import { FollowerClient } from "./follower-client";
import { mapTrade } from "./trade-mapper";


class CopyEngine {


    follower:
    FollowerClient | null = null;


    running:boolean = false;


    copiedTrades:number = 0;



    async connectFollower(
        token:string
    ){

        this.follower =
        new FollowerClient(token);


        await this.follower.connect();


        console.log(
            "COPY FOLLOWER READY"
        );

    }



    start(){

        this.running = true;


        console.log(
            "COPY TRADING STARTED"
        );

    }



    stop(){

        this.running = false;


        console.log(
            "COPY TRADING STOPPED"
        );

    }



    async copyTrade(
        trade:any
    ){

        if(!this.running)
            return;


        if(!this.follower)
            return;



        const mapped =
        mapTrade(trade);



        console.log(
            "COPYING TRADE",
            mapped
        );


        this.copiedTrades++;


    }

}



export const copyEngine =
new CopyEngine();