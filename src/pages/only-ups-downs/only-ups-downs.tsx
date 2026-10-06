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
import { OUDExecutionController } from '@/only-ups-downs/execution';
import type { OUDExecutionState } from '@/only-ups-downs/execution/oud-execution-types';

const emptySnapshot = (): OnlyUpsDownsScannerSnapshot => ({
    ready: false,
    price: null,
    prices: [],
    pointCount: 0,
    direction: null,
    regime: {} as OnlyUpsDownsScannerSnapshot['regime'],
    structure: {} as OnlyUpsDownsScannerSnapshot['structure'],
    pressure: {} as OnlyUpsDownsScannerSnapshot['pressure'],
    reversal: {} as OnlyUpsDownsScannerSnapshot['reversal'],
    continuation: {} as OnlyUpsDownsScannerSnapshot['continuation'],
    stability: {} as OnlyUpsDownsScannerSnapshot['stability'],
    signal: null,
    signalLocked: false,
    signalCycleId: 0,
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
        app,
        client,
    } = useStore();
    const oudExecutionControllerRef =
        useRef<OUDExecutionController | null>(null);

    const [oudExecutionState, setOudExecutionState] =
        useState<OUDExecutionState>({
            lifecycle: 'STOPPED',
            status: 'WAITING',
            direction: null,
            market: '',
            directionMode: 'BOTH',
            strategyMode: 'BOTH',
            martingaleEnabled: false,
            martingaleMultiplier: 1.6,
            maxMartingaleLevel: 6,
            baseStake: 10,
            stake: 10,
            currentStake: 10,
            duration: 2,
            recoveryLevel: 0,
            contractId: null,
            lastResult: null,
            profit: null,
            error: null,
            totalTrades: 0,
            wins: 0,
            losses: 0,
            totalProfit: 0,
            winRate: 0,
            tradeHistory: [],
        });

    const [oudStakeInput, setOudStakeInput] = useState('10');
    const [oudDuration, setOudDuration] = useState(2);
const [oudManualDirection, setOudManualDirection] =
    useState<'UP' | 'DOWN'>('UP');

    useEffect(() => {
        const controller = new OUDExecutionController(
            dbot,
            client?.currency || 'USD',
            () => liveRef.current,
        );

        oudExecutionControllerRef.current = controller;

        const unsubscribe = controller.subscribe(state => {
            setOudExecutionState(state);
        });

        return () => {
            unsubscribe();
            controller.destroy();

            if (oudExecutionControllerRef.current === controller) {
                oudExecutionControllerRef.current = null;
            }
        };
    }, [dbot, client?.currency]);

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
    

    /*
     * Native OUD BOT timeframe.
     *
     * This is intentionally separate from analysisHorizon.
     * The existing FREE BOTS / Apply Signal scanner lifecycle
     * remains untouched.
     */
    const [oudTimeframe, setOudTimeframe] =
        useState<'SHORT' | 'LONG'>('SHORT');

    /*
     * Native OUD BOT execution configuration.
     *
     * These controls belong only to the native execution bot.
     * FREE BOTS / Apply Signal remains completely separate.
     */
    const [oudDirectionMode, setOudDirectionMode] =
        useState<'UP' | 'DOWN' | 'BOTH'>('BOTH');

    const [oudStrategyMode, setOudStrategyMode] =
        useState<'REVERSAL' | 'CONTINUATION' | 'BOTH'>('BOTH');

    const [oudMartingaleEnabled, setOudMartingaleEnabled] =
        useState(false);

    const [oudMartingaleMultiplier, setOudMartingaleMultiplier] =
        useState('1.6');

    const [oudMaxMartingaleLevel, setOudMaxMartingaleLevel] =
        useState('6');

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

      /*
       * Prevent the same READY signal cycle from entering the
       * automatic Apply Signal pipeline more than once.
       */
      const autoAppliedSignalCycleRef =
          useRef<number | null>(null);


    /*
     * ---------------------------------------------------------
     * OUD OFFICIAL BLOCKLY WORKSPACE LIFECYCLE
     * ---------------------------------------------------------
     *
     * OUD does not render BotBuilder, so BotBuilder's normal
     * app.onMount() lifecycle never runs.
     *
     * Reuse the existing AppStore lifecycle so DBot creates
     * the official Blockly workspace through initWorkspace().
     */
    useEffect(() => {
        let cancelled = false;

        const mountOfficialWorkspace = async () => {
            try {
                if (cancelled) return;

                console.log(
                    '[OUD WORKSPACE] Mounting official DBot workspace...'
                );

                await app.onMount();

                if (cancelled) return;

                console.log(
                    '[OUD WORKSPACE] Official workspace ready:',
                    {
                        globalWorkspace: !!window.Blockly?.derivWorkspace,
                        dbotWorkspace: !!dbot.workspace,
                        scratchDiv:
                            !!document.getElementById('scratch_div'),
                        scratchDivWidth:
                            document.getElementById('scratch_div')
                                ?.offsetWidth ?? 0,
                        scratchDivHeight:
                            document.getElementById('scratch_div')
                                ?.offsetHeight ?? 0,
                    }
                );
            } catch (error) {
                console.error(
                    '[OUD WORKSPACE] Official workspace initialization failed:',
                    error
                );
            }
        };

        void mountOfficialWorkspace();

        return () => {
            cancelled = true;

            console.log(
                '[OUD WORKSPACE] Unmounting official DBot workspace...'
            );

            app.onUnmount();
        };
    }, [app, dbot]);
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
        (window as any).__OUD_LIVE__ = live;
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

            if ((window as any).__OUD_LIVE__ === live) {
                delete (window as any).__OUD_LIVE__;
            }

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
    if (snapshot.signalLocked) {
        return;
    }

    setAppliedSignalKey(null);
}, [
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

    const handleOudRun = () => {
        const controller =
            oudExecutionControllerRef.current;

        if (!controller) return;

        const stake = Number(oudStakeInput);
        const duration = Number(oudDuration);

        if (
            !Number.isFinite(stake) ||
            stake <= 0
        ) {
            return;
        }

        if (
            !Number.isInteger(duration) ||
            duration < 2 ||
            duration > 5
        ) {
            return;
        }

        controller.setStake(stake);
        controller.setDuration(duration);
        controller.setDirectionMode(oudDirectionMode);
        console.log('[OUD DIRECTION DEBUG]', {
            uiDirectionMode: oudDirectionMode,
            controllerDirectionMode: controller.getState().directionMode,
        });
        controller.setStrategyMode(oudStrategyMode);
        controller.setMartingaleEnabled(
            oudMartingaleEnabled,
        );

        const multiplier = Number(oudMartingaleMultiplier);
        if (
            !Number.isFinite(multiplier) ||
            multiplier < 1
        ) {
            return;
        }

        controller.setMartingaleMultiplier(
            multiplier,
        );

        const maxMartingaleLevel =
            Number(oudMaxMartingaleLevel);

        if (
            !Number.isInteger(maxMartingaleLevel) ||
            maxMartingaleLevel < 0
        ) {
            return;
        }

        controller.setMaxMartingaleLevel(
            maxMartingaleLevel,
        );

        /*
         * RUN only arms the native OUD execution controller.
         *
         * Direction is NOT selected here.
         * The live OUD scanner supplies UP / DOWN when a
         * valid READY signal cycle becomes available.
         */
        controller.run();
    };

    const handleOudPause = () => {
        oudExecutionControllerRef.current?.pause();
    };

    const handleOudStop = () => {
        oudExecutionControllerRef.current?.stop();
    };

    const handleOudReset = () => {
        oudExecutionControllerRef.current?.reset();
    };

    const handleOudManualTrade = (
        direction: 'UP' | 'DOWN',
    ) => {
        const controller =
            oudExecutionControllerRef.current;

        if (!controller) {
            return;
        }

        const stake = Number(oudStakeInput);
        const duration = Number(oudDuration);

        if (
            !Number.isFinite(stake) ||
            stake <= 0
        ) {
            return;
        }

        if (
            !Number.isInteger(duration) ||
            duration < 2 ||
            duration > 5
        ) {
            return;
        }

        if (
            oudExecutionState.status === 'PURCHASING' ||
            oudExecutionState.status === 'CONTRACT_ACTIVE'
        ) {
            return;
        }

        if (!symbol) {
            return;
        }

        setOudManualDirection(direction);

        controller.setStake(stake);
        controller.setDuration(duration);

        void controller.executeManual({
            direction,
            market: symbol,
            stake,
            duration,
        });
    };
    useEffect(() => {
        const controller = oudExecutionControllerRef.current;

        if (!controller) {
            return;
        }

        const scannerDirection =
            signalDirection === 'UP'
                ? 'UP'
                : signalDirection === 'DOWN'
                    ? 'DOWN'
                    : null;

        controller.setSignal(
            scannerDirection,
            symbol,
            snapshot.signalCycleId,
        );
    }, [
        signalDirection,
        snapshot.signalCycleId,
        symbol,
    ]);

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
        snapshot.signalCycleId,
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

    (window as any).__OUD_APPLY_GATE__ = {
        signalExists: !!signal,
        signalStatus: signal?.status ?? null,
        botDirection: signal?.botDirection ?? null,
        signalKey,
        appliedSignalKey,
        hasAppliedSignal,
        canApplySignal,
    };


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
         * INITIAL SIGNAL VS RECOVERY SIGNAL
         * ---------------------------------------------------------
         *
         * A stopped bot needs the XML workspace configured and
         * started through the official Run Bot lifecycle.
         *
         * A running bot must NOT reload the XML and must NOT be
         * started again. A NEW READY signal is injected directly
         * into the existing interpreter so the current Martingale
         * Stake and lossCounter remain untouched.
         */
        const dbot = run_panel.dbot as any;

        const botAlreadyRunning =
            Boolean(
                dbot?.is_bot_running &&
                dbot?.interpreter,
            );

        if (botAlreadyRunning) {
            console.log(
                'ONLY UPS / ONLY DOWNS: RECOVERY SIGNAL - LIVE RUNTIME INJECTION',
                {
                    market: oudMarket,
                    direction,
                    signalKey,
                },
            );

            const executionStartedAt = performance.now();

            console.log(
                '[OUD EXEC TIMING] APPLY SIGNAL START',
                {
                    signalKey,
                    direction,
                    market: oudMarket,
                    t: executionStartedAt,
                },
            );

            const runtimeUpdates = [
                ['Direction', direction],
                ['signal armed', 1],
                ['signal consumed', 0],
                ['trading mode', 0],
            ] as const;

            for (const [variableName, value] of runtimeUpdates) {
                const injected =
                    dbot.setRuntimeVariable(
                        variableName,
                        value,
                    );

                if (!injected) {
                    throw new Error(
                        `ONLY UPS / ONLY DOWNS: failed to inject runtime variable "${variableName}"`,
                    );
                }

                console.log(
                    '[OUD EXEC TIMING] RUNTIME VARIABLE INJECTED',
                    {
                        variableName,
                        value,
                        elapsedMs: Number(
                            (performance.now() - executionStartedAt).toFixed(2),
                        ),
                    },
                );
            }

            console.log(
                '[OUD EXEC TIMING] BEFORE READY FOR NEXT PURCHASE',
                {
                    elapsedMs: Number(
                        (performance.now() - executionStartedAt).toFixed(2),
                    ),
                },
            );

            const readyForNextPurchase =
                dbot.readyForNextPurchase?.();

            console.log(
                '[OUD EXEC TIMING] READY FOR NEXT PURCHASE RETURNED',
                {
                    result: readyForNextPurchase,
                    elapsedMs: Number(
                        (performance.now() - executionStartedAt).toFixed(2),
                    ),
                },
            );

            if (readyForNextPurchase === false) {
                throw new Error(
                    'ONLY UPS / ONLY DOWNS: failed to prepare trade engine for the next signal.',
                );
            }


            console.log(
                'ONLY UPS / ONLY DOWNS: NEW RECOVERY SIGNAL ARMED',
                {
                    direction,
                    signalArmed: 1,
                    signalConsumed: 0,
                    tradingMode: 0,
                    martingaleState:
                        'PRESERVED IN LIVE BOT',
                },
            );

            /*
             * The running bot successfully accepted the signal.
             * Consume the scanner lifecycle lock only now.
             *
             * If execution failed, control would have gone to catch
             * before reaching this point, leaving READY available.
             */
            liveRef.current?.consumeSignal();

            setAppliedSignalKey(signalKey);
            setAutoApplySignals(true);

            return;
        }

        /*
         * ---------------------------------------------------------
         * INITIAL SIGNAL - CONTINUE WITH XML CONFIGURATION
         * ---------------------------------------------------------
         *
         * The bot is stopped, so the existing XML loading and
         * initialization path below remains unchanged.
         */

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
         * APPLY OUD SIGNAL TO INITIALIZATION STATE
         * ---------------------------------------------------------
         *
         * The bot has not started yet, so runtime variables cannot
         * be used here. Write the AI signal directly into the exact
         * Blockly initialization blocks before runBot().
         *
         * UP   = RUNHIGH / Only Ups
         * DOWN = RUNLOW  / Only Downs
         */

        const setOudInitializationValue = (
            blockId: string,
            fieldName: 'TEXT' | 'NUM',
            value: string,
        ) => {
            const block = (workspace.getAllBlocks() as any[]).find(item => item.id === blockId);

            if (!block) {
                throw new Error(
                    `ONLY UPS / ONLY DOWNS: initialization block not found: ${blockId}`,
                );
            }

            const valueBlock = block.getInputTargetBlock('VALUE');

            if (!valueBlock) {
                throw new Error(
                    `ONLY UPS / ONLY DOWNS: VALUE block missing: ${blockId}`,
                );
            }

            const field = valueBlock.getField(fieldName);

            if (!field) {
                throw new Error(
                    `ONLY UPS / ONLY DOWNS: ${fieldName} field missing: ${blockId}`,
                );
            }

            field.setValue(value);
        };

        setOudInitializationValue(
            'oud_direction_init',
            'TEXT',
            signalDirection,
                );

        setOudInitializationValue(
            'oud_signal_armed_init',
            'NUM',
            '1',
                );

        setOudInitializationValue(
            'oud_signal_consumed_init',
            'NUM',
            '0',
                );

        setOudInitializationValue(
            'oud_trading_mode_init',
            'NUM',
            '0',
                );

        console.log(
            'ONLY UPS / ONLY DOWNS: SIGNAL INJECTED INTO OUD INITIALIZATION',
            {
                direction: signalDirection,
                signalArmed: 1,
                signalConsumed: 0,
                tradingMode: 0,
            },
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
         * The official Run Bot lifecycle completed successfully.
         * Consume the scanner READY lifecycle lock only now.
         *
         * If onRunButtonClick() failed, control would have gone to
         * catch and this consume call would never execute.
         */
        liveRef.current?.consumeSignal();

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
/*
     * AUTO APPLY READY OUD SIGNAL
     * ---------------------------------------------------------
     *
     * The bot is not running when a READY signal appears.
     * Therefore runtime variables cannot be injected here.
     *
     * Reuse the exact same Apply Signal pipeline as the manual
     * button so the signal is configured before runBot().
     *
     * One READY signal arms one initial purchase.
     * Existing recovery / martingale logic remains untouched.
     */
    useEffect(() => {
        /*
         * Native OUD automation owns scanner-driven execution
         * whenever the native bot is RUNNING.
         *
         * Keep the existing Blockly Apply Signal path available
         * for manual / legacy use when native automation is not
         * active.
         */
        if (oudExecutionState.lifecycle === 'RUNNING') {
            return;
        }

        if (
            !autoApplySignals ||
            !signal ||
            signal.status !== 'READY' ||
            !signal.botDirection ||
            !signalKey ||
            signalKey === appliedSignalKey
        ) {
            return;
        }

        const currentSignalCycle =
            snapshot.signalCycleId;

        /*
         * The same READY cycle can produce multiple React renders.
         * Only allow automatic application once for that cycle.
         */
        if (
            autoAppliedSignalCycleRef.current ===
            currentSignalCycle
        ) {
            console.log(
                '[OUD AUTO APPLY] SAME CYCLE ALREADY ATTEMPTED',
                {
                    signalCycleId: currentSignalCycle,
                    signalKey,
                },
            );
            return;
        }

        autoAppliedSignalCycleRef.current =
            currentSignalCycle;

        console.log(
            '[OUD AUTO APPLY] NEW SIGNAL CYCLE',
            {
                signalCycleId: currentSignalCycle,
                signalKey,
                direction: signal.botDirection,
            },
        );

        void handleApplySignal();
    }, [
        autoApplySignals,
        signal,
        signalKey,
        appliedSignalKey,
        snapshot.signalCycleId,
        handleApplySignal,
    ]);

    if (!symbol || symbols.length === 0) {
        return (
            <>
                <div
                    id='scratch_div'
                    className='only-ups-downs-workspace-host'
                    aria-hidden='true'
                />
                <ChunkLoader message='' />
            </>
        );
    }

    return (
        <>
            <div
                id='scratch_div'
                className='only-ups-downs-workspace-host'
                aria-hidden='true'
            />

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
            {/* =====================================================
    TICK MOVEMENT
   ===================================================== */}

<section className='only-ups-downs-tick-movement'>
    <div className='only-ups-downs-tick-movement__header'>
        <div>
            <span className='only-ups-downs-tick-movement__eyebrow'>
                LIVE TICKS
            </span>
            <h2>TICK MOVEMENT</h2>
        </div>

        <span className='only-ups-downs-tick-movement__market'>
            {symbol || '—'}
        </span>
    </div>

    <div className='only-ups-downs-tick-movement__ticks'>
        {snapshot.prices.slice(-12).map((price, index, values) => {
            const previous = values[index - 1];

            if (previous === undefined) {
                return (
                    <span
                        key={`${price}-${index}`}
                        className='only-ups-downs-tick-movement__tick is-neutral'
                    >
                        →
                    </span>
                );
            }

            return (
                <span
                    key={`${price}-${index}`}
                    className={
                        price > previous
                            ? 'only-ups-downs-tick-movement__tick is-up'
                            : price < previous
                                ? 'only-ups-downs-tick-movement__tick is-down'
                                : 'only-ups-downs-tick-movement__tick is-neutral'
                    }
                >
                    {price > previous
                        ? '↑'
                        : price < previous
                            ? '↓'
                            : '→'}
                </span>
            );
        })}
    </div>
</section>

{/* =====================================================
    NATIVE OUD BOT
   ===================================================== */}

<section className='only-ups-downs-native-bot'>
    <div className='only-ups-downs-native-bot__header'>
        <div>
            <div className='only-ups-downs-native-bot__eyebrow'>
                AUTONOMOUS EXECUTION
            </div>
            <h2>OUD BOT</h2>
        </div>

        <div
            className={
                `only-ups-downs-native-bot__status ` +
                `is-${oudExecutionState.lifecycle.toLowerCase()}`
            }
        >
            {oudExecutionState.lifecycle}
        </div>
    </div>

    <div className='only-ups-downs-native-bot__settings'>
        <div className='only-ups-downs-native-bot__field'>
            <label>Market</label>
            <select
                value={symbol}
                disabled={
                    oudExecutionState.status === 'PURCHASING' ||
                    oudExecutionState.status === 'CONTRACT_ACTIVE'
                }
                onChange={event => {
                    const nextSymbol = event.target.value;

                    if (!nextSymbol) {
                        return;
                    }

                    setSymbol(nextSymbol);
                    setAppliedSignalKey(null);
                    setAutoApplySignals(false);

                    try {
                        localStorage.setItem(
                            ONLY_UPS_DOWNS_MARKET_STORAGE_KEY,
                            nextSymbol,
                        );
                    } catch {
                        // Ignore storage failures.
                    }
                }}
            >
                {symbols.map(item => (
                    <option
                        key={item.symbol}
                        value={item.symbol}
                    >
                        {item.display_name || item.symbol}
                    </option>
                ))}
            </select>
        </div>

        <div className='only-ups-downs-native-bot__field'>
            <label>Timeframe</label>
            <div className='only-ups-downs-native-bot__segmented'>
                <button
                    type='button'
                    className={
                        oudTimeframe === 'SHORT'
                            ? 'is-active'
                            : ''
                    }
                    onClick={() => setOudTimeframe('SHORT')}
                >
                    SHORT
                </button>

                <button
                    type='button'
                    className={
                        oudTimeframe === 'LONG'
                            ? 'is-active'
                            : ''
                    }
                    onClick={() => setOudTimeframe('LONG')}
                >
                    LONG
                </button>
            </div>
        </div>

        <div className='only-ups-downs-native-bot__field'>
            <label>Duration</label>
            <select
                value={oudDuration}
                disabled={
                    oudExecutionState.status === 'PURCHASING' ||
                    oudExecutionState.status === 'CONTRACT_ACTIVE'
                }
                onChange={event =>
                    setOudDuration(Number(event.target.value))
                }
            >
                <option value={2}>2 ticks</option>
                <option value={3}>3 ticks</option>
                <option value={4}>4 ticks</option>
                <option value={5}>5 ticks</option>
            </select>
        </div>

        <div className='only-ups-downs-native-bot__field'>
            <label>Direction</label>
            <div className='only-ups-downs-native-bot__segmented'>
                {(['UP', 'DOWN', 'BOTH'] as const).map(mode => (
                    <button
                        key={mode}
                        type='button'
                        className={
                            oudDirectionMode === mode
                                ? 'is-active'
                                : ''
                        }
                        onClick={() =>
                            setOudDirectionMode(mode)
                        }
                    >
                        {mode === 'UP'
                            ? '↑ UP'
                            : mode === 'DOWN'
                                ? '↓ DOWN'
                                : 'BOTH'}
                    </button>
                ))}
            </div>
        </div>

        <div className='only-ups-downs-native-bot__field'>
            <label>Strategy</label>
            <div className='only-ups-downs-native-bot__segmented'>
                {(
                    [
                        'REVERSAL',
                        'CONTINUATION',
                        'BOTH',
                    ] as const
                ).map(mode => (
                    <button
                        key={mode}
                        type='button'
                        className={
                            oudStrategyMode === mode
                                ? 'is-active'
                                : ''
                        }
                        onClick={() =>
                            setOudStrategyMode(mode)
                        }
                    >
                        {mode === 'REVERSAL'
                            ? 'REV'
                            : mode === 'CONTINUATION'
                                ? 'CONT'
                                : 'BOTH'}
                    </button>
                ))}
            </div>
        </div>

        <div className='only-ups-downs-native-bot__field'>
            <label>Martingale</label>
            <div className='only-ups-downs-native-bot__segmented'>
                <button
                    type='button'
                    className={
                        !oudMartingaleEnabled
                            ? 'is-active'
                            : ''
                    }
                    onClick={() =>
                        setOudMartingaleEnabled(false)
                    }
                >
                    OFF
                </button>

                <button
                    type='button'
                    className={
                        oudMartingaleEnabled
                            ? 'is-active'
                            : ''
                    }
                    onClick={() =>
                        setOudMartingaleEnabled(true)
                    }
                >
                    ON
                </button>
            </div>
        </div>

        <div className='only-ups-downs-native-bot__field'>
            <label>Stake</label>
            <input
                type='number'
                min='0.01'
                step='0.01'
                value={oudStakeInput}
                disabled={
                    oudExecutionState.status === 'PURCHASING' ||
                    oudExecutionState.status === 'CONTRACT_ACTIVE'
                }
                onChange={event =>
                    setOudStakeInput(event.target.value)
                }
            />
        </div>

        <div className='only-ups-downs-native-bot__field'>
            <label>Multiplier</label>
            <input
                type='number'
                min='1'
                step='0.1'
                value={oudMartingaleMultiplier}
                disabled={
                    oudExecutionState.status === 'PURCHASING' ||
                    oudExecutionState.status === 'CONTRACT_ACTIVE'
                }
                onChange={event =>
                    setOudMartingaleMultiplier(
                        event.target.value,
                    )
                }
            />
        </div>

        <div className='only-ups-downs-native-bot__field'>
            <label>Max Level</label>
            <input
                type='number'
                min='0'
                step='1'
                value={oudMaxMartingaleLevel}
                disabled={
                    oudExecutionState.status === 'PURCHASING' ||
                    oudExecutionState.status === 'CONTRACT_ACTIVE'
                }
                onChange={event =>
                    setOudMaxMartingaleLevel(
                        event.target.value,
                    )
                }
            />
        </div>
    </div>

    <div className='only-ups-downs-native-bot__controls'>
        <button
            type='button'
            className='only-ups-downs-native-bot__control only-ups-downs-native-bot__control--run'
            disabled={
                oudExecutionState.status === 'PURCHASING' ||
                oudExecutionState.status === 'CONTRACT_ACTIVE'
            }
            onClick={handleOudRun}
        >
            ▶ START
        </button>

        <button
            type='button'
            className='only-ups-downs-native-bot__control'
            disabled={
                oudExecutionState.lifecycle !== 'RUNNING'
            }
            onClick={handleOudPause}
        >
            ⏸ PAUSE
        </button>

        <button
            type='button'
            className='only-ups-downs-native-bot__control'
            disabled={
                oudExecutionState.lifecycle === 'STOPPED'
            }
            onClick={handleOudStop}
        >
            ■ STOP
        </button>
    </div>

    <div className='only-ups-downs-native-bot__status-grid'>
        <div>
            <span>Status</span>
            <strong>{oudExecutionState.lifecycle}</strong>
        </div>

        <div>
            <span>Signal</span>
            <strong>
                {signalDirection === 'UP'
                    ? '↑ UP'
                    : signalDirection === 'DOWN'
                        ? '↓ DOWN'
                        : 'WAIT'}
            </strong>
        </div>

        <div>
            <span>Last Result</span>
            <strong>
                {oudExecutionState.lastResult || '—'}
            </strong>
        </div>

        <div>
            <span>Current Stake</span>
            <strong>
                {oudExecutionState.currentStake.toFixed(2)}
            </strong>
        </div>
    </div>
</section>

{/* =====================================================
    OUD PERFORMANCE
   ===================================================== */}

<section className='only-ups-downs-native-performance'>
    <div className='only-ups-downs-native-performance__header'>
        <div>
            <span>BOT RESULTS</span>
            <h2>PERFORMANCE</h2>
        </div>

        <button
            type='button'
            className='only-ups-downs-native-performance__reset'
            disabled={
                oudExecutionState.status === 'PURCHASING' ||
                oudExecutionState.status === 'CONTRACT_ACTIVE'
            }
            onClick={handleOudReset}
        >
            ↻ RESET
        </button>
    </div>

    <div className='only-ups-downs-native-performance__grid'>
        <div>
            <span>Total P/L</span>
            <strong>
                {oudExecutionState.totalProfit >= 0
                    ? '+'
                    : ''}
                {oudExecutionState.totalProfit.toFixed(2)}
            </strong>
        </div>

        <div>
            <span>Total Trades</span>
            <strong>{oudExecutionState.totalTrades}</strong>
        </div>

        <div>
            <span>Wins</span>
            <strong>{oudExecutionState.wins}</strong>
        </div>

        <div>
            <span>Losses</span>
            <strong>{oudExecutionState.losses}</strong>
        </div>

        <div>
            <span>Win Rate</span>
            <strong>
                {oudExecutionState.winRate.toFixed(1)}%
            </strong>
        </div>

        <div>
            <span>Current Level</span>
            <strong>
                {oudExecutionState.recoveryLevel} /{' '}
                {oudExecutionState.maxMartingaleLevel}
            </strong>
        </div>

        <div>
            <span>Current Stake</span>
            <strong>
                {oudExecutionState.currentStake.toFixed(2)}
            </strong>
        </div>

        <div>
            <span>Last Result</span>
            <strong>
                {oudExecutionState.lastResult || '—'}
            </strong>
        </div>
    </div>

    {oudExecutionState.tradeHistory.length > 0 && (
        <div className='only-ups-downs-native-performance__recent'>
            <span>RECENT TRADES</span>

            <div className='only-ups-downs-native-performance__trade-list'>
                {oudExecutionState.tradeHistory
                    .slice(0, 5)
                    .map(trade => (
                        <div
                            key={trade.id}
                            className='only-ups-downs-native-performance__trade'
                        >
                            <strong>
                                {trade.direction === 'UP'
                                    ? '↑'
                                    : '↓'}
                            </strong>

                            <span>
                                {trade.result}
                            </span>

                            <span>
                                {trade.profit === null
                                    ? '—'
                                    : `${trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)}`}
                            </span>
                        </div>
                    ))}
            </div>
        </div>
    )}
</section>


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
    </>
    );
};

export default OnlyUpsDowns;






















































