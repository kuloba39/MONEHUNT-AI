import { useEffect, useState } from 'react';
import ApiHelpers from '@/external/bot-skeleton/services/api/api-helpers';
import { api_base } from '@/external/bot-skeleton/services/api/api-base';

type TickData = {
    digit:number;
    quote:number;
    epoch:number;
};



export const useAnalysisTicks = (market:string) => {


    const [ticks,setTicks] = useState<TickData[]>([]);



    useEffect(()=>{


        if(!market) return;


        let interval:any;



       const start = ()=>{


    const api = api_base;


    if(!api){

        console.log(
            "D CIRCLES API BASE NOT READY"
        );

        return false;

    }



    const ws = api.api;



    if(!ws){

        console.log(
            "D CIRCLES MAIN SOCKET NOT READY",
            api
        );

        return false;

    }



    console.log(
        "D CIRCLES CONNECTED MAIN API SOCKET",
        market
    );



    ws.send({

    ticks: market,

    subscribe:1

});




    const subscription =
api.api.onMessage()
.subscribe(({data}:any)=>{
if(subscription){

    subscription.unsubscribe();

}


        if(data.error){

            console.log(
                "D CIRCLES ERROR",
                data.error.message
            );

            return;

        }



        if(!data.tick){

            return;

        }



        const quote =
        Number(
            data.tick.quote
        );



        const digit =
        Number(
            quote
            .toFixed(2)
            .replace(".","")
            .slice(-1)
        );



        setTicks(prev=>[

            ...prev.slice(-99),

            {

                digit,

                quote,

                epoch:data.tick.epoch

            }

        ]);



        console.log(
            "D CIRCLES CLEAN TICK",
            {
                market,
                quote,
                digit
            }
        );


    });



    return true;


};



        interval=setInterval(()=>{


            if(start()){

                clearInterval(interval);

            }


        },1000);




        return ()=>{


            if(interval){

                clearInterval(interval);

            }


        };



    },[market]);




    return ticks;


};