import { api_base } from '@/external/bot-skeleton/services/api/api-base';
import type {
    OUDDirection,
    OUDDirectionMode,
    OUDExecuteParams,
    OUDExecutionState,
    OUDStrategyMode,
    OUDTradeRecord,
} from './oud-execution-types';
import type { OnlyUpsDownsLive } from '@/only-ups-downs/live/only-ups-downs-live';

const MIN_DURATION = 2;
const MAX_DURATION = 5;
const MAX_HISTORY = 10;
const DEFAULT_MAX_RECOVERY = 6;
const DEFAULT_MARTINGALE_MULTIPLIER = 1.6;

const normalizeDuration = (duration: number) => {
    const value = Number(duration);

    if (!Number.isFinite(value)) {
        return MIN_DURATION;
    }

    return Math.min(
        MAX_DURATION,
        Math.max(MIN_DURATION, Math.floor(value)),
    );
};

const normalizeMultiplier = (value: number) => {
    const numeric = Number(value);

    if (!Number.isFinite(numeric) || numeric < 1) {
        return DEFAULT_MARTINGALE_MULTIPLIER;
    }

    return Math.min(10, numeric);
};

const normalizeMaxMartingaleLevel = (value: number) => {
    const numeric = Number(value);

    if (!Number.isFinite(numeric) || numeric < 0) {
        return DEFAULT_MAX_RECOVERY;
    }

    return Math.min(20, Math.floor(numeric));
};

const normalizeStake = (value: number) => {
    const numeric = Number(value);

    if (!Number.isFinite(numeric) || numeric <= 0) {
        return 0;
    }

    return Number(numeric.toFixed(2));
};

const getContractType = (direction: OUDDirection) =>
    direction === 'UP' ? 'RUNHIGH' : 'RUNLOW';

export class OUDExecutionController {
    private dbot: any;
    private tradeEngine: any;
    private currency: string;
    private getLive: () => OnlyUpsDownsLive | null;
    private state: OUDExecutionState;
    private pollTimer: ReturnType<typeof setInterval> | null = null;
    private signalMonitorTimer: ReturnType<typeof setInterval> | null = null;

    /*
     * Scanner lifecycle tracking.
     *
     * A signalCycleId represents one executable READY lifecycle.
     * The controller must never purchase the same cycle twice.
     */
    private lastSeenSignalCycleId = 0;
    private lastConsumedSignalCycleId = 0;
    private runStartSignalCycleId = 0;
    private signalExecutionInFlight = false;

    private listeners = new Set<
        (state: OUDExecutionState) => void
    >();

    constructor(
        dbot: any,
        currency = 'USD',
        getLive: () => OnlyUpsDownsLive | null = () => null,
    ) {
        this.dbot = dbot;
        this.currency = currency || 'USD';
        this.getLive = getLive;

        this.state = {
            lifecycle: 'STOPPED',
            status: 'WAITING',
            direction: null,
            market: '',

            directionMode: 'BOTH',
            strategyMode: 'BOTH',

            martingaleEnabled: false,
            martingaleMultiplier:
                DEFAULT_MARTINGALE_MULTIPLIER,
            maxMartingaleLevel:
                DEFAULT_MAX_RECOVERY,

            baseStake: 10,
            stake: 10,
            currentStake: 10,

            duration: MIN_DURATION,
            recoveryLevel: 0,

            contractId: null,
            lastResult: null,
            profit: null,
            error: null,

            totalTrades: 0,
            wins: 0,
            losses: 0,
            totalProfit: 0,
            winRate: 0,

            tradeHistory: [],
        };

        this.refreshEngine();
    }

    private refreshEngine() {
        this.tradeEngine =
            this.dbot?.interpreter?.bot?.tradeEngine ?? null;

        return this.tradeEngine;
    }

    getState() {
        return {
            ...this.state,
            tradeHistory: [...this.state.tradeHistory],
        };
    }

    subscribe(listener: (state: OUDExecutionState) => void) {
        this.listeners.add(listener);

        listener(this.getState());

        return () => {
            this.listeners.delete(listener);
        };
    }

    private emit() {
        const nextState = this.getState();

        this.listeners.forEach(listener => {
            try {
                listener(nextState);
            } catch (error) {
                console.error(
                    '[OUD EXECUTION] listener error',
                    error,
                );
            }
        });
    }

    private setState(
        patch: Partial<OUDExecutionState>,
    ) {
        this.state = {
            ...this.state,
            ...patch,
        };

        this.emit();
    }

    setStake(stake: number) {
        const value = normalizeStake(stake);

        if (!value) {
            return;
        }

        this.setState({
            baseStake: value,
            currentStake: value,
            stake:
                this.state.lifecycle === 'RUNNING' &&
                this.state.martingaleEnabled
                    ? this.calculateNextStake(
                          this.state.recoveryLevel,
                          value,
                      )
                    : value,
        });
    }

    setDuration(duration: number) {
        this.setState({
            duration: normalizeDuration(duration),
        });
    }

    setDirectionMode(mode: OUDDirectionMode) {
        if (
            mode !== 'UP' &&
            mode !== 'DOWN' &&
            mode !== 'BOTH'
        ) {
            return;
        }

        this.setState({
            directionMode: mode,
        });
    }

    setStrategyMode(mode: OUDStrategyMode) {
        if (
            mode !== 'REVERSAL' &&
            mode !== 'CONTINUATION' &&
            mode !== 'BOTH'
        ) {
            return;
        }

        this.setState({
            strategyMode: mode,
        });
    }

    setMartingaleEnabled(enabled: boolean) {
        const value = Boolean(enabled);

        this.setState({
            martingaleEnabled: value,
            recoveryLevel: value
                ? this.state.recoveryLevel
                : 0,
            currentStake: value
                ? this.calculateNextStake(
                      this.state.recoveryLevel,
                      this.state.baseStake,
                  )
                : this.state.baseStake,
            stake: value
                ? this.calculateNextStake(
                      this.state.recoveryLevel,
                      this.state.baseStake,
                  )
                : this.state.baseStake,
        });
    }

    setMartingaleMultiplier(multiplier: number) {
        const value = normalizeMultiplier(multiplier);

        this.setState({
            martingaleMultiplier: value,
            currentStake:
                this.state.martingaleEnabled
                    ? this.calculateNextStake(
                          this.state.recoveryLevel,
                          this.state.baseStake,
                      )
                    : this.state.baseStake,
            stake:
                this.state.martingaleEnabled
                    ? this.calculateNextStake(
                          this.state.recoveryLevel,
                          this.state.baseStake,
                      )
                    : this.state.baseStake,
        });
    }

    setMaxMartingaleLevel(level: number) {
        const value =
            normalizeMaxMartingaleLevel(level);

        const recoveryLevel = Math.min(
            this.state.recoveryLevel,
            value,
        );

        this.setState({
            maxMartingaleLevel: value,
            recoveryLevel,
            currentStake:
                this.state.martingaleEnabled
                    ? this.calculateNextStake(
                          recoveryLevel,
                          this.state.baseStake,
                      )
                    : this.state.baseStake,
            stake:
                this.state.martingaleEnabled
                    ? this.calculateNextStake(
                          recoveryLevel,
                          this.state.baseStake,
                      )
                    : this.state.baseStake,
        });
    }

    private calculateNextStake(
        recoveryLevel = this.state.recoveryLevel,
        baseStake = this.state.baseStake,
    ) {
        const normalizedBase =
            normalizeStake(baseStake);

        if (!normalizedBase) {
            return 0;
        }

        if (!this.state.martingaleEnabled) {
            return normalizedBase;
        }

        const level = Math.min(
            Math.max(0, Math.floor(recoveryLevel)),
            this.state.maxMartingaleLevel,
        );

        const calculated =
            normalizedBase *
            Math.pow(
                this.state.martingaleMultiplier,
                level,
            );

        if (!Number.isFinite(calculated)) {
            return normalizedBase;
        }

        return Number(
            calculated.toFixed(8),
        );
    }

    private directionAllowed(
        direction: OUDDirection,
    ) {
        return (
            this.state.directionMode === 'BOTH' ||
            this.state.directionMode === direction
        );
    }

    private strategyAllowed(
        signalMode: string | undefined,
    ) {
        if (this.state.strategyMode === 'BOTH') {
            return true;
        }

        return signalMode === this.state.strategyMode;
    }

    setSignal(
        direction: OUDDirection | null,
        market: string,
        signalCycleId = 0,
    ) {
        const normalizedCycleId =
            Number(signalCycleId);

        if (
            Number.isFinite(normalizedCycleId) &&
            normalizedCycleId > this.lastSeenSignalCycleId
        ) {
            this.lastSeenSignalCycleId =
                normalizedCycleId;
        }

        this.setState({
            market,
            direction,
            status:
                direction &&
                this.state.lifecycle === 'RUNNING' &&
                this.state.status !== 'PURCHASING' &&
                this.state.status !== 'CONTRACT_ACTIVE'
                    ? 'SIGNAL_READY'
                    : this.state.status,
        });
    }

    run() {
        if (
            this.state.status === 'PURCHASING' ||
            this.state.status === 'CONTRACT_ACTIVE'
        ) {
            return false;
        }

        const live = this.getLive();
        const snapshot = live?.getSnapshot();
        const currentSignalCycleId = Number(snapshot?.signalCycleId);
        this.runStartSignalCycleId = Number.isFinite(currentSignalCycleId)
            ? Math.max(0, currentSignalCycleId)
            : 0;
        this.setState({
            lifecycle: 'RUNNING',
            status: 'WAITING',
            error: null,
            recoveryLevel:
                this.state.martingaleEnabled
                    ? this.state.recoveryLevel
                    : 0,
            currentStake:
                this.state.martingaleEnabled
                    ? this.calculateNextStake(
                          this.state.recoveryLevel,
                          this.state.baseStake,
                      )
                    : this.state.baseStake,
            stake:
                this.state.martingaleEnabled
                    ? this.calculateNextStake(
                          this.state.recoveryLevel,
                          this.state.baseStake,
                      )
                    : this.state.baseStake,
        });

        this.startSignalMonitoring();

        return true;
    }

    pause() {
        this.stopSignalMonitoring();

        this.setState({
            lifecycle: 'PAUSED',
            error: null,
        });

        return true;
    }

    stop() {
        this.stopSignalMonitoring();

        this.setState({
            lifecycle: 'STOPPED',
            error: null,
        });

        return true;
    }

    private startSignalMonitoring() {
        this.stopSignalMonitoring();

        this.signalMonitorTimer = setInterval(() => {
            if (
                this.state.lifecycle !== 'RUNNING' ||
                this.state.status === 'PURCHASING' ||
                this.state.status === 'CONTRACT_ACTIVE' ||
                this.signalExecutionInFlight
            ) {
                return;
            }

            const live = this.getLive();
            const snapshot = live?.getSnapshot();

            if (!snapshot) {
                return;
            }

            const signal = snapshot.signal;
            const cycleId =
                Number(snapshot.signalCycleId);

            if (
                !snapshot.signalLocked ||
                !signal ||
                !Number.isFinite(cycleId) ||
                cycleId <= 0
            ) {
                return;
            }

            if (
                cycleId <=
                this.lastConsumedSignalCycleId
            ) {
                return;
            }

            if (
                cycleId <=
                this.runStartSignalCycleId
            ) {
                return;
            }

            const direction =
                signal.botDirection === 'ups'
                    ? 'UP'
                    : signal.botDirection === 'downs'
                        ? 'DOWN'
                        : null;

            if (!direction) {
                return;
            }

            /*
             * Direction is a hard user configuration gate.
             */
            if (!this.directionAllowed(direction)) {
                return;
            }

            /*
             * Strategy is a hard user configuration gate.
             *
             * Scanner remains the signal authority.
             * The controller only decides whether the
             * scanner's READY signal matches user settings.
             */
            if (
                !this.strategyAllowed(
                    signal.mode,
                )
            ) {
                return;
            }

            const market =
                live.getSymbol() ||
                this.state.market;

            if (!market) {
                return;
            }

            this.lastSeenSignalCycleId = cycleId;
            this.signalExecutionInFlight = true;

            const nextStake =
                this.calculateNextStake(
                    this.state.recoveryLevel,
                    this.state.baseStake,
                );

            this.setState({
                status: 'SIGNAL_READY',
                direction,
                market,
                currentStake: nextStake,
                stake: nextStake,
                error: null,
            });

            void this.execute({
                direction,
                market,
                stake: nextStake,
                duration: this.state.duration,
            }).finally(() => {
                this.signalExecutionInFlight = false;
            });
        }, 150);
    }

    canExecute() {
        return (
            this.state.lifecycle === 'RUNNING' &&
            !!this.state.direction &&
            !!this.state.market &&
            this.state.status !== 'PURCHASING' &&
            this.state.status !== 'CONTRACT_ACTIVE'
        );
    }

    private stopPolling() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
    }

    private stopSignalMonitoring() {
        if (this.signalMonitorTimer) {
            clearInterval(this.signalMonitorTimer);
            this.signalMonitorTimer = null;
        }
    }

    private addTradeRecord(
        record: OUDTradeRecord,
    ) {
        const history = [
            record,
            ...this.state.tradeHistory,
        ].slice(0, MAX_HISTORY);

        this.setState({
            tradeHistory: history,
        });
    }

    private startContractWatcher() {
        this.stopPolling();

        this.pollTimer = setInterval(() => {
            const engine = this.refreshEngine();

            if (!engine) {
                return;
            }

            const contract = engine.data?.contract;

            if (!contract) {
                return;
            }

            if (
                this.state.contractId &&
                contract.contract_id &&
                String(contract.contract_id) !==
                    String(this.state.contractId)
            ) {
                return;
            }

            if (
                contract.contract_id &&
                !this.state.contractId
            ) {
                this.setState({
                    contractId: String(
                        contract.contract_id,
                    ),
                    status: 'CONTRACT_ACTIVE',
                });
            }

            if (!contract.is_sold) {
                if (
                    this.state.status !==
                    'CONTRACT_ACTIVE'
                ) {
                    this.setState({
                        status: 'CONTRACT_ACTIVE',
                    });
                }

                return;
            }

            this.stopPolling();

            const profitValue = Number(
                contract.profit,
            );

            const hasProfit =
                Number.isFinite(profitValue) &&
                profitValue > 0;

            const result = hasProfit
                ? 'WIN'
                : 'LOSS';

            const nextRecoveryLevel =
                hasProfit || !this.state.martingaleEnabled
                    ? 0
                    : Math.min(
                          this.state.maxMartingaleLevel,
                          this.state.recoveryLevel + 1,
                      );

            const record: OUDTradeRecord = {
                id: Date.now(),
                timestamp:
                    new Date().toISOString(),
                direction:
                    this.state.direction || 'UP',
                stake: this.state.stake,
                result,
                profit:
                    Number.isFinite(profitValue)
                        ? profitValue
                        : null,
                contractId:
                    this.state.contractId,
            };

            const nextTotalTrades =
                this.state.totalTrades + 1;

            const nextWins =
                this.state.wins +
                (hasProfit ? 1 : 0);

            const nextLosses =
                this.state.losses +
                (hasProfit ? 0 : 1);

            const nextTotalProfit =
                this.state.totalProfit +
                (Number.isFinite(profitValue)
                    ? profitValue
                    : 0);

            const nextWinRate =
                nextTotalTrades > 0
                    ? (nextWins /
                          nextTotalTrades) *
                      100
                    : 0;

            const nextStake =
                this.state.martingaleEnabled
                    ? this.calculateNextStake(
                          nextRecoveryLevel,
                          this.state.baseStake,
                      )
                    : this.state.baseStake;

            this.setState({
                status: hasProfit
                    ? 'WON'
                    : 'LOST',
                lastResult: result,
                profit:
                    Number.isFinite(profitValue)
                        ? profitValue
                        : null,
                recoveryLevel:
                    nextRecoveryLevel,
                currentStake: nextStake,
                stake: nextStake,
                totalTrades:
                    nextTotalTrades,
                wins: nextWins,
                losses: nextLosses,
                totalProfit:
                    Number(
                        nextTotalProfit.toFixed(8),
                    ),
                winRate:
                    Number(
                        nextWinRate.toFixed(2),
                    ),
            });

            this.addTradeRecord(record);

            this.setState({
                contractId: null,
            });
        }, 100);
    }

    async execute(params: OUDExecuteParams) {
        return this.executeInternal(
            params,
            true,
            true,
        );
    }

    async executeManual(params: OUDExecuteParams) {
        if (
            this.state.status === 'PURCHASING' ||
            this.state.status === 'CONTRACT_ACTIVE'
        ) {
            return false;
        }

        this.signalExecutionInFlight = true;

        try {
            return await this.executeInternal(
                params,
                false,
                false,
            );
        } finally {
            this.signalExecutionInFlight = false;
        }
    }

    private async executeInternal(
        params: OUDExecuteParams,
        requireRunning: boolean,
        consumeScannerSignal: boolean,
    ) {
        /*
         * Native execution is scanner-driven.
         *
         * The controller may prepare the TradeEngine only
         * after the scanner has produced an accepted signal.
         */
        if (
            requireRunning &&
            this.state.lifecycle !== 'RUNNING'
        ) {
            return false;
        }

        if (
            this.state.status === 'PURCHASING' ||
            this.state.status === 'CONTRACT_ACTIVE'
        ) {
            return false;
        }

        const duration = normalizeDuration(
            params.duration,
        );

        const stake = normalizeStake(
            params.stake,
        );

        if (!stake) {
            this.setState({
                status: 'ERROR',
                error: 'Invalid stake.',
            });

            return false;
        }

        if (!params.market) {
            this.setState({
                status: 'ERROR',
                error: 'No market selected.',
            });

            return false;
        }

        this.refreshEngine();

        if (!this.tradeEngine) {
            this.setState({
                status: 'ERROR',
                error:
                    'OUD TradeEngine is not initialized.',
            });

            return false;
        }

        if (
            !api_base.api ||
            !api_base.is_authorized
        ) {
            this.setState({
                status: 'ERROR',
                error:
                    'Trading API is not authorized.',
            });

            return false;
        }

        if (this.dbot?.is_bot_running) {
            this.setState({
                status: 'ERROR',
                error:
                    'The Blockly bot is already running. Stop it before using the native OUD bot.',
            });

            return false;
        }

        try {
            this.stopPolling();

            const direction = params.direction;
            const contractType =
                getContractType(direction);

            this.setState({
                status: 'PURCHASING',
                direction,
                market: params.market,
                stake,
                currentStake: stake,
                duration,
                contractId: null,
                lastResult: null,
                profit: null,
                error: null,
            });

            const token = api_base.token;

            if (!token) {
                throw new Error(
                    'No authorized trading token is available.',
                );
            }

            /*
             * Reuse the existing MONEHUNT DBot TradeEngine.
             * No second API/WebSocket connection is created.
             */
            this.tradeEngine.init(token, {
                symbol: params.market,
                contractTypes: [
                    'RUNHIGH',
                    'RUNLOW',
                ],
                candleInterval: 60,
                shouldRestartOnError: true,
                nativeOudDirectPurchase: true,
                timeMachineEnabled: false,
            });

            if (this.tradeEngine.startPromise) {
                await this.tradeEngine.startPromise;
            }

            /*
             * Native OUD uses direct purchase only.
             * Set this before TradeEngine.start(), because start()
             * immediately evaluates proposal requirements.
             */
            this.tradeEngine.start({
                amount: stake,
                currency: this.currency,
                duration,
                duration_unit: 't',
                basis: 'stake',
            });

            await this.tradeEngine.watch('before');

            /*
             * PAUSE / STOP must prevent a new purchase.
             * An already-purchased contract is allowed to finish.
             */
            if (
                requireRunning &&
                this.state.lifecycle !== 'RUNNING'
            ) {
                this.setState({
                    status: 'WAITING',
                });

                return false;
            }

            const beforeState =
                this.tradeEngine.store?.getState?.();

            if (
                beforeState &&
                beforeState.scope !==
                    'BEFORE_PURCHASE'
            ) {
                throw new Error(
                    `OUD TradeEngine did not reach BEFORE_PURCHASE. Scope: ${beforeState.scope}`,
                );
            }

            const beforeContractId =
                this.tradeEngine.contractId;

            if (beforeContractId) {
                throw new Error(
                    `TradeEngine already has active contract ${beforeContractId}.`,
                );
            }

            /*
             * Final pre-purchase lifecycle gate.
             * Do not enter a trade after PAUSE / STOP.
             */
            if (
                requireRunning &&
                this.state.lifecycle !== 'RUNNING'
            ) {
                this.setState({
                    status: 'WAITING',
                });

                return false;
            }

            await this.tradeEngine.purchase(
                contractType,
            );

            const contractId =
                this.tradeEngine.contractId;

            if (!contractId) {
                throw new Error(
                    `Purchase returned without a contract_id for ${contractType}.`,
                );
            }

            /*
             * Consume the scanner signal only after Deriv
             * has confirmed a real contract_id.
             */
            const live = this.getLive();
            const liveSnapshot =
                live?.getSnapshot();

            const consumedCycleId = Number(
                liveSnapshot?.signalCycleId,
            );

            if (
                consumeScannerSignal &&
                live &&
                Number.isFinite(consumedCycleId) &&
                consumedCycleId > 0 &&
                consumedCycleId >
                    this.lastConsumedSignalCycleId
            ) {
                live.consumeSignal();

                this.lastConsumedSignalCycleId =
                    consumedCycleId;
            }

            this.setState({
                status: 'CONTRACT_ACTIVE',
                contractId: String(contractId),
            });

            this.startContractWatcher();

            return true;
        } catch (error) {
            this.stopPolling();

            const message =
                error instanceof Error
                    ? error.message
                    : String(error);

            console.error(
                '[OUD EXECUTION] failed:',
                error,
            );

            this.setState({
                status: 'ERROR',
                error: message,
                contractId: null,
            });

            return false;
        }
    }

    reset() {
        /*
         * Never reset away an active purchased contract.
         * The real Deriv contract must finish first.
         */
        if (
            this.state.status === 'PURCHASING' ||
            this.state.status === 'CONTRACT_ACTIVE'
        ) {
            this.setState({
                error:
                    'Reset is unavailable while a contract is active.',
            });

            return false;
        }

        this.stopPolling();
        this.lastSeenSignalCycleId = 0;
        this.lastConsumedSignalCycleId = 0;
        this.signalExecutionInFlight = false;

        this.setState({
            lifecycle: 'STOPPED',
            status: 'WAITING',
            direction: null,
            contractId: null,
            lastResult: null,
            profit: null,
            recoveryLevel: 0,
            currentStake:
                this.state.baseStake,
            stake:
                this.state.baseStake,
            error: null,
            tradeHistory: [],
            totalTrades: 0,
            wins: 0,
            losses: 0,
            totalProfit: 0,
            winRate: 0,
        });

        return true;
    }

    destroy() {
        this.stopPolling();
        this.stopSignalMonitoring();
        this.lastSeenSignalCycleId = 0;
        this.lastConsumedSignalCycleId = 0;
        this.signalExecutionInFlight = false;
        this.listeners.clear();
    }
}

export default OUDExecutionController;
