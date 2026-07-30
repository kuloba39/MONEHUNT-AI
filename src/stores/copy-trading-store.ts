import { makeAutoObservable } from "mobx";
import { api_base } from "@/external/bot-skeleton/services/api/api-base";
import { followerTradeExecutor } 
from '@/services/follower-trade-executor.service';
import { followerDerivConnection }
from '@/services/follower-deriv-connection.service';


export interface TradeHistoryItem {

    contract: string;

    stake: string;

    profit: string;

    result: 'WIN' | 'LOSS';

    time: string;

}

export interface MasterTrader {

    id:number;

    name:string;

    roi:string;

    followers:number;

    balance:number;

    status:"active" | "offline";


    profitHistory:number[];

    tradeHistory:TradeHistoryItem[];

}

export interface Follower {

    id:number;

    user_id:number;

    master_id:number;

    deriv_token:string;

    copy_percentage:number;

    max_stake:number;

    status:"active" | "paused";

}


export interface CopiedTrade {

    trade_id:string;

    master_id:number;

    symbol:string;

    contract_type:string;

    stake:number;

    duration:number;

    barrier?:string;

    time:string;

    currency:string;

    basis:string;

}




class CopyTradingStore {

activeCopies:any[] = [];


get traders(){

return this.masters;

}


registerMaster(data:any){

const trader:MasterTrader = {


id:
Date.now(),


name:
data.name,


roi:
"0%",


followers:
0,


balance:
0,


status:
"active",


deriv_token:"",


profitHistory:
[],


tradeHistory:[]


};


this.masters.push(trader);


console.log(
"NEW MASTER REGISTERED",
trader
);


}




copiedTraders:MasterTrader[] = [];


masters:MasterTrader[]=[


{
id:1,
name:"John Forex",
roi:"+45%",
followers:132,
balance:1000,
status:"active",
deriv_token:"",

profitHistory:[
10,
25,
40,
55,
70
],

tradeHistory:[
{
contract:"DIGITOVER",
stake:"10",
profit:"8.5",
result:"WIN",
time:"10:30"
}
]

},


{
id:2,
name:"AI Alpha Trader",
roi:"+35%",
followers:84,
balance:2500,
status:"active",
deriv_token:"",

profitHistory:[
5,
20,
35,
60,
90
],

tradeHistory:[
{
contract:"DIGITUNDER",
stake:"15",
profit:"12",
result:"WIN",
time:"11:00"
}
]

}


];



followers:Follower[]=[];


trades:CopiedTrade[]=[];




constructor(){

makeAutoObservable(this);

}





async addFollower(
follower:Follower
){

this.followers.push(
follower
);


const api =
await followerDerivConnection.connect(
    follower.id,
    follower.deriv_token
);


if(!api){

console.log(
"FOLLOWER CONNECTION FAILED",
follower.id
);

return;

}



console.log(
"FOLLOWER READY FOR COPYING",
follower.id
);


}





removeFollower(id:number){

this.followers =
this.followers.filter(
item=>item.id!==id
);

}





getMaster(id:number){

return this.masters.find(
item=>item.id===id
);

}
  getTraderById(id:number){

  return this.traders.find(
  trader=>trader.id===id
  );

  }


  getTrader(id:number){

  return this.traders.find(
  trader=>trader.id===id
  );

  }
isFollowing(
id:number
){

return this.copiedTraders.some(
item=>item.id===id
);

}





followTrader(
masterId:number
){

const master =
this.getMaster(masterId);


if(master){

master.followers++;

}


}
copyTrader(
trader:MasterTrader
){

if(
this.isFollowing(trader.id)
){

return;

}


this.copiedTraders.push(
trader
);


this.activeCopies.push({

traderId:trader.id,

amount:10,

enabled:true

});



followerDerivConnection.connect(

    trader.id,

    trader.deriv_token

);



console.log(
"TRADER COPIED",
trader
);


}





calculateStake(

masterStake:number,

masterBalance:number,

followerBalance:number

){

return Number(
(
masterStake *
followerBalance /
masterBalance
).toFixed(2)
);


}





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

this.activeCopies.forEach(
copy => {

if(copy.enabled){

this.executeCopiedTrade(
copy.followerId,
trade
);

}

}
);

}





getFollowers(masterId:number){

return this.followers.filter(

item=>
item.master_id===masterId &&
item.status==="active"

);


}
async executeCopiedTrade(
    followerId:number,
    trade:CopiedTrade
)
{

const copy =
this.activeCopies.find(
item =>
item.followerId === traderId ||
item.traderId === traderId
);

if(!copy){

console.log(
"NO ACTIVE COPY FOR FOLLOWER",
{
traderId,
activeCopies:this.activeCopies
}
);

return;

}

console.log(
"COPY FOUND",
copy
);const follower =
this.followers.find(
item=>item.followerId===followerId
);

if(!follower){

console.log(
"FOLLOWER PROFILE NOT FOUND"
);

return;

}

if(
follower.status !== "active"
){

console.log(
"FOLLOWER PAUSED",
follower.id
);

return;

}

if(!api_base.api){

console.log(
"API NOT CONNECTED"
);

return;

}


let followerStake =
trade.stake *
(follower.copy_percentage / 100);



if(
followerStake > follower.max_stake
){

followerStake =
follower.max_stake;

}


const proposalRequest = {

proposal:1,

amount:
Number(
followerStake.toFixed(2)
),

basis:"stake",

contract_type:
trade.contract_type,

currency:"USD",

duration:
trade.duration ?? 1,

duration_unit:"t",

symbol:
trade.symbol,

barrier:
trade.barrier

};



console.log(
"COPY PROPOSAL REQUEST",
proposalRequest
);



await followerTradeExecutor.execute(
    traderId,
    {
        amount: copy.amount,
        basis:"stake",
        contract_type: trade.contract_type,
        currency:"USD",
        duration: trade.duration ?? 1,
        duration_unit:"t",
        symbol: trade.symbol,
        barrier: trade.barrier
    }
);

console.log(
    "COPY TRADE EXECUTION COMPLETE",
    traderId
);


}
masterApplications:any[] = [];


registerMasterTrader(data:any){

const master:MasterTrader = {

id:Date.now(),

name:data.name,

roi:"+0%",

followers:0,

balance:0,

status:"active",

deriv_token:data.deriv_token,

profitHistory:[],

tradeHistory:[]

};


this.masters.push(
master
);


console.log(
"NEW MASTER TRADER REGISTERED",
master
);


return master;

}





}



export const copyTradingStore =
new CopyTradingStore();


(globalThis as any).copyTradingStore =
copyTradingStore;