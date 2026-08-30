import { getSocketURL } from '@/components/shared';


class FollowerDerivConnection {


    connections = new Map<number, any>();


    async connect(
        followerId:number,
        token:string
    ){

        try {

            console.log(
                "CONNECTING FOLLOWER DERIV",
                followerId
            );


            /*
                getSocketURL() already performs the
                authenticated Options API WebSocket
                URL flow.

                The returned URL contains the
                short-lived OTP.

                Therefore we MUST NOT call
                api.authorize(token) again.
            */

            const wsURL =
                await getSocketURL();


            if(!wsURL){

                console.error(
                    "FOLLOWER CONNECTION FAILED - NO WS URL",
                    followerId
                );

                return null;

            }


            console.log(
                "FOLLOWER AUTHENTICATED WS URL OBTAINED",
                followerId
            );


            const socket =
                new WebSocket(wsURL);


            await new Promise<void>((resolve, reject) => {

                const timeout =
                    window.setTimeout(() => {

                        reject(
                            new Error(
                                "Follower WebSocket connection timeout"
                            )
                        );

                    }, 15000);


                socket.onopen = () => {

                    window.clearTimeout(
                        timeout
                    );

                    console.log(
                        "FOLLOWER WEBSOCKET OPEN",
                        followerId
                    );

                    resolve();

                };


                socket.onerror = () => {

                    window.clearTimeout(
                        timeout
                    );

                    reject(
                        new Error(
                            "Follower WebSocket connection error"
                        )
                    );

                };


                socket.onclose = () => {

                    console.log(
                        "FOLLOWER WEBSOCKET CLOSED",
                        followerId
                    );

                };

            });


            this.connections.set(
                followerId,
                socket
            );


            console.log(
                "FOLLOWER ACCOUNT CONNECTED",
                followerId
            );


            return socket;


        } catch(error){

            console.error(
                "FOLLOWER CONNECTION ERROR",
                followerId,
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

        const connection =
            this.connections.get(
                followerId
            );


        if(connection){

            try {

                connection.close();

            } catch(error){

                console.error(
                    "FOLLOWER DISCONNECT ERROR",
                    followerId,
                    error
                );

            }

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
