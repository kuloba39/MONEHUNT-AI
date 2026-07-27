import { useEffect, useState } from 'react';

type Market = {
    symbol:string;
    display_name:string;
};



export const useActiveMarkets = () => {


    const [markets,setMarkets] = useState<Market[]>([]);



    useEffect(()=>{


        const loadMarkets = async()=>{


            try {


                const api =
                (window as any)
                .ApiHelpers
                ?.instance;



                const activeSymbols =
                api?.active_symbols;



                if(!activeSymbols){

                    console.log(
                        "D CIRCLES ACTIVE SYMBOL SERVICE NOT READY"
                    );

                    return;

                }



                const symbols =
                await activeSymbols
                .retrieveActiveSymbols(true);




                console.log(
                    "D CIRCLES REAL SYMBOLS",
                    symbols
                );




                const clean =
                symbols.map((item:any)=>({


                    symbol:
                    item.symbol,


                    display_name:
                    item.display_name ||
                    item.symbol



                }));




                setMarkets(clean);



            } catch(error){


                console.log(
                    "D CIRCLES MARKET ERROR",
                    error
                );


            }


        };




        loadMarkets();



    },[]);




    return markets;


};