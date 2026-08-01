import { useState } from "react";
import { copyTradingStore } from "@/stores/copy-trading-store";
import { useNavigate } from "react-router-dom";
import './follower-connect-page.scss';


const FollowerConnectPage = () => {


    const navigate = useNavigate();


    const [token,setToken] = useState("");

    const [status,setStatus] = useState("");

    const [selectedMaster,setSelectedMaster] =
    useState<number | null>(null);



    const masters =
    copyTradingStore.getMarketplaceMasters();



    const connect = async()=>{


        if(!selectedMaster){


            setStatus(
                "Please select a trader to copy"
            );


            return;


        }



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
            selectedMaster,



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



            copyTradingStore.followMaster(


                selectedMaster,


                follower.id


            );




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





<select


value={selectedMaster || ""}



onChange={(e)=>

    setSelectedMaster(

        Number(e.target.value)

    )

}



>


<option value="">

Select trader to copy

</option>



{

masters.map(master=>(


<option

key={master.id}

value={master.id}

>

{master.name}

</option>


))

}



</select>







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