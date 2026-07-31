import './master-register-page.scss';
import { useState } from "react";
import { copyTradingStore } from "@/stores/copy-trading-store";



const MasterRegisterPage = () => {


const [form,setForm] = useState({

name:"",
experience:"",
strategy:"",
markets:"",
contracts:"",
risk:"",
stake:"",
followers:"",
about:""

});



const update=(key:string,value:string)=>{

setForm({

...form,

[key]:value

});

};



const submit=()=>{


copyTradingStore.registerMaster({

name:form.name,

experience:form.experience,

strategy:form.strategy,

markets:form.markets.split(","),

contracts:form.contracts.split(","),

risk:form.risk,

maxStake:Number(form.stake),

maxFollowers:Number(form.followers),

about:form.about

});


alert(
"Trader registered and added to marketplace"
);


};



return (

<div className="master-register">


<h1>
Become a Master Trader
</h1>



<input
placeholder="Trader name example: AI Digit Master"
value={form.name}
onChange={e=>update("name",e.target.value)}
/>



<textarea
placeholder="Experience example: 3 years trading Deriv synthetic indices"
value={form.experience}
onChange={e=>update("experience",e.target.value)}
/>



<textarea
placeholder="Strategy example: Tick frequency analysis with risk control"
value={form.strategy}
onChange={e=>update("strategy",e.target.value)}
/>



<input
placeholder="Markets example: Volatility 100, Volatility 75"
value={form.markets}
onChange={e=>update("markets",e.target.value)}
/>



<input
placeholder="Contracts example: DIGITOVER,DIGITUNDER"
value={form.contracts}
onChange={e=>update("contracts",e.target.value)}
/>



<select
value={form.risk}
onChange={e=>update("risk",e.target.value)}
>

<option>
Select Risk
</option>

<option>
Low Risk
</option>

<option>
Medium Risk
</option>

<option>
High Risk
</option>

</select>




<input
placeholder="Maximum stake example: 10"
value={form.stake}
onChange={e=>update("stake",e.target.value)}
/>




<input
placeholder="Maximum followers example: 500"
value={form.followers}
onChange={e=>update("followers",e.target.value)}
/>



<textarea
placeholder="About you example: I specialise in digit analysis"
value={form.about}
onChange={e=>update("about",e.target.value)}
/>



<button
onClick={submit}
>

Register as Master Trader

</button>


</div>


);


};


export default MasterRegisterPage;