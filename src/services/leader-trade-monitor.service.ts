import { CopyTrade } from './copy-trading/types';


class LeaderTradeMonitor {


    private listeners:
    Array<(trade:CopyTrade)=>void> = [];



    addListener(
        callback:(trade:CopyTrade)=>void
    ){

        this.listeners.push(callback);

    }





    emitTrade(
        trade:CopyTrade
    ){

        console.log(
            "LEADER TRADE DETECTED",
            trade
        );


        this.listeners.forEach(
            cb=>cb(trade)
        );

    }



}


export const leaderTradeMonitor =
new LeaderTradeMonitor();