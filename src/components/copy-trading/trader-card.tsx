import React from 'react';


interface Trader {
    name:string;
    profit:string;
    winRate:string;
    followers:number;
    risk:string;
}


interface Props {
    trader:Trader;
}


const TraderCard = ({ trader }:Props)=>{

    return (

        <div className="trader-card">


            <div className="trader-card__avatar">
                👤
            </div>


            <h3>
                {trader.name}
            </h3>


            <div className="trader-card__stats">

                <div>
                    Profit
                    <strong>
                        {trader.profit}
                    </strong>
                </div>


                <div>
                    Win Rate
                    <strong>
                        {trader.winRate}
                    </strong>
                </div>


                <div>
                    Followers
                    <strong>
                        {trader.followers}
                    </strong>
                </div>


                <div>
                    Risk
                    <strong>
                        {trader.risk}
                    </strong>
                </div>

            </div>


            <button>
                Copy Trader
            </button>


        </div>

    );
};


export default TraderCard;