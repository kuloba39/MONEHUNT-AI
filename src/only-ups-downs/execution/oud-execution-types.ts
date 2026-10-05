export type OUDDirection = 'UP' | 'DOWN';

export type OUDDirectionMode = 'UP' | 'DOWN' | 'BOTH';

export type OUDStrategyMode =
    | 'REVERSAL'
    | 'CONTINUATION'
    | 'BOTH';

export type OUDLifecycleStatus =
    | 'RUNNING'
    | 'PAUSED'
    | 'STOPPED';

export type OUDExecutionStatus =
    | 'WAITING'
    | 'SIGNAL_READY'
    | 'PURCHASING'
    | 'CONTRACT_ACTIVE'
    | 'WON'
    | 'LOST'
    | 'ERROR';

export interface OUDTradeRecord {
    id: number;
    timestamp: string;
    direction: OUDDirection;
    stake: number;
    result: 'WIN' | 'LOSS';
    profit: number | null;
    contractId: string | null;
}

export interface OUDExecutionState {
    lifecycle: OUDLifecycleStatus;
    status: OUDExecutionStatus;

    direction: OUDDirection | null;
    market: string;

    /*
     * User configuration.
     */
    directionMode: OUDDirectionMode;
    strategyMode: OUDStrategyMode;
    martingaleEnabled: boolean;
    martingaleMultiplier: number;
    maxMartingaleLevel: number;

    /*
     * Stake tracking.
     *
     * baseStake = user's configured starting stake.
     * stake = actual stake used for the current/last trade.
     */
    baseStake: number;
    stake: number;
    currentStake: number;

    duration: number;
    recoveryLevel: number;

    contractId: string | null;
    lastResult: string | null;
    profit: number | null;
    error: string | null;

    /*
     * Cumulative performance.
     * These are independent of the 10-trade display history.
     */
    totalTrades: number;
    wins: number;
    losses: number;
    totalProfit: number;
    winRate: number;

    tradeHistory: OUDTradeRecord[];
}

export interface OUDExecuteParams {
    direction: OUDDirection;
    market: string;
    stake: number;
    duration: number;
}
