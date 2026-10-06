export type OUDDirection = 'UP' | 'DOWN';

export type OUDDirectionMode = 'UP' | 'DOWN' | 'BOTH';

export type OUDStrategyMode =
    | 'REVERSAL'
    | 'CONTINUATION'
    | 'BOTH';


export type OUDTradeStrategy =
    | 'REVERSAL'
    | 'CONTINUATION'
    | 'MANUAL';
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

/*
 * ============================================================
 * NATIVE OUD EXECUTION ARCHITECTURE
 * ============================================================
 *
 * These types separate:
 *
 *   1. USER CONFIGURATION
 *   2. SCANNER SIGNAL
 *   3. ACTIVE TRADE
 *   4. TRADE RESULT
 *
 * The active trade direction is immutable once created.
 */

/**
 * Exact scanner signal accepted by the execution layer.
 *
 * signalCycleId comes directly from the OUD scanner.
 * One cycle represents one READY signal lifecycle.
 */
export interface OUDSignal {
    signalCycleId: number;
    direction: OUDDirection;
    strategy: Exclude<OUDStrategyMode, 'BOTH'>;
    market: string;
    confidence: number | null;
    timestamp: number;
}

/**
 * Immutable trade snapshot created from one OUDSignal.
 *
 * Once this object exists, its direction must never be
 * replaced by a later scanner update.
 */
export interface OUDActiveTrade {
    tradeId: number;
    signalCycleId: number;
    direction: OUDDirection;
    strategy: OUDTradeStrategy;
    market: string;
    stake: number;
    duration: number;
    contractType: 'RUNHIGH' | 'RUNLOW';
    contractId: string | null;
}

/**
 * Final result of one active trade.
 *
 * Direction comes from the immutable active trade,
 * never from the current scanner state.
 */
export interface OUDTradeResult {
    tradeId: number;
    signalCycleId: number;
    direction: OUDDirection;
    strategy: OUDTradeStrategy;
    market: string;
    result: 'WIN' | 'LOSS';
    profit: number | null;
    contractId: string | null;
    timestamp: string;
}
