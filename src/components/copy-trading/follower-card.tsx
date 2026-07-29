import React from "react";


type Props = {
loginid:string;
};


const FollowerCard = ({
loginid
}:Props)=>{


return (

<div className="copy-card">

<h3>
{loginid}
</h3>


<p>
Multiplier:
<strong>
 x2
</strong>
</p>


<p>
Risk:
<strong>
 Medium
</strong>
</p>


<div className="status connected">
🟢 Copy Enabled
</div>


</div>

);


};


export default FollowerCard;