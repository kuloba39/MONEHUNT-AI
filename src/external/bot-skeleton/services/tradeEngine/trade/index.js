import { applyMiddleware, createStore } from 'redux';
import { getMonehuntRuntimeConfig } from '../../../../../utils/monehunt-runtime-config';
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

const watchBefore = (store, getPrevTick, setPrevTick) => {
    const state = store.getState();

    // Fast path: when the bot is already ready to purchase,
    // do not wait for another market tick.
    if (
        state.scope === constants.BEFORE_PURCHASE &&
        state.proposalsReady
    ) {
        return Promise.resolve(true);
    }

    return watchScope({
        store,
        stopScope: constants.DURING_PURCHASE,
        passScope: constants.BEFORE_PURCHASE,
        passFlag: 'proposalsReady',
        getPrevTick,
        setPrevTick,
    });
};
const watchDuring = (store, getPrevTick, setPrevTick) =>
    watchScope({
        store,
        stopScope: constants.STOP,
        passScope: constants.DURING_PURCHASE,
        passFlag: 'openContract',
        getPrevTick,
        setPrevTick,
    });

const watchScope = ({
    store,
    stopScope,
    passScope,
    passFlag,
    getPrevTick,
    setPrevTick,
}) => {
    // in case watch is called after stop is fired
    if (store.getState().scope === stopScope) {
        return Promise.resolve(false);
    }

    return new Promise(resolve => {
        const unsubscribe = store.subscribe(() => {
            const newState = store.getState();

            // State transitions such as PROPOSALS_READY,
            // OPEN_CONTRACT, SELL and READY_FOR_NEXT_PURCHASE
            // are not guaranteed to arrive with a NEW_TICK.
            // Evaluate the state transition first so the bot cannot
            // hang waiting for an unrelated market tick.
            if (newState.scope === passScope && newState[passFlag]) {
                unsubscribe();
                resolve(true);
                return;
            }

            if (newState.scope === stopScope) {
                unsubscribe();
                resolve(false);
                return;
            }

            // Ignore duplicate tick notifications only after the
            // relevant state transitions have been evaluated.
            if (newState.newTick === getPrevTick()) return;
            setPrevTick(newState.newTick);
        });
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

        const { symbol } = effectiveOptions;

        this.initArgs = [token, effectiveOptions];
        this.options = effectiveOptions;

        console.log('[MONEHUNT RUNTIME BRIDGE] INIT:', {
            configured: !!monehuntRuntimeConfig,
            configuredSymbol: monehuntRuntimeConfig?.symbol ?? null,
            configuredContractType:
                monehuntRuntimeConfig?.contractType ?? null,
            engineSymbol: effectiveOptions?.symbol ?? null,
            engineContractTypes:
                effectiveOptions?.contractTypes ?? null,
        });

        this.startPromise = this.loginAndGetBalance(token);

        if (!this.checkTicksPromiseExists()) this.watchTicks(symbol);
    }
    start(tradeOptions) {
        if (!this.options) {
            throw createError('NotInitialized', getLocalizedErrorMessage('NotInitialized'));
        }

        globalObserver.emit('bot.running');

        const monehuntRuntimeConfig = getMonehuntRuntimeConfig();

        const effectiveTradeOptions = {
            ...tradeOptions,
        };

        if (monehuntRuntimeConfig?.stake !== undefined) {
            effectiveTradeOptions.amount = monehuntRuntimeConfig.stake;
        }

        if (monehuntRuntimeConfig?.duration !== undefined) {
            effectiveTradeOptions.duration = monehuntRuntimeConfig.duration;
        }

        if (monehuntRuntimeConfig?.durationUnit) {
            effectiveTradeOptions.duration_unit =
                monehuntRuntimeConfig.durationUnit;
        }

        if (monehuntRuntimeConfig?.prediction !== undefined) {
            effectiveTradeOptions.prediction =
                monehuntRuntimeConfig.prediction;
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
                                api_base.api.send({ proposal_open_contract: 1, contract_id: contract.contract_id });
                            }, ['PriceMoved']);
                        }
                    }, 1500);
                }
                resolve();
            });
            api_base.pushSubscription(subscription);
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
            );
        }

        return watchDuring(
            this.store,
            getPrevTick,
            setPrevTick,
        );
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
