import { useEffect, useState } from 'react';


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


            const api =
            (window as any)
            .ApiHelpers
            ?.instance;



            if(!api?.ws){


                console.log(
                    "D CIRCLES WAITING FOR API"
                );


                return false;

            }




            const ws = api.ws;



            console.log(
                "D CIRCLES CONNECTED THROUGH MAIN SOCKET",
                market
            );



            ws.send(JSON.stringify({

                ticks:market,

                subscribe:1

            }));





            ws.onmessage = (event:any)=>{


                const data =
                JSON.parse(
                    event.data
                );



                if(data.error){

                    console.log(
                        "D CIRCLES ERROR",
                        data.error.message
                    );

                    return;

                }




                if(!data.tick) return;




                const quote =
                Number(
                    data.tick.quote
                );




                const digit =
                Number(
                    String(quote)
                    .replace('.','')
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
                    "D CIRCLES TICK",
                    {
                        market,
                        quote,
                        digit
                    }
                );


            };



            return true;


        };





        interval = setInterval(()=>{


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