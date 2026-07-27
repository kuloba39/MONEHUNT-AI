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


        const connect = () => {

            ws = new WebSocket(
                'wss://ws.derivws.com/websockets/v3?app_id=1089'
            );


            ws.onopen = () => {


                ws.send(JSON.stringify({

                    ticks:market,
                    subscribe:1

                }));


            };



            ws.onmessage = (msg)=>{


                const data = JSON.parse(msg.data);



                if(data.tick){


                    const quote =
                    data.tick.quote;



                    const digit =
                    Number(
                        String(quote)
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

                }


            };


        };



        connect();



        return ()=>{

            if(ws){

                ws.close();

            }

        };


    },[market]);



    return ticks;


};