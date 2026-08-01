import './trader-profile.scss';
import type { Trader } from '@/stores/copy-trading-store';
import TradeHistory from './trade-history';
import CopySettings from './copy-settings';
import ProfitChart from './profit-chart';

interface Props {
    trader: Trader;
}

const TraderProfile = ({ trader }: Props) => {

    return (

        <div className='trader-profile'>

            <div className='trader-profile__header'>

                <div className='trader-profile__avatar'>
                    {trader.avatar}
                </div>

                <div>

                    <h1>{trader.name}</h1>

                    <p>{trader.country}</p>

                    <p>{trader.strategy}</p>

                </div>

            </div>

            <div className='trader-profile__grid'>

                <div className='profile-stat'>
                    <span>Total Profit</span>
                    <strong>{trader.profit}</strong>
                </div>

                <div className='profile-stat'>
                    <span>Monthly Profit</span>
                    <strong>{trader.monthlyProfit}</strong>
                </div>

                <div className='profile-stat'>
                    <span>Win Rate</span>
                    <strong>{trader.winRate}</strong>
                </div>

                <div className='profile-stat'>
                    <span>Followers</span>
                    <strong>{trader.followers}</strong>
                </div>

                <div className='profile-stat'>
                    <span>Total Trades</span>
                    <strong>{trader.totalTrades}</strong>
                </div>

                <div className='profile-stat'>
                    <span>Drawdown</span>
                    <strong>{trader.drawdown}</strong>
                </div>

            </div>
            <ProfitChart
    data={
        Array.isArray(trader.profitHistory)
        ? trader.profitHistory
        : []
    }
/>
          <TradeHistory
    trades={
        Array.isArray(trader.tradeHistory)
        ? trader.tradeHistory
        : []
    }
/>
    <CopySettings

    traderId={trader.id}

    traderName={trader.name}

    settings={trader.copySettings || {}}

/>

            <div className='trader-profile__performance'>

                <h2>Performance Summary</h2>

                <p>Wins: {trader.wins}</p>

                <p>Losses: {trader.losses}</p>

                <p>Risk Level: {trader.risk}</p>

                <p>Status: {trader.status}</p>

            </div>

        </div>

    );

};

export default TraderProfile;