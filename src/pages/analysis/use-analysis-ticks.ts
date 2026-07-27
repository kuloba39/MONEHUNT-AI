import { useEffect, useState } from 'react';
import ApiHelpers from '@/external/bot-skeleton/services/api/api-helpers';


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


            const api = ApiHelpers.instance;



            if(!api){

                console.log(
                    "D CIRCLES API NOT READY"
                );

                return false;

            }



            const ws =
                api.ws ||
                api.api;



            if(!ws){

                console.log(
                    "D CIRCLES SOCKET NOT READY",
                    api
                );

                return false;

            }



            console.log(
                "D CIRCLES CONNECTED MAIN SOCKET",
                market
            );



            ws.send(JSON.stringify({

                ticks:market,
                subscribe:1

            }));



            ws.onMessage?.().subscribe(({data}:any)=>{


                const response =
                typeof data === "string"
                ? JSON.parse(data)
                : data;



                if(response.error){

                    console.log(
                        "D CIRCLES ERROR",
                        response.error.message
                    );

                    return;

                }



                if(!response.tick){

                    return;

                }



                const quote =
                Number(
                    response.tick.quote
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

                        epoch:
                        response.tick.epoch

                    }

                ]);



                console.log(
                    "D CIRCLES TICK",
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