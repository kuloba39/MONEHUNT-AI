import React, { useEffect, useState } from 'react';
import './analysis.scss';

const Analysis = () => {

    const [digits,setDigits] = useState<number[]>([]);

    const [market,setMarket] = useState('R_10');


    useEffect(()=>{

        /*
        TEMP DATA SOURCE

        Replace this later with Deriv tick feed.
        */

        const timer = setInterval(()=>{

            const digit =
                Math.floor(Math.random()*10);


            setDigits(prev=>[
                ...prev.slice(-99),
                digit
            ]);


        },1000);


        return ()=>clearInterval(timer);


    },[]);



    const digitStats =
        Array.from(
            {length:10},
            (_,digit)=>{


                const count =
                    digits.filter(
                        d=>d===digit
                    ).length;


                const probability =
                    digits.length
                    ?
                    ((count / digits.length)*100).toFixed(1)
                    :
                    "0";


                return {

                    digit,

                    count,

                    probability

                };

            }
        );



    return (

        <div className="analysis-page">


            <h1>
                ⚡ D CIRCLES
            </h1>


            <p>
                Live digit probability intelligence
            </p>
             <h3>
               📈 Active Market: {market}
              </h3>



            <div className="circles">


            {
                digitStats.map(item=>(


                    <div
                    key={item.digit}
                    className={
                        item.count >= 5
                        ?
                        "circle hot"
                        :
                        "circle"
                    }
                    >


                        <strong>
                            {item.digit}
                        </strong>


                        <span>
                            {item.count}
                        </span>


                        <small>
                            {item.probability}%
                        </small>


                    </div>


                ))
            }
           <div className="market-box">

<label>
    Market
</label>


<select
value={market}
onChange={(e)=>setMarket(e.target.value)}
>


{/* VOLATILITY INDICES */}

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


{/* VOLATILITY 1 SECOND */}

<option value="1HZ10V">
Volatility 10 (1s) Index
</option>

<option value="1HZ25V">
Volatility 25 (1s) Index
</option>

<option value="1HZ50V">
Volatility 50 (1s) Index
</option>

<option value="1HZ75V">
Volatility 75 (1s) Index
</option>

<option value="1HZ100V">
Volatility 100 (1s) Index
</option>


{/* JUMP INDICES */}

<option value="JD10">
Jump 10 Index
</option>

<option value="JD25">
Jump 25 Index
</option>

<option value="JD50">
Jump 50 Index
</option>

<option value="JD75">
Jump 75 Index
</option>

<option value="JD100">
Jump 100 Index
</option>


{/* BOOM CRASH */}

<option value="BOOM300">
Boom 300 Index
</option>

<option value="BOOM500">
Boom 500 Index
</option>

<option value="BOOM1000">
Boom 1000 Index
</option>


<option value="CRASH300">
Crash 300 Index
</option>

<option value="CRASH500">
Crash 500 Index
</option>

<option value="CRASH1000">
Crash 1000 Index
</option>


{/* STEP INDEX */}

<option value="STEPINDEX">
Step Index
</option>


{/* RANGE BREAK */}

<option value="RANGE100">
Range Break 100 Index
</option>

<option value="RANGE200">
Range Break 200 Index
</option>


{/* DRIFT SWITCHING */}

<option value="DS10">
Drift Switching 10 Index
</option>

<option value="DS20">
Drift Switching 20 Index
</option>


</select>


</div>


            </div>



            <h3>
                Last 100 ticks
            </h3>



            <div className="history">


            {
                digits.map((d,i)=>(

                    <span key={i}>
                        {d}
                    </span>

                ))
            }


            </div>



        </div>

    );

};


export default Analysis;