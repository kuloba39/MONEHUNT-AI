import { useEffect, useRef, useState } from 'react';
import { DBOT_TABS } from '@/constants/bot-contents';
import { useStore } from '@/hooks/useStore';
import { load, save_types } from '@/external/bot-skeleton';
import { FREE_BOTS } from '@/constants/free-bots';
import './ai-lab.scss';
import { useAnalysisTicks } from '../analysis/use-analysis-ticks';
import {
    MatchesUIAdapter
} from '@/ai-lab/matches/matches-ui-adapter';

import {
    VolatilityScannerController,
} from '@/ai-lab/matches/volatility-scanner-controller';

import {
    VolatilityScannerRunResult,
} from '@/ai-lab/matches/volatility-scanner-controller';

const AI_LAB_TICK_COUNT = 1000;
type AiLabMarket = {
    symbol: string;
    name: string;
    market: string;
};

const AiLab = () => {
    const { dashboard, load_modal, blockly_store } = useStore();

    const { setActiveTab } = dashboard;
    const { setSelectedStrategyId } = load_modal;
    const { setLoading } = blockly_store;
    const [markets, setMarkets] =
    useState<AiLabMarket[]>([]);

    const [market, setMarket] = useState(() => {

        if (typeof window === 'undefined') {
            return 'R_100';
        }

        return (
            localStorage.getItem(
                'ai_lab_market'
            ) || 'R_100'
        );

    });
   useEffect(() => {

    let cancelled = false;

    let subscription: any = null;

    const requestId = Date.now();


    const loadDigitMarkets = async () => {

        try {

            const apiModule =
                await import(
                    '@/external/bot-skeleton/services/api/api-base'
                );


            const derivApi =
                apiModule.api_base;


            if (!derivApi?.api) {

                console.log(
                    'AI LAB: DERIV API NOT READY'
                );

                return;

            }


            subscription =
                derivApi.api
                    .onMessage()
                    .subscribe(
                        ({ data }: any) => {

                            if (cancelled) {
                                return;
                            }


                            if (
                                data?.echo_req?.req_id !==
                                requestId
                            ) {
                                return;
                            }


                            if (
                                data?.error
                            ) {

                                console.error(
                                    'AI LAB MARKET LOAD ERROR',
                                    data.error
                                );

                                return;

                            }


                            if (
                                !data?.active_symbols
                            ) {
                                return;
                            }


                            const discoveredMarkets:
                                AiLabMarket[] =
                                data.active_symbols

                                    .filter(
                                        (item: any) =>
                                            item?.underlying_symbol
                                    )

                                    .filter(
                                        (item: any) =>
                                            item.exchange_is_open !== 0 &&
                                            item.is_trading_suspended !== 1
                                    )

                                    .map(
                                        (item: any) => ({

                                            symbol:
                                                item.underlying_symbol,

                                            name:
                                                item.underlying_symbol_name ||
                                                item.display_name ||
                                                item.underlying_symbol,

                                            market:
                                                item.market || ''

                                        })
                                    )

                                    .sort(
                                        (a, b) =>
                                            a.name.localeCompare(
                                                b.name
                                            )
                                    );


                            setMarkets(
                                discoveredMarkets
                            );


                            console.log(
                                'AI LAB DIGIT MARKETS',
                                discoveredMarkets
                            );


                            const savedMarket =
                                localStorage.getItem(
                                    'ai_lab_market'
                                );


                            const savedExists =
                                discoveredMarkets.some(
                                    item =>
                                        item.symbol ===
                                        savedMarket
                                );


                            if (
                                savedMarket &&
                                savedExists
                            ) {

                                setMarket(
                                    savedMarket
                                );

                            } else if (
                                discoveredMarkets.some(
                                    item =>
                                        item.symbol ===
                                        'R_100'
                                )
                            ) {

                                setMarket(
                                    'R_100'
                                );

                            } else if (
                                discoveredMarkets.length > 0
                            ) {

                                setMarket(
                                    discoveredMarkets[0].symbol
                                );

                            }

                        }
                    );


            derivApi.api.send({

                req_id: requestId,

                active_symbols: 'brief',

                contract_type: [
                    'DIGITOVER',
                    'DIGITUNDER',
                    'DIGITEVEN',
                    'DIGITODD',
                    'DIGITMATCH',
                    'DIGITDIFF'
                ]

            });


        } catch (error) {

            console.error(
                'AI LAB MARKET LOAD ERROR',
                error
            );

        }

    };


    loadDigitMarkets();


    return () => {

        cancelled = true;

        if (subscription) {
            subscription.unsubscribe();
        }

    };

}, []);


    const ticks = useAnalysisTicks(
        market,
        AI_LAB_TICK_COUNT
    );


    const adapterRef =
        useRef<MatchesUIAdapter | null>(null);


    const initializedRef =
    useRef(false);

const lastProcessedTickRef =
    useRef<string | null>(null);
const [
    engineState,
    setEngineState
] = useState<any>(null);


       const [
    currentSignal,
    setCurrentSignal
] = useState<any>(null);


    const applySignalToBot = async () => {
        const signal = currentSignal;

        if (!signal?.ready) {
            console.warn('AI LAB: No READY signal available');
            return;
        }

        const bot = FREE_BOTS.find(
            item => item.id === 'matches-signal'
        );

        if (!bot?.xml) {
            console.error(
                'AI LAB: MATCHES SIGNAL BOT XML NOT FOUND'
            );
            return;
        }

        const entryDigit = Number(signal.entryDigit);
        const barrierDigit = Number(signal.barrierDigit);

        if (
            !Number.isInteger(entryDigit) ||
            entryDigit < 0 ||
            entryDigit > 9 ||
            !Number.isInteger(barrierDigit) ||
            barrierDigit < 0 ||
            barrierDigit > 9
        ) {
            console.error(
                'AI LAB: INVALID MATCHES SIGNAL',
                signal
            );
            return;
        }

        setLoading(true);

        try {
            const workspace =
                window.Blockly?.derivWorkspace;

            if (!workspace) {
                throw new Error(
                    'Blockly workspace is not ready'
                );
            }

            console.log(
                'AI LAB → MATCHES SIGNAL BOT',
                {
                    market,
                    entryDigit,
                    barrierDigit
                }
            );

            await load({
                block_string: bot.xml,
                file_name: bot.name,
                strategy_id: bot.id,
                from: save_types.LOCAL,
                workspace,
                drop_event: null,
                showIncompatibleStrategyDialog: null,
                show_snackbar: true,
            });

            const blocks =
    workspace.getAllBlocks() as any[];

            const marketBlock =
                blocks.find(
                    block =>
                        block.type ===
                        'trade_definition_market'
                );

            if (marketBlock) {
                const symbolField =
                    marketBlock.getField(
                        'SYMBOL_LIST'
                    );

                if (symbolField) {
                    symbolField.setValue(market);
                }
            }

            const predictionBlock =
                blocks.find(block => {
                    if (
                        block.type !==
                        'variables_set'
                    ) {
                        return false;
                    }

                    const variableField =
                        block.getField('VAR');

                    return (
                        variableField?.getText() ===
                        'Prediction'
                    );
                });

            if (predictionBlock) {
                const numberBlock =
                    predictionBlock
                        .getInputTargetBlock(
                            'VALUE'
                        );

                numberBlock
                    ?.getField('NUM')
                    ?.setValue(
                        String(barrierDigit)
                    );
            }

            const entryBlock =
                blocks.find(block => {
                    if (
                        block.type !==
                        'variables_set'
                    ) {
                        return false;
                    }

                    const variableField =
                        block.getField('VAR');

                    return (
                        variableField?.getText() ===
                        'entry point'
                    );
                });

            if (entryBlock) {
                const numberBlock =
                    entryBlock
                        .getInputTargetBlock(
                            'VALUE'
                        );

                numberBlock
                    ?.getField('NUM')
                    ?.setValue(
                        String(entryDigit)
                    );
            }

            const tradingModeBlock =
                blocks.find(block => {
                    if (
                        block.type !==
                        'variables_set'
                    ) {
                        return false;
                    }

                    const variableField =
                        block.getField('VAR');

                    return (
                        variableField?.getText() ===
                        'trading mode'
                    );
                });

            if (tradingModeBlock) {
                const numberBlock =
                    tradingModeBlock
                        .getInputTargetBlock(
                            'VALUE'
                        );

                numberBlock
                    ?.getField('NUM')
                    ?.setValue('0');
            }

            workspace.render();

            setSelectedStrategyId(
                bot.id
            );

            setActiveTab(
                DBOT_TABS.BOT_BUILDER
            );

            console.log(
                'AI LAB: SIGNAL APPLIED SUCCESSFULLY'
            );

        } catch (error) {
            console.error(
                'AI LAB: APPLY TO BOT ERROR',
                error
            );
        } finally {
            setLoading(false);
        }
    };


    const [
        stats,
        setStats
    ] = useState({
        total: 0,
        wins: 0,
        losses: 0,
        winRate: 0
    });


    const [
        learningStats,
        setLearningStats
    ] = useState<any[]>([]);
    const volatilityScannerRef =
        useRef<VolatilityScannerController | null>(null);


    const [
        volatilityScan,
        setVolatilityScan
    ] = useState<VolatilityScannerRunResult | null>(null);
const [
    selectedScanMarket,
    setSelectedScanMarket
] = useState<string | null>(null);


    const [
        volatilityScanning,
        setVolatilityScanning
    ] = useState(false);


    const [
        volatilityError,
        setVolatilityError
    ] = useState<string | null>(null);
    const runVolatilityScanner = async () => {

        if (volatilityScanning) {
            return;
        }

        setVolatilityScanning(true);

        setVolatilityError(null);

        try {

            if (!volatilityScannerRef.current) {

                volatilityScannerRef.current =
                    new VolatilityScannerController();

            }

            const result =
                await volatilityScannerRef.current.run();

            setVolatilityScan(result);

            console.log(
                '[AI LAB] VOLATILITY SCAN RESULT:',
                result
            );

            if (result.selected) {

    console.log(
        '[AI LAB] SCANNER RECOMMENDATION:',
        result.selected.symbol,
        result.selected.score
    );

}

        } catch (error) {

            console.error(
                '[AI LAB] VOLATILITY SCANNER ERROR:',
                error
            );

            setVolatilityError(
                error instanceof Error
                    ? error.message
                    : 'Volatility scanner failed'
            );

        } finally {

            setVolatilityScanning(false);

        }

    };
const selectScannedMarket = (symbol: string) => {

    console.log(
        '[AI LAB] USER SELECTED SCANNED MARKET:',
        symbol
    );

    setSelectedScanMarket(symbol);

    setMarket(symbol);

    localStorage.setItem(
        'ai_lab_market',
        symbol
    );

};


    /*
     * Create one Matches adapter
     * for the current AI Lab session.
     */

    useEffect(() => {

        adapterRef.current =
    new MatchesUIAdapter();

initializedRef.current =
    false;

lastProcessedTickRef.current =
    null;

        setEngineState(null);

setCurrentSignal(null);

setStats({
            total: 0,
            wins: 0,
            losses: 0,
            winRate: 0
        });

        setLearningStats([]);

    }, [market]);


    /*
 * Feed D Circles ticks into Matches.
 *
 * The first batch is historical data.
 * After that, only the newest live tick
 * is processed.
 */

useEffect(() => {

    const adapter =
        adapterRef.current;

    if (
        !adapter ||
        ticks.length === 0
    ) {
        return;
    }


    /*
     * Process the initial history once.
     */

    if (!initializedRef.current) {

        adapter.processTicks(
            ticks
        );


        initializedRef.current =
            true;


        const lastTick =
            ticks[ticks.length - 1];


        lastProcessedTickRef.current =
            [
                lastTick.epoch,
                lastTick.quote,
                lastTick.digit
            ].join('|');


        setEngineState(
            adapter.getCurrentState()
        );


        setStats({

            total:
                adapter.getTotalOutcomes(),

            wins:
                adapter.getWins().length,

            losses:
                adapter.getLosses().length,

            winRate:
                adapter.getWinRate()

        });


        setLearningStats(
            adapter.getLearningStats()
        );


        return;

    }


    /*
     * The D Circles hook continuously appends
     * live ticks to the end of the array.
     *
     * Identify the newest tick using its
     * actual data instead of its array index.
     */

    const lastTick =
        ticks[ticks.length - 1];


    const tickKey =
        [
            lastTick.epoch,
            lastTick.quote,
            lastTick.digit
        ].join('|');


    /*
     * Nothing new has arrived.
     */

    if (
        tickKey ===
        lastProcessedTickRef.current
    ) {
        return;
    }


    /*
     * Process the new live tick.
     */

    const result =
    adapter.processTick(
        lastTick
    );


    lastProcessedTickRef.current =
        tickKey;


    if (result) {

    setEngineState(
        result
    );

    if (
        result.pendingSignal?.signal
    ) {

        setCurrentSignal(
            result.pendingSignal.signal
        );

    }

}


    setStats({

        total:
            adapter.getTotalOutcomes(),

        wins:
            adapter.getWins().length,

        losses:
            adapter.getLosses().length,

        winRate:
            adapter.getWinRate()

    });


    setLearningStats(
        adapter.getLearningStats()
    );


}, [ticks]);


    useEffect(() => {

        localStorage.setItem(
            'ai_lab_market',
            market
        );

    }, [market]);


    const lastTick =
        ticks[ticks.length - 1];


    const signal =
    currentSignal;


    const digit =
        engineState?.digit ??
        lastTick?.digit;


    return (

        <div className="ai-lab-page">

            <header className="ai-lab-header">

                <div>

                    <div className="ai-lab-title">
                        AI LAB
                    </div>

                    <div className="ai-lab-subtitle">
                        MATCHES INTELLIGENCE &
                        ADAPTIVE LEARNING
                    </div>

                </div>


                <div className="ai-lab-live">

                    <span className="ai-lab-live-dot" />

                    LIVE

                </div>

            </header>


            <section className="ai-lab-market">

    <div className="market-command">

        <label>
            ACTIVE MARKET
        </label>

        <div className="market-command-symbol">
            {market}
        </div>

        <div className="market-command-status">
            <span className="ai-lab-live-dot" />
            LIVE
        </div>

    </div>

    <div className="market-selector">

        <label>
            SELECT MARKET
        </label>


                <select
                    value={market}
                    onChange={event =>
                        setMarket(
                            event.target.value
                        )
                    }
                >
    {markets.length === 0 && (

    <option value={market}>
        Loading Digit markets...
    </option>

)}

                    {markets.map(item => (

    <option
        key={item.symbol}
        value={item.symbol}
    >
        {item.name} ({item.symbol})
    </option>

))}

                </select>
                    </div>


                <div className="ai-lab-tick-info">

                    <span>
                        Ticks: {ticks.length}
                    </span>

                    <span>
                        Digit: {digit ?? '--'}
                    </span>

                    <span>
                        Quote: {lastTick?.quote ?? '--'}
                    </span>

                </div>

            </section>


            <section className="ai-lab-volatility">

                <div className="section-heading">
                    VOLATILITY MARKET INTELLIGENCE
                </div>


                <div className="volatility-control">

                    <button
                        type="button"
                        onClick={runVolatilityScanner}
                        disabled={volatilityScanning}
                    >
                        {volatilityScanning
                            ? 'SCANNING MARKETS...'
                            : 'SCAN VOLATILITY MARKETS'}
                    </button>


                    <div className="volatility-summary">

                        <span>
                            Markets:
                            {' '}
                            {volatilityScan?.markets.length ?? '--'}
                        </span>


                        <span>
                            Loaded:
                            {' '}
                            {volatilityScan?.loadedMarkets ?? '--'}
                        </span>


                        <span>
                            Failed:
                            {' '}
                            {volatilityScan?.failedMarkets ?? '--'}
                        </span>

                    </div>

                </div>


                {volatilityError && (

                    <div className="volatility-error">
                        {volatilityError}
                    </div>

                )}


                <div className="volatility-selected">

    <div>

        <span>
            TRADING MARKET
        </span>

        <strong>
            {selectedScanMarket || market}
        </strong>

    </div>


    <div>

        <span>
            AI RECOMMENDATION
        </span>

        <strong>
            {volatilityScan?.selected?.symbol || '--'}
        </strong>

    </div>


    <div>

        <span>
            SCORE
        </span>

        <strong>
            {selectedScanMarket
                ? (
                    volatilityScan.rankings.find(
                        item =>
                            item.symbol ===
                            selectedScanMarket
                    )?.score ?? 0
                ).toFixed(1)
                : '--'}
        </strong>

    </div>


    <div>

        <span>
            STATUS
        </span>

        <strong>
            {selectedScanMarket
                ? 'USER SELECTED'
                : 'SELECT A MARKET'}
        </strong>

    </div>

</div>


                {volatilityScan && (

                    <div className="volatility-ranking">

                        <div className="volatility-ranking-header">

    <span>#</span>

    <span>MARKET</span>

    <span>SCORE</span>

    <span>VOLATILITY</span>

    <span>STABILITY</span>

    <span>TREND</span>

    <span>PATTERN</span>

    <span>DECISION</span>

    <span>ACTION</span>

</div>


{volatilityScan.rankings.map(
    (ranking, index) => {

        const isSelected =
            selectedScanMarket === ranking.symbol;

        const isRecommended =
            volatilityScan.selected?.symbol ===
            ranking.symbol;

        return (
            <div
                className={
                    `volatility-ranking-row ${
                        isSelected
                            ? 'selected-market'
                            : ''
                    }`
                }
                key={ranking.symbol}
            >

                <span>
                    {index + 1}
                </span>

                <strong>
                    {ranking.symbol}
                </strong>

                <span>
                    {ranking.score.toFixed(1)}
                </span>

                <span>
                    {ranking.metrics.volatility.toFixed(1)}
                </span>

                <span>
                    {ranking.metrics.stability.toFixed(1)}
                </span>

                <span>
                    {ranking.metrics.trendStrength.toFixed(1)}
                </span>

                <span>
                    {ranking.metrics.patternPersistence.toFixed(1)}
                </span>

                <span>
                    {ranking.decision}
                </span>

                <button
                    type="button"
                    className={
                        isSelected
                            ? 'market-select-button selected'
                            : 'market-select-button'
                    }
                    onClick={() =>
                        selectScannedMarket(
                            ranking.symbol
                        )
                    }
                >
                    {isSelected
                        ? 'SELECTED'
                        : 'SELECT'}
                </button>

                {isRecommended &&
                    !isSelected && (
                        <span className="scanner-recommended">
                            AI PICK
                        </span>
                    )}

            </div>
        );
    }
)}
                    </div>

                )}

            </section>


            <section className="ai-lab-signal">

               <div className="section-heading">
    AI CORE
</div>


                                <div className="signal-grid">

                    <div className="signal-card">

                        <span>
                            ENTRY
                        </span>

                        <strong>
                            {signal?.entryDigit ?? '--'}
                        </strong>

                    </div>


                    <div className="signal-card">

                        <span>
                            BARRIER
                        </span>

                        <strong>
                            {signal?.barrierDigit ?? '--'}
                        </strong>

                    </div>


                    <div className="signal-card signal-confidence-card">

                        <span>
                            CONFIDENCE
                        </span>

                        <strong>
                            {signal
                                ? `${signal.confidence.toFixed(1)}%`
                                : '--'}
                        </strong>

                    </div>


                    <div className="signal-card">

                        <span>
                            QUALITY SCORE
                        </span>

                        <strong>
                            {signal
                                ? `${signal.qualityScore.toFixed(1)}`
                                : '--'}
                        </strong>

                    </div>

                </div>


                <div className="signal-action">

                    <button
                        type="button"
                        onClick={applySignalToBot}
                        disabled={!signal?.ready}
                        className="apply-signal-button"
                    >
                        APPLY TO BOT
                    </button>

                </div>


            </section>


            <section className="ai-lab-grid">

                <div className="ai-lab-panel">

                    <div className="section-heading">
                        ENGINE BREAKDOWN
                    </div>


                    <div className="engine-row">

                        <span>
                            Digit Engine
                        </span>

                        <strong>
                            {engineState?.scores?.[0]
                                ? engineState.scores[0].digit
                                : '--'}
                        </strong>

                    </div>


                    <div className="engine-row">

                        <span>
                            Barrier Engine
                        </span>

                        <strong>
                            {engineState?.barrier?.barrierDigit ??
                                '--'}
                        </strong>

                    </div>


                    <div className="engine-row">

                        <span>
                            Entry Engine
                        </span>

                        <strong>
                            {engineState?.entry?.entryDigit ??
                                '--'}
                        </strong>

                    </div>


                    <div className="engine-row">

                        <span>
                            Fibonacci
                        </span>

                        <strong>
                            {signal?.fibLevel ?? '--'}
                        </strong>

                    </div>


                    <div className="engine-row">

                        <span>
                            Regime
                        </span>

                        <strong>
                            {engineState?.regime?.regime ??
                                '--'}
                        </strong>

                    </div>


                    <div className="engine-row">

                        <span>
                            Confluence
                        </span>

                        <strong>
                            {signal
                                ? signal.confluenceScore.toFixed(1)
                                : '--'}
                        </strong>

                    </div>


                    <div className="engine-row">

                        <span>
                            Quality
                        </span>

                        <strong>
                            {signal
                                ? signal.qualityScore.toFixed(1)
                                : '--'}
                        </strong>

                    </div>

                </div>


                <div className="ai-lab-panel">

                    <div className="section-heading">
                        SIGNAL STATUS
                    </div>


                    <div className="status-main">

                        <span
                            className={
                                signal?.ready
                                    ? 'status-ready'
                                    : 'status-waiting'
                            }
                        >
                            {signal?.ready
                                ? 'READY'
                                : 'WAITING'}
                        </span>

                    </div>


                    <div className="status-row">

                        <span>
                            Entry
                        </span>

                        <strong>
                            {signal?.entryDigit ?? '--'}
                        </strong>

                    </div>


                    <div className="status-row">

                        <span>
                            Barrier
                        </span>

                        <strong>
                            {signal?.barrierDigit ?? '--'}
                        </strong>

                    </div>


                    <div className="status-row">

                        <span>
                            Relationship
                        </span>

                        <strong>
                            {signal
                                ? signal.relationshipScore.toFixed(1)
                                : '--'}
                        </strong>

                    </div>


                    <div className="status-row">

                        <span>
                            Regime
                        </span>

                        <strong>
                            {signal?.regime ?? '--'}
                        </strong>

                    </div>


                    <div className="status-row">

                        <span>
                            Pending Signals
                        </span>

                        <strong>
                            {adapterRef.current
                                ?.getPendingCount() ?? 0}
                        </strong>

                    </div>

                </div>

            </section>


            <section className="ai-lab-performance">

                <div className="section-heading">
                    MATCHES PERFORMANCE
                </div>


                <div className="performance-grid">

                    <div>
                        <span>
                            TOTAL
                        </span>

                        <strong>
                            {stats.total}
                        </strong>
                    </div>


                    <div>
                        <span>
                            WINS
                        </span>

                        <strong>
                            {stats.wins}
                        </strong>
                    </div>


                    <div>
                        <span>
                            LOSSES
                        </span>

                        <strong>
                            {stats.losses}
                        </strong>
                    </div>


                    <div>
                        <span>
                            WIN RATE
                        </span>

                        <strong>
                            {stats.winRate.toFixed(1)}%
                        </strong>
                    </div>

                </div>

            </section>


            <section className="ai-lab-learning">

                <div className="section-heading">
                    ADAPTIVE LEARNING
                </div>


                {learningStats.length === 0 ? (

                    <div className="learning-empty">
                        Waiting for completed Matches
                        outcomes...
                    </div>

                ) : (

                    <div className="learning-list">

                        {learningStats
                            .slice(0, 10)
                            .map((item, index) => (

                                <div
                                    className="learning-row"
                                    key={`${item.key.symbol}-${item.key.regime}-${item.key.entryDigit}-${item.key.barrierDigit}-${item.key.fibLevel}-${index}`}
                                >

                                    <span>
                                        {item.key.symbol}
                                    </span>

                                    <span>
                                        E{item.key.entryDigit}
                                        {' â†’ '}
                                        B{item.key.barrierDigit}
                                    </span>

                                    <span>
                                        {item.key.regime}
                                    </span>

                                    <strong>
                                        {item.winRate.toFixed(1)}%
                                    </strong>

                                </div>

                            ))}

                    </div>

                )}

            </section>

        </div>

    );

};


export default AiLab;

