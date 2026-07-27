import { useEffect, useState } from 'react';


type TickData = {

    digit:number;
    quote:number;
    epoch:number;

};



export const useAnalysisTicks = (market:string) => {


    const [ticks,setTicks] = useState<TickData[]>([]);



    useEffect(()=>{


        let ws:WebSocket;



        ws = new WebSocket(
            'wss://ws.derivws.com/websockets/v3?app_id=1089'
        );



        ws.onopen = ()=>{


            console.log(
                "D CIRCLES CONNECTED",
                market
            );



            ws.send(JSON.stringify({

                ticks:market,
                subscribe:1

            }));


        };





        ws.onmessage = (message)=>{


            const data =
            JSON.parse(
                message.data
            );



            console.log(
                "D CIRCLES DATA",
                data
            );



            if(data.tick){


                const quote =
                Number(
                    data.tick.quote
                );



                const digit =
                Number(
                    quote
                    .toFixed(2)
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

            }



        };




        ws.onerror=(error)=>{


            console.log(
                "D CIRCLES ERROR",
                error
            );


        };




        return ()=>{


            if(ws){

                ws.close();

            }


        };



    },[market]);



    return ticks;



};