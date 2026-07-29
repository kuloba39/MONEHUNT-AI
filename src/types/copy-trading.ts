export type AccountRole =
    | "master"
    | "follower";


export interface DerivAccount {

    id: string;

    loginid: string;

    currency: string;

    email?: string;

    role: AccountRole;

    connectedAt: number;

}



export interface MasterTrader {

    id: string;

    accountId: string;

    displayName: string;

    followers: number;

    totalProfit: number;

    winRate: number;

    status:
        | "active"
        | "paused";

}



export interface CopyRelationship {

    id: string;

    masterId: string;

    followerAccountId: string;

    status:
        | "active"
        | "paused";


    settings: {

        stakeMode:
            | "fixed"
            | "percentage";


        fixedStake?: number;


        percentage?: number;


        maxDailyLoss: number;

    };

}