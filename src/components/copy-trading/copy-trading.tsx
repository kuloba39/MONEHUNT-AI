import './copy-trading.scss';
import TraderCard from './trader-card';
import TraderProfile from './trader-profile';
import { observer } from 'mobx-react-lite';
import { copyTradingStore } from '@/stores/copy-trading-store';


const CopyTrading = observer(() => {

    console.log("COPY TRADING COMPONENT LOADED");


    const traders =
        copyTradingStore.getMarketplaceTraders();
      console.log(
    "MARKETPLACE DATA",
    traders
);


    const activeCopies =
        copyTradingStore.activeCopies;


    const followTrader = (trader:any) => {

        copyTradingStore.followMaster(
            trader.id,
            1
        );

        console.log(
            "FOLLOWING MASTER",
            trader
        );

    };



    return (

        <div className="copy-trading">


            <div className="copy-trading__header">

                <h1>
                    Copy Trading
                </h1>


                <p>
                    Follow top user traders and automatically copy their strategies.
                </p>
                <button
                    className="copy-trading__register-btn"
                    onClick={() =>
                        window.location.href = "/copy-trading/register"
    }
>
    Become a Master Trader
</button>
<button

className="copy-trading__connect-btn"

onClick={() =>
window.location.href =
"/copy-trading/connect"
}

>
Connect Deriv Account
</button>

            </div>





            <section className="copy-trading__marketplace">


                <h2>
                    Top User Traders
                </h2>



                <div className="copy-trading__grid">


                    {
                        traders.length === 0 ? (

                            <div className="copy-empty">

                                No traders available yet.

                            </div>


                        ) : (


                            traders.map((trader:any)=>(


                                <TraderCard

                                    key={trader.id}

                                    trader={trader}


                                    isFollowing={
                                        activeCopies.some(
                                            copy =>
                                            copy.masterId === trader.id
                                        )
                                    }


                                    onCopy={() =>
                                        followTrader(trader)
                                    }

                                />


                            ))


                        )

                    }


                </div>


            </section>





            {
                traders.length > 0 && (

                    <TraderProfile

                        trader={traders[0]}

                    />

                )
            }






            <section className="copy-trading__my-copy">


                <h2>
                    My Copy Trading
                </h2>



                {
                    activeCopies.length === 0 ? (


                        <div className="copy-empty">

                            You are not copying any traders yet.

                        </div>



                    ) : (


                        <div className="copy-trading__grid">


                            {
                                activeCopies.map(
                                    (copy:any)=>{


                                        const trader =
                                        traders.find(
                                            (t:any)=>
                                            t.id === copy.masterId
                                        );



                                        if(!trader)
                                            return null;



                                        return (


                                            <TraderCard

                                                key={
                                                    trader.id
                                                }


                                                trader={
                                                    trader
                                                }


                                                isFollowing={
                                                    true
                                                }


                                                onCopy={()=>
                                                    console.log(
                                                        "REMOVE COPY TODO",
                                                        trader.id
                                                    )
                                                }


                                            />

                                        );


                                    }
                                )
                            }


                        </div>


                    )

                }



            </section>




        </div>

    );

});



export default CopyTrading;