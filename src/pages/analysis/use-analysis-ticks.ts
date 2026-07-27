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



        let ws: WebSocket | null = null;



        ws = new WebSocket(
            'wss://ws.derivws.com/websockets/v3?app_id=1089'
        );



        ws.onopen = ()=>{


            console.log(
                "D CIRCLES REQUEST SYMBOLS"
            );


            ws?.send(JSON.stringify({

                active_symbols:"brief"

            }));


        };





        ws.onmessage = (message)=>{


            const data = JSON.parse(
                message.data
            );



console.log(
    "D CIRCLES FULL RESPONSE",
    JSON.stringify(data, null, 2)
);




            // Handle Deriv errors

            if(data.error){


                console.log(
                    "D CIRCLES DERIV ERROR",
                    data.error.message
                );


                return;

            }







            // Receive available symbols first

            if(data.active_symbols){



          const valid =
          data.active_symbols.find(
            (s:any)=>
                s.symbol === market ||
                s.display_name === market ||
                s.symbol.includes(market)
);
          console.log(
             "AVAILABLE MARKETS",
              data.active_symbols.map(
               (s:any)=>s.symbol
               )
);



                console.log(
                    "D CIRCLES SYMBOL CHECK",
                    market,
                    valid
                );




                if(valid){


                    console.log(
                        "D CIRCLES SYMBOL FOUND",
                        valid
                    );



                    ws?.send(JSON.stringify({


                        ticks:market,

                        subscribe:1


                    }));


                }
                else{


                    console.log(
                        "D CIRCLES SYMBOL NOT FOUND",
                        market
                    );


                }



                return;

            }








            // Ignore messages without ticks

            if(!data.tick){


                console.log(
                    "D CIRCLES NO TICK",
                    data
                );


                return;

            }







            // Process live tick

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





            console.log(
                "D CIRCLES TICK",
                {
                    quote,
                    digit
                }
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







        ws.onerror = (error)=>{


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