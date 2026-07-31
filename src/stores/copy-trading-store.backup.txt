import { makeAutoObservable } from 'mobx';
import { api_base } from '@/external/bot-skeleton/services/api/api-base';

export interface CopySettings {

    amount: number;

    risk: 'Low' | 'Medium' | 'High';

    autoCopy: boolean;

    stopLoss: number;

    takeProfit: number;

}


export interface TradeHistoryItem {

    contract: string;

    stake: string;

    profit: string;

    result: 'WIN' | 'LOSS';

    time: string;

}
export interface CopySettings {

    amount: number;

    risk: 'Low' | 'Medium' | 'High';

    autoCopy: boolean;

    stopLoss: number;

    takeProfit: number;

}


export interface Trader {

    id: number;

    name: string;

    profit: string;

    winRate: string;

    followers: number;

    risk: string;

    status?: 'active' | 'offline';

    copiedAmount?: number;

    avatar: string;

    country: string;

    strategy: string;

    totalTrades: number;

    wins: number;

    losses: number;

    drawdown: string;

    monthlyProfit: string;

profitHistory: number[];

tradeHistory: TradeHistoryItem[];
copySettings?: CopySettings;

}



class CopyTradingStore {
    activeCopies: {
    traderId:number;
    enabled:boolean;
    amount:number;
    risk:string;
    stopLoss:number;
    takeProfit:number;
}[] = [];

    traders: Trader[] = [


        {
    id: 1,
    name: 'AI Alpha Trader',
    profit: '+$1,245',
    winRate: '82%',
    followers: 324,
    risk: 'LOW',
    status: 'active',

    avatar: '🤖',

    country: 'Kenya',

    strategy: 'Digit Over/Under',

    totalTrades: 1543,

    wins: 1265,

    losses: 278,

    drawdown: '8%',

    monthlyProfit: '+$624',
    copySettings: {

    amount: 10,

    risk: 'Low',

    autoCopy: true,

    stopLoss: 50,

    takeProfit: 100,

},
    tradeHistory: [

    {
        contract: 'Digit Over 5',
        stake: '$10',
        profit: '+$8.20',
        result: 'WIN',
        time: '09:15'
    },

    {
        contract: 'Digit Under 4',
        stake: '$10',
        profit: '+$8.50',
        result: 'WIN',
        time: '09:22'
    },

    {
        contract: 'Even',
        stake: '$10',
        profit: '-$10',
        result: 'LOSS',
        time: '09:31'
    }

],
    profitHistory: [
    120,
    240,
    310,
    450,
    520,
    610,
    740,
    830,
    910,
    1040,
    1170,
    1245
],
},



        {
    id: 2,
    name: 'Smart Digit Hunter',
    profit: '+$860',
    winRate: '76%',
    followers: 189,
    risk: 'MEDIUM',
    status: 'active',

    avatar: '📈',

    country: 'South Africa',

    strategy: 'Even/Odd Strategy',

    totalTrades: 987,

    wins: 750,

    losses: 237,

    drawdown: '12%',

    monthlyProfit: '+$418',
    copySettings: {

    amount: 10,

    risk: 'Low',

    autoCopy: true,

    stopLoss: 50,

    takeProfit: 100,

},
    tradeHistory: [

    {
        contract: 'Digit Over 5',
        stake: '$10',
        profit: '+$8.20',
        result: 'WIN',
        time: '09:15'
    },

    {
        contract: 'Digit Under 4',
        stake: '$10',
        profit: '+$8.50',
        result: 'WIN',
        time: '09:22'
    },

    {
        contract: 'Even',
        stake: '$10',
        profit: '-$10',
        result: 'LOSS',
        time: '09:31'
    }

],
    profitHistory: [
    80,
    120,
    170,
    250,
    330,
    390,
    470,
    560,
    640,
    710,
    790,
    860
],
},



        {
    id: 3,
    name: 'Quantum Signals',
    profit: '+$2,430',
    winRate: '88%',
    followers: 512,
    risk: 'LOW',
    status: 'active',

    avatar: '🚀',

    country: 'Nigeria',

    strategy: 'AI Pattern Detection',

    totalTrades: 2231,

    wins: 1963,

    losses: 268,

    drawdown: '6%',

    monthlyProfit: '+$1,103',

copySettings: {

    amount: 20,

    risk: 'Low',

    autoCopy: true,

    stopLoss: 100,

    takeProfit: 200,

},
    tradeHistory: [

    {
        contract: 'Digit Over 5',
        stake: '$10',
        profit: '+$8.20',
        result: 'WIN',
        time: '09:15'
    },

    {
        contract: 'Digit Under 4',
        stake: '$10',
        profit: '+$8.50',
        result: 'WIN',
        time: '09:22'
    },

    {
        contract: 'Even',
        stake: '$10',
        profit: '-$10',
        result: 'LOSS',
        time: '09:31'
    }

],
    profitHistory: [
    250,
    430,
    620,
    810,
    990,
    1180,
    1360,
    1590,
    1820,
    2050,
    2230,
    2430
],
},


    ];



    copiedTraders: Trader[] = [];



    constructor() {

        makeAutoObservable(this);

    }



    copyTrader(trader: Trader) {


        const exists =
            this.copiedTraders.some(
                item => item.id === trader.id
            );


        if (!exists) {


            this.copiedTraders.push({

    ...trader,

    copiedAmount: 0,

    copySettings: {

        amount: 10,

        risk: 'Low',

        autoCopy: true,

        stopLoss: 50,

        takeProfit: 100

    }

});


            this.incrementFollowers(trader.id);


        }


    }





    removeTrader(id:number) {


        this.copiedTraders =
            this.copiedTraders.filter(
                trader => trader.id !== id
            );


    }





    incrementFollowers(id:number) {


        const trader =
            this.traders.find(
                item => item.id === id
            );


        if(trader){

            trader.followers += 1;

        }


    }





    getTraderById(id:number) {


        return this.traders.find(
            trader => trader.id === id
        );


    }
getTrader(id:number) {

    return this.traders.find(
        trader => trader.id === id
    );

}





    isFollowing(id:number) {


        return this.copiedTraders.some(
            trader => trader.id === id
        );


    }
updateCopySettings(
    id:number,
    settings:CopySettings
) {


    const trader =
        this.copiedTraders.find(
            item => item.id === id
        );


    if(trader){

        trader.copySettings = settings;

    }


}



startCopy(
    traderId:number,
    settings:CopySettings
){


    const exists =
        this.activeCopies.some(

            item =>
            item.traderId === traderId

        );


    if(exists){

        return;

    }



    this.activeCopies.push({

        traderId,

        enabled:true,

        amount:settings.amount,

        risk:settings.risk,

        stopLoss:settings.stopLoss,

        takeProfit:settings.takeProfit,

    });



    console.log(
        "COPY STARTED",
        this.activeCopies
    );
console.log(
    "ACTIVE COPIES JSON",
    JSON.stringify(this.activeCopies, null, 2)
);


}



stopCopy(
    traderId:number
){


    this.activeCopies =
        this.activeCopies.filter(

            item =>
            item.traderId !== traderId

        );


    console.log(
        "COPY STOPPED",
        traderId
    );


}



async executeCopiedTrade(
    traderId:number,
    trade:any
){


   const copy =
    this.activeCopies.find(
        item => item.traderId === traderId
    );


if(!copy){
    console.log("NO ACTIVE COPY");
    return;
}


if(!copy.enabled){
    return;
}


console.log(
    "COPY EXECUTION START",
    {
        traderId,
        trade,
        stake:copy.amount
    }
);



if(!api_base.api){

    console.log(
        "API NOT CONNECTED"
    );

    return;

}



const proposalRequest = {

    proposal:1,

    amount:copy.amount,

    basis:"stake",

    contract_type:trade.contract_type,

    currency:"USD",

    duration:trade.duration ?? 1,

    duration_unit:trade.duration_unit ?? "t",

    symbol:trade.symbol,

    barrier:trade.barrier

};



console.log(
    "COPY PROPOSAL",
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



if(!proposal || !proposal.proposal?.id){

    console.log(
        "NO PROPOSAL ID"
    );

    return;

}



const buy:any =
    await api_base.api.send({
        buy: proposal.proposal.id,
        price: copy.amount
    });



console.log(
    "COPIED TRADE BOUGHT",
    buy
);


}

}


export const copyTradingStore =
    new CopyTradingStore();


console.log(
    "COPY STORE LOADED",
    copyTradingStore
);


(globalThis as any).copyTradingStore = copyTradingStore;