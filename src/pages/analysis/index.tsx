import { useState, useEffect } from 'react';
import './analysis.scss';
import { useAnalysisTicks } from './use-analysis-ticks';

const Analysis = () => {
const [localTime, setLocalTime] = useState(new Date());

const [analysisTickCount] = useState(1000);

const [market, setMarket] = useState(() => {
    if (typeof window === 'undefined') {
        return 'R_100';
    }

    return (
        localStorage.getItem('d_circles_market') ||
        'R_100'
    );
});

useEffect(() => {
    const timer = setInterval(() => {
        setLocalTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
}, []);

const ticks = useAnalysisTicks(
    market,
    analysisTickCount
);

useEffect(() => {
    localStorage.setItem(
        'd_circles_market',
        market
    );
}, [market]);

const lastTick =
    ticks[ticks.length - 1];

const analysisDigits =
    ticks
        .slice(-analysisTickCount)
        .map(tick => tick.digit);

const recentDigits =
    ticks
        .slice(-100)
        .map(tick => tick.digit);

/*
 * DIGIT STATISTICS
 */

const digitStats =
    Array.from(
        { length: 10 },
        (_, digit) => {
            const count =
                analysisDigits.filter(
                    d => d === digit
                ).length;

            const percent =
                analysisDigits.length
                    ? (
                        (count /
                            analysisDigits.length) *
                        100
                    )
                    : 0;

            return {
                digit,
                count,
                percent
            };
        }
    );

/*
 * DIGIT RANKING
 *
 * RED    = least appearing
 * YELLOW = second least
 * BLUE   = second most
 * GREEN  = most appearing
 */

const rankedDigits =
    [...digitStats].sort(
        (a, b) => a.count - b.count
    );

const leastDigit =
    rankedDigits[0]?.digit;

const secondLeastDigit =
    rankedDigits[1]?.digit;

const secondMostDigit =
    rankedDigits[8]?.digit;

const mostDigit =
    rankedDigits[9]?.digit;

const getDigitClass =
    (digit: number) => {
        if (digit === leastDigit) {
            return 'red';
        }

        if (digit === secondLeastDigit) {
            return 'yellow';
        }

        if (digit === secondMostDigit) {
            return 'blue';
        }

        if (digit === mostDigit) {
            return 'green';
        }

        return 'neutral';
    };

return (
    <div className="analysis-page">

        {/* HEADER */}

        <header className="analysis-header">

            <div className="header-left">

                <div className="header-title">
                    D CIRCLES
                </div>

                <div className="local-time">
                    Local Time:{' '}
                    {localTime.toLocaleTimeString()}
                </div>

            </div>

            <div className="live-status">
                <span className="live-dot" />
                LIVE
            </div>

        </header>


        {/* MARKET */}

        <section className="market-section">

            <label>
                Market
            </label>

            <select
                value={market}
                onChange={(e) =>
                    setMarket(e.target.value)
                }
            >

                <optgroup label="Volatility Indices">

                    <option value="R_10">
                        Volatility 10 Index
                    </option>

                    <option value="R_25">
                        Volatility 25 Index
                    </option>

                    <option value="R_50">
                        Volatility 50 Index
                    </option>

                    <option value="R_75">
                        Volatility 75 Index
                    </option>

                    <option value="R_100">
                        Volatility 100 Index
                    </option>

                </optgroup>


                <optgroup label="Volatility 1s Indices">

                    <option value="1HZ10V">
                        Volatility 10 (1s)
                    </option>

                    <option value="1HZ15V">
                        Volatility 15 (1s)
                    </option>

                    <option value="1HZ25V">
                        Volatility 25 (1s)
                    </option>

                    <option value="1HZ30V">
                        Volatility 30 (1s)
                    </option>

                    <option value="1HZ50V">
                        Volatility 50 (1s)
                    </option>

                    <option value="1HZ75V">
                        Volatility 75 (1s)
                    </option>

                    <option value="1HZ90V">
                        Volatility 90 (1s)
                    </option>

                    <option value="1HZ100V">
                        Volatility 100 (1s)
                    </option>

                </optgroup>


                <optgroup label="Boom & Crash">

                    <option value="BOOM500">
                        Boom 500
                    </option>

                    <option value="BOOM1000">
                        Boom 1000
                    </option>

                    <option value="CRASH500">
                        Crash 500
                    </option>

                    <option value="CRASH1000">
                        Crash 1000
                    </option>

                </optgroup>


                <optgroup label="Jump Indices">

                    <option value="JUMP10">
                        Jump 10
                    </option>

                    <option value="JUMP25">
                        Jump 25
                    </option>

                    <option value="JUMP50">
                        Jump 50
                    </option>

                    <option value="JUMP75">
                        Jump 75
                    </option>

                    <option value="JUMP100">
                        Jump 100
                    </option>

                </optgroup>

            </select>

        </section>


        {/* D CIRCLES */}

        <section className="circles-section">

            <div className="circles">

                {digitStats.map((item) => (

                    <div
                        key={item.digit}
                        className={`digit-unit ${getDigitClass(item.digit)}`}
                    >

                        <div className="digit-circle">

                            <div className="digit-label">
                                {item.digit}
                            </div>

                            <div className="digit-count">
                                {item.count}
                            </div>

                            <div className="digit-percent">
                                {item.percent.toFixed(1)}%
                            </div>

                        </div>

                    </div>

                ))}

            </div>

        </section>


        {/* LAST QUOTE */}

        <section className="last-quote-section">

            <div className="last-quote">

                <div className="section-label">
                    LAST QUOTE
                </div>

                <div className="quote-value">
                    {lastTick
                        ? lastTick.quote
                        : 'Waiting...'}
                </div>

            </div>


            <div className="last-digit">

                <div className="section-label">
                    LAST DIGIT
                </div>

                <div className="last-digit-value">
                    {lastTick
                        ? lastTick.digit
                        : '-'}
                </div>

            </div>

        </section>


        {/* RECENT DIGITS */}

        <section className="recent-section">

            <div className="section-title">
                RECENT DIGITS
            </div>

            <div className="history">

                {recentDigits.map(
                    (digit, index) => (

                        <span
                            key={`${digit}-${index}`}
                            className={getDigitClass(digit)}
                        >
                            {digit}
                        </span>

                    )
                )}

            </div>

        </section>

    </div>
);

};

export default Analysis;
