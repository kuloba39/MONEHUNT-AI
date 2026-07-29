import { useParams } from 'react-router-dom';
import TraderProfile from '@/components/copy-trading/trader-profile';
import { copyTradingStore } from '@/stores/copy-trading-store';

const TraderDetails = () => {

    const { traderId } = useParams();

    const trader =
        copyTradingStore.getTrader(
            Number(traderId)
        );

    if (!trader) {

        return (
            <div style={{ padding: '30px' }}>
                Trader not found
            </div>
        );

    }

    return <TraderProfile trader={trader} />;

};

export default TraderDetails;