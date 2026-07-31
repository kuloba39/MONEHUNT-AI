import { makeAutoObservable } from "mobx";
import { followerDerivConnection } from "@/services/follower-deriv-connection.service";
import { followerTradeExecutor } from "@/services/follower-trade-executor.service";
import { marketplaceService } from "@/services/copy-trading/marketplace.service";



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

    account_id:string;

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


    masters:MasterTrader[] = [];

    followers:Follower[] = [];

    activeCopies:any[] = [];

    trades:CopiedTrade[] = [];




        constructor(){

    makeAutoObservable(this);

    this.loadMastersFromServer();

    this.loadFollowers();

}






    /*
        MASTER STORAGE
    */


    saveMasters(){


        localStorage.setItem(

            "copy_trading_masters",

            JSON.stringify(
                this.masters
            )

        );


    }
async loadMastersFromServer(){

    try{

        const masters =
            await marketplaceService.getMasters();


        this.masters =
            masters;


        localStorage.setItem(
            "copy_trading_masters",
            JSON.stringify(masters)
        );


        console.log(
            "GLOBAL MARKETPLACE LOADED",
            masters
        );


    }
    catch(error){

        console.log(
            "MARKETPLACE SERVER ERROR",
            error
        );


        this.loadMasters();

    }

}






    loadMasters(){


        try{


            const saved =
            localStorage.getItem(
                "copy_trading_masters"
            );



            if(saved){


                this.masters =
                JSON.parse(saved);


            }



        }catch(error){


            console.error(
                "LOAD MASTERS FAILED",
                error
            );


        }


    }






    /*
        FOLLOWER STORAGE
    */


    saveFollowers(){


        localStorage.setItem(

            "copy_trading_followers",

            JSON.stringify(
                this.followers
            )

        );


    }






    loadFollowers(){


        try{


            const saved =
            localStorage.getItem(
                "copy_trading_followers"
            );



            if(saved){


                this.followers =
                JSON.parse(saved);


            }



        }catch(error){


            console.error(
                "LOAD FOLLOWERS FAILED",
                error
            );


        }


    }






    /*
        CHECK DUPLICATES

        One Deriv account
        = one registration
    */


    isFollowerRegistered(
        account_id:string
    ){


        return this.followers.some(

            follower =>

            follower.account_id === account_id

        );


    }





    isMasterRegistered(
        account_id:string
    ){


        return this.masters.some(

            master =>

            master.account_id === account_id

        );


    }
    /*
        MASTER REGISTRATION

        Creates marketplace trader
        No API token stored
    */


    async registerMaster(data:any){


        if(
            data.account_id &&
            this.isMasterRegistered(
                data.account_id
            )
        ){

            console.log(
                "MASTER ACCOUNT ALREADY REGISTERED",
                data.account_id
            );

            return false;

        }





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
            "Global",


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
            Number(
                data.balance || 0
            ),


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





        await marketplaceService.registerMaster(
    master
);


await this.loadMastersFromServer();



        console.log(
            "MASTER REGISTERED",
            master
        );



        return master;


    }









    /*
        FOLLOWER REGISTRATION

        User pastes own Deriv token
        Account is verified first
    */


    async addFollower(
        follower:Follower
    ){



        if(
            this.isFollowerRegistered(
                follower.account_id
            )
        ){

            console.log(
                "FOLLOWER ACCOUNT ALREADY REGISTERED",
                follower.account_id
            );


            return false;


        }






        const connection =

        await followerDerivConnection.connect(

            follower.id,

            follower.deriv_token

        );






        if(!connection){


            console.log(
                "FOLLOWER TOKEN INVALID",
                follower.account_id
            );


            return false;


        }






        this.followers.push(

            follower

        );



        this.saveFollowers();





        console.log(

            "FOLLOWER REGISTERED",

            follower

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

        this.getMaster(
            masterId
        );




        if(!master){


            console.log(
                "MASTER NOT FOUND"
            );


            return false;


        }






        const alreadyFollowing =

        this.activeCopies.some(

            copy =>

            copy.masterId === masterId &&

            copy.followerId === followerId

        );






        if(alreadyFollowing){


            console.log(
                "ALREADY FOLLOWING MASTER"
            );


            return false;


        }






        master.followers++;






        this.activeCopies.push({


            masterId,


            followerId,


            enabled:true


        });






        console.log(

            "MASTER FOLLOWED",

            {
                masterId,
                followerId
            }

        );






        return true;



    }





    /*
        MASTER SENDS TRADE

        Receives trade from
        Purchase.js copy engine
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

            copy =>

            copy.masterId === trade.master_id &&

            copy.enabled

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
        EXECUTE COPIED TRADE

        Sends trade to follower account
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

                "FOLLOWER ACCOUNT PAUSED"

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
    Number(
        amount.toFixed(2)
    ),


    basis:
    follower.copy_percentage
    ? "stake"
    : trade.basis,


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
    trade.barrier,


    timestamp:
    Date.now()


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

            {

                follower:

                follower.account_id,


                trade

            }

        );



    }









    /*
        GET MASTER
    */


    getMaster(

        id:number

    ){


        return this.masters.find(

            master =>

            master.id === id

        );


    }









    /*
        GET FOLLOWERS OF MASTER
    */


    getFollowers(

        masterId:number

    ){


        return this.followers.filter(

            follower =>

            follower.master_id === masterId &&

            follower.status === "active"

        );


    }









    /*
        MARKETPLACE DATA

        Used by copy-trading.tsx
    */


    getMarketplaceMasters(){


        return this.masters.filter(

            master =>

            master.status === "active"

        );


    }









getMarketplaceTraders(){

    return (this.masters || [])

        .filter(

            master =>
            master.status === "active"

        )

        .map(

            master => ({


                id:
                master.id,


                name:
                master.name,


                avatar:
                master.avatar,


                country:
                master.country,


                strategy:
                master.strategy,


                profit:
                master.roi,


                monthlyProfit:
                master.monthlyProfit,


                roi:
                master.roi,


                winRate:
                master.winRate,


                totalTrades:
                master.totalTrades,


                wins:
                master.wins,


                losses:
                master.losses,


                drawdown:
                master.drawdown,


                followers:
                master.followers,


                risk:
                master.risk,


                status:
                master.status,


                verified:
                master.verified,


                experience:
                master.experience,


                markets:
                master.markets || [],


                contracts:
                master.contracts || [],


                profitHistory:
                master.profitHistory || [],


                tradeHistory:
                master.tradeHistory || [],


                copySettings:
                master.copySettings || {}

            })

        );


}
    getMasterById(

        id:number

    ){

        return this.masters.find(

            master =>

            master.id === id

        );

    }


}


export const copyTradingStore =
new CopyTradingStore();


(globalThis as any).copyTradingStore =
copyTradingStore;