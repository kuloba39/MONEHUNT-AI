import { makeAutoObservable } from "mobx";
import { followerDerivConnection } from "@/services/follower-deriv-connection.service";
import { followerTradeExecutor } from "@/services/follower-trade-executor.service";



export interface MasterTrader {

    id:number;

    name:string;

    avatar:string;

    country:string;

    strategy:string;

    profit:string;

    monthlyProfit:string;

    roi:string;

    winRate:string;

    totalTrades:number;

    wins:number;

    losses:number;

    drawdown:string;

    risk:string;

    followers:number;

    balance:number;

    account_id:string;

    experience:string;

    markets:string[];

    contracts:string[];

    status:
    "active" |
    "offline";

    verified:boolean;

    createdAt:number;

    profitHistory:number[];

    tradeHistory:any[];

    copySettings:any;

}




export interface Follower {


    id:number;

    user_id:number;

    master_id:number;

    deriv_token:string;

    copy_percentage:number;

    max_stake:number;

    status:
    "active" |
    "paused";

}




export interface CopiedTrade {


    trade_id:string;

    master_id:number;


    symbol:string;


    contract_type:string;


    amount:number;


    duration:number;


    duration_unit:string;


    barrier?:string;


    currency:string;


    basis:string;


    timestamp:number;


}




class CopyTradingStore {


    masters:MasterTrader[]=[];


    followers:Follower[]=[];


    activeCopies:any[]=[];


    trades:CopiedTrade[]=[];



    constructor(){

        makeAutoObservable(this);

    }





    /*
        MASTER REGISTRATION

        Any verified Deriv real account
        can become a marketplace master.

        No API token stored.
    */

    registerMaster(data:any){


        const master:MasterTrader = {

    id:
    Date.now(),


    name:
    data.name ||
    "Anonymous Trader",


    avatar:
    data.avatar ||
    "👤",


    country:
    data.country ||
    "Unknown",


    strategy:
    data.strategy ||
    "Deriv Trading Strategy",


    profit:
    "0%",


    monthlyProfit:
    "0%",


    roi:
    "0%",


    winRate:
    "0%",


    totalTrades:
    0,


    wins:
    0,


    losses:
    0,


    drawdown:
    "0%",


    risk:
    data.risk ||
    "Medium",


    followers:
    0,


    balance:
    data.balance ||
    0,


    account_id:
    data.account_id ||
    "",


    experience:
    data.experience ||
    "",


    markets:
    data.markets ||
    [],


    contracts:
    data.contracts ||
    [],


    status:
    "active",


    verified:
    true,


    createdAt:
    Date.now(),


    profitHistory:
    [],


    tradeHistory:
    [],


    copySettings:
    {}

};



        this.masters.push(
            master
        );



        console.log(
            "MASTER TRADER REGISTERED",
            master
        );



        return master;

    }





    /*
        FOLLOWER CONNECTS USING
        THEIR OWN DERIV TOKEN
    */


    async addFollower(
        follower:Follower
    ){


        this.followers.push(
            follower
        );



        const connection =
        await followerDerivConnection.connect(
            follower.id,
            follower.deriv_token
        );



        if(!connection){


            console.log(
                "FOLLOWER CONNECTION FAILED",
                follower.id
            );


            return false;

        }




        console.log(
            "FOLLOWER READY",
            follower.id
        );



        return true;


    }







    /*
        FOLLOW MASTER
    */


    followMaster(
        masterId:number,
        followerId:number
    ){


        const master =
        this.getMaster(masterId);



        if(!master){

            console.log(
                "MASTER NOT FOUND"
            );

            return;

        }



        master.followers++;



        this.activeCopies.push({

            masterId,

            followerId,

            enabled:true

        });



        console.log(
            "FOLLOW SUBSCRIBED",
            {
                masterId,
                followerId
            }
        );


    }







    /*
        MASTER SENDS TRADE
    */


    receiveMasterTrade(
        trade:CopiedTrade
    ){


        this.trades.push(
            trade
        );



        console.log(
            "MASTER TRADE RECEIVED",
            trade
        );




        const copies =
        this.activeCopies.filter(
            c =>
            c.masterId === trade.master_id &&
            c.enabled
        );



        copies.forEach(
            copy => {


                this.executeCopiedTrade(
                    copy.followerId,
                    trade
                );


            }
        );


    }








    /*
        EXECUTE TRADE ON FOLLOWER ACCOUNT
    */


    async executeCopiedTrade(
        followerId:number,
        trade:CopiedTrade
    ){



        const follower =
        this.followers.find(
            f =>
            f.id === followerId
        );



        if(!follower){


            console.log(
                "FOLLOWER NOT FOUND"
            );


            return;

        }




        if(
            follower.status !== "active"
        ){

            console.log(
                "FOLLOWER PAUSED"
            );


            return;

        }






        let amount =
    trade.amount *
    (
        follower.copy_percentage / 100
    );





        if(
    amount >
    follower.max_stake
){

    amount =
    follower.max_stake;

}





        const request = {

    amount:
        Number(amount.toFixed(2)),

    basis:
        "stake",


            contract_type:
            trade.contract_type,


            currency:
            trade.currency,


            duration:
            trade.duration,


            duration_unit:
    trade.duration_unit,


            symbol:
            trade.symbol,


            barrier:
            trade.barrier


        };





        console.log(
            "COPY TRADE REQUEST",
            request
        );





        await followerTradeExecutor.execute(

            follower.id,

            request

        );





        console.log(
            "COPIED TRADE EXECUTED",
            follower.id
        );



    }








    getMaster(
        id:number
    ){


        return this.masters.find(
            m =>
            m.id===id
        );


    }






    getFollowers(
        masterId:number
    ){


        return this.followers.filter(

            f =>
            f.master_id===masterId &&
            f.status==="active"

        );


    }





        getMarketplaceMasters(){

        return this.masters.filter(
            m =>
            m.status==="active"
        );

    }


    getMasterById(id:number){

        return this.masters.find(
            m => m.id === id
        );

    }
getMarketplaceTraders(){

    return this.masters.map(master => ({

        id: master.id,

        name: master.name,

        avatar:"👤",

        country:"Global",

        strategy:"Deriv Strategy",

        profit:master.roi,

        monthlyProfit:"0%",

        winRate:"0%",

        totalTrades:master.profitHistory.length,

        wins:0,

        losses:0,

        drawdown:"0%",

        followers:master.followers,

        risk:"Medium",

        status:master.status,

        profitHistory:master.profitHistory,

        tradeHistory:[],

        copySettings:{}

    }));

}


}





export const copyTradingStore =
new CopyTradingStore();



(globalThis as any).copyTradingStore =
copyTradingStore;