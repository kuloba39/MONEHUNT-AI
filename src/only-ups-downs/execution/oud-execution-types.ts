export type OUDDirection = 'UP' | 'DOWN';

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
    stake: number;
    duration: number;
    recoveryLevel: number;
    contractId: string | null;
    lastResult: string | null;
    profit: number | null;
    error: string | null;
    tradeHistory: OUDTradeRecord[];
}

export interface OUDExecuteParams {
    direction: OUDDirection;
    market: string;
    stake: number;
    duration: number;
}
