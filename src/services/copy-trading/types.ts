export interface CopyTrade {
    symbol: string;
    contract_type: string;
    amount: number;
    duration: number;
    duration_unit: string;
    barrier?: string;
    prediction?: string | number;
}


export interface FollowerAccount {
    token: string;
    loginid?: string;
    account_type?: "demo" | "live";
    connected: boolean;
}


export interface CopyStatus {
    running: boolean;
    copiedTrades: number;
    lastTrade?: CopyTrade;
}