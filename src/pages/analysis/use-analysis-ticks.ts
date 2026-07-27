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
        "D CIRCLES ACTIVE MARKET:",
        market
    );


    ws.send(JSON.stringify({
        forget_all:"ticks"
    }));


    ws.send(JSON.stringify({

        ticks: market,
        subscribe: 1

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



            if(data.error){

            console.log(
            "D CIRCLES DERIV ERROR",
                data.error.message
                );

    return;

};


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

                        epoch:data.tick.epoch
                    }

                ]);

            }   // closes if(data.tick)


        };      // closes ws.onmessage



        ws.onerror=(error)=>{

            console.log(
                "D CIRCLES ERROR",
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