import { useParams } from 'react-router-dom';
import TraderProfile from '@/components/copy-trading/trader-profile';
import { copyTradingStore } from '@/stores/copy-trading-store';

const TraderProfilePage = () => {

    const { id } = useParams();

    const trader =
        copyTradingStore.getTraderById(
            Number(id)
        );

    if (!trader) {

        return (

            <div className="copy-trading-page">

                Trader not found.

            </div>

        );

    }

    return (

        <div className="copy-trading-page">

            <TraderProfile trader={trader} />

        </div>

    );

};

export default TraderProfilePage;