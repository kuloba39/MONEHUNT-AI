import { useState } from "react";
import { copyTradingStore } from "@/stores/copy-trading-store";
import { useNavigate } from "react-router-dom";
import './follower-connect-page.scss';


const FollowerConnectPage = () => {


    const navigate = useNavigate();


    const [token,setToken] = useState("");

    const [status,setStatus] = useState("");



    const connect = async()=>{


        if(!token){

            setStatus(
                "Please enter your Deriv API token"
            );

            return;

        }



        const follower = {


            id:
            Date.now(),


            user_id:
            Date.now(),


            master_id:
            0,


            deriv_token:
            token,


            copy_percentage:
            100,


            max_stake:
            10,


            status:
            "active" as const

        };



        const connected =
        await copyTradingStore.addFollower(
            follower
        );



        if(connected){


            setStatus(
                "Deriv account verified successfully"
            );


            setTimeout(()=>{

                navigate(
                    "/copy-trading"
                );

            },1500);



        }else{


            setStatus(
                "Invalid token or connection failed"
            );


        }


    };



return (

<div className="follower-connect">

<h1>
Client Registration
</h1>


<p>
Verify your Deriv account to join copy trading.
</p>



<input

type="password"

placeholder="Enter Deriv API Token"

value={token}

onChange={
e=>setToken(e.target.value)
}

/>



<button
className="client-register-btn"
onClick={connect}
>
Register Client
</button>



<p>
{status}
</p>


</div>

);


};


export default FollowerConnectPage;