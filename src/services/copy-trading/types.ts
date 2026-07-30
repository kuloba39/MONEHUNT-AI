export interface CopyTrade {

    contract_type:string;

    symbol:string;

    amount:number;

    duration:number;

    duration_unit:string;

    barrier?:string;

    basis:string;

    currency:string;

    timestamp:number;

}


export interface CopyFollower {

    id:number;

    token:string;

    multiplier:number;

    active:boolean;

}