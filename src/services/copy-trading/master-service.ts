import {
    getMasters
} from "@/services/copy-trading/copy-storage";


import type {
    MasterTrader
} from "@/types/copy-trading";



export function listMasters(): MasterTrader[] {


    return getMasters();


}



export function findMaster(
    id:string
):MasterTrader | undefined {


    const masters =
        getMasters();


    return masters.find(
        master =>
            master.id === id
    );


}