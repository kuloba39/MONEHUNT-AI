import './copy-trading.scss';
import TraderCard from './trader-card';
import TraderProfile from './trader-profile';
import { observer } from 'mobx-react-lite';
import { copyTradingStore } from '@/stores/copy-trading-store';


const CopyTrading = observer(() => {

    console.log("COPY TRADING COMPONENT LOADED");

    return (
        <div className="copy-trading">

            <div className="copy-trading__header">
                <h1>Copy Trading</h1>

                <p>
                    Follow top user traders and automatically copy their strategies.
                </p>
            </div>


            <section className="copy-trading__marketplace">

                <h2>Top User Traders</h2>

                <div className="copy-trading__grid">

                    {copyTradingStore.traders.map((trader) => (
                        <TraderCard

key={trader.id}

trader={trader}

isFollowing={
    copyTradingStore.isFollowing(trader.id)
}

onCopy={() =>
    copyTradingStore.copyTrader(trader)
}

/>
                    ))}

                </div>

            </section>
            <TraderProfile
    trader={copyTradingStore.traders[0]}
/>


            <section className="copy-trading__my-copy">

                <h2>My Copy Trading</h2>


                {
                    copyTradingStore.copiedTraders.length === 0 ? (

                        <div className="copy-empty">
                            You are not copying any traders yet.
                        </div>

                    ) : (

                        <div className="copy-trading__grid">

                            {copyTradingStore.copiedTraders.map((trader) => (

    <TraderCard

        key={trader.id}

        trader={trader}

        isFollowing={true}

        onCopy={() =>
            copyTradingStore.removeTrader(trader.id)
        }

    />

))}

                        </div>

                    )
                }


            </section>

        </div>
    );
});


export default CopyTrading;