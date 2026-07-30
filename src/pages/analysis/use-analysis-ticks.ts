import { useEffect, useState } from 'react';
import { api_base } from '@/external/bot-skeleton/services/api/api-base';


type TickData = {
    digit:number;
    quote:string;
    epoch:number;
    market:string;
};



export const useAnalysisTicks = (

    market:string,

    analysisTicks:number = 1000

) => {



const STORAGE_KEY = `d_circles_ticks_${market}`;



const [ticks,setTicks] = useState<TickData[]>(()=>{


    try {


        const saved =
        localStorage.getItem(STORAGE_KEY);


        if(saved){

            return JSON.parse(saved);

        }


    } catch(error){

        console.log(
            "D CIRCLES CACHE ERROR",
            error
        );

    }


    return [];

});




const tickLimit = Math.min(
    5000,
    Math.max(
        100,
        analysisTicks
    )
);





/*
    UNIVERSAL DERIV DIGIT EXTRACTION

    Keeps trailing zeros.

    Example:

    123.230
    pip_size 3

    becomes

    123.230

    last digit = 0
*/

const extractDigit = (
    quote:any,
    pipSize:number
)=>{


    const formatted =

    Number(quote)

    .toFixed(pipSize);



    const clean =

    formatted.replace(".","");



    return Number(
        clean.slice(-1)
    );


};







useEffect(()=>{


if(!market) return;



let api:any = null;

let subscription:any = null;

let subscriptionId:string|null = null;

let interval:any;



const start = ()=>{


api = api_base;



if(!api?.api){

console.log(
"D CIRCLES API NOT READY"
);

return false;

}




const activeMarket =

market === "GLOBAL"

?

"R_100"

:

market;



console.log(
"D CIRCLES CONNECTED",
activeMarket
);





/*
    LOAD HISTORY
*/


api.api.send({

ticks_history:
activeMarket,

count:
tickLimit,

end:
"latest",

style:
"ticks"

})
.then((history:any)=>{


if(!history?.history?.prices)
return;



const prices =
history.history.prices;


const times =
history.history.times;



const historicalTicks =

prices.map(
(price:any,index:number)=>{


const pipSize =

history.pip_size ??
2;



const digit =

extractDigit(
price,
pipSize
);



return {

digit,

quote:

String(price),

epoch:

times[index],

market

};



});



setTicks(
historicalTicks
);



localStorage.setItem(

STORAGE_KEY,

JSON.stringify(
historicalTicks
)

);



console.log(

"D CIRCLES HISTORY LOADED",

historicalTicks.length

);



});








/*
    LIVE TICKS
*/


subscription =

api.api

.onMessage()

.subscribe(({data}:any)=>{



if(data.error){

console.log(
"D CIRCLES ERROR",
data.error
);

return;

}



if(data.subscription){

subscriptionId =
data.subscription.id;

}




if(!data.tick)
return;





const rawQuote =

String(
data.tick.quote
);



const pipSize =

data.tick.pip_size ?? 2;




const digit =

extractDigit(
rawQuote,
pipSize
);



console.log(

"LIVE DIGIT",

{

quote:rawQuote,

pipSize,

digit

}

);






const newTick:TickData = {


digit,

quote:

rawQuote,

epoch:

data.tick.epoch,

market


};





setTicks(prev=>{



let updated = [

...prev,

newTick

];



/*
    Keep newest 5000
*/

updated =

updated

.sort(
(a,b)=>
a.epoch-b.epoch
)

.slice(-5000);





localStorage.setItem(

STORAGE_KEY,

JSON.stringify(updated)

);



return updated;


});




});







api.api.send({

ticks:

activeMarket,

subscribe:

1

});




return true;


};





interval =

setInterval(()=>{


if(start()){

clearInterval(interval);

}


},1000);






return ()=>{


if(subscription){

subscription.unsubscribe();

}



if(

subscriptionId &&
api?.api

){

api.api.send({

forget:

subscriptionId

});

}



if(interval){

clearInterval(interval);

}



};



},[market,tickLimit]);








/*
    GLOBAL VIEW
*/


if(market==="GLOBAL"){

return ticks;

}




return ticks.filter(

tick=>

tick.market===market

);



};