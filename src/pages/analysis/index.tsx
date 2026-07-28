import { useState } from 'react';
import './analysis.scss';
import { useAnalysisTicks } from './use-analysis-ticks';


const Analysis = () => {


    const [analysisTickCount, setAnalysisTickCount] =
        useState(1000);


    const [market, setMarket] =
        useState('R_100');


    const ticks =
    useAnalysisTicks(
        "R_100",
        analysisTickCount
    );


    const lastTick =
        ticks[ticks.length - 1];


    const digits =
        ticks.map(
            tick => tick.digit
        );



    /*
        DIGIT STATISTICS
    */

    const digitStats =
        Array.from(
            { length: 10 },
            (_, digit) => {


                const count =
                    digits.filter(
                        d => d === digit
                    ).length;



                const percent =
                    digits.length
                        ?
                        ((count / digits.length) * 100)
                        :
                        0;



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



    const leastDigits =
        rankedDigits
            .slice(0,2)
            .map(
                x=>x.digit
            );



    const secondLeastDigits =
        rankedDigits
            .slice(2,4)
            .map(
                x=>x.digit
            );



    const mostDigits =
        rankedDigits
            .slice(-2)
            .map(
                x=>x.digit
            );



    const secondMostDigits =
        rankedDigits
            .slice(-4,-2)
            .map(
                x=>x.digit
            );




    const getDigitClass =
        (digit:number)=>{


            if(
                leastDigits.includes(digit)
            )
                return "red";



            if(
                secondLeastDigits.includes(digit)
            )
                return "yellow";



            if(
                mostDigits.includes(digit)
            )
                return "green";



            if(
                secondMostDigits.includes(digit)
            )
                return "blue";



            return "";

        };





return (

<div className="analysis-page">


<h1>
⚡ D CIRCLES
</h1>


<p>
Live Deriv digit probability analyzer
</p>





<select

value={analysisTickCount}

onChange={
(e)=>
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







<div className="market-box">


<label>
Market
</label>



<select

value={market}

onChange={
(e)=>
setMarket(
e.target.value
)
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







<div className="last-tick-box">


<h3>
Last Tick
</h3>


{
lastTick ? (

<>

<p>
Quote:
{lastTick.quote}
</p>


<p>
Digit:
{lastTick.digit}
</p>


<p>
Time:
{
new Date(
lastTick.epoch * 1000
)
.toLocaleTimeString()
}
</p>


</>

)

:

(

<p>
Waiting for tick...
</p>

)

}


</div>








<h2>
Digit Probability
</h2>





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



<div className="percent">

{
item.percent.toFixed(1)
}%

</div>



<div className="count">

{
item.count
}
ticks

</div>


</div>


)

)


}



</div>









<h2>
Last 100 Ticks
</h2>




<div className="history">


{

digits
.slice(-100)
.map(
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