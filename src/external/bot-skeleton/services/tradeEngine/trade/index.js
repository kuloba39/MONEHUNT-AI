import { applyMiddleware, createStore } from 'redux';
import {
    clearMonehuntRuntimeConfig,
    getMonehuntRuntimeConfig,
} from '../../../../../utils/monehunt-runtime-config';
import { thunk } from 'redux-thunk';
import { getLocalizedErrorMessage } from '@/constants/backend-error-messages';
import { createError } from '../../../utils/error';
import { observer as globalObserver } from '../../../utils/observer';
import { api_base } from '../../api/api-base';
import { checkBlocksForProposalRequest, doUntilDone } from '../utils/helpers';
import { expectInitArg } from '../utils/sanitize';
import { proposalsReady, readyForNextPurchase, start } from './state/actions';
import * as constants from './state/constants';
import rootReducer from './state/reducers';
import Balance from './Balance';
import OpenContract from './OpenContract';
import Proposal from './Proposal';
import Purchase from './Purchase';
import Sell from './Sell';
import Ticks from './Ticks';
import Total from './Total';

const OVER2_SIGNAL_STRATEGY_ID = 'over2-signal-v2';

const watchBefore = (
    store,
    getPrevTick,
    setPrevTick,
    { requireNewTick = false, signal } = {}
) => {
    const state = store.getState();
    const stopScopes = requireNewTick
        ? [constants.DURING_PURCHASE, constants.STOP]
        : [constants.DURING_PURCHASE];

    // Fast path: when the bot is already ready to purchase,
    // do not wait for another market tick.
    if (
        !requireNewTick &&
        state.scope === constants.BEFORE_PURCHASE &&
        state.proposalsReady
    ) {
        return Promise.resolve(true);
    }

    return watchScope({
        store,
        stopScopes,
        passScope: constants.BEFORE_PURCHASE,
        passFlag: 'proposalsReady',
        getPrevTick,
        setPrevTick,
        baselineEpoch: requireNewTick ? state.newTick : undefined,
        requireNewTick,
        signal,
    });
};
const watchDuring = (store, getPrevTick, setPrevTick) =>
    watchScope({
        store,
        stopScopes: [constants.STOP],
        passScope: constants.DURING_PURCHASE,
        passFlag: 'openContract',
        getPrevTick,
        setPrevTick,
    });

const watchScope = ({
    store,
    stopScopes,
    passScope,
    passFlag,
    getPrevTick,
    setPrevTick,
    baselineEpoch,
    requireNewTick = false,
    signal,
}) => {
    const isStopScope = scope => stopScopes.includes(scope);

    if (isStopScope(store.getState().scope) || signal?.aborted) {
        return Promise.resolve(false);
    }

    return new Promise((resolve, reject) => {
        let unsubscribe;
        let cleanupRequested = false;
        let settled = false;

        const cleanup = () => {
            if (unsubscribe) {
                const unsubscribeStore = unsubscribe;
                unsubscribe = undefined;
                unsubscribeStore();
            } else {
                cleanupRequested = true;
            }
            signal?.removeEventListener('abort', onAbort);
        };

        const settle = (settlePromise, value) => {
            if (settled) return;
            settled = true;
            cleanup();
            settlePromise(value);
        };

        const onAbort = () => settle(resolve, false);

        const checkState = () => {
            if (settled) return;

            try {
                const newState = store.getState();

                if (isStopScope(newState.scope)) {
                    settle(resolve, false);
                    return;
                }

                const hasNewRequiredTick =
                    !requireNewTick || newState.newTick !== baselineEpoch;

                if (
                    newState.scope === passScope &&
                    newState[passFlag] &&
                    hasNewRequiredTick
                ) {
                    if (requireNewTick) setPrevTick(newState.newTick);
                    settle(resolve, true);
                    return;
                }

                // Preserve the existing duplicate-tick bookkeeping for other waiters.
                if (newState.newTick !== getPrevTick()) {
                    setPrevTick(newState.newTick);
                }
            } catch (error) {
                settle(reject, error);
            }
        };

        if (signal) {
            signal.addEventListener('abort', onAbort, { once: true });
            if (signal.aborted) {
                onAbort();
                return;
            }
        }

        try {
            unsubscribe = store.subscribe(checkState);
            if (cleanupRequested) {
                cleanupRequested = false;
                cleanup();
            }

            // Redux retains the latest epoch; this closes the subscribe/setup race.
            if (requireNewTick) checkState();
        } catch (error) {
            settle(reject, error);
        }
    });
};

export default class TradeEngine extends Balance(Purchase(Sell(OpenContract(Proposal(Ticks(Total(class {}))))))) {
    constructor($scope) {
        super();
        this.observer = $scope.observer;
        this.$scope = $scope;
        this.observe();
        this.data = {
            contract: {},
            proposals: [],
        };
        this.subscription_id_for_accumulators = null;
        this.is_proposal_requested_for_accumulators = false;

        // Tick watcher state belongs to this TradeEngine instance.
        this.prevTick = undefined;

        // Retain the Workspace base stake after its shared config is consumed.
        this.monehuntWorkspaceStake = null;

        this.store = createStore(rootReducer, applyMiddleware(thunk));
    }

    init(...args) {
        const [token, options] = expectInitArg(args);
        const monehuntRuntimeConfig = getMonehuntRuntimeConfig();

        const effectiveOptions = {
            ...options,
        };

        if (monehuntRuntimeConfig?.symbol) {
            effectiveOptions.symbol = monehuntRuntimeConfig.symbol;
        }


        if (monehuntRuntimeConfig?.contractType) {
            if (
                monehuntRuntimeConfig.contractType === 'both' &&
                Array.isArray(options?.contractTypes)
            ) {
                effectiveOptions.contractTypes = [...options.contractTypes];
            } else {
                effectiveOptions.contractTypes = [
                    monehuntRuntimeConfig.contractType,
                ];
            }
        }

        const originalContractTypes = options?.contractTypes;
        const direction = monehuntRuntimeConfig?.direction;
        const contractPreference = monehuntRuntimeConfig?.contractPreference;
        const tradeFamily = String(monehuntRuntimeConfig?.tradeFamily || '').toUpperCase();

        const contractFamilies = {
            EVENODD: ['DIGITEVEN', 'DIGITODD'],
            OVERUNDER: ['DIGITOVER', 'DIGITUNDER'],
            CALLPUT: ['CALL', 'PUT'],
        };

        const selectedFamily = contractFamilies[tradeFamily];
        const allowsPreferenceOverride =
            !monehuntRuntimeConfig?.contractType ||
            monehuntRuntimeConfig.contractType === 'both';

        let preferenceOverrideApplied = false;

        // Only override contracts within a recognized, matching family.
        // Keep the bot's original contract list for all other strategies.
        const originalTypesMatchFamily =
            Array.isArray(originalContractTypes) &&
            originalContractTypes.length > 0 &&
            originalContractTypes.every(type => selectedFamily?.includes(type));

        if (
            contractPreference &&
            selectedFamily &&
            originalTypesMatchFamily &&
            allowsPreferenceOverride
        ) {
            const preferenceMap = {
                even: ['DIGITEVEN'],
                odd: ['DIGITODD'],
                over: ['DIGITOVER'],
                under: ['DIGITUNDER'],
                rise: ['CALL'],
                fall: ['PUT'],
                both: selectedFamily,
            };

            const requestedTypes = preferenceMap[contractPreference];
            const familyMatchesPreference =
                (tradeFamily === 'EVENODD' &&
                    ['even', 'odd', 'both'].includes(contractPreference)) ||
                (tradeFamily === 'OVERUNDER' &&
                    ['over', 'under', 'both'].includes(contractPreference)) ||
                (tradeFamily === 'CALLPUT' &&
                    ['rise', 'fall', 'both'].includes(contractPreference));

            if (familyMatchesPreference && requestedTypes) {
                effectiveOptions.contractTypes = [...requestedTypes];
                preferenceOverrideApplied = true;
            }
        }

        // Backward compatibility for callers still using the older direction setting.
        let directionOverrideApplied = false;
        if (
            !contractPreference &&
            direction &&
            Array.isArray(originalContractTypes) &&
            originalContractTypes.length > 0 &&
            originalContractTypes.every(type => ['CALL', 'PUT'].includes(type)) &&
            allowsPreferenceOverride
        ) {
            effectiveOptions.contractTypes =
                direction === 'rise'
                    ? ['CALL']
                    : direction === 'fall'
                      ? ['PUT']
                      : ['CALL', 'PUT'];
            directionOverrideApplied = true;
        }
        const { symbol } = effectiveOptions;

        this.initArgs = [token, effectiveOptions];
        this.options = effectiveOptions;

        console.log('[MONEHUNT RUNTIME BRIDGE] INIT:', {
            configured: !!monehuntRuntimeConfig,
            configuredSymbol: monehuntRuntimeConfig?.symbol ?? null,
            configuredContractType:
                monehuntRuntimeConfig?.contractType ?? null,
            configuredDirection: direction ?? 'bot-default',
            configuredTradeFamily: tradeFamily || null,
            configuredContractPreference: contractPreference ?? 'bot-default',
            contractPreferenceOverrideApplied: preferenceOverrideApplied,
            directionOverrideApplied,
            engineSymbol: effectiveOptions?.symbol ?? null,
            engineContractTypes:
                effectiveOptions?.contractTypes ?? null,
        });

        this.startPromise = this.loginAndGetBalance(token);

        this.watchTicks(symbol);
    }
    start(tradeOptions, { preserveMonehuntMartingale = false } = {}) {
        if (!this.options) {
            throw createError('NotInitialized', getLocalizedErrorMessage('NotInitialized'));
        }

        globalObserver.emit('bot.running');

        const monehuntRuntimeConfig = getMonehuntRuntimeConfig();

        const isNativeOud = this.options?.nativeOudDirectPurchase === true;

        if (isNativeOud) {
            this.monehuntWorkspaceStake = null;
        } else if (monehuntRuntimeConfig?.stake !== undefined) {
            const configuredWorkspaceStake = Number(monehuntRuntimeConfig.stake);
            this.monehuntWorkspaceStake =
                Number.isFinite(configuredWorkspaceStake) && configuredWorkspaceStake > 0
                    ? configuredWorkspaceStake
                    : null;
        }
        // Consume shared config; this run retains its local copy.
        if (monehuntRuntimeConfig) {
            clearMonehuntRuntimeConfig();
        }

        // Preserve progression only for a valid existing state outside native OUD execution.
        const canPreserveMonehuntMartingale =
            Boolean(this.monehuntMartingale) &&
            this.options?.nativeOudDirectPurchase !== true &&
            (preserveMonehuntMartingale || !monehuntRuntimeConfig);

        if (!canPreserveMonehuntMartingale) {
            this.monehuntMartingale = null;

            const martingaleMultiplier = Number(monehuntRuntimeConfig?.martingale);
            const startingStake = Number(
                monehuntRuntimeConfig?.stake ?? tradeOptions?.amount
            );
            const configuredMaxStake = monehuntRuntimeConfig?.maxStake;
            const maxStake =
                configuredMaxStake === undefined || configuredMaxStake === null
                    ? null
                    : Number(configuredMaxStake);

            if (
                monehuntRuntimeConfig &&
                Number.isFinite(martingaleMultiplier) &&
                martingaleMultiplier > 1 &&
                Number.isFinite(startingStake) &&
                startingStake > 0 &&
                (maxStake === null ||
                    (Number.isFinite(maxStake) && maxStake >= startingStake))
            ) {
                this.monehuntMartingale = {
                    startingStake,
                    currentStake: startingStake,
                    multiplier: martingaleMultiplier,
                    maxStake,
                };
            }
        }

        const effectiveTradeOptions = {
            ...tradeOptions,
        };

        const hasWorkspaceStake =
            Number.isFinite(this.monehuntWorkspaceStake) &&
            this.monehuntWorkspaceStake > 0;

        if (!isNativeOud && hasWorkspaceStake) {
            effectiveTradeOptions.amount = canPreserveMonehuntMartingale
                ? this.monehuntMartingale.currentStake
                : this.monehuntWorkspaceStake;
        } else if (monehuntRuntimeConfig?.stake !== undefined) {
            effectiveTradeOptions.amount = monehuntRuntimeConfig.stake;
        }

        if (canPreserveMonehuntMartingale) {
            effectiveTradeOptions.amount = this.monehuntMartingale.currentStake;
        }

        if (monehuntRuntimeConfig?.duration !== undefined) {
            effectiveTradeOptions.duration = monehuntRuntimeConfig.duration;
        }

        if (monehuntRuntimeConfig?.durationUnit) {
            effectiveTradeOptions.duration_unit =
                monehuntRuntimeConfig.durationUnit;
        }


        // Preserve the bot prediction unless the user explicitly supplied an override.
        if (Number.isFinite(monehuntRuntimeConfig?.prediction)) {
            effectiveTradeOptions.prediction = monehuntRuntimeConfig.prediction;
        }
        if (
            monehuntRuntimeConfig?.takeProfit !== undefined ||
            monehuntRuntimeConfig?.stopLoss !== undefined
        ) {
            effectiveTradeOptions.limit_order = {
                ...(effectiveTradeOptions.limit_order || {}),
            };

            if (monehuntRuntimeConfig.takeProfit !== undefined) {
                effectiveTradeOptions.take_profit =
                    monehuntRuntimeConfig.takeProfit;
                effectiveTradeOptions.limit_order.take_profit =
                    monehuntRuntimeConfig.takeProfit;
            }

            if (monehuntRuntimeConfig.stopLoss !== undefined) {
                effectiveTradeOptions.stop_loss =
                    monehuntRuntimeConfig.stopLoss;
                effectiveTradeOptions.limit_order.stop_loss =
                    monehuntRuntimeConfig.stopLoss;
            }
        }

        console.log('[MONEHUNT RUNTIME BRIDGE] START:', {
            configured: !!monehuntRuntimeConfig,
            stake: monehuntRuntimeConfig?.stake ?? null,
            martingale: monehuntRuntimeConfig?.martingale ?? null,
            duration: monehuntRuntimeConfig?.duration ?? null,
            durationUnit: monehuntRuntimeConfig?.durationUnit ?? null,
            prediction: monehuntRuntimeConfig?.prediction ?? null,
            takeProfit: monehuntRuntimeConfig?.takeProfit ?? null,
            stopLoss: monehuntRuntimeConfig?.stopLoss ?? null,
            engineSymbol: this.options?.symbol ?? null,
        });

        const validated_trade_options =
            this.validateTradeOptions(effectiveTradeOptions);

        this.tradeOptions = {
            ...validated_trade_options,
            symbol: this.options.symbol,
        };


        this.store.dispatch(start());
        this.checkLimits(validated_trade_options);

        this.makeDirectPurchaseDecision();
    }
    loginAndGetBalance(token) {
        if (this.token === token) {
            return Promise.resolve();
        }
        // for strategies using total runs, GetTotalRuns function is trying to get loginid and it gets called before Proposals calls.
        // the below required loginid to be set in Proposal calls where loginAndGetBalance gets resolved.
        // Earlier this used to happen as soon as we get ticks_history response and by the time GetTotalRuns gets called we have required info.
        this.accountInfo = api_base.account_info;
        this.token = api_base.token;
        return new Promise(resolve => {
            // Try to recover from a situation where API doesn't give us a correct response on
            // "proposal_open_contract" which would make the bot run forever. When there's a "sell"
            // event, wait a couple seconds for the API to give us the correct "proposal_open_contract"
            // response, if there's none after x seconds. Send an explicit request, which _should_
            // solve the issue. This is a backup!
            const subscription = api_base.api.onMessage().subscribe(({ data }) => {
                if (data.msg_type === 'transaction' && data.transaction.action === 'sell') {
                    this.transaction_recovery_timeout = setTimeout(() => {
                        const { contract } = this.data;
                        const is_same_contract = contract.contract_id === data.transaction.contract_id;
                        const is_open_contract = contract.status === 'open';
                        if (is_same_contract && is_open_contract) {
                            doUntilDone(() => {
                                return api_base.api.send({ proposal_open_contract: 1, contract_id: contract.contract_id });
                            }, ['PriceMoved']);
                        }
                    }, 1500);
                }
                resolve();
            });
            api_base.pushSubscription(subscription, this);
        });
    }

    observe() {
        this.observeOpenContract();
        this.observeBalance();
        this.observeProposals();
    }

    watch(watchName) {
        const getPrevTick = () => this.prevTick;
        const setPrevTick = tick => {
            this.prevTick = tick;
        };

        if (watchName === 'before') {
            return watchBefore(
                this.store,
                getPrevTick,
                setPrevTick,
                {
                    requireNewTick:
                        this.options?.strategyId === OVER2_SIGNAL_STRATEGY_ID,
                    signal: this.$scope?.executionSignal,
                }
            );
        }

        return watchDuring(
            this.store,
            getPrevTick,
            setPrevTick,
        );
    }

    readyForNextPurchase() {
        this.store.dispatch(readyForNextPurchase());
    }

    makeDirectPurchaseDecision() {
        /*
         * Native OUD direct-purchase mode intentionally bypasses
         * Blockly proposal requirements.
         *
         * This is scoped to the native OUD TradeEngine caller only.
         * Normal Blockly bots retain the existing proposal decision.
         */
        if (this.options?.nativeOudDirectPurchase === true) {
            this.is_proposal_subscription_required = false;
            this.store.dispatch(proposalsReady());
            return;
        }

        const { has_payout_block, is_basis_payout } = checkBlocksForProposalRequest();
        this.is_proposal_subscription_required = has_payout_block || is_basis_payout;

        if (this.is_proposal_subscription_required) {
            this.makeProposals({ ...this.options, ...this.tradeOptions });
            this.checkProposalReady();
        } else {
            this.store.dispatch(proposalsReady());
        }
    }
}
