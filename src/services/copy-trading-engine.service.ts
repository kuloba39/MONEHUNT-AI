import {
leaderTradeMonitor
}
from './leader-trade-monitor.service';


import {
followerTradeExecutor
}
from './follower-trade-executor.service';



import {
CopyFollower
}
from './copy-trading/types';



class CopyTradingEngine {


followers:CopyFollower[]=[];



start(){

leaderTradeMonitor
.addListener(
async(trade)=>{


for(const follower of this.followers){


if(
!follower.active
)
continue;



await followerTradeExecutor.execute(
follower.id,
{
...trade,
amount:
trade.amount *
follower.multiplier
}
);


}


});


}



addFollower(
follower:CopyFollower
){

this.followers.push(
follower
);


}


}


export const copyTradingEngine =
new CopyTradingEngine();