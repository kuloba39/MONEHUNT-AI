import { copyTradingStore } from "@/stores/copy-trading-store";
import { followerTradeExecutor } from "@/services/follower-trade-executor.service";


export interface CopyRequest {

    masterId:number;

    followerId:number;

    enabled?:boolean;

}



class FollowerCopyService {


    startCopy(
        request:CopyRequest
    ){


        const master =
            copyTradingStore.getMaster(
                request.masterId
            );


        if(!master){

            throw new Error(
                "Master trader not found"
            );

        }



        const follower =
            copyTradingStore.followers.find(
                f =>
                f.id === request.followerId
            );



        if(!follower){

            throw new Error(
                "Follower account not found"
            );

        }



        copyTradingStore.followMaster(

            request.masterId,

            request.followerId

        );



        console.log(
            "COPY STARTED",
            {
                master:
                request.masterId,

                follower:
                request.followerId
            }
        );



        return {

            success:true,

            master,

            follower

        };


    }





    stopCopy(

        masterId:number,

        followerId:number

    ){



        const copy =
            copyTradingStore.activeCopies.find(

                c =>

                c.masterId === masterId &&

                c.followerId === followerId

            );



        if(copy){

            copy.enabled=false;

        }



        console.log(

            "COPY STOPPED",

            {
                masterId,
                followerId
            }

        );


        return true;


    }





    async copyTrade(

        followerId:number,

        trade:any

    ){



        const follower =

            copyTradingStore.followers.find(

                f =>
                f.id===followerId

            );



        if(!follower){

            console.log(
                "FOLLOWER DOES NOT EXIST"
            );

            return false;

        }



        let amount =

            trade.stake *

            (

                (follower.settings?.copy_percentage ?? 100) / 100

            );



        if(

            amount >

            follower.settings?.max_stake ?? Number.MAX_SAFE_INTEGER

        ){

            amount =
                follower.settings?.max_stake ?? Number.MAX_SAFE_INTEGER;

        }




        await followerTradeExecutor.execute(

            follower.id,

            {

                amount:

                    Number(
                        amount.toFixed(2)
                    ),


                basis:"stake",


                contract_type:

                    trade.contract_type,


                currency:

                    trade.currency,


                duration:

                    trade.duration,


                duration_unit:"t",


                symbol:

                    trade.symbol,


                barrier:

                    trade.barrier,



                timestamp:

                    Date.now()



            }

        );



        console.log(

            "FOLLOWER COPY TRADE SENT",

            {
                followerId,
                amount
            }

        );



        return true;


    }




    getActiveCopies(){


        return copyTradingStore.activeCopies.filter(

            c=>c.enabled

        );


    }



}



export const followerCopyService =

    new FollowerCopyService();





