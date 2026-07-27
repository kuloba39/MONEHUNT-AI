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



        let subscription:any;



        const connect = async()=>{


            try {


                const api =
                (window as any)
                .ApiHelpers
                ?.instance;



                const ws =
                api?.ws;



                if(!ws){


                    console.log(
                        "D CIRCLES API NOT READY"
                    );

                    return;

                }




                console.log(
                    "D CIRCLES USING APP SOCKET",
                    market
                );




                const request = {

                    ticks: market,

                    subscribe:1

                };





                ws.send(
                    JSON.stringify(request)
                );





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




                    if(!data.tick){

                        return;

                    }





                    const quote =
                    Number(
                        data.tick.quote
                    );




                    const digit =
                    Number(
                        String(
                            quote
                        )
                        .replace('.','')
                        .slice(-1)
                    );




                    setTicks(prev=>[


                        ...prev.slice(-99),


                        {

                            digit,

                            quote,

                            epoch:
                            data.tick.epoch

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





            } catch(error){


                console.log(
                    "D CIRCLES CONNECT ERROR",
                    error
                );


            }



        };




        connect();




        return ()=>{


            if(subscription){


                subscription();

            }


        };




    },[market]);





    return ticks;


};