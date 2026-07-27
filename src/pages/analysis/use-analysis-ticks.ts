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

                ticks: market,
                subscribe:1

            }));


        };





        ws.onmessage = (event)=>{


            const data = JSON.parse(
                event.data
            );



            console.log(
                "D CIRCLES RAW",
                data
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





            const quote = Number(
                data.tick.quote
            );




            const digit = Number(

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





        ws.onerror=(error)=>{


            console.log(
                "D CIRCLES SOCKET ERROR",
                error
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