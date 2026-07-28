import { useState, useEffect } from 'react';
import './analysis.scss';
import { useAnalysisTicks } from './use-analysis-ticks';


const Analysis = () => {
const [localTime, setLocalTime] = useState(
    new Date()
);


useEffect(()=>{

    const timer = setInterval(()=>{

        setLocalTime(new Date());

    },1000);


    return ()=>clearInterval(timer);

},[]);


    const [analysisTickCount, setAnalysisTickCount] =
        useState(1000);


    const [market, setMarket] =
        useState('R_100');


    const ticks =
    useAnalysisTicks(
        market,
        analysisTickCount
    );


    const lastTick =
        ticks[ticks.length - 1];


    const digits =
        ticks.map(
            tick => tick.digit
        );
        const analysisDigits =
    ticks
        .slice(-analysisTickCount)
        .map(tick => tick.digit);

const recentDigits =
    ticks
        .slice(-100)
        .map(tick => tick.digit);



    /*
        DIGIT STATISTICS
    */

    const digitStats =
        Array.from(
            { length: 10 },
            (_, digit) => {


                const count =
                    analysisDigits.filter(
                    d => d === digit
                  ).length;

                 const percent =
                    analysisDigits.length
                  ? ((count / analysisDigits.length) * 100)
                     : 0;



                return {

                    digit,
                    count,
                    percent

                };

            }
        );




    /*
        DIGIT RANKING

        RED    = least appearing
        YELLOW = second least
        BLUE   = second most
        GREEN  = most appearing

    */


    const rankedDigits =
        [...digitStats]
            .sort(
                (a,b)=>a.count-b.count
            );



    const leastDigit =
    rankedDigits[0]?.digit;


const secondLeastDigit =
    rankedDigits[1]?.digit;


const secondMostDigit =
    rankedDigits[8]?.digit;


const mostDigit =
    rankedDigits[9]?.digit;




    const getDigitClass =
    (digit:number)=>{


        if(digit === leastDigit)
            return "red";



        if(digit === secondLeastDigit)
            return "yellow";



        if(digit === secondMostDigit)
            return "blue";



        if(digit === mostDigit)
            return "green";



        return "neutral";


    };





return (

<div className="analysis-page">


<h1>
D CIRCLES
</h1>


<div className="top-info">


<div>
LOCAL TIME

<br/>

{
localTime.toLocaleTimeString()
}

</div>



<div>
LAST TICK

<br/>

{
lastTick ? (

<div className="last-tick-content">

    <div className="quote-box">

        <span>
            {lastTick.quote}
        </span>

        <small>
            QUOTE
        </small>

    </div>


    <div className="digit-box">

        <span>
            {lastTick.digit}
        </span>

        <small>
            DIGIT
        </small>

    </div>

</div>

)

:

"Waiting..."
}

</div>


</div>





<div className="market-box">

<label>
Market
</label>


<select

value={market}

onChange={
(e)=>
setMarket(e.target.value)
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

</select>

</div>







<div className="d-hub">


<div className="hub-circle">

<div className="hub-letter">
D
</div>


<strong>
{
analysisDigits.length
}
</strong>


<small>
TOTAL TICKS
</small>


</div>


</div>








<div className="circles">


{
digitStats.map(
(item)=>(

<div

key={item.digit}

className={
`
circle
${getDigitClass(item.digit)}
`
}

>


<div className="digit">

{item.digit}

</div>


<div className="count">

{item.count}

</div>


<div className="percent">

{item.percent.toFixed(1)}%

</div>


</div>

)

)

}


</div>








<h2>
RECENT DIGITS
</h2>


<div className="history">


{

recentDigits.map(
(digit,index)=>(


<span

key={index}

className={
getDigitClass(digit)
}

>

{digit}

</span>


)

)

}


</div>



</div>


);


};


export default Analysis;