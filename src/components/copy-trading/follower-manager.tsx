import React,{useState} from "react";
import FollowerCard from "./follower-card";


const FollowerManager =()=>{


const [login,setLogin]=useState("");

const [followers,setFollowers]=useState<string[]>([]);



const addFollower=()=>{

if(!login) return;

setFollowers([
...followers,
login
]);

setLogin("");

};



return (

<div>


<div className="copy-card">

<h3>
ADD FOLLOWER
</h3>


<input

placeholder="Deriv Login ID"

value={login}

onChange={
e=>setLogin(e.target.value)
}

/>


<button onClick={addFollower}>
CONNECT FOLLOWER
</button>


</div>



<h3>
FOLLOWERS
</h3>


{
followers.map(
(f)=>(

<FollowerCard
key={f}
loginid={f}
/>

)

)
}


</div>

);


};


export default FollowerManager;