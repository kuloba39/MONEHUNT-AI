import { DerivAPIBasic } from '@deriv/deriv-api';


export class FollowerClient {

    api:any = null;

    token:string;


    constructor(token:string){

        this.token = token;

    }



    async connect(){

        const connection =
        new WebSocket(
            "wss://ws.derivws.com/websockets/v3?app_id=YOUR_APP_ID"
        );


        this.api =
        new DerivAPIBasic({
            connection
        });


        const response =
        await this.api.authorize(
            this.token
        );


        console.log(
            "FOLLOWER AUTHORIZED",
            response
        );


        return response;

    }



    async buy(proposalId:string, price:number){

        if(!this.api){
            throw new Error(
                "Follower not connected"
            );
        }


        return await this.api.buy({
            buy: proposalId,
            price
        });

    }

}