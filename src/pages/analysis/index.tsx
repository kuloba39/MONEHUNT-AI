import React, { useEffect, useState } from 'react';
import './analysis.scss';

const Analysis = () => {

    const [digits,setDigits] = useState<number[]>([]);


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