const TradingViewComponent = () => {
    return (
        <iframe
            id='trading-view-iframe'
            title='Deriv TradingView Chart'
            src='https://charts.deriv.com/deriv?hide-signup=true'
            style={{
                display: 'block',
                width: '100%',
                height: '100%',
                minHeight: '600px',
                border: 'none',
                margin: 0,
                padding: 0,
                backgroundColor: '#ffffff',
            }}
            allow='fullscreen'
        />
    );
};

export default TradingViewComponent;