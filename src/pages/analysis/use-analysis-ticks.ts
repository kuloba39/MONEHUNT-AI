import { useEffect, useState } from 'react';
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
        let api:any = null;
        let subscription:any = null;
        let subscriptionId:string | null = null;



        const start = ()=>{


            api = api_base;


            if(!api){

                console.log(
                    "D CIRCLES API BASE NOT READY"
                );

                return false;

            }



            if(!api.api){

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



            subscription =
            api.api.onMessage()
            .subscribe(({data}:any)=>{


                if(data.error){

                    console.log(
                        "D CIRCLES ERROR",
                        data.error.message
                    );

                    return;

                }



                if(data.subscription){

                    subscriptionId =
                    data.subscription.id;


                    console.log(
                        "D CIRCLES SUB ID",
                        market,
                        subscriptionId
                    );

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



            api.api.send({

                ticks: market,
                subscribe:1

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

                    forget: subscriptionId

                });


                console.log(
                    "D CIRCLES FORGOT SUBSCRIPTION",
                    subscriptionId
                );

            }



            if(interval){

                clearInterval(interval);

            }


        };



    },[market]);



    return ticks;


};