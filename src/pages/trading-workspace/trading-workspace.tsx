import React from 'react';
import { observer } from 'mobx-react-lite';
import { ApiHelpers } from '@/external/bot-skeleton';
import { getContractTypeOptions } from '@/components/shared/utils/common-data';
import { useStore } from '@/hooks/useStore';
import {
    MONEHUNT_SELECTED_BOT_KEY,
    type MonehuntSelectedBot,
} from '@/utils/monehunt-selected-bot';
import { setMonehuntRuntimeConfig } from '@/utils/monehunt-runtime-config';
import { load } from '@/external/bot-skeleton/scratch/utils';
import './trading-workspace.scss';

const TradingWorkspace = observer(() => {
    const store = useStore();
    const { app, dbot } = store;
    const isRunning = Boolean(store?.run_panel?.is_running);

    const [selectedBot, setSelectedBot] =
        React.useState<MonehuntSelectedBot | null>(null);

    const [market, setMarket] = React.useState('');
    const [submarket, setSubmarket] = React.useState('');
    const [symbol, setSymbol] = React.useState('');
    const [marketOptions, setMarketOptions] = React.useState<Array<[string, string]>>([]);
    const [submarketOptions, setSubmarketOptions] = React.useState<Array<[string, string]>>([]);
    const [symbolOptions, setSymbolOptions] = React.useState<Array<[string, string]>>([]);
    const [tradeType, setTradeType] = React.useState('');
    const [contractType, setContractType] = React.useState('');
    const [contractTypeOptions, setContractTypeOptions] =
        React.useState<Array<[string, string]>>([]);
    const [prediction, setPrediction] = React.useState('');
    const [predictionOptions, setPredictionOptions] = React.useState<number[]>([]);
    const [duration, setDuration] = React.useState('1');
    const [durationUnit, setDurationUnit] = React.useState('');
    const [durationOptions, setDurationOptions] = React.useState<
        Array<{ display: string; unit: string; min: number; max: number }>
    >([]);
    const [stake, setStake] = React.useState('1');
    const [martingale, setMartingale] = React.useState('2');
    const [takeProfit, setTakeProfit] = React.useState('');
    const [stopLoss, setStopLoss] = React.useState('');
    const [error, setError] = React.useState('');

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
                console.log(
                    '[MONEHUNT TRADING WORKSPACE] MOUNTING OFFICIAL DBOT WORKSPACE'
                );

                await app.onMount();

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

                await load({
                    block_string: selectedBotForExecution.xml,
                    file_name: selectedBotForExecution.name,
                    strategy_id: selectedBotForExecution.id,
                    from: 'monehunt-trading-workspace',
                    workspace,
                    showIncompatibleStrategyDialog: false,
                    show_snackbar: false,
                    persist_to_recent: false,
                });

                const allBlocks = workspace.getAllBlocks(false);

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

                const contractOptions = loadedTradeType
                    ? getContractTypeOptions('both', loadedTradeType)
                    : [];

                const officialContractOptions: Array<[string, string]> =
                    [...contractOptions];

                if (officialContractOptions.length > 1) {
                    officialContractOptions.unshift(['Both', 'both']);
                }

                setContractTypeOptions(officialContractOptions);

                const initialContract =
                    loadedContractType &&
                    officialContractOptions.some(
                        option => option[1] === loadedContractType
                    )
                        ? loadedContractType
                        : officialContractOptions[0]?.[1] || '';

                setContractType(initialContract);

                console.log(
                    '[MONEHUNT TRADING WORKSPACE] BOT TRADE SETTINGS DETECTED:',
                    {
                        tradeType: loadedTradeType,
                        contractType: loadedContractType,
                        contractOptions: officialContractOptions,
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

                await activeSymbols.retrieveActiveSymbols(false);

                if (cancelled) return;

                const options = activeSymbols.getMarketDropdownOptions();

                setMarketOptions(options);

                const firstMarket = options?.[0]?.[1] ?? '';

                if (firstMarket) {
                    setMarket(firstMarket);

                    const submarkets =
                        activeSymbols.getSubmarketDropdownOptions(firstMarket);

                    setSubmarketOptions(submarkets);

                    const firstSubmarket = submarkets?.[0]?.[1] ?? '';

                    if (firstSubmarket) {
                        setSubmarket(firstSubmarket);

                        const symbols =
                            activeSymbols.getSymbolDropdownOptions(firstSubmarket);

                        setSymbolOptions(symbols);

                        const firstSymbol = symbols?.[0]?.[1] ?? '';

                        if (firstSymbol) {
                            setSymbol(firstSymbol);
                        }
                    }
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
    }, []);

    React.useEffect(() => {
        if (!market) return;

        const activeSymbols = ApiHelpers?.instance?.active_symbols;
        if (!activeSymbols) return;

        const options = activeSymbols.getSubmarketDropdownOptions(market);

        setSubmarketOptions(options);

        const nextSubmarket = options?.[0]?.[1] ?? '';
        setSubmarket(nextSubmarket);

        if (nextSubmarket) {
            const symbols =
                activeSymbols.getSymbolDropdownOptions(nextSubmarket);

            setSymbolOptions(symbols);

            const nextSymbol = symbols?.[0]?.[1] ?? '';
            setSymbol(nextSymbol);
        } else {
            setSymbolOptions([]);
            setSymbol('');
        }
    }, [market]);

    React.useEffect(() => {
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
                const [durations, predictions] = await Promise.all([
                    contractsFor.getDurations(symbol, tradeType),
                    contractsFor.getPredictionRange(symbol, tradeType),
                ]);

                if (cancelled) return;

                setDurationOptions(durations || []);
                setPredictionOptions(predictions || []);

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

                if (predictions?.length) {
                    const currentPrediction = Number(prediction);
                    const nextPrediction = predictions.includes(currentPrediction)
                        ? currentPrediction
                        : predictions[0];

                    setPrediction(String(nextPrediction));
                } else {
                    setPrediction('');
                }

                console.log(
                    '[MONEHUNT TRADING WORKSPACE] TRADE RUNTIME OPTIONS READY:',
                    {
                        symbol,
                        tradeType,
                        durations,
                        predictions,
                    }
                );
            } catch (error) {
                console.error(
                    '[MONEHUNT TRADING WORKSPACE] TRADE RUNTIME OPTIONS FAILED:',
                    error
                );
            }
        };

        void loadTradeRuntimeOptions();

        return () => {
            cancelled = true;
        };
    }, [symbol, tradeType]);

    React.useEffect(() => {
        if (!submarket) return;

        const activeSymbols = ApiHelpers?.instance?.active_symbols;
        if (!activeSymbols) return;

        const options = activeSymbols.getSymbolDropdownOptions(submarket);

        setSymbolOptions(options);

        const nextSymbol = options?.[0]?.[1] ?? '';
        setSymbol(nextSymbol);
    }, [submarket]);
    const executeBot = async () => {
        setError('');

        if (!selectedBot) {
            setError('Select a bot before execution.');
            return;
        }

        const parsedStake = Number(stake);
        const parsedMartingale = Number(martingale);
        const parsedTakeProfit =
            takeProfit.trim() === '' ? undefined : Number(takeProfit);
        const parsedStopLoss =
            stopLoss.trim() === '' ? undefined : Number(stopLoss);
        const parsedPrediction =
            prediction.trim() === '' ? undefined : Number(prediction);
        const parsedDuration = Number(duration);
        const selectedDurationOption = durationOptions.find(
            option => option.unit === durationUnit
        );

        if (!symbol) {
            setError('Select a market.');
            return;
        }

        if (!contractType) {
            setError('Select a contract / side.');
            return;
        }

        if (
            !Number.isFinite(parsedDuration) ||
            parsedDuration < 1 ||
            parsedDuration > 10
        ) {
            setError('Duration must be between 1 and 10.');
            return;
        }

        if (
            selectedDurationOption &&
            (parsedDuration < selectedDurationOption.min ||
                parsedDuration > Math.min(selectedDurationOption.max, 10))
        ) {
            setError('Duration is outside the official range for this duration unit.');
            return;
        }

        if (
            parsedPrediction !== undefined &&
            (!Number.isInteger(parsedPrediction) ||
                !predictionOptions.includes(parsedPrediction))
        ) {
            setError('Prediction is outside the official range for this contract.');
            return;
        }

        if (!Number.isFinite(parsedStake) || parsedStake <= 0) {
            setError('Stake must be greater than 0.');
            return;
        }

        if (
            !Number.isFinite(parsedMartingale) ||
            parsedMartingale < 0
        ) {
            setError('Martingale must be 0 or greater.');
            return;
        }

        if (
            parsedTakeProfit !== undefined &&
            (!Number.isFinite(parsedTakeProfit) || parsedTakeProfit < 0)
        ) {
            setError('Take Profit must be 0 or greater.');
            return;
        }

        if (
            parsedStopLoss !== undefined &&
            (!Number.isFinite(parsedStopLoss) || parsedStopLoss < 0)
        ) {
            setError('Stop Loss must be 0 or greater.');
            return;
        }

        setMonehuntRuntimeConfig({
            symbol,
            contractType,
            prediction: parsedPrediction,
            duration: parsedDuration,
            durationUnit: durationUnit || undefined,
            stake: parsedStake,
            martingale: parsedMartingale,
            takeProfit: parsedTakeProfit,
            stopLoss: parsedStopLoss,
        });

        console.log(
            '[MONEHUNT TRADING WORKSPACE] EXECUTE:',
            {
                botId: selectedBot.id,
                botName: selectedBot.name,
                symbol,
                contractType,
                prediction: parsedPrediction ?? null,
                duration: parsedDuration,
                durationUnit: durationUnit || null,
                stake: parsedStake,
                martingale: parsedMartingale,
                takeProfit: parsedTakeProfit ?? null,
                stopLoss: parsedStopLoss ?? null,
            }
        );

        await store.run_panel.onRunButtonClick();
    };
    return (
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
                                    onChange={event =>
                                        setMarket(event.target.value)
                                    }
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
                                    onChange={event =>
                                        setSubmarket(event.target.value)
                                    }
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
                                    onChange={event =>
                                        setSymbol(event.target.value)
                                    }
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
                                <span>CONTRACT / SIDE</span>
                                <select
                                    value={contractType}
                                    onChange={event =>
                                        setContractType(event.target.value)
                                    }
                                    disabled={
                                        isRunning ||
                                        contractTypeOptions.length === 0
                                    }
                                >
                                    {contractTypeOptions.map(([label, value]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            {predictionOptions.length > 0 && (
                                <label>
                                    <span>PREDICTION</span>
                                    <select
                                        value={prediction}
                                        onChange={event =>
                                            setPrediction(event.target.value)
                                        }
                                        disabled={isRunning}
                                    >
                                        {predictionOptions.map(value => (
                                            <option key={value} value={value}>
                                                {value}
                                            </option>
                                        ))}
                                    </select>
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

            <div
                id='scratch_div'
                aria-hidden='true'
                style={{
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
        </main>
    );
});

export default TradingWorkspace;
