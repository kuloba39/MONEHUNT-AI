import React from 'react';
import { observer } from 'mobx-react-lite';
import DraggableResizeWrapper from '@/components/draggable/draggable-resize-wrapper';
import TradingViewComponent from '@/components/trading-view-chart/trading-view';
import { useStore } from '@/hooks/useStore';
import { localize } from '@deriv-com/translations';

const TradingViewModal = observer(() => {
    const { dashboard } = useStore();

    const {
        is_trading_view_modal_visible,
        setTradingViewModalVisibility,
    } = dashboard;

    return (
        <>
            {is_trading_view_modal_visible && (
                <DraggableResizeWrapper
                    boundary='.main'
                    header={localize('TradingView Chart')}
                    onClose={setTradingViewModalVisibility}
                    modalWidth={1100}
                    modalHeight={720}
                    minWidth={900}
                    minHeight={600}
                    enableResizing
                >
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            overflow: 'hidden',
                            padding: 0,
                            margin: 0,
                        }}
                    >
                        <TradingViewComponent />
                    </div>
                </DraggableResizeWrapper>
            )}
        </>
    );
});

export default TradingViewModal;