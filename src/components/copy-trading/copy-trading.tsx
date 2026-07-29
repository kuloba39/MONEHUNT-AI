import './copy-trading.scss';
import TraderCard from './trader-card';

const demoTraders = [
    {
        id: 1,
        name: 'AI Alpha Trader',
        profit: '+$1,245',
        winRate: '82%',
        followers: 324,
        risk: 'LOW',
    },
    {
        id: 2,
        name: 'Smart Digit Hunter',
        profit: '+$860',
        winRate: '76%',
        followers: 189,
        risk: 'MEDIUM',
    },
    {
        id: 3,
        name: 'Quantum Signals',
        profit: '+$2,430',
        winRate: '88%',
        followers: 512,
        risk: 'LOW',
    },
];


const CopyTrading = () => {

    console.log("COPY TRADING COMPONENT LOADED");

    return (
        <div className="copy-trading">

            <div className="copy-trading__header">
                <h1>
                    Copy Trading
                </h1>

                <p>
                    Follow top user traders and automatically copy their strategies.
                </p>
            </div>


            <section className="copy-trading__marketplace">

                <h2>
                    Top User Traders
                </h2>


                <div className="copy-trading__grid">

                    {demoTraders.map((trader) => (

                        <TraderCard
                            key={trader.id}
                            trader={trader}
                        />

                    ))}

                </div>

            </section>


            <section className="copy-trading__my-copy">

                <h2>
                    My Copy Trading
                </h2>


                <div className="copy-empty">

                    You are not copying any traders yet.

                </div>


            </section>


        </div>
    );
};


export default CopyTrading;