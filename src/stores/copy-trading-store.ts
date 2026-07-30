import { makeAutoObservable } from "mobx";
import { api_base } from "@/external/bot-skeleton/services/api/api-base";


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

    deriv_token:string;


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

    status:"OPEN" | "WIN" | "LOSS";

}




class CopyTradingStore {

activeCopies:any[] = [];


get traders(){

return this.masters;

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





addFollower(
follower:Follower
){

this.followers.push(
follower
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
copy.traderId,
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
    traderId:number,
    trade:CopiedTrade
){

const copy =
this.activeCopies.find(
item=>item.traderId===traderId
);


if(!copy){

console.log(
"NO ACTIVE COPY",
traderId
);

return;

}


if(!api_base.api){

console.log(
"API NOT CONNECTED"
);

return;

}



const proposalRequest = {

proposal:1,

amount:
copy.amount,

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



const proposal:any =
await api_base.api.send(
proposalRequest
);



console.log(
"COPY PROPOSAL RESPONSE",
proposal
);



if(
!proposal?.proposal?.id
){

console.log(
"NO PROPOSAL ID"
);

return;

}



const buy:any =
await api_base.api.send({

buy:
proposal.proposal.id,

price:
copy.amount

});



console.log(
"COPIED TRADE BOUGHT",
buy
);


}





}



export const copyTradingStore =
new CopyTradingStore();


(globalThis as any).copyTradingStore =
copyTradingStore;