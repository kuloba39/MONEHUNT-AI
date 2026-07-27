import React from 'react';
import './d-circles.scss';


type Digit = {
    digit:number;
    count:number;
    active?:boolean;
};


const DCircles = ({
    digits=[]
}:{
    digits?:Digit[]
})=>{


const defaultDigits =
Array.from({length:10},(_,i)=>({
    digit:i,
    count:0,
    active:false
}));


const data =
digits.length ? digits : defaultDigits;



return (

<div className="d-circles">


{
data.map(item=>(


<div
key={item.digit}
className={
`
digit-circle
${item.active?'active':''}
`
}
>


<div className="digit-number">

{item.digit}

</div>


<div className="digit-count">

{item.count}

</div>


</div>


))

}



</div>


);


};


export default DCircles;