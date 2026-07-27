import {useEffect, useState} from 'react';
import './analysis.scss';
import {useAnalysisTicks} from './use-analysis-ticks';


const Analysis = () => {
    


    const [analysisTickCount,setAnalysisTickCount] =
     useState(500);
    
    const [market,setMarket] = useState('R_100');


    const ticks = useAnalysisTicks(market, analysisTickCount);
    const lastTick = ticks[ticks.length - 1];


    const digits = ticks.map(
        tick=>tick.digit
    );



    const digitStats = Array.from(
        {length:10},
        (_,digit)=>{


            const count =
            digits.filter(
                d=>d===digit
            ).length;



            const percent =
            digits.length
            ?
            ((count / digits.length)*100).toFixed(1)
            :
            '0';



            return {

                digit,
                count,
                percent

            };


        }
    );



return (

<div className="analysis-page">
    <select
    value={analysisTickCount}
    onChange={(e)=>
        setAnalysisTickCount(
            Number(e.target.value)
        )
    }
>

<option value={100}>
100 ticks
</option>

<option value={500}>
500 ticks
</option>

<option value={1000}>
1000 ticks
</option>

<option value={2000}>
2000 ticks
</option>

<option value={3000}>
3000 ticks
</option>

</select>


<h1>
⚡ D CIRCLES
</h1>


<p>
Live Deriv digit probability analyzer
</p>
<div className="last-tick-box">

    <h3>
        Last Tick
    </h3>

    {lastTick ? (

        <>

        <p>
            Quote: {lastTick.quote}
        </p>

        <p>
            Digit: {lastTick.digit}
        </p>

        <p>
            Time: {new Date(
                lastTick.epoch * 1000
            ).toLocaleTimeString()}
        </p>

        </>

    ) : (

        <p>
            Waiting for tick...
        </p>

    )}

</div>



<div className="market-box">

<label>
Market
</label>


<select

value={market}

onChange={
(e)=>setMarket(e.target.value)
}

>


<option value="R_10">
Volatility 10 Index
</option>


<option value="R_25">
Volatility 25 Index
</option>


<option value="R_50">
Volatility 50 Index
</option>


<option value="R_75">
Volatility 75 Index
</option>


<option value="R_100">
Volatility 100 Index
</option>


<option value="1HZ10V">
Volatility 10 (1s)
</option>


<option value="1HZ25V">
Volatility 25 (1s)
</option>


<option value="1HZ50V">
Volatility 50 (1s)
</option>


<option value="1HZ75V">
Volatility 75 (1s)
</option>


<option value="1HZ100V">
Volatility 100 (1s)
</option>


<option value="BOOM500">
Boom 500
</option>


<option value="BOOM1000">
Boom 1000
</option>


<option value="CRASH500">
Crash 500
</option>


<option value="CRASH1000">
Crash 1000
</option>


<option value="JD10">
Jump 10
</option>


<option value="JD25">
Jump 25
</option>


<option value="JD50">
Jump 50
</option>


<option value="JD75">
Jump 75
</option>


<option value="JD100">
Jump 100
</option>


</select>


</div>





<div className="circles">


{
digitStats.map(item=>(


<div

key={item.digit}

className={
`
circle
${Number(item.percent)>=20?'hot':''}
`

}

>


<div className="digit">

{item.digit}

</div>



<div className="percent">

{item.percent}%

</div>



<div className="count">

{item.count} ticks

</div>


</div>


))

}



</div>





<h3>
Last 100 Ticks
</h3>



<div className="history">


{
digits.map((digit,index)=>(

<span key={index}>

{digit}

</span>


))

}


</div>



</div>


);


};


export default Analysis;