import DerivAPIBasic from "@deriv/deriv-api/dist/DerivAPIBasic";
import { getSocketURL } from "@/components/shared";


class FollowerVerificationService {


    async verify(token:string){


        try{


            const api = new DerivAPIBasic({

                app_id:
                process.env.NEXT_PUBLIC_DERIV_APP_ID || "",

                connection:
                new WebSocket(
                    getSocketURL()
                )

            });



            await api.authorize(
                token
            );



            const account =
            await api.account();



            if(!account || account.error){


                console.log(
                    "ACCOUNT VERIFICATION FAILED",
                    account
                );


                return null;


            }




            const authorize =
            account.authorize;



            if(!authorize){


                console.log(
                    "NO AUTHORIZE RESPONSE"
                );


                return null;


            }





            return {


                verified:true,


                account_id:
                authorize.loginid,


                balance:
                authorize.balance,


                currency:
                authorize.currency,


                account_type:

                authorize.loginid.startsWith("VRT")
                ?
                "Demo"
                :
                "Real"


            };





        }
        catch(error){


            console.log(

                "FOLLOWER VERIFICATION ERROR",

                error

            );


            return null;


        }


    }


}



export const followerVerificationService =
new FollowerVerificationService();