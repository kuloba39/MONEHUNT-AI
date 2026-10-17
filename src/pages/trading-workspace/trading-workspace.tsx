import React from 'react';
import { observer } from 'mobx-react-lite';
import { ApiHelpers } from '@/external/bot-skeleton';
import { useStore } from '@/hooks/useStore';
import { generateOAuthURL } from '@/components/shared';
import Dialog from '@/components/shared_ui/dialog';
import { localize } from '@deriv-com/translations';
import {
    MONEHUNT_PENDING_GLOBAL_RUN_KEY,
    MONEHUNT_PENDING_GLOBAL_MARKET_KEY,
    MONEHUNT_SELECTED_BOT_KEY,
    type MonehuntSelectedBot,
} from '@/utils/monehunt-selected-bot';
import { setMonehuntRuntimeConfig } from '@/utils/monehunt-runtime-config';
import RunPanel from '@/components/run-panel';
import { load } from '@/external/bot-skeleton/scratch/utils';
import './trading-workspace.scss';

const TradingWorkspace = observer(({ headless = false }: { headless?: boolean }) => {
    const store = useStore();
    const { app, dbot } = store;
    const {
        is_dialog_open,
        dialog_options,
        onCancelButtonClick,
        onCloseDialog,
        onOkButtonClick,
    } = store.run_panel;
    const {
        cancel_button_text,
        ok_button_text,
        title,
        message,
        dismissable,
        is_closed_on_cancel,
    } = dialog_options as {
        cancel_button_text?: string;
        ok_button_text?: string;
        title?: string;
        message?: React.ReactNode;
        dismissable?: boolean;
        is_closed_on_cancel?: boolean;
    };

    const handleDialogLogin = async () => {
        const oauthUrl = await generateOAuthURL();
        if (oauthUrl) {
            window.location.replace(oauthUrl);
        } else {
            console.error('[TRADING WORKSPACE] Failed to generate OAuth URL');
        }
    };
    const isRunning = Boolean(store?.run_panel?.is_running);

    const [selectedBot, setSelectedBot] =
        React.useState<MonehuntSelectedBot | null>(null);
    const [executionWorkspaceReady, setExecutionWorkspaceReady] = React.useState(false);
    const [loadedBotId, setLoadedBotId] = React.useState('');
    const [globalRunSignal, setGlobalRunSignal] = React.useState(0);
    const handledGlobalRunRequest = React.useRef('');
    const [apiHelpersReadyVersion, setApiHelpersReadyVersion] = React.useState(0);

    const [market, setMarket] = React.useState('');
    const [submarket, setSubmarket] = React.useState('');
    const [symbol, setSymbol] = React.useState('');
    const [marketOptions, setMarketOptions] = React.useState<Array<[string, string]>>([]);
    const [submarketOptions, setSubmarketOptions] = React.useState<Array<[string, string]>>([]);
    const [symbolOptions, setSymbolOptions] = React.useState<Array<[string, string]>>([]);
    const [tradeType, setTradeType] = React.useState('');
    const [contractType, setContractType] = React.useState('');
    const [botPrediction, setBotPrediction] = React.useState('');
    const [showPredictionControls, setShowPredictionControls] = React.useState(false);
    const [hasWinningStake, setHasWinningStake] = React.useState(false);
    const [winningStake, setWinningStake] = React.useState('');
    const [prediction, setPrediction] = React.useState('');
    const [predictionMode, setPredictionMode] = React.useState<'bot-default' | 'user-preference'>('bot-default');
    const [directionPreference, setDirectionPreference] = React.useState<
        'bot-default' | 'even' | 'odd' | 'over' | 'under' | 'rise' | 'fall' | 'both'
    >('bot-default');
    const strategySelectionRef = React.useRef<{ market: string; submarket: string; symbol: string } | null>(null);
    const pendingDcirclesRunRef = React.useRef<{
        botId: string;
        symbol: string;
        market: string;
        submarket: string;
        signal: number;
    } | null>(null);
    const [globalMarketReadySymbol, setGlobalMarketReadySymbol] = React.useState('');
    const [durationOptionsSymbol, setDurationOptionsSymbol] = React.useState('');
    const [duration, setDuration] = React.useState('1');
    const [durationUnit, setDurationUnit] = React.useState('');
    const [durationOptions, setDurationOptions] = React.useState<
        Array<{ display: string; unit: string; min: number; max: number }>
    >([]);
    const [stake, setStake] = React.useState('1');
    const [martingale, setMartingale] = React.useState('0');
    const [maxStake, setMaxStake] = React.useState('');
    const [takeProfit, setTakeProfit] = React.useState('');
    const [stopLoss, setStopLoss] = React.useState('');
    const [error, setError] = React.useState('');
    const [showBotWorkspace, setShowBotWorkspace] = React.useState(false);

    React.useEffect(() => {
        if (!executionWorkspaceReady) return;

        let attempts = 0;
        let cancelled = false;
        let interval: ReturnType<typeof setInterval>;

        const checkApiHelpers = () => {
            if (cancelled) return;

            attempts += 1;
            const helpers = ApiHelpers?.instance;

            if (helpers?.active_symbols && helpers?.contracts_for) {
                console.log('[MONEHUNT TRADING WORKSPACE] API HELPERS READY');
                clearInterval(interval);
                setApiHelpersReadyVersion(current => current + 1);
                return;
            }

            if (attempts >= 30) {
                clearInterval(interval);
                console.warn('[MONEHUNT TRADING WORKSPACE] API HELPER READINESS TIMEOUT');
            }
        };

        interval = setInterval(checkApiHelpers, 500);
        checkApiHelpers();

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [executionWorkspaceReady]);

    React.useEffect(() => {
        if (!showBotWorkspace && !headless) return;

        const workspace = dbot.workspace;
        const blockly = (window as any).Blockly;

        if (!workspace || !blockly?.svgResize) return;

        const resizeWorkspace = () => blockly.svgResize(workspace);
        const frame = window.requestAnimationFrame(resizeWorkspace);

        window.addEventListener('resize', resizeWorkspace);

        return () => {
            window.cancelAnimationFrame(frame);
            window.removeEventListener('resize', resizeWorkspace);
        };
    }, [showBotWorkspace, dbot, headless]);

    React.useEffect(() => {
        const readPendingRequest = () => {
            try {
                if (sessionStorage.getItem(MONEHUNT_PENDING_GLOBAL_RUN_KEY)) {
                    setGlobalRunSignal(current => current + 1);
                }
            } catch (error) {
                console.error('[MONEHUNT GLOBAL RUN] Could not read queued request:', error);
            }
        };

        const handleGlobalRun = () => {
            handledGlobalRunRequest.current = '';
            readPendingRequest();
        };

        readPendingRequest();
        window.addEventListener('monehunt:global-run', handleGlobalRun);

        return () => {
            window.removeEventListener('monehunt:global-run', handleGlobalRun);
        };
    }, []);

    React.useEffect(() => {
        const readSelectedBot = () => {
            const raw = sessionStorage.getItem(MONEHUNT_SELECTED_BOT_KEY);

            if (!raw) {
                setSelectedBot(null);
                return;
            }

            try {
                const parsed = JSON.parse(raw);

                if (!parsed?.id || !parsed?.name || !parsed?.xml) {
                    console.warn(
                        '[MONEHUNT TRADING WORKSPACE] Invalid selected bot:',
                        parsed
                    );
                    setSelectedBot(null);
                    return;
                }

                setSelectedBot(parsed);

                console.log(
                    '[MONEHUNT TRADING WORKSPACE] SELECTED BOT LOADED:',
                    {
                        id: parsed.id,
                        name: parsed.name,
                        free: parsed.free,
                        xml: parsed.xml
                            ? 'WORKSPACE_PRESENT'
                            : 'EMPTY',
                    }
                );
            } catch (error) {
                console.error(
                    '[MONEHUNT TRADING WORKSPACE] Failed to read selected bot:',
                    error
                );
                setSelectedBot(null);
            }
        };

        readSelectedBot();
    }, []);

    React.useEffect(() => {
        let cancelled = false;

        const mountExecutionWorkspace = async () => {
            try {
                setExecutionWorkspaceReady(false);
                setLoadedBotId('');
                console.log(
                    '[MONEHUNT TRADING WORKSPACE] MOUNTING OFFICIAL DBOT WORKSPACE'
                );

                const mountStartedAt = performance.now();                 console.log('[MONEHUNT TIMING] app.onMount START', {                     t: mountStartedAt,                 });
                await app.onMount();

                console.log('[MONEHUNT TIMING] app.onMount END', {                     elapsedMs: Math.round(performance.now() - mountStartedAt),                 });
                if (cancelled) return;

                const workspace = dbot.workspace;

                if (!workspace) {
                    console.error(
                        '[MONEHUNT TRADING WORKSPACE] DBOT WORKSPACE NOT READY'
                    );
                    return;
                }

                const rawSelectedBot = sessionStorage.getItem(
                    MONEHUNT_SELECTED_BOT_KEY
                );

                if (!rawSelectedBot) {
                    console.warn(
                        '[MONEHUNT TRADING WORKSPACE] NO SELECTED BOT XML'
                    );
                    return;
                }

                let selectedBotForExecution: MonehuntSelectedBot;

                try {
                    selectedBotForExecution = JSON.parse(rawSelectedBot);
                } catch (error) {
                    console.error(
                        '[MONEHUNT TRADING WORKSPACE] SELECTED BOT XML PARSE FAILED:',
                        error
                    );
                    return;
                }

                if (!selectedBotForExecution?.xml) {
                    console.warn(
                        '[MONEHUNT TRADING WORKSPACE] SELECTED BOT XML EMPTY'
                    );
                    return;
                }

                console.log(
                    '[MONEHUNT TRADING WORKSPACE] LOADING SELECTED BOT INTO EXECUTION WORKSPACE:',
                    {
                        id: selectedBotForExecution.id,
                        name: selectedBotForExecution.name,
                    }
                );

                const botLoadStartedAt = performance.now();
                console.log('[MONEHUNT TIMING] bot XML load START');
                setError('');

                const loadResult = await load({
                    block_string: selectedBotForExecution.xml,
                    file_name: selectedBotForExecution.name,
                    strategy_id: selectedBotForExecution.id,
                    from: 'monehunt-trading-workspace',
                    workspace,
                    drop_event: null,
                    showIncompatibleStrategyDialog: false,
                    show_snackbar: false,
                    persist_to_recent: false,
                });

                console.log('[MONEHUNT TIMING] bot XML load END', {
                    elapsedMs: Math.round(performance.now() - botLoadStartedAt),
                });

                if (cancelled) return;

                const loadError = (loadResult as { error?: unknown } | undefined)?.error;

                if (loadError) {
                    console.error(
                        '[MONEHUNT TRADING WORKSPACE] Selected bot load failed:',
                        loadError
                    );
                    setError(
                        typeof loadError === 'string'
                            ? loadError
                            : 'The selected bot could not be loaded. Check its XML and supported blocks.'
                    );
                    return;
                }

                const allBlocks = workspace.getAllBlocks(false);

                if (allBlocks.length === 0) {
                    const message = 'The selected bot loaded no blocks. Please check the saved bot XML.';
                    console.error('[MONEHUNT TRADING WORKSPACE]', message);
                    setError(message);
                    return;
                }
                const hasPredictionVariable = allBlocks.some(
                    block => block.type === 'variables_set' &&
                        block.getField('VAR')?.getText() === 'Prediction'
                );
                const winStakeSetter = allBlocks.find(
                    block => block.type === 'variables_set' &&
                        block.getField('VAR')?.getText() === 'winStake'
                );
                const winStakeValueBlock = winStakeSetter?.getInputTargetBlock?.('VALUE');
                const loadedWinStake = winStakeValueBlock?.getFieldValue?.('NUM');

                const canEditWinningStake =
                    winStakeValueBlock?.type === 'math_number' &&
                    winStakeValueBlock.getField('NUM') !== null;

                setHasWinningStake(canEditWinningStake);
                setWinningStake(
                    loadedWinStake !== null && loadedWinStake !== undefined
                        ? String(loadedWinStake)
                        : ''
                );

                const marketBlock = allBlocks.find(
                    block => block.type === 'trade_definition_market'
                );
                const loadedMarket = marketBlock?.getFieldValue('MARKET_LIST') || '';
                const loadedSubmarket = marketBlock?.getFieldValue('SUBMARKET_LIST') || '';
                const loadedSymbol = marketBlock?.getFieldValue('SYMBOL_LIST') || '';

                strategySelectionRef.current = {
                    market: loadedMarket,
                    submarket: loadedSubmarket,
                    symbol: loadedSymbol,
                };

                const tradeTypeBlock = allBlocks.find(
                    block => block.type === 'trade_definition_tradetype'
                );

                const loadedTradeType =
                    tradeTypeBlock?.getFieldValue('TRADETYPE_LIST') || '';

                const loadedContractTypeBlock = allBlocks.find(
                    block => block.type === 'trade_definition_contracttype'
                );

                const loadedContractType =
                    loadedContractTypeBlock?.getFieldValue('TYPE_LIST') || '';

                setTradeType(loadedTradeType);

                setContractType(loadedContractType);
                const isEvenOddContract = ['DIGITEVEN', 'DIGITODD', 'EVEN', 'ODD']
                    .includes(String(loadedContractType).toUpperCase());
                setShowPredictionControls(hasPredictionVariable && !isEvenOddContract);

                const tradeOptionsBlock = allBlocks.find(
                    block => block.type === 'trade_definition_tradeoptions'
                );
                const predictionBlock = tradeOptionsBlock?.getInputTargetBlock?.('PREDICTION');
                const loadedPredictionValue = predictionBlock?.getFieldValue?.('NUM');
                const loadedPrediction =
                    loadedPredictionValue !== null && loadedPredictionValue !== undefined &&
                    String(loadedPredictionValue).trim() !== ''
                        ? String(loadedPredictionValue)
                        : '';

                setBotPrediction(loadedPrediction);
                setPrediction(loadedPrediction);
                setPredictionMode('bot-default');
                setDirectionPreference('bot-default');

                console.log(
                    '[MONEHUNT TRADING WORKSPACE] BOT TRADE SETTINGS DETECTED:',
                    {
                        tradeType: loadedTradeType,
                        contractType: loadedContractType,
                    }
                );
                console.log(
                    '[MONEHUNT TRADING WORKSPACE] EXECUTION WORKSPACE READY:',
                    {
                        botId: selectedBotForExecution.id,
                        workspaceReady: !!dbot.workspace,
                        globalWorkspace:
                            window.Blockly.derivWorkspace === workspace,
                        blockCount: workspace.getAllBlocks(false).length,
                    }
                );
                setLoadedBotId(String(selectedBotForExecution.id));
                setExecutionWorkspaceReady(true);
            } catch (error) {
                console.error(
                    '[MONEHUNT TRADING WORKSPACE] EXECUTION WORKSPACE INITIALIZATION FAILED:',
                    error
                );
            }
        };

        void mountExecutionWorkspace();

        return () => {
            cancelled = true;

            console.log(
                '[MONEHUNT TRADING WORKSPACE] UNMOUNTING OFFICIAL DBOT WORKSPACE'
            );

            app.onUnmount();
        };
    }, [app, dbot]);

    React.useEffect(() => {
        if (!executionWorkspaceReady) return;

        let cancelled = false;

        const loadMarketOptions = async () => {
            try {
                const activeSymbols = ApiHelpers?.instance?.active_symbols;

                if (!activeSymbols) {
                    console.warn(
                        '[MONEHUNT TRADING WORKSPACE] ACTIVE SYMBOLS HELPER NOT READY'
                    );
                    return;
                }

                const symbolsStartedAt = performance.now();                 console.log('[MONEHUNT TIMING] active symbols START');
                await activeSymbols.retrieveActiveSymbols(false);

                console.log('[MONEHUNT TIMING] active symbols END', {                     elapsedMs: Math.round(performance.now() - symbolsStartedAt),                 });
                if (cancelled) return;

                const options = activeSymbols.getMarketDropdownOptions();

                setMarketOptions(options);

                const desiredMarket = strategySelectionRef.current?.market;
                const firstMarket =
                    options.find(option => option[1] === desiredMarket)?.[1] ??
                    options?.[0]?.[1] ??
                    '';

                if (firstMarket) {
                    setMarket(firstMarket);
                }

                console.log(
                    '[MONEHUNT TRADING WORKSPACE] MARKET SELECTORS READY:',
                    {
                        markets: options.length,
                        firstMarket,
                    }
                );
            } catch (error) {
                console.error(
                    '[MONEHUNT TRADING WORKSPACE] MARKET SELECTORS INITIALIZATION FAILED:',
                    error
                );
            }
        };

        void loadMarketOptions();

        return () => {
            cancelled = true;
        };
    }, [executionWorkspaceReady, apiHelpersReadyVersion]);

    React.useEffect(() => {
        if (!market) return;

        const activeSymbols = ApiHelpers?.instance?.active_symbols;
        if (!activeSymbols) return;

        const options = activeSymbols.getSubmarketDropdownOptions(market);
        setSubmarketOptions(options);

        const selection = strategySelectionRef.current;
        const desiredSubmarket =
            selection?.market === market ? selection.submarket : '';
        const nextSubmarket =
            options.find(option => option[1] === desiredSubmarket)?.[1] ??
            options?.[0]?.[1] ??
            '';

        setSubmarket(nextSubmarket);

        if (!nextSubmarket) {
            setSymbolOptions([]);
            setSymbol('');
        }
    }, [market, apiHelpersReadyVersion]);

    React.useEffect(() => {
        setDurationOptionsSymbol('');
        setDurationOptions([]);
        setGlobalMarketReadySymbol('');

        if (!symbol || !tradeType) return;

        const contractsFor = ApiHelpers?.instance?.contracts_for;

        if (!contractsFor) {
            console.warn(
                '[MONEHUNT TRADING WORKSPACE] CONTRACTS FOR HELPER NOT READY'
            );
            return;
        }

        let cancelled = false;

        const loadTradeRuntimeOptions = async () => {
            try {
                const runtimeOptionsStartedAt = performance.now();                 console.log('[MONEHUNT TIMING] contracts_for START', {                     symbol,                     tradeType,                 });
                const durations = await contractsFor.getDurations(symbol, tradeType);

                console.log('[MONEHUNT TIMING] contracts_for END', {                     elapsedMs: Math.round(performance.now() - runtimeOptionsStartedAt),                 });
                if (cancelled) return;

                setDurationOptions(durations || []);
                setDurationOptionsSymbol(symbol);

                const pendingDcirclesRun = pendingDcirclesRunRef.current;
                if (pendingDcirclesRun?.symbol === symbol) {
                    const hasUsableDuration =
                        Array.isArray(durations) &&
                        durations.some(
                            item =>
                                item &&
                                typeof item.unit === 'string' &&
                                item.unit.length > 0 &&
                                Number.isFinite(Number(item.min)) &&
                                Number.isFinite(Number(item.max)) &&
                                Number(item.min) <= Number(item.max)
                        );

                    if (hasUsableDuration) {
                        setGlobalMarketReadySymbol(symbol);
                    } else {
                        setGlobalMarketReadySymbol('');
                        handledGlobalRunRequest.current =
                            `${pendingDcirclesRun.botId}:${pendingDcirclesRun.signal}`;
                        pendingDcirclesRunRef.current = null;
                        setError(
                            `No supported contract durations are available for ${symbol}. No trade was started.`
                        );

                        try {
                            if (
                                sessionStorage.getItem(MONEHUNT_PENDING_GLOBAL_RUN_KEY) ===
                                pendingDcirclesRun.botId
                            ) {
                                sessionStorage.removeItem(MONEHUNT_PENDING_GLOBAL_RUN_KEY);
                                sessionStorage.removeItem(MONEHUNT_PENDING_GLOBAL_MARKET_KEY);
                            }
                        } catch (error) {
                            console.error(
                                '[MONEHUNT GLOBAL RUN] Could not clear unsupported market request:',
                                error
                            );
                        }
                    }
                }

                const selectedDuration =
                    durations?.find(item => item.unit === durationUnit) ||
                    durations?.[0];

                if (selectedDuration) {
                    setDurationUnit(selectedDuration.unit);

                    const currentDuration = Number(duration);
                    const safeDuration =
                        Number.isFinite(currentDuration) &&
                        currentDuration >= selectedDuration.min &&
                        currentDuration <= Math.min(selectedDuration.max, 10)
                            ? currentDuration
                            : Math.max(1, selectedDuration.min);

                    setDuration(String(Math.min(safeDuration, 10)));
                } else {
                    setDurationUnit('');
                    setDuration('1');
                }

                console.log(
                    '[MONEHUNT TRADING WORKSPACE] TRADE RUNTIME OPTIONS READY:',
                    {
                        symbol,
                        tradeType,
                        durations,
                    }
                );
            } catch (error) {
                console.error(
                    '[MONEHUNT TRADING WORKSPACE] TRADE RUNTIME OPTIONS FAILED:',
                    error
                );

                if (cancelled) return;

                setDurationOptions([]);
                setDurationOptionsSymbol('');
                setGlobalMarketReadySymbol('');

                const pendingDcirclesRun = pendingDcirclesRunRef.current;

                if (pendingDcirclesRun?.symbol === symbol) {
                    handledGlobalRunRequest.current =
                        `${pendingDcirclesRun.botId}:${pendingDcirclesRun.signal}`;
                    pendingDcirclesRunRef.current = null;

                    setError(
                        `Could not load contract durations for ${symbol}. No trade was started.`
                    );

                    try {
                        if (
                            sessionStorage.getItem(MONEHUNT_PENDING_GLOBAL_RUN_KEY) ===
                            pendingDcirclesRun.botId
                        ) {
                            sessionStorage.removeItem(MONEHUNT_PENDING_GLOBAL_RUN_KEY);
                            sessionStorage.removeItem(MONEHUNT_PENDING_GLOBAL_MARKET_KEY);
                        }
                    } catch (storageError) {
                        console.error(
                            '[MONEHUNT GLOBAL RUN] Could not clear failed duration request:',
                            storageError
                        );
                    }
                }
            }
        };

        void loadTradeRuntimeOptions();

        return () => {
            cancelled = true;
        };
    }, [symbol, tradeType, apiHelpersReadyVersion]);

    React.useEffect(() => {
        if (!submarket) return;

        const activeSymbols = ApiHelpers?.instance?.active_symbols;
        if (!activeSymbols) return;

        const options = activeSymbols.getSymbolDropdownOptions(submarket);
        setSymbolOptions(options);

        const selection = strategySelectionRef.current;
        const pendingDcirclesSymbol =
            pendingDcirclesRunRef.current?.submarket === submarket
                ? pendingDcirclesRunRef.current.symbol
                : '';
        const desiredSymbol =
            pendingDcirclesSymbol ||
            (selection?.submarket === submarket ? selection.symbol : '');
        const nextSymbol = desiredSymbol
            ? options.find(option => option[1] === desiredSymbol)?.[1] ?? ''
            : options?.[0]?.[1] ?? '';

        setSymbol(nextSymbol);

        if (selection && nextSymbol === desiredSymbol && desiredSymbol) {
            strategySelectionRef.current = null;
            console.log(
                '[MONEHUNT TRADING WORKSPACE] XML MARKET/SYMBOL SELECTION RESTORED:',
                { market: selection.market, submarket, symbol: nextSymbol }
            );
        }
    }, [submarket, apiHelpersReadyVersion]);
    const executeBot = async (): Promise<boolean> => {
        setError('');

        if (!selectedBot) {
            setError('Select a bot before execution.');
            return false;
        }

        const parsedStake = Number(stake);
        const parsedMartingale = Number(martingale);
        const parsedMaxStake = maxStake.trim() === '' ? undefined : Number(maxStake);
        const parsedTakeProfit =
            takeProfit.trim() === '' ? undefined : Number(takeProfit);
        const parsedStopLoss =
            stopLoss.trim() === '' ? undefined : Number(stopLoss);
        const parsedDuration = Number(duration);
        const parsedUserPrediction =
            prediction.trim() === '' ? undefined : Number(prediction);

        if (
            predictionMode === 'user-preference' &&
            (
                parsedUserPrediction === undefined ||
                !Number.isFinite(parsedUserPrediction) ||
                !Number.isInteger(parsedUserPrediction)
            )
        ) {
            setError('User Prediction must be a valid whole number.');
            return false;
        }
        const selectedDurationOption = durationOptions.find(
            option => option.unit === durationUnit
        );

        if (!symbol) {
            setError('Select a market.');
            return false;
        }

        if (
            durationOptionsSymbol !== symbol ||
            !selectedDurationOption ||
            !Number.isFinite(Number(selectedDurationOption.min)) ||
            !Number.isFinite(Number(selectedDurationOption.max)) ||
            Number(selectedDurationOption.min) > Number(selectedDurationOption.max)
        ) {
            setError(
                'Wait for valid contract duration options to load for the selected market.'
            );
            return false;
        }

        if (
            !Number.isFinite(parsedDuration) ||
            parsedDuration < 1 ||
            parsedDuration > 10
        ) {
            setError('Duration must be between 1 and 10.');
            return false;
        }

        if (
            selectedDurationOption &&
            (parsedDuration < selectedDurationOption.min ||
                parsedDuration > Math.min(selectedDurationOption.max, 10))
        ) {
            setError('Duration is outside the official range for this duration unit.');
            return false;
        }

        if (!Number.isFinite(parsedStake) || parsedStake <= 0) {
            setError('Stake must be greater than 0.');
            return false;
        }

        if (
            !Number.isFinite(parsedMartingale) ||
            (parsedMartingale !== 0 && parsedMartingale <= 1)
        ) {
            setError('Martingale must be 0 (disabled) or greater than 1.');
            return false;
        }

        if (
            parsedMaxStake !== undefined &&
            (!Number.isFinite(parsedMaxStake) || parsedMaxStake < parsedStake)
        ) {
            setError('Max Stake must be a valid amount at least as large as the starting stake.');
            return false;
        }

        if (
            parsedTakeProfit !== undefined &&
            (!Number.isFinite(parsedTakeProfit) || parsedTakeProfit < 0)
        ) {
            setError('Take Profit must be 0 or greater.');
            return false;
        }

        if (
            parsedStopLoss !== undefined &&
            (!Number.isFinite(parsedStopLoss) || parsedStopLoss < 0)
        ) {
            setError('Stop Loss must be 0 or greater.');
            return false;
        }


        console.log(
            '[MONEHUNT TRADING WORKSPACE] EXECUTE:',
            {
                botId: selectedBot.id,
                botName: selectedBot.name,
                symbol,
                direction:
                    directionPreference === 'bot-default'
                        ? undefined
                        : directionPreference,
                duration: parsedDuration,
                durationUnit: durationUnit || null,
                stake: parsedStake,
                martingale: parsedMartingale,
                maxStake: parsedMaxStake ?? null,
                takeProfit: parsedTakeProfit ?? null,
                stopLoss: parsedStopLoss ?? null,
            }
        );

        const didStart = await store.run_panel.onRunButtonClick(() => {
            setMonehuntRuntimeConfig({
                symbol,
                tradeFamily: tradeType,
                contractPreference:
                    directionPreference === 'bot-default'
                        ? undefined
                        : directionPreference,
                direction:
                    directionPreference === 'rise' ||
                    directionPreference === 'fall' ||
                    directionPreference === 'both'
                        ? directionPreference
                        : undefined,
                duration: parsedDuration,
                durationUnit: durationUnit || undefined,
                prediction: predictionMode === 'user-preference' ? parsedUserPrediction : undefined,
                stake: parsedStake,
                martingale: parsedMartingale,
                maxStake: parsedMaxStake,
                takeProfit: parsedTakeProfit,
                stopLoss: parsedStopLoss,
            });
        });

        if (didStart !== true) {
            setError('The official bot validation or login gate blocked execution.');
            return false;
        }

        return true;
    };
    React.useEffect(() => {
        if (!globalRunSignal) return;

        let pendingBotId = '';
        let requestedDcirclesSymbol = '';

        try {
            pendingBotId = sessionStorage.getItem(MONEHUNT_PENDING_GLOBAL_RUN_KEY) || '';
            requestedDcirclesSymbol =
                sessionStorage.getItem(MONEHUNT_PENDING_GLOBAL_MARKET_KEY) || '';
        } catch (error) {
            console.error('[MONEHUNT GLOBAL RUN] Could not read queued request:', error);
            setError('Could not read the queued Run request. Please press Run again.');
            return;
        }

        if (!pendingBotId || !selectedBot || pendingBotId !== String(selectedBot.id)) return;
        if (loadedBotId !== pendingBotId || !executionWorkspaceReady) return;
        if (isRunning) return;

        const requestToken = `${pendingBotId}:${globalRunSignal}`;

        if (requestedDcirclesSymbol) {
            const staged = pendingDcirclesRunRef.current;

            if (
                !staged ||
                staged.botId !== pendingBotId ||
                staged.signal !== globalRunSignal ||
                staged.symbol !== requestedDcirclesSymbol
            ) {
                const activeSymbols = ApiHelpers?.instance?.active_symbols;

                // Wait for active-symbol options before validating the requested market.
                // An empty initial list does not prove that the market is invalid.
                if (!activeSymbols || !marketOptions.length) return;

                const resolved = activeSymbols
                    .getAllSymbols(false)
                    .find((item: { symbol: string }) => item.symbol === requestedDcirclesSymbol);

                const validMarket =
                    resolved &&
                    typeof resolved.market === 'string' &&
                    typeof resolved.submarket === 'string' &&
                    !activeSymbols.isSymbolClosed(requestedDcirclesSymbol) &&
                    !activeSymbols.isMarketClosed(resolved.market) &&
                    activeSymbols
                        .getMarketDropdownOptions()
                        .some((option: [string, string]) => option[1] === resolved.market) &&
                    activeSymbols
                        .getSubmarketDropdownOptions(resolved.market)
                        .some((option: [string, string]) => option[1] === resolved.submarket) &&
                    activeSymbols
                        .getSymbolDropdownOptions(resolved.submarket)
                        .some((option: [string, string]) => option[1] === requestedDcirclesSymbol);

                if (!validMarket) {
                    handledGlobalRunRequest.current = requestToken;
                    pendingDcirclesRunRef.current = null;
                    setError(
                        `D-Circles market ${requestedDcirclesSymbol} is unavailable or closed. No trade was started.`
                    );

                    try {
                        if (sessionStorage.getItem(MONEHUNT_PENDING_GLOBAL_RUN_KEY) === pendingBotId) {
                            sessionStorage.removeItem(MONEHUNT_PENDING_GLOBAL_RUN_KEY);
                            sessionStorage.removeItem(MONEHUNT_PENDING_GLOBAL_MARKET_KEY);
                        }
                    } catch (error) {
                        console.error('[MONEHUNT GLOBAL RUN] Could not clear invalid request:', error);
                    }
                    return;
                }

                pendingDcirclesRunRef.current = {
                    botId: pendingBotId,
                    symbol: requestedDcirclesSymbol,
                    market: resolved.market,
                    submarket: resolved.submarket,
                    signal: globalRunSignal,
                };

                strategySelectionRef.current = {
                    market: resolved.market,
                    submarket: resolved.submarket,
                    symbol: requestedDcirclesSymbol,
                };

                setGlobalMarketReadySymbol(
                    symbol === requestedDcirclesSymbol && durationOptionsSymbol === requestedDcirclesSymbol && durationOptions.length
                        ? requestedDcirclesSymbol
                        : ''
                );
                setError('');
                setMarket(resolved.market);
                setSubmarket(resolved.submarket);
                setSymbol(requestedDcirclesSymbol);

                console.log('[MONEHUNT GLOBAL RUN] D-Circles market staged:', {
                    botId: pendingBotId,
                    symbol: requestedDcirclesSymbol,
                    market: resolved.market,
                    submarket: resolved.submarket,
                });
                return;
            }

            if (
                market !== staged.market ||
                submarket !== staged.submarket ||
                symbol !== staged.symbol ||
                durationOptionsSymbol !== staged.symbol ||
                globalMarketReadySymbol !== staged.symbol
            ) {
                return;
            }
        } else {
            pendingDcirclesRunRef.current = null;
        }

        if (handledGlobalRunRequest.current === requestToken) return;

        if (
            !marketOptions.length ||
            !symbol ||
            !durationOptions.length ||
            !durationUnit
        ) return;

        if (isRunning) return;

        handledGlobalRunRequest.current = requestToken;

        console.log('[MONEHUNT GLOBAL RUN] Running selected bot through validated flow:', {
            botId: pendingBotId,
            symbol,
            duration,
            durationUnit,
            dCirclesMarket: requestedDcirclesSymbol || null,
        });

        void (async () => {
            try {
                const accepted = await executeBot();

                if (!accepted) {
                    setError(current =>
                        current || 'Run was not started. Correct the settings and press Run again.'
                    );
                }
            } catch (error) {
                console.error('[MONEHUNT GLOBAL RUN] Execution request failed:', error);
                setError('The queued Run request failed. Review the settings and try again.');
            } finally {
                try {
                    if (sessionStorage.getItem(MONEHUNT_PENDING_GLOBAL_RUN_KEY) === pendingBotId) {
                        sessionStorage.removeItem(MONEHUNT_PENDING_GLOBAL_RUN_KEY);
                        sessionStorage.removeItem(MONEHUNT_PENDING_GLOBAL_MARKET_KEY);
                    }
                } catch (error) {
                    console.error('[MONEHUNT GLOBAL RUN] Could not clear completed request:', error);
                }
                pendingDcirclesRunRef.current = null;
                setGlobalMarketReadySymbol('');
            }
        })();
    }, [
        globalRunSignal,
        selectedBot,
        loadedBotId,
        executionWorkspaceReady,
        apiHelpersReadyVersion,
        marketOptions,
        market,
        submarket,
        symbol,
        durationOptions,
        durationOptionsSymbol,
        durationUnit,
        globalMarketReadySymbol,
        isRunning,
    ]);
    return (
        <>
        {!headless && (
        <main className='monehunt-trading-workspace'>
            <section className='monehunt-trading-workspace__header'>
                <div>
                    <span className='monehunt-trading-workspace__eyebrow'>
                        MONEHUNT EXECUTION
                    </span>
                    <h1>Trading Workspace</h1>
                    <p>
                        Select a bot, configure runtime settings, and execute.
                    </p>
                </div>

                <div
                    className={`monehunt-trading-workspace__status ${
                        isRunning
                            ? 'monehunt-trading-workspace__status--running'
                            : ''
                    }`}
                >
                    {isRunning ? 'RUNNING' : 'READY'}
                </div>
            </section>

            <section className='monehunt-trading-workspace__panel'>
                <div className='monehunt-trading-workspace__panel-header'>
                    <div>
                        <span className='monehunt-trading-workspace__label'>
                            SELECTED BOT
                        </span>

                        <h2>
                            {selectedBot?.name || 'No bot selected'}
                        </h2>
                    </div>

                    {selectedBot && (
                        <span className='monehunt-trading-workspace__bot-id'>
                            {selectedBot.id}
                        </span>
                    )}
                </div>

                {selectedBot ? (
                    <div className='monehunt-trading-workspace__selected'>
                        <div className='monehunt-trading-workspace__bot-summary'>
                            <div className='monehunt-trading-workspace__bot-icon'>
                                {selectedBot.icon || 'BOT'}
                            </div>

                            <div>
                                <h3>{selectedBot.name}</h3>

                                <p>
                                    {selectedBot.description ||
                                        'Ready for runtime configuration.'}
                                </p>

                                {selectedBot.free && (
                                    <span className='monehunt-trading-workspace__free-badge'>
                                        FREE BOT
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className='monehunt-trading-workspace__runtime'>
                            <span className='monehunt-trading-workspace__label'>
                                RUNTIME SETTINGS
                            </span>

                            <p>
                                These settings are runtime controls and do not
                                modify the selected bot XML.
                            </p>
                        </div>

                        <div className='monehunt-trading-workspace__runtime-grid'>
                            <label>
                                <span>MARKET</span>
                                <select
                                    value={market}
                                    onChange={event => {
                                        strategySelectionRef.current = null;
                                        setMarket(event.target.value);
                                    }}
                                    disabled={isRunning || marketOptions.length === 0}
                                >
                                    {marketOptions.map(([label, value]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                <span>SUBMARKET</span>
                                <select
                                    value={submarket}
                                    onChange={event => {
                                        strategySelectionRef.current = null;
                                        setSubmarket(event.target.value);
                                    }}
                                    disabled={
                                        isRunning || submarketOptions.length === 0
                                    }
                                >
                                    {submarketOptions.map(([label, value]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                <span>SYMBOL</span>
                                <select
                                    value={symbol}
                                    onChange={event => {
                                        strategySelectionRef.current = null;
                                        setSymbol(event.target.value);
                                    }}
                                    disabled={isRunning || symbolOptions.length === 0}
                                >
                                    {symbolOptions.map(([label, value]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                <span>BOT CONTRACT (FROM STRATEGY)</span>
                                <div>{contractType || 'Defined by bot strategy'}</div>
                            </label>
                            <label>
                            <span>CONTRACT PREFERENCE</span>
                            <select
                                value={directionPreference}
                                onChange={event =>
                                    setDirectionPreference(
                                        event.target.value as
                                            | 'bot-default'
                                            | 'even'
                                            | 'odd'
                                            | 'over'
                                            | 'under'
                                            | 'rise'
                                            | 'fall'
                                            | 'both'
                                    )
                                }
                                disabled={isRunning}
                            >
                                <option value='bot-default'>Bot Default</option>
                                {tradeType?.toUpperCase() === 'EVENODD' && (
                                    <>
                                        <option value='even'>Even Only</option>
                                        <option value='odd'>Odd Only</option>
                                        <option value='both'>Both Even and Odd</option>
                                    </>
                                )}
                                {tradeType?.toUpperCase() === 'OVERUNDER' && (
                                    <>
                                        <option value='over'>Over Only</option>
                                        <option value='under'>Under Only</option>
                                        <option value='both'>Both Over and Under</option>
                                    </>
                                )}
                                {tradeType?.toUpperCase() === 'CALLPUT' && (
                                    <>
                                        <option value='rise'>Rise / UP Only</option>
                                        <option value='fall'>Fall / DOWN Only</option>
                                        <option value='both'>Both Rise and Fall</option>
                                    </>
                                )}
                            </select>
                        </label>
                            {showPredictionControls && (
                            <>
                                <label>
                                    <span>PREDICTION SOURCE</span>
                                    <select
                                        value={predictionMode}
                                        onChange={event => {
                                            const mode = event.target.value as 'bot-default' | 'user-preference';
                                            setPredictionMode(mode);
                                            if (mode === 'bot-default') setPrediction(botPrediction);
                                        }}
                                        disabled={isRunning}
                                    >
                                        <option value='bot-default'>
                                            Bot Default{botPrediction ? ` (${botPrediction})` : ' (strategy default)'}
                                        </option>
                                        <option value='user-preference'>User Preference</option>
                                    </select>
                                </label>
                                {predictionMode === 'user-preference' && (
                                    <label>
                                        <span>USER PREDICTION</span>
                                        <input
                                            type='number'
                                            step='1'
                                            value={prediction}
                                            onChange={event => setPrediction(event.target.value)}
                                            disabled={isRunning}
                                        />
                                    </label>
                                )}
                            </>
                            )}
                            {hasWinningStake && (
                                <label>
                                    <span>WINNING STAKE</span>
                                    <input
                                        type='number'
                                        min='0.01'
                                        step='any'
                                        value={winningStake}
                                        onChange={event => {
                                            const value = event.target.value;
                                            setWinningStake(value);
                                            const amount = Number(value);
                                            if (value.trim() && Number.isFinite(amount) && amount > 0) {
                                                const workspace = dbot.workspace;
                                                const setter = workspace?.getAllBlocks(false).find(
                                                    block => block.type === 'variables_set' &&
                                                        block.getField('VAR')?.getText() === 'winStake'
                                                );
                                                const valueBlock = setter?.getInputTargetBlock?.('VALUE');
                                                if (
                                                    valueBlock?.type === 'math_number' &&
                                                    valueBlock.getField('NUM')
                                                ) {
                                                    valueBlock.setFieldValue(String(amount), 'NUM');
                                                }
                                            }
                                        }}
                                        disabled={isRunning}
                                    />
                                </label>
                            )}
                            {durationOptions.length > 0 && (
                                <label>
                                    <span>DURATION</span>
                                    <select
                                        value={duration}
                                        onChange={event =>
                                            setDuration(event.target.value)
                                        }
                                        disabled={isRunning}
                                    >
                                        {Array.from({ length: 10 }, (_, index) => {
                                            const selectedDuration =
                                                durationOptions.find(
                                                    option =>
                                                        option.unit === durationUnit
                                                );

                                            const min = selectedDuration?.min ?? 1;
                                            const max = Math.min(
                                                selectedDuration?.max ?? 10,
                                                10
                                            );
                                            const value = index + 1;

                                            return value >= min && value <= max ? (
                                                <option key={value} value={value}>
                                                    {value}
                                                </option>
                                            ) : null;
                                        })}
                                    </select>
                                </label>
                            )}

                            {durationOptions.length > 0 && (
                                <label>
                                    <span>DURATION UNIT</span>
                                    <select
                                        value={durationUnit}
                                        onChange={event =>
                                            setDurationUnit(event.target.value)
                                        }
                                        disabled={isRunning}
                                    >
                                        {durationOptions.map(option => (
                                            <option
                                                key={option.unit}
                                                value={option.unit}
                                            >
                                                {option.display}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            )}

                            <label>
                                <span>STAKE</span>
                                <input
                                    type='number'
                                    min='0'
                                    step='0.01'
                                    value={stake}
                                    onChange={event =>
                                        setStake(event.target.value)
                                    }
                                    disabled={isRunning}
                                />
                            </label>

                            <label>
                                <span>MARTINGALE</span>
                                <input
                                    type='number'
                                    min='0'
                                    step='0.01'
                                    value={martingale}
                                    onChange={event =>
                                        setMartingale(event.target.value)
                                    }
                                    disabled={isRunning}
                                />
                            </label>

                            <label>
                                <span>MAX STAKE (OPTIONAL)</span>
                                <input
                                    type='number'
                                    min={stake || '0.01'}
                                    step='0.01'
                                    value={maxStake}
                                    onChange={event => setMaxStake(event.target.value)}
                                    placeholder='No cap'
                                    disabled={isRunning}
                                />
                            </label>

                            <label>
                                <span>TAKE PROFIT</span>
                                <input
                                    type='number'
                                    min='0'
                                    step='0.01'
                                    value={takeProfit}
                                    onChange={event =>
                                        setTakeProfit(event.target.value)
                                    }
                                    placeholder='Optional'
                                    disabled={isRunning}
                                />
                            </label>

                            <label>
                                <span>STOP LOSS</span>
                                <input
                                    type='number'
                                    min='0'
                                    step='0.01'
                                    value={stopLoss}
                                    onChange={event =>
                                        setStopLoss(event.target.value)
                                    }
                                    placeholder='Optional'
                                    disabled={isRunning}
                                />
                            </label>
                        </div>

                        {error && (
                            <div className='monehunt-trading-workspace__error'>
                                {error}
                            </div>
                        )}

                        <div className='monehunt-trading-workspace__actions'>
                            <button
                                type='button'
                                onClick={() => void executeBot()}
                                disabled={isRunning}
                            >
                                EXECUTE
                            </button>

                            {!showBotWorkspace && (
                                <button
                                    type='button'
                                    className='monehunt-trading-workspace__workspace-toggle'
                                    onClick={() => setShowBotWorkspace(true)}
                                >
                                    SHOW BOT WORKSPACE
                                </button>
                            )}

                            <span>
                                Uses the existing MONEHUNT bot execution path.
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className='monehunt-trading-workspace__empty'>
                        <div className='monehunt-trading-workspace__empty-icon'>
                            BOT
                        </div>

                        <h3>Select a bot to begin</h3>

                        <p>
                            Choose a Free Bot or a saved user bot. Bot logic is
                            managed separately in Bot Builder.
                        </p>
                    </div>
                )}
            </section>



            {showBotWorkspace && (
                <button
                    type='button'
                    className='monehunt-trading-workspace__workspace-close'
                    onClick={() => setShowBotWorkspace(false)}
                >
                    CLOSE BOT WORKSPACE
                </button>
            )}
        </main>
        )}

        <div
                id='scratch_div'
                aria-hidden={!showBotWorkspace}
                style={showBotWorkspace ? {
                    position: 'fixed',
                    left: '24px',
                    top: '120px',
                    width: 'calc(100vw - 48px)',
                    height: 'calc(100vh - 144px)',
                    overflow: 'hidden',
                    opacity: 1,
                    pointerEvents: 'auto',
                    zIndex: 10000,
                    background: 'var(--general-main-1)',
                    border: '1px solid rgba(0, 214, 163, 0.35)',
                    borderRadius: '12px',
                } : {
                    position: 'fixed',
                    left: '-10000px',
                    top: 0,
                    width: '1200px',
                    height: '800px',
                    overflow: 'hidden',
                    opacity: 0,
                    pointerEvents: 'none',
                }}
            />

        {/* TRADING WORKSPACE SHARED DIALOG HOST */}
        <Dialog
            cancel_button_text={cancel_button_text || localize('Cancel')}
            className='dc-dialog__wrapper--fixed'
            confirm_button_text={ok_button_text || localize('Ok')}
            has_close_icon
            is_mobile_full_width={false}
            is_visible={is_dialog_open}
            onCancel={onCancelButtonClick || undefined}
            onClose={onCloseDialog}
            onConfirm={onOkButtonClick || onCloseDialog}
            portal_element_id='modal_root'
            title={title}
            login={handleDialogLogin}
            dismissable={dismissable}
            is_closed_on_cancel={is_closed_on_cancel}
        >
            {message}
        </Dialog>

        <RunPanel />
    </>
    );
});

export default TradingWorkspace;
