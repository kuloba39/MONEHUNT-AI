import type { Trader } from '@/stores/copy-trading-store';
import { useNavigate } from 'react-router-dom';

interface Props {

    trader: Trader;

    onCopy: () => void;

    isFollowing: boolean;

}



const TraderCard = ({
    trader,
    onCopy,
    isFollowing
}: Props) => {
const navigate = useNavigate();


    return (

        <div className="trader-card">


            <div className="trader-card__top">


                <div className="trader-card__avatar">

                    {trader.avatar}

                </div>


                <div>

                    <h3
    style={{ cursor: 'pointer' }}
    onClick={() =>
        navigate(`/copy-trading/trader/${trader.id}`)
    }
>
    {trader.name}
</h3>


                    <p>
                        {trader.country}
                    </p>


                </div>


            </div>





            <div className="trader-card__strategy">

                <span>
                    Strategy
                </span>

                <strong>
                    {trader.strategy}
                </strong>

            </div>





            <div className="trader-card__performance">


                <div>

                    <span>
                        Profit
                    </span>

                    <strong>
                        {trader.profit}
                    </strong>

                </div>



                <div>

                    <span>
                        Win Rate
                    </span>

                    <strong>
                        {trader.winRate}
                    </strong>

                </div>


            </div>





            <div className="trader-card__stats">


                <div>

                    Trades

                    <strong>
                        {trader.totalTrades}
                    </strong>

                </div>



                <div>

                    Wins

                    <strong>
                        {trader.wins}
                    </strong>

                </div>



                <div>

                    Losses

                    <strong>
                        {trader.losses}
                    </strong>

                </div>



                <div>

                    Drawdown

                    <strong>
                        {trader.drawdown}
                    </strong>

                </div>



                <div>

                    Followers

                    <strong>
                        {trader.followers}
                    </strong>

                </div>


            </div>





            <div className="trader-risk">

                Risk:

                <strong>
                    {trader.risk}
                </strong>

            </div>





            <button

                className={
                    isFollowing
                    ? "trader-card__button trader-card__button--active"
                    : "trader-card__button"
                }

                onClick={onCopy}

            >

                {
                    isFollowing
                    ? "Following ✓"
                    : "Copy Trader"
                }


            </button>


        </div>

    );

};



export default TraderCard;