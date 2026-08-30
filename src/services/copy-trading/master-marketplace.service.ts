import { copyTradingStore } from "@/stores/copy-trading-store";


export interface MasterRegistrationData {

    name:string;

    account_id:string;

    balance?:number;

}



class MasterMarketplaceService {



    registerMaster(
        data:MasterRegistrationData
    ){


        if(!data.account_id){

            throw new Error(
                "Deriv account ID required"
            );

        }



        const master =
        copyTradingStore.registerMaster({

            name:data.name,

            account_id:data.account_id,

            balance:data.balance || 0

        });



        console.log(
            "MASTER ADDED TO MARKETPLACE",
            master
        );



        return master;


    }





    getMarketplace(){


        return (
            copyTradingStore.getMarketplaceMasters()
        );


    }





    getMaster(
        id:number
    ){


        return (
            copyTradingStore.getMaster(id)
        );


    }





    deactivateMaster(
        id:number
    ){


        const master =
        copyTradingStore.getMaster(id);



        if(master){

            master.status="offline";

        }



        console.log(
            "MASTER REMOVED FROM MARKETPLACE",
            id
        );


    }





    activateMaster(
        id:number
    ){


        const master =
        copyTradingStore.getMaster(id);



        if(master){

            master.status="active";

        }



        console.log(
            "MASTER RETURNED TO MARKETPLACE",
            id
        );


    }



}



export const masterMarketplaceService =
new MasterMarketplaceService();
