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


        let ws:WebSocket | null = null;



        ws = new WebSocket(
            'wss://ws.derivws.com/websockets/v3?app_id=1089'
        );



        ws.onopen = ()=>{


            console.log(
                "D CIRCLES ACTIVE MARKET:",
                market
            );


            ws?.send(JSON.stringify({

                ticks: market,
                subscribe: 1

            }));


        };





        ws.onmessage = (message)=>{


            const data = JSON.parse(
                message.data
            );



            // Handle Deriv errors
            if(data.error){

                console.log(
                    "D CIRCLES ERROR:",
                    data.error.message
                );

                return;

            }




            // Ignore non tick messages
            if(!data.tick){

                return;

            }




            const quote = Number(
                data.tick.quote
            );



            if(!quote){

                return;

            }




            const digit = Number(

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

                    epoch:data.tick.epoch

                }


            ]);



        };






        ws.onerror = ()=>{


            console.log(
                "D CIRCLES SOCKET ERROR"
            );


        };






        return ()=>{


            if(ws){


                ws.close(
                    1000,
                    "Market changed"
                );


            }


        };



    },[market]);





    return ticks;


};