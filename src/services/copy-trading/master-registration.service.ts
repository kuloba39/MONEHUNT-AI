import { copyTradingStore } from "../../stores/copy-trading-store";


export interface MasterRegistrationData {

    derivAccountId:string;

    username?:string;

    country?:string;

}


class MasterRegistrationService {


    async registerMasterTrader(
        data:MasterRegistrationData
    ){

        if(
            !data.derivAccountId
        ){

            throw new Error(
                "Deriv account ID required"
            );

        }


        const masterTrader = {

            account_id:
                data.derivAccountId,

            name:
                data.username ||
                "Anonymous Trader",

            country:
                data.country ||
                "Unknown"

        };


        const registeredMaster =
            await copyTradingStore.registerMaster(
                masterTrader
            );


        console.log(
            "MASTER TRADER REGISTERED",
            registeredMaster
        );


        return registeredMaster;

    }


}


export const masterRegistrationService =
    new MasterRegistrationService();