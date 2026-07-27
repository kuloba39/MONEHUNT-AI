import { useEffect, useState } from 'react';


type Market = {

    symbol:string;
    name:string;

};



export const useActiveMarkets = ()=>{


    const [markets,setMarkets] = useState<Market[]>([]);



    useEffect(()=>{


        const ws = new WebSocket(
            'wss://ws.derivws.com/websockets/v3?app_id=1089'
        );



        ws.onopen = ()=>{


            ws.send(JSON.stringify({

                active_symbols:"brief"

            }));


        };



        ws.onmessage = (msg)=>{


            const data = JSON.parse(
                msg.data
            );



            if(data.active_symbols){


                const list =
                data.active_symbols
                .filter(
                    (item:any)=>
                    item.exchange_is_open
                )
                .map(
                    (item:any)=>({

                        symbol:item.symbol,

                        name:item.display_name

                    })
                );



                console.log(
                    "D CIRCLES MARKETS",
                    list
                );


                setMarkets(list);


            }


        };



        return ()=>{

            ws.close();

        };


    },[]);



    return markets;


};