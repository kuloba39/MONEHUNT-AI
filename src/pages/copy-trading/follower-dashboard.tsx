import { observer } from "mobx-react-lite";
import { copyTradingStore } from "@/stores/copy-trading-store";
import "./follower-dashboard.scss";


const FollowerDashboard = observer(()=>{


const followers =
copyTradingStore.followers;



return (

<div className="follower-dashboard">


<h1>
My Copy Trading Accounts
</h1>



{

followers.map(follower=>{


const master =

copyTradingStore.getMaster(

follower.master_id

);




return (

<div

className="follower-card"

key={follower.id}

>


<h2>

Copying:

{master?.name || "Unknown Trader"}

</h2>




<div>

Status:

<strong>

{follower.status}

</strong>


</div>

<div className="account-summary">

<h3>
Account Details
</h3>


<p>
Account ID:
{
follower.account_id || "Not connected"
}
</p>


<p>
Verification:
{
follower.verified
?
"Verified"
:
"Pending"
}
</p>


<p>
Account Type:
{
follower.profile?.account_type || "Unknown"
}
</p>


<p>
Currency:
{
follower.profile?.currency || "USD"
}
</p>


</div>





<div className="follower-actions">


{

follower.status==="active" && (

<button

onClick={()=>


copyTradingStore.pauseFollower(

follower.id

)

}

>

Pause Copying

</button>

)

}





{

follower.status==="paused" && (

<button

onClick={()=>


copyTradingStore.resumeFollower(

follower.id

)

}

>

Resume Copying

</button>

)

}





<button

onClick={()=>


copyTradingStore.stopFollower(

follower.id

)

}

>

Stop Trading

</button>







<button

onClick={()=>{


const confirmStop =

window.confirm(

"Remove this master trader?"

);



if(confirmStop){


copyTradingStore.unfollowFollower(

follower.id

);


}



}}

>

Unfollow Master

</button>



</div>







<div className="risk-summary">


<h3>
Risk Settings
</h3>


<p>

Copy:

{follower.settings?.copy_percentage}%

</p>



<p>

Maximum Stake:

{follower.settings?.max_stake}

</p>



<p>

Daily Loss Limit:

{follower.settings?.daily_loss_limit}

</p>



</div>





</div>


);


})


}



</div>


);


});


export default FollowerDashboard;