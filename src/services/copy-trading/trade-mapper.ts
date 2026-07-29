import type { CopyTrade } from "./types";


export function mapTrade(
    trade:any
):CopyTrade {


    return {

        symbol:
        trade.symbol,

        contract_type:
        trade.contract_type,

        amount:
        Number(trade.amount || trade.price || 1),

        duration:
        Number(trade.duration || 1),

        duration_unit:
        trade.duration_unit || "t",

        barrier:
        trade.barrier,

        prediction:
        trade.barrier

    };


}