import { copyTradingStore } from "../../stores/copy-trading-store";


export interface MasterRegistrationData {
    derivAccountId: string;
    username?: string;
    country?: string;
}


class MasterRegistrationService {


    async registerMasterTrader(
        data: MasterRegistrationData
    ) {

        if (!data.derivAccountId) {
            throw new Error(
                "Deriv account ID required"
            );
        }


        const masterTrader = {

            id:
                crypto.randomUUID(),

            derivAccountId:
                data.derivAccountId,


            username:
                data.username ||
                "Anonymous Trader",


            country:
                data.country ||
                "Unknown",


            status:
                "ACTIVE",


            followers:
                0,


            createdAt:
                Date.now()

        };


        copyTradingStore.getState()
            .addMasterTrader(
                masterTrader
            );


        console.log(
            "MASTER TRADER REGISTERED",
            masterTrader
        );


        return masterTrader;

    }


}


export const masterRegistrationService =
    new MasterRegistrationService();