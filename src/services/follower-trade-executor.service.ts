import { followerDerivConnection } 
from './follower-deriv-connection.service';

import { CopyTrade } 
from './copy-trading/types';
import { copyTradingStore }
from '@/stores/copy-trading-store';



class FollowerTradeExecutor {


async execute(
    followerId:number,
    trade:CopyTrade
){


    const follower =
    copyTradingStore.followers.find(

        f =>
        f.id === followerId

    );



    if(!follower){


        console.log(

            "FOLLOWER NOT FOUND",

            followerId

        );


        return;


    }




    if(follower.status !== "active"){


        console.log(

            "FOLLOWER NOT ACTIVE - TRADE BLOCKED",

            {
                followerId,
                status:follower.status
            }

        );


        return;


    }





    const api =
    followerDerivConnection
    .getConnection(followerId);



    if(!api){

        console.log(
            "FOLLOWER NOT CONNECTED",
            followerId
        );

        return;

    }



    const proposal =
    await api.proposal({

        amount:
        trade.amount,

        basis:
        trade.basis,

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

    });



    if(proposal.error){

        console.log(
            "FOLLOWER PROPOSAL ERROR",
            proposal.error
        );

        return;

    }



    const buy =
    await api.buy({

        buy:
        proposal.proposal.id,

        price:
        trade.amount

    });



    console.log(
        "FOLLOWER COPIED TRADE",
        {
            followerId,
            buy
        }
    );

}



}


export const followerTradeExecutor =
new FollowerTradeExecutor();