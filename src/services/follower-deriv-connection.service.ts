import DerivAPIBasic from '@deriv/deriv-api/dist/DerivAPIBasic';
import { getSocketURL } from '@/components/shared';


class FollowerDerivConnection {


    connections = new Map<number, any>();



   async connect(
    followerId:number,
    token:string
){

    try {

        const wsURL =
        await getSocketURL();

        const socket =
        new WebSocket(wsURL);

        const api =
        new DerivAPIBasic({
            connection:socket
        });

        const auth:any =
        await api.authorize(
            token
        );

        if(auth?.error){

            console.error(
                "FOLLOWER AUTH FAILED",
                auth.error
            );

            return null;
        }

        this.connections.set(
            followerId,
            api
        );

        console.log(
            "FOLLOWER ACCOUNT CONNECTED",
            followerId
        );

        return api;

    } catch(error){

        console.error(
            "FOLLOWER CONNECTION ERROR",
            error
        );

        return null;
    }

}





    getConnection(
        followerId:number
    ){

        return this.connections.get(
            followerId
        );

    }





    disconnect(
        followerId:number
    ){

        const api =
        this.connections.get(
            followerId
        );


        if(api?.connection){

            api.connection.close();

        }


        this.connections.delete(
            followerId
        );


        console.log(
            "FOLLOWER DISCONNECTED",
            followerId
        );


    }





    pause(
        followerId:number
    ){

        console.log(
            "COPY PAUSED",
            followerId
        );

    }


}



export const followerDerivConnection =
new FollowerDerivConnection();