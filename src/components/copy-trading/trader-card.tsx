import type { MasterTrader } from '@/stores/copy-trading-store';
import { useNavigate } from 'react-router-dom';

interface Props {
    trader: MasterTrader;
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

                    👤

                </div>


                <div>

                    <h3
                        style={{ cursor: "pointer" }}
                        onClick={() =>
                            navigate(
                                `/copy-trading/trader/${trader.id}`
                            )
                        }
                    >
                        {trader.name}
                    </h3>


                    <p>
                        {trader.account_id || "Deriv Trader"}
                    </p>


                </div>


            </div>



            <div className="trader-card__strategy">

                <span>
                    Account Status
                </span>


                <strong>
                    {trader.status}
                </strong>

            </div>




            <div className="trader-card__performance">


                <div>

                    <span>
                        ROI
                    </span>

                    <strong>
                        {trader.roi}
                    </strong>

                </div>



                <div>

                    <span>
                        Balance
                    </span>

                    <strong>
                        ${trader.balance}
                    </strong>

                </div>


            </div>




            <div className="trader-card__stats">


                <div>

                    Followers

                    <strong>
                        {trader.followers}
                    </strong>

                </div>



                <div>

                    Verified

                    <strong>
                        {trader.verified ? "YES" : "NO"}
                    </strong>

                </div>



                <div>

                    Created

                    <strong>
                        {new Date(
                            trader.createdAt
                        ).toLocaleDateString()}
                    </strong>

                </div>


            </div>




            <div className="trader-risk">

                Status:

                <strong>
                    {trader.status}
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