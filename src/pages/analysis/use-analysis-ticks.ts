import { useEffect, useState } from 'react';
import { api_base } from '@/external/bot-skeleton/services/api/api-base';


type TickData = {

    digit:number;

    quote:number;

    epoch:number;

    market:string;

};



export const useAnalysisTicks = (

    market:string,

    analysisTicks:number = 1000

) => {



    /*
        GLOBAL D CIRCLES MEMORY

        Same storage for all markets.
    */

    const STORAGE_KEY = 'd_circles_global_ticks';



    const [ticks,setTicks] = useState<TickData[]>(()=>{


        try {


            const saved =

            localStorage.getItem(
                STORAGE_KEY
            );


            if(saved){

                return JSON.parse(saved);

            }


        } catch(error){


            console.log(
                "D CIRCLES CACHE LOAD ERROR",
                error
            );


        }


        return [];

    });





    const tickLimit = Math.min(

        1000,

        Math.max(

            100,

            analysisTicks

        )

    );





    useEffect(()=>{


        if(!market) return;



        let interval:any;

        let api:any = null;

        let subscription:any = null;

        let subscriptionId:string|null = null;





        const start = ()=>{


            api = api_base;



            if(!api?.api){


                console.log(
                    "D CIRCLES API NOT READY"
                );


                return false;

            }





            console.log(

                "D CIRCLES CONNECTED",

                market

            );







            subscription =

            api.api

            .onMessage()

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


                }







                if(!data.tick){

                    return;

                }







                const quote =

                Number(

                    data.tick.quote

                );





                const pipSize =

data.tick.pip_size ?? 2;


const digit =

Number(

    quote

    .toFixed(pipSize)

    .replace(".","")

    .slice(-1)

);







                 console.log(
                     "TICK PAYLOAD",
                  data.tick
                   );

                setTicks(prev => {





                    const newTick:TickData = {


                        digit,


                        quote,


                        epoch:

                        data.tick.epoch,


                        market


                    };







                    let updated = [

                        ...prev,

                        newTick

                    ];









                    /*
                        BALANCE ALL MARKETS

                        Keep maximum 100 ticks
                        from each market.
                    */



                    const marketGroups:

                    Record<string,TickData[]> = {};







                    updated.forEach(tick=>{


                        if(!marketGroups[tick.market]){


                            marketGroups[tick.market]=[];


                        }



                        marketGroups[tick.market]

                        .push(tick);



                    });









                    updated =

                    Object.values(marketGroups)

                    .flatMap(group=>{


                        return group

                        .sort(

                            (a,b)=>

                            a.epoch-b.epoch

                        )

                        .slice(-100);


                    });









                    /*
                        GLOBAL MEMORY

                        Keep latest 1000 ticks.
                    */



                    updated =

                    updated

                    .sort(

                        (a,b)=>

                        a.epoch-b.epoch

                    )

                    .slice(-tickLimit);









                    localStorage.setItem(

                        STORAGE_KEY,

                        JSON.stringify(updated)

                    );








                    console.log(

                        "D CIRCLES MEMORY",

                        {

                            total:

                            updated.length,


                            markets:

                            [

                                ...new Set(

                                    updated.map(

                                        x=>x.market

                                    )

                                )

                            ]

                        }

                    );







                    return updated;





                });








                console.log(

                    "D CIRCLES TICK",

                    {

                        market,

                        quote,

                        digit

                    }

                );




            });









            const activeMarket =
             market === 'GLOBAL'
             ? 'R_100'
             : market;


            api.api.send({

             ticks: activeMarket,

                subscribe: 1

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








    if (market === 'GLOBAL') {
    return ticks;
}

return ticks.filter(
    tick => tick.market === market
);



};