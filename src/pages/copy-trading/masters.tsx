import './masters.scss';

import {
    listMasters
} from "@/services/copy-trading/master-service";


const Masters = () => {


const masters = listMasters();



return (

<div className="masters-page">


<h1>
AVAILABLE MASTERS
</h1>



{
masters.length === 0 && (

<div className="empty">

No active masters available

</div>

)

}



{
masters.map(master => (


<div
className="master-card"
key={master.id}
>


<h2>
{master.displayName}
</h2>



<div className="master-status">

STATUS:

<strong>
{master.status}
</strong>

</div>



<div className="master-info">


<div>

FOLLOWERS

<strong>
{master.followers}
</strong>

</div>



<div>

WIN RATE

<strong>
{master.winRate}%

</strong>

</div>



<div>

PROFIT

<strong>
${master.totalProfit}

</strong>

</div>


</div>



<button>

FOLLOW MASTER

</button>


</div>


))

}



</div>

);


};


export default Masters;