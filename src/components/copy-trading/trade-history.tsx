import './trade-history.scss';
import type { TradeHistoryItem } from '@/stores/copy-trading-store';


interface Props {

    trades: TradeHistoryItem[];

}



const TradeHistory = ({ trades }: Props) => {


    return (

        <div className="trade-history">


            <h2>
                Recent Trades
            </h2>



            <div className="trade-history__table-wrapper">

                <table>


                    <thead>

                        <tr>

                            <th>
                                Time
                            </th>

                            <th>
                                Contract
                            </th>

                            <th>
                                Stake
                            </th>

                            <th>
                                Profit
                            </th>

                            <th>
                                Result
                            </th>

                        </tr>

                    </thead>



                    <tbody>


                        {trades.map((trade, index) => (

                            <tr key={index}>

                                <td>
                                    {trade.time}
                                </td>

                                <td>
                                    {trade.contract}
                                </td>

                                <td>
                                    {trade.stake}
                                </td>

                                <td>
                                    {trade.profit}
                                </td>

                                <td className={
                                    trade.result === 'WIN'
                                    ? 'trade-win'
                                    : 'trade-loss'
                                }>

                                    {trade.result}

                                </td>

                            </tr>

                        ))}


                    </tbody>


                </table>


            </div>


        </div>

    );

};



export default TradeHistory;