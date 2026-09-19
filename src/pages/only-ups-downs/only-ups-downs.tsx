import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ChunkLoader from '@/components/loader/chunk-loader';
import TradingViewComponent from '@/components/trading-view-chart/trading-view';
import chart_api from '@/external/bot-skeleton/services/api/chart-api';
import { useSmartChartAdaptor } from '@/hooks/useSmartChartAdaptor';
import { OnlyUpsDownsLive } from '@/only-ups-downs/live/only-ups-downs-live';
import type { OnlyUpsDownsScannerSnapshot } from '@/only-ups-downs/scanner/only-ups-downs-scanner';
import type {
    OnlyUpsDownsAnalysisHorizon,
} from '@/only-ups-downs/types/only-ups-downs-types';
import './only-ups-downs.scss';
import { DBOT_TABS } from '@/constants/bot-contents';
import { useStore } from '@/hooks/useStore';
import { load, save_types } from '@/external/bot-skeleton';
import { saveWorkspaceToRecent } from '@/external/bot-skeleton/utils';
import { FREE_BOTS } from '@/constants/free-bots';

const emptySnapshot = (): OnlyUpsDownsScannerSnapshot => ({
    ready: false,
    price: null,
    prices: [],
    pointCount: 0,
    direction: null,
    structure: {} as OnlyUpsDownsScannerSnapshot['structure'],
    pressure: {} as OnlyUpsDownsScannerSnapshot['pressure'],
    reversal: {} as OnlyUpsDownsScannerSnapshot['reversal'],
    signal: null,
    signalLocked: false,
    updatedAt: 0,
});

const clampPercent = (value: number): number =>
    Math.max(0, Math.min(100, Number(value) || 0));

const formatHorizon = (
    horizon: OnlyUpsDownsAnalysisHorizon | null | undefined,
): string => {
    if (!horizon) return 'WAITING';

    return horizon.replace(/_/g, ' ');
};

const OnlyUpsDowns = () => {
    const {
        dashboard,
        load_modal,
        blockly_store,
        dbot,
        run_panel,
    } = useStore();

    const { setActiveTab } = dashboard;

    const { setSelectedStrategyId } = load_modal;

    const { setLoading } = blockly_store;
    const {
        adapter,
        adapterInitialized,
        chartData,
        getQuotes,
        subscribeQuotes,
        unsubscribeQuotes,
    } = useSmartChartAdaptor();

    const is_connection_opened = !!chart_api?.api;

    const liveRef = useRef<OnlyUpsDownsLive | null>(null);

    const pendingHistoryRef = useRef<number[]>([]);
    const pendingHistorySymbolRef = useRef<string | null>(null);
    const seededHistorySymbolRef = useRef<string | null>(null);

    const ONLY_UPS_DOWNS_MARKET_STORAGE_KEY =
        'only_ups_downs_selected_market';

    const [symbol, setSymbol] = useState(() => {
        try {
            return (
                localStorage.getItem(
                    ONLY_UPS_DOWNS_MARKET_STORAGE_KEY,
                ) ?? ''
            );
        } catch {
            return '';
        }
    });

    const [analysisHorizon, setAnalysisHorizon] =
        useState<OnlyUpsDownsAnalysisHorizon>('AUTO');
    const [snapshot, setSnapshot] = useState<OnlyUpsDownsScannerSnapshot>(
        emptySnapshot(),
    );

    const [appliedSignalKey, setAppliedSignalKey] =
        useState<string | null>(null);

      /*
       * ---------------------------------------------------------
       * OUD AUTO-APPLY LIFECYCLE
       * ---------------------------------------------------------
       *
       * The first READY signal requires the user to press
       * APPLY SIGNAL manually.
       *
       * Once that first signal has been successfully applied,
       * subsequent NEW READY signals may be applied automatically.
       */
      const [autoApplySignals, setAutoApplySignals] =
          useState(false);


    const symbols = useMemo(
        () =>
            (chartData.activeSymbols ?? []).filter(
                (item) => item.market === 'synthetic_index',
            ),
        [chartData.activeSymbols],
    );

    const selectedMarket = useMemo(
        () =>
            symbols.find((item) => item.symbol === symbol) ?? null,
        [symbols, symbol],
    );

    useEffect(() => {
        if (!symbols.length) return;

        const exists = symbols.some(
            (item) => item.symbol === symbol,
        );

        if (exists) {
            return;
        }

        try {
            const savedMarket = localStorage.getItem(
                ONLY_UPS_DOWNS_MARKET_STORAGE_KEY,
            );

            if (
                savedMarket &&
                symbols.some(
                    (item) => item.symbol === savedMarket,
                )
            ) {
                setSymbol(savedMarket);
                return;
            }
        } catch {
            // Fall through to the first available market.
        }

        setSymbol(symbols[0].symbol);
    }, [symbols, symbol]);

    const getQuotesForOnlyUpsDowns = useCallback(
        async (params: Parameters<typeof getQuotes>[0]) => {
            const result = await getQuotes(params);

            if (
                params.granularity === 0 &&
                params.symbol === symbol &&
                Array.isArray(result?.history?.prices)
            ) {
                const historySymbol = params.symbol;

                if (
                    historySymbol &&
                    seededHistorySymbolRef.current !== historySymbol
                ) {
                    const prices = result.history.prices
                        .map(Number)
                        .filter(
                            (price) =>
                                Number.isFinite(price) &&
                                price > 0,
                        );

                    pendingHistoryRef.current = prices;
                    pendingHistorySymbolRef.current = historySymbol;

                    if (liveRef.current) {
                        liveRef.current.addPrices(prices);
                        pendingHistoryRef.current = [];
                        pendingHistorySymbolRef.current = null;
                        seededHistorySymbolRef.current = historySymbol;
                    }
                }
            }

            return result;
        },
        [getQuotes, symbol],
    );

    useEffect(() => {
        if (!adapter || !adapterInitialized || !symbol) {
            return;
        }

        const live = new OnlyUpsDownsLive(adapter, {
            maxPoints: 2000,
            minimumPoints: 40,
            horizon: analysisHorizon,
        });

        liveRef.current = live;
        live.setSymbol(symbol);

        void live.start(symbol);

        if (
            pendingHistorySymbolRef.current === symbol &&
            pendingHistoryRef.current.length
        ) {
            live.addPrices(pendingHistoryRef.current);
            pendingHistoryRef.current = [];
            pendingHistorySymbolRef.current = null;
            seededHistorySymbolRef.current = symbol;
        }

        setSnapshot(live.getSnapshot());

        const interval = window.setInterval(() => {
            setSnapshot(live.getSnapshot());
        }, 250);

        return () => {
            window.clearInterval(interval);
            live.stop();

            if (liveRef.current === live) {
                liveRef.current = null;
            }
        };
    }, [adapter, adapterInitialized, symbol, analysisHorizon]);

    /*
     * ---------------------------------------------------------
     * RELEASE APPLIED SIGNAL AFTER ITS READY CYCLE ENDS
     * ---------------------------------------------------------
     *
     * A locked READY signal has already authorized its one
     * execution. Do not clear the page state while that signal
     * remains locked.
     *
     * Once the scanner leaves READY and releases its lifecycle
     * lock, the next READY state is allowed to become a new
     * signal.
     */
    useEffect(() => {
        if (
            snapshot.signal !== null ||
            snapshot.signalLocked
        ) {
            return;
        }

        setAppliedSignalKey(null);
    }, [
        snapshot.signal,
        snapshot.signalLocked,
    ]);

    const subscribeOnlyUpsDownsQuotes = useCallback(
        (params, callback) => {
            return subscribeQuotes(params, (quote) => {
                const price =
                    Number.isFinite(quote?.Close)
                        ? quote.Close
                        : null;

                if (price !== null && price > 0) {
                    liveRef.current?.addPrice(price);
                }

                callback(quote);
            });
        },
        [subscribeQuotes],
    );

    const signal = snapshot.signal;

    const signalDirection =
        signal?.botDirection === 'ups'
            ? 'UP'
            : signal?.botDirection === 'downs'
                ? 'DOWN'
                : 'WAIT';

    const status =
        signal?.status ??
        (snapshot.ready ? 'WAIT' : 'BUILDING');

    const confidence =
        clampPercent(signal?.confidence ?? 0);

    const trendStrength =
        clampPercent(signal?.trendScore ?? 0);

    const structureAlignment =
        clampPercent(signal?.structureScore ?? 0);

    const momentumShift =
        clampPercent(signal?.momentumShiftScore ?? 0);

    const stabilityScore =
        signal?.stabilitySafe
            ? 100
            : 0;

    const volatilityScore =
        signal?.volatilitySafe
            ? 100
            : 0;

    const signalKey = signal
    ? [
        symbol,
        signal.botDirection ?? 'none',
        signal.selectedHorizon,
        signal.mode,
        signal.status,
        signal.entryQuality,
        signal.reason,
        signal.confidence,
        signal.trendScore,
        signal.exhaustionScore,
        signal.oppositePressureScore,
        signal.structureScore,
        signal.momentumShiftScore,
        signal.rsiConfirmation,
        signal.bollingerConfirmation,
        signal.adxConfirmation,
        signal.volatilitySafe,
        signal.stabilitySafe,
        signal.reversalRisk,
        signal.entryScore,
    ].join('|')
    : null;

    const hasAppliedSignal =
        !!signalKey &&
        appliedSignalKey === signalKey;

    const canApplySignal =
        !!signal &&
        signal.status === 'READY' &&
        !!signal.botDirection &&
        !hasAppliedSignal;
    useEffect(() => {
        if (
            !signal ||
            signal.status !== 'READY' ||
            !signal.botDirection ||
            !autoApplySignals ||
            !signalKey ||
            signalKey === appliedSignalKey
        ) {
            return;
        }

        const direction =
            signal.botDirection === 'ups'
                ? 'UP'
                : 'DOWN';

        const runtimeUpdated =
            dbot?.setRuntimeVariable?.(
                'Direction',
                direction,
            ) ?? false;

        if (!runtimeUpdated) {
            return;
        }

        dbot?.setRuntimeVariable?.(
            'signal armed',
            1,
        );

        dbot?.setRuntimeVariable?.(
            'signal consumed',
            0,
        );

        dbot?.setRuntimeVariable?.(
            'trading mode',
            0,
        );

        setAppliedSignalKey(signalKey);
    }, [
        autoApplySignals,
        signal,
        signalKey,
        appliedSignalKey,
        dbot,
    ]);

    const handleApplySignal = async () => {
    if (!signalKey || !signal) return;

    if (
        signal.status !== 'READY' ||
        !signal.botDirection
    ) {
        return;
    }

    const bot = FREE_BOTS.find(
        item => item.id === 'only-ups-downs-signal',
    );

    if (!bot?.xml) {
        console.error(
            'ONLY UPS / ONLY DOWNS: SIGNAL BOT XML NOT FOUND',
        );
        return;
    }

    const direction =
        signal.botDirection === 'ups'
            ? 'UP'
            : signal.botDirection === 'downs'
                ? 'DOWN'
                : null;

    if (!direction) {
        console.error(
            'ONLY UPS / ONLY DOWNS: INVALID SIGNAL DIRECTION',
            signal,
        );
        return;
    }

    setLoading(true);

    try {
        const workspace =
            window.Blockly?.derivWorkspace;

        if (!workspace) {
            throw new Error(
                'Blockly workspace is not ready',
            );
        }

        /*
 * Use the market currently being analysed.
 *
 * Apply Signal must configure the bot for the
 * exact market that produced this signal.
 */
const oudMarket = symbol;

        console.log(
            'ONLY UPS / ONLY DOWNS: APPLY SIGNAL',
            {
                market: oudMarket,
                direction,
                botDirection: signal.botDirection,
                horizon: signal.selectedHorizon,
                mode: signal.mode,
                confidence: signal.confidence,
            },
        );

        /*
 * ---------------------------------------------------------
 * PRESERVE OUD MARTINGALE STATE
 * ---------------------------------------------------------
 *
 * A fresh signal reloads the OUD XML, but the current
 * Martingale stake and loss counter must survive.
 *
 * First signal:
 *   no existing state -> XML defaults are used.
 *
 * Later signal:
 *   preserve current Stake and lossCounter.
 */
const readVariableNumber = (
    variableName: string,
): number | null => {
    const existingBlocks =
        workspace.getAllBlocks() as any[];

    const variableBlock =
        existingBlocks.find(block => {
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
                variableName
            );
        });

    if (!variableBlock) {
        return null;
    }

    const valueBlock =
        variableBlock.getInputTargetBlock(
            'VALUE',
        );

    const valueField =
        valueBlock?.getField('NUM');

    if (!valueField) {
        return null;
    }

    const value =
        Number(valueField.getValue());

    return Number.isFinite(value)
        ? value
        : null;
};

const preservedStake =
    readVariableNumber('Stake');

const preservedLossCounter =
    readVariableNumber('lossCounter');

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

/*
 * ---------------------------------------------------------
 * RESTORE OUD MARTINGALE STATE
 * ---------------------------------------------------------
 */
const restoreVariableNumber = (
    variableName: string,
    value: number | null,
) => {
    if (value === null) {
        return;
    }

    const variableBlock =
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
                variableName
            );
        });

    if (!variableBlock) {
        console.warn(
            `ONLY UPS / ONLY DOWNS: ${variableName} restore block not found`,
        );
        return;
    }

    const valueBlock =
        variableBlock.getInputTargetBlock(
            'VALUE',
        );

    const numberField =
        valueBlock?.getField('NUM');

    if (numberField) {
        numberField.setValue(
            String(value),
        );
    }
};

restoreVariableNumber(
    'Stake',
    preservedStake,
);

restoreVariableNumber(
    'lossCounter',
    preservedLossCounter,
);

        /*
 * ---------------------------------------------------------
 * APPLY ANALYSED OUD MARKET
 * ---------------------------------------------------------
 */
        const marketBlock =
            blocks.find(
                block =>
                    block.type ===
                    'trade_definition_market',
            );

        if (marketBlock) {
            const symbolField =
                marketBlock.getField('SYMBOL_LIST');

            if (symbolField) {
    symbolField.setValue(oudMarket);

    const appliedMarket =
        symbolField.getValue();

    if (appliedMarket !== oudMarket) {
        throw new Error(
            `OUD MARKET MISMATCH: analysed=${oudMarket}, applied=${appliedMarket}`,
        );
    }

    console.log(
        'ONLY UPS / ONLY DOWNS: ANALYSED MARKET APPLIED',
        {
            analysedMarket: oudMarket,
            appliedMarket,
        },
    );
}
        }

        /*
         * ---------------------------------------------------------
         * APPLY DIRECTION
         * ---------------------------------------------------------
         *
         * UP   = CALL
         * DOWN = PUT
         *
         * The XML itself handles CALL/PUT execution.
         * We only inject the signal direction here.
         */
        const directionBlock =
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
                    'Direction'
                );
            });

        if (directionBlock) {
            const directionValue =
                directionBlock.getInputTargetBlock(
                    'VALUE',
                );

            directionValue
                ?.getField('TEXT')
                ?.setValue(direction);
        } else {
            console.warn(
                'ONLY UPS / ONLY DOWNS: Direction variable block not found',
            );
        }

        /*
         * ---------------------------------------------------------
         * ARM NEW SIGNAL
         * ---------------------------------------------------------
         */
        const setVariableValue = (
            variableName: string,
            value: string,
        ) => {
            const block =
                blocks.find(item => {
                    if (
                        item.type !==
                        'variables_set'
                    ) {
                        return false;
                    }

                    const variableField =
                        item.getField('VAR');

                    return (
                        variableField?.getText() ===
                        variableName
                    );
                });

            if (!block) {
                console.warn(
                    `ONLY UPS / ONLY DOWNS: ${variableName} variable block not found`,
                );
                return;
            }

            const valueBlock =
                block.getInputTargetBlock(
                    'VALUE',
                );

            valueBlock
                ?.getField('NUM')
                ?.setValue(value);
        };

                setVariableValue(
            'signal armed',
            '1',
        );

        setVariableValue(
            'signal consumed',
            '0',
        );

        setVariableValue(
            'trading mode',
            '0',
        );

        dbot?.setRuntimeVariable?.(
            'Direction',
            signalDirection,
        );

        dbot?.setRuntimeVariable?.(
            'signal armed',
            1,
        );

        dbot?.setRuntimeVariable?.(
            'signal consumed',
            0,
        );

        dbot?.setRuntimeVariable?.(
            'trading mode',
            0,
        );

        /*
         * ---------------------------------------------------------
         * PERSIST FINAL OUD WORKSPACE
         * ---------------------------------------------------------
         */
        const updatedXml =
            window.Blockly.Xml.workspaceToDom(
                workspace,
            );

        (window.Blockly as any).xmlValues = {
            ...((window.Blockly as any).xmlValues || {}),
            strategy_id: bot.id,
            convertedDom: updatedXml,
            file_name: bot.name,
            from: save_types.LOCAL,
        };

        await saveWorkspaceToRecent(
            updatedXml,
            save_types.LOCAL,
        );

        /*
         * ---------------------------------------------------------
         * START OFFICIAL BOT EXECUTION
         * ---------------------------------------------------------
         *
         * The signal has now been fully configured and persisted.
         * Use the application's official Run Bot lifecycle.
         *
         * Do NOT call dbot.runBot() directly here.
         */
        await run_panel.onRunButtonClick();
        workspace.render();

        setSelectedStrategyId(
            bot.id,
        );

        setActiveTab(
            DBOT_TABS.BOT_BUILDER,
        );

        /*
         * Mark THIS exact signal as consumed
         * by the OUD page.
         */
        setAppliedSignalKey(signalKey);
        setAutoApplySignals(true);

        console.log(
            'ONLY UPS / ONLY DOWNS: SIGNAL APPLIED SUCCESSFULLY',
            {
                market: oudMarket,
                direction,
                signalKey,
            },
        );
    } catch (error) {
        console.error(
            'ONLY UPS / ONLY DOWNS: APPLY SIGNAL ERROR',
            error,
        );
    } finally {
        setLoading(false);
    }
};

    if (!symbol || symbols.length === 0) {
        return <ChunkLoader message='' />;
    }

    return (
        <div className='only-ups-downs-page'>

            {/* =====================================================
                EXISTING HEADER
               ===================================================== */}

            <div className='only-ups-downs-page__header'>
                <div>
                    <h1>Only Ups / Only Downs</h1>
                    <p>
                        Independent live market scanner and signal engine
                    </p>
                </div>

                <div className='only-ups-downs-page__status'>
                    <span
                        className={
                            adapterInitialized
                                ? 'status-dot status-dot--live'
                                : 'status-dot'
                        }
                    />
                    {adapterInitialized ? 'LIVE' : 'CONNECTING'}
                </div>
            </div>

            {/* =====================================================
                EXISTING CONTROLS
               ===================================================== */}

            <div className='only-ups-downs-page__controls'>
                <label htmlFor='only-ups-downs-market'>
                    Derived Market
                </label>

                <select
                    id='only-ups-downs-market'
                    value={symbol}
onChange={(event) => {
    const nextMarket = event.target.value;

    setSymbol(nextMarket);
    setAppliedSignalKey(null);
        setAutoApplySignals(false);

    try {
        localStorage.setItem(
            ONLY_UPS_DOWNS_MARKET_STORAGE_KEY,
            nextMarket,
        );
    } catch {
        // Ignore storage failures.
    }
}}
                    disabled={!symbols.length}
                >
                    {symbols.map((item) => (
                        <option
                            key={item.symbol}
                            value={item.symbol}
                        >
                            {item.display_name} ({item.symbol})
                        </option>
                    ))}
                </select>

                <label htmlFor='only-ups-downs-horizon'>
                    Analysis Horizon
                </label>

                <select
                    id='only-ups-downs-horizon'
                    value={analysisHorizon}
                    onChange={(event) => {
                        setAnalysisHorizon(
                            event.target.value as OnlyUpsDownsAnalysisHorizon,
                        );
                        setAppliedSignalKey(null);
                          setAutoApplySignals(false);
                    }}
                >
                    <option value='AUTO'>AUTO</option>
                    <option value='SHORT_TERM'>SHORT TERM</option>
                    <option value='MEDIUM_TERM'>MEDIUM TERM</option>
                    <option value='LONG_TERM'>LONG TERM</option>
                    <option value='MULTI_TIMEFRAME'>
                        MULTI-TIMEFRAME
                    </option>
                </select>
            </div>

            {/* =====================================================
                EXISTING TRADINGVIEW / SMARTCHART
                DO NOT MODIFY THIS BLOCK
               ===================================================== */}

            <div className='only-ups-downs-page__chart-card'>
                <div className='only-ups-downs-page__chart-header'>
                    <h2>LIVE MARKET CHART</h2>
                    <span>{symbol}</span>
                </div>

                <div className='only-ups-downs-page__chart'>
                    <TradingViewComponent />
                </div>
            </div>

            {/* =====================================================
                ONLY UPS / ONLY DOWNS COMMAND CENTER
               ===================================================== */}

            <section className='only-ups-downs-command-center'>

                <div className='only-ups-downs-command-center__header'>
                    <div>
                        <div className='only-ups-downs-command-center__eyebrow'>
                            AI MARKET SIGNAL ENGINE
                        </div>

                        <h2>
                            ONLY UPS / ONLY DOWNS
                        </h2>

                        <p>
                            Live directional analysis and execution-ready
                            signal qualification.
                        </p>
                    </div>

                    <div className='only-ups-downs-command-center__live'>
                        <span
                            className={
                                adapterInitialized
                                    ? 'status-dot status-dot--live'
                                    : 'status-dot'
                            }
                        />
                        {adapterInitialized ? 'LIVE' : 'CONNECTING'}
                    </div>
                </div>

                {/* =================================================
                    SELECTED MARKET
                   ================================================= */}

                <div className='only-ups-downs-market-strip'>

                    <div className='only-ups-downs-market-strip__label'>
                        SELECTED MARKET
                    </div>

                    <div className='only-ups-downs-market-strip__market'>
                        <strong>
                            {symbol}
                        </strong>

                        <span>
                            {selectedMarket?.display_name ?? 'Synthetic Market'}
                        </span>
                    </div>

                    <div className='only-ups-downs-market-strip__ticks'>
                        <span>BUFFER</span>
                        <strong>
                            {snapshot.pointCount}
                        </strong>
                    </div>

                    <div className='only-ups-downs-market-strip__price'>
                        <span>LIVE PRICE</span>
                        <strong>
                            {snapshot.price !== null
                                ? snapshot.price
                                : '--'}
                        </strong>
                    </div>

                </div>

                {/* =================================================
                    PRIMARY SIGNAL
                   ================================================= */}

                <div
                    className={`only-ups-downs-primary-signal ${
                        signalDirection === 'UP'
                            ? 'only-ups-downs-primary-signal--up'
                            : signalDirection === 'DOWN'
                                ? 'only-ups-downs-primary-signal--down'
                                : 'only-ups-downs-primary-signal--wait'
                    }`}
                >
                    <div className='only-ups-downs-primary-signal__label'>
                        PRIMARY SIGNAL
                    </div>

                    <div className='only-ups-downs-primary-signal__direction'>
                        {signalDirection === 'UP' && '?'}
                        {signalDirection === 'DOWN' && '?'}
                        {signalDirection === 'WAIT' && ' '}
                    </div>

                    <div className='only-ups-downs-primary-signal__value'>
                        {signalDirection}
                    </div>

                    <div className='only-ups-downs-primary-signal__confidence'>
                        {confidence.toFixed(1)}%
                        <span>CONFIDENCE</span>
                    </div>

                    <div className='only-ups-downs-primary-signal__horizon'>
                        {formatHorizon(signal?.selectedHorizon)}
                    </div>

                    <div className='only-ups-downs-primary-signal__mode'>
                        {signal?.mode ?? 'NONE'}
                    </div>
                </div>

                {/* =================================================
                    SIGNAL SUMMARY
                   ================================================= */}

                <div className='only-ups-downs-signal-summary'>

                    <div>
                        <span>ENGINE CONFIDENCE</span>
                        <strong>
                            {confidence.toFixed(1)}%
                        </strong>
                    </div>

                    <div>
                        <span>DIRECTION</span>
                        <strong>
                            {signalDirection}
                        </strong>
                    </div>

                    <div>
                        <span>HORIZON</span>
                        <strong>
                            {formatHorizon(signal?.selectedHorizon)}
                        </strong>
                    </div>

                    <div>
                        <span>STATUS</span>
                        <strong>
                            {status}
                        </strong>
                    </div>

                </div>

                {/* =================================================
                    SIGNAL INTELLIGENCE
                   ================================================= */}

                <div className='only-ups-downs-intelligence'>

                    <div className='only-ups-downs-section-heading'>
                        <span>SIGNAL INTELLIGENCE</span>
                        <small>
                            LIVE ENGINE COMPONENTS
                        </small>
                    </div>

                    <div className='only-ups-downs-intelligence__grid'>

                        <div className='only-ups-downs-intelligence__metric'>
                            <div className='only-ups-downs-intelligence__metric-head'>
                                <span>TREND STRENGTH</span>
                                <strong>
                                    {trendStrength.toFixed(1)}%
                                </strong>
                            </div>

                            <div className='only-ups-downs-meter'>
                                <div
                                    className='only-ups-downs-meter__fill'
                                    style={{
                                        width: `${trendStrength}%`,
                                    }}
                                />
                            </div>
                        </div>

                        <div className='only-ups-downs-intelligence__metric'>
                            <div className='only-ups-downs-intelligence__metric-head'>
                                <span>STRUCTURE ALIGNMENT</span>
                                <strong>
                                    {structureAlignment.toFixed(1)}%
                                </strong>
                            </div>

                            <div className='only-ups-downs-meter'>
                                <div
                                    className='only-ups-downs-meter__fill'
                                    style={{
                                        width: `${structureAlignment}%`,
                                    }}
                                />
                            </div>
                        </div>

                        <div className='only-ups-downs-intelligence__metric'>
                            <div className='only-ups-downs-intelligence__metric-head'>
                                <span>MOMENTUM SHIFT</span>
                                <strong>
                                    {momentumShift.toFixed(1)}%
                                </strong>
                            </div>

                            <div className='only-ups-downs-meter'>
                                <div
                                    className='only-ups-downs-meter__fill'
                                    style={{
                                        width: `${momentumShift}%`,
                                    }}
                                />
                            </div>
                        </div>

                        <div className='only-ups-downs-intelligence__metric'>
                            <div className='only-ups-downs-intelligence__metric-head'>
                                <span>STABILITY</span>
                                <strong>
                                    {stabilityScore.toFixed(0)}%
                                </strong>
                            </div>

                            <div className='only-ups-downs-meter'>
                                <div
                                    className='only-ups-downs-meter__fill'
                                    style={{
                                        width: `${stabilityScore}%`,
                                    }}
                                />
                            </div>
                        </div>

                        <div className='only-ups-downs-intelligence__metric'>
                            <div className='only-ups-downs-intelligence__metric-head'>
                                <span>VOLATILITY SAFETY</span>
                                <strong>
                                    {volatilityScore.toFixed(0)}%
                                </strong>
                            </div>

                            <div className='only-ups-downs-meter'>
                                <div
                                    className='only-ups-downs-meter__fill'
                                    style={{
                                        width: `${volatilityScore}%`,
                                    }}
                                />
                            </div>
                        </div>

                        <div className='only-ups-downs-intelligence__metric'>
                            <div className='only-ups-downs-intelligence__metric-head'>
                                <span>ENTRY SCORE</span>
                                <strong>
                                    {Number(signal?.entryScore ?? 0).toFixed(1)}
                                </strong>
                            </div>

                            <div className='only-ups-downs-meter'>
                                <div
                                    className='only-ups-downs-meter__fill'
                                    style={{
                                        width: `${clampPercent(
                                            signal?.entryScore ?? 0,
                                        )}%`,
                                    }}
                                />
                            </div>
                        </div>

                    </div>
                </div>

                {/* =================================================
                    SIGNAL QUALIFICATION
                   ================================================= */}

                <div className='only-ups-downs-qualification'>

                    <div>
                        <span>ENTRY QUALITY</span>
                        <strong>
                            {signal?.entryQuality ?? 'NONE'}
                        </strong>
                    </div>

                    <div>
                        <span>REVERSAL RISK</span>
                        <strong>
                            {signal?.reversalRisk ?? 'NONE'}
                        </strong>
                    </div>

                    <div>
                        <span>VOLATILITY</span>
                        <strong>
                            {signal?.volatilitySafe ? 'SAFE' : 'UNSAFE'}
                        </strong>
                    </div>

                    <div>
                        <span>STABILITY</span>
                        <strong>
                            {signal?.stabilitySafe ? 'STABLE' : 'UNSTABLE'}
                        </strong>
                    </div>

                </div>

                {/* =================================================
                    SIGNAL REASON
                   ================================================= */}

                <div className='only-ups-downs-reason'>

                    <div className='only-ups-downs-section-heading'>
                        <span>SIGNAL REASON</span>
                        <small>
                            ENGINE EXPLANATION
                        </small>
                    </div>

                    <div className='only-ups-downs-reason__body'>
                        {signal?.reason ||
                            'The engine is still building enough market structure to qualify a directional signal.'}
                    </div>

                </div>

                {/* =================================================
                    APPLY SIGNAL
                   ================================================= */}

                <div className='only-ups-downs-apply'>

                    <button
                        type='button'
                        className={`only-ups-downs-apply__button ${
                            hasAppliedSignal
                                ? 'only-ups-downs-apply__button--applied'
                                : ''
                        }`}
                        onClick={handleApplySignal}
                        disabled={!canApplySignal}
                    >
                        {hasAppliedSignal
                            ? '? SIGNAL APPLIED'
                            : signal?.status === 'READY'
                                ? 'APPLY SIGNAL'
                                : 'SIGNAL NOT READY'}
                    </button>

                    <div className='only-ups-downs-apply__notice'>
                        {hasAppliedSignal ? (
                            <>
                                <strong>
                                    SIGNAL CONSUMED
                                </strong>
                                <span>
                                    One applied signal ? one contract ?
                                    wait for a new qualified signal.
                                </span>
                            </>
                        ) : (
                            <>
                                <strong>
                                    EXECUTION CONTROL
                                </strong>
                                <span>
                                    Applying a qualified signal configures
                                    the execution bot for this market,
                                    direction and horizon.
                                </span>
                            </>
                        )}
                    </div>

                </div>

            </section>

        </div>
    );
};

export default OnlyUpsDowns;
