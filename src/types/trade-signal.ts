export type SignalStatus =
    | "pending"
    | "executed"
    | "failed";


export interface TradeSignal {

    id: string;


    masterId: string;


    symbol: string;


    contractType:
        | "DIGITOVER"
        | "DIGITUNDER"
        | "DIGITEVEN"
        | "DIGITODD"
        | "DIGITMATCH"
        | "DIGITDIFF"
        | "CALL"
        | "PUT";


    prediction?: number;


    barrier?: string;


    stake: number;


    timestamp: number;


    status: SignalStatus;


    followersExecuted: number;

}