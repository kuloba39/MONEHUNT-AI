import { useState } from "react";
import { copyTradingStore } from "@/stores/copy-trading-store";
import { useNavigate } from "react-router-dom";
import "./follower-connect-page.scss";


const FollowerConnectPage = () => {


const navigate = useNavigate();



const [step,setStep] = useState(1);


const [status,setStatus] = useState("");



const [selectedMaster,setSelectedMaster] =
useState<number | null>(null);



const [token,setToken] =
useState("");



const [profile,setProfile] = useState({

    name:"",
    account_type:"Real",
    currency:"USD"

});



const [settings,setSettings] = useState({

    copy_mode:"same_as_master",

    copy_percentage:100,

    fixed_amount:1,

    multiplier:1,

    max_stake:10,

    daily_loss_limit:10,

    stop_loss:0,

    take_profit:0

});



const masters =
copyTradingStore.getMarketplaceMasters();





const connect = async()=>{


if(!selectedMaster){

setStatus(
"Please select a master trader"
);

return;

}



if(!token){

setStatus(
"Enter your Deriv API token"
);

return;

}





const follower:any = {


id:Date.now(),


user_id:Date.now(),


master_id:selectedMaster,


account_id:"",


deriv_token:token,


profile,


settings,


copy_percentage:
settings.copy_percentage,


max_stake:
settings.max_stake,


status:"pending"


};





const connected =

await copyTradingStore.addFollower(

follower

);





if(!connected){

setStatus(
"Deriv verification failed"
);

return;

}





setStatus(
"Account verified. Review your copy settings before activation."
);


setStep(6);



setTimeout(()=>{


navigate("/copy-trading");


},1500);



};







return (

<div className="follower-connect">


<h1>
Follower Registration
</h1>



<div className="copy-wizard">


<p>
Step {step} / 5
</p>



</div>





{
step===1 && (

<>

<h3>
Select Master Trader
</h3>


<select

value={selectedMaster || ""}

onChange={(e)=>
setSelectedMaster(
Number(e.target.value)
)
}

>

<option value="">
Select trader
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



<button

onClick={()=>{

if(!selectedMaster){

setStatus(
"Select a trader first"
);

return;

}

setStep(2);

}}

>

Continue

</button>


</>

)

}







{
step===2 && (

<>

<h3>
Your Profile
</h3>


<input

placeholder="Your name"

value={profile.name}

onChange={(e)=>

setProfile({

...profile,

name:e.target.value

})

}

/>



<select

value={profile.account_type}

onChange={(e)=>

setProfile({

...profile,

account_type:e.target.value

})

}

>

<option>
Real
</option>

<option>
Demo
</option>

</select>



<button

onClick={()=>setStep(3)}

>

Continue

</button>


</>

)

}







{
step===3 && (

<>

<h3>
Connect Deriv Account
</h3>


<input

type="password"

placeholder="Deriv API Token"

value={token}

onChange={(e)=>

setToken(e.target.value)

}

/>



<button

onClick={()=>setStep(4)}

>

Continue

</button>


</>

)

}







{
step===4 && (

<>

<h3>
Copy Risk Settings
</h3>



<label>
Maximum Stake
</label>


<input

type="number"

value={settings.max_stake}

onChange={(e)=>

setSettings({

...settings,

max_stake:Number(e.target.value)

})

}

/>





<label>
Copy Percentage
</label>


<input

type="number"

value={settings.copy_percentage}

onChange={(e)=>

setSettings({

...settings,

copy_percentage:Number(e.target.value)

})

}

/>





<button

onClick={()=>setStep(5)}

>

Continue

</button>


</>

)

}







{
step===5 && (

<>

<h3>
Confirm Copy Trading
</h3>


<p>
Master selected successfully
</p>


<p>
Copy Percentage:
{settings.copy_percentage}%
</p>


<p>
Maximum Stake:
{settings.max_stake}
</p>



<button

onClick={connect}

>

Activate Copy Trading

</button>


</>

)

}






<p>

{status}

</p>



</div>

);


};



export default FollowerConnectPage;