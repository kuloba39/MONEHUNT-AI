import { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { DBOT_TABS } from '@/constants/bot-contents';
import { useStore } from '@/hooks/useStore';
import { useMonehuntAI } from '@/monehunt-ai-core';
import { load, save_types } from '@/external/bot-skeleton';
import { saveWorkspaceToRecent } from '@/external/bot-skeleton/utils';
import { FREE_BOTS } from '@/constants/free-bots';
import { MONEHUNT_PENDING_OVER2_SIGNAL_KEY, selectMonehuntBot } from '@/utils/monehunt-selected-bot';
import './ai-lab.scss';
import { useAnalysisTicks } from '../analysis/use-analysis-ticks';
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

const AiLab = observer(() => {
    const navigate = useNavigate();
    const { dashboard, load_modal, blockly_store } = useStore();
    const { state: aiState } = useMonehuntAI();

    const { setActiveTab } = dashboard;

    const {
        setSelectedStrategyId,
        selected_strategy_id,
    } = load_modal;

    const { setLoading } = blockly_store;

    const isOver2Strategy =
        selected_strategy_id === 'over2-signal';

    const isMatchesStrategy =
        selected_strategy_id === 'matches-signal';
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
/*
 * OVER 2 MULTI-MARKET SCANNER
 *
 * Independent from MATCHES and D CIRCLES.
 *
 * Every market gets its own 1000-tick
 * Over2Engine.
 */

const over2ScannerState = aiState.over2.scannerState;

/*
 * OVER 2 USER SELECTED MARKET
 *
 * The scanner provides ALL valid signals.
 * The user explicitly selects one valid signal.
 *
 * Scanner updates must NOT overwrite the
 * user's current selection.
 */
const [
    over2SelectedMarket,
    setOver2SelectedMarket
] =
    useState<any>(null);


/*
 * OVER 2 USER SELECTED SIGNAL
 *
 * This stores the exact signal selected by the user.
 * It is intentionally separate from the live scanner
 * signal so scanner refreshes cannot remove the
 * user's selection.
 */
const [
    over2SelectedSignal,
    setOver2SelectedSignal
] =
    useState<any>(null);

const over2SelectedLiveResult =
    over2ScannerState?.qualifyingMarkets?.find(
        (result: any) =>
            result.symbol === over2SelectedMarket?.symbol
    ) ?? null;

const over2State =
    over2SelectedLiveResult?.state ??
    over2SelectedMarket?.state ??
    null;

const over2Signal =
    over2SelectedSignal ??
    over2SelectedLiveResult?.signal ??
    null;
/*
 * Stable reference for the user's selected
 * OVER 2 market.
 *
 * The scanner callback reads this ref so
 * live scanner updates never overwrite the
 * user's selection.
 */
/*
 * OVER 2 USER SELECTED BOT
 *
 * Kept separate from the global Bot Builder
 * selected strategy. The user must select
 * a bot before APPLY TO BOT is enabled.
 */
const [
    over2SelectedBot,
    setOver2SelectedBot
] =
    useState<any>(null);

const over2SelectedMarketRef =
    useRef<any>(null);

over2SelectedMarketRef.current =
    over2SelectedMarket;

/*
 * OVER 2 USER SELECTED MARKET
 *
 * A scanner result is accepted only when
 * it is a valid READY OVER 2 signal.
 */
const [over2ScannerNow, setOver2ScannerNow] =
    useState(Date.now());

useEffect(() => {
    const timer =
        window.setInterval(() => {
            setOver2ScannerNow(Date.now());
        }, 1000);

    return () => {
        window.clearInterval(timer);
    };
}, []);

const formatOver2SignalAge = (
    generatedAt: number | undefined
) => {
    if (!generatedAt) {
        return '--';
    }

    const seconds =
        Math.max(
            0,
            Math.floor(
                (over2ScannerNow - generatedAt) /
                1000
            )
        );

    if (seconds < 1) {
        return 'NOW';
    }

    return `${seconds}s ago`;
};

const selectOver2Market = (
    result: any
) => {
    if (
        !result?.signal?.qualifying ||
        !result?.signal?.ready ||
        result?.signal?.leastDigit === null
    ) {
        console.warn(
            'AI LAB: Cannot select invalid OVER 2 signal'
        );
        return;
    }

    over2SelectedMarketRef.current =
        result;

    setOver2SelectedMarket(
        result
    );
    
/*
 * LOCK THE EXACT SIGNAL SELECTED BY THE USER.
 */
setOver2SelectedSignal(
    result.signal
);

/*
 * OVER 2 IS A DEDICATED STRATEGY.
 *
 * Selecting a valid signal immediately activates the
 * dedicated OVER 2 bot strategy. No bot selector is required.
 */
setSelectedStrategyId(
    'over2-signal'
);
/*
     * OVER 2 uses one dedicated bot.
     *
     * Selecting a valid signal automatically
     * selects the OVER 2 bot so APPLY TO BOT
     * becomes immediately available.
     */
    const over2Bot =
        FREE_BOTS.find(
            bot =>
                bot.id ===
                'over2-signal'
        );

    setOver2SelectedBot(
        over2Bot ?? null
    );
console.log(
        'AI LAB OVER 2 MARKET SELECTED',
        {
            symbol: result.symbol,
            name: result.name,
            leastDigit: result.signal.leastDigit
        }
    );
};

/*
 * OVER 2 USER TRADE SETTINGS
 *
 * These values are controlled by the user
 * from the AI LAB signal display.
 *
 * They are only initial UI values.
 * APPLY OVER 2 BOT uses the current values.
 */

const [
    over2InitialStake,
    setOver2InitialStake
] = useState(() => {
    if (typeof window === 'undefined') return '10';
    return localStorage.getItem('ai_lab_over2_initial_stake') || '10';
});

const [
    over2Stake,
    setOver2Stake
] = useState(() => {
    if (typeof window === 'undefined') return '10';
    return localStorage.getItem('ai_lab_over2_stake') || '10';
});

const [
    over2TakeProfit,
    setOver2TakeProfit
] = useState(() => {
    if (typeof window === 'undefined') return '15';
    return localStorage.getItem('ai_lab_over2_take_profit') || '15';
});

const [
    over2MartingaleLevel,
    setOver2MartingaleLevel
] = useState(() => {
    if (typeof window === 'undefined') return '6';
    return localStorage.getItem('ai_lab_over2_martingale_level') || '6';
});

const [
    over2Martingale,
    setOver2Martingale
] = useState(() => {
    if (typeof window === 'undefined') return '2';
    return localStorage.getItem('ai_lab_over2_martingale') || '2';
});

/*
 * OVER 2 SETTINGS PERSISTENCE
 *
 * Market selection, scanner refreshes, and bot loading
 * must never reset the user's configured settings.
 */
useEffect(() => {
    localStorage.setItem('ai_lab_over2_initial_stake', over2InitialStake);
    localStorage.setItem('ai_lab_over2_stake', over2Stake);
    localStorage.setItem('ai_lab_over2_take_profit', over2TakeProfit);
    localStorage.setItem('ai_lab_over2_martingale_level', over2MartingaleLevel);
    localStorage.setItem('ai_lab_over2_martingale', over2Martingale);
}, [
    over2InitialStake,
    over2Stake,
    over2TakeProfit,
    over2MartingaleLevel,
    over2Martingale
]);
/*
 * MATCHES USER TRADE SETTINGS
 *
 * These values are controlled by the user
 * from the AI LAB signal display.
 *
 * APPLY MATCHES BOT uses the current values.
 */

const [
    matchesInitialStake,
    setMatchesInitialStake
] = useState('10');

const [
    matchesStake,
    setMatchesStake
] = useState('10');

const [
    matchesTakeProfit,
    setMatchesTakeProfit
] = useState('15');

const [
    matchesMartingaleLevel,
    setMatchesMartingaleLevel
] = useState('6');

const [
    matchesMartingale,
    setMatchesMartingale
] = useState('2');


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
            let workspace =
                window.Blockly?.derivWorkspace;

            if (!workspace) {
                console.log(
                    'AI LAB: Navigating to Trading Workspace for Blockly workspace'
                );

                navigate('/preview');

                await new Promise<void>((resolve, reject) => {
                    let attempts = 0;

                    const timer = window.setInterval(() => {
                        workspace =
                            window.Blockly?.derivWorkspace;

                        if (workspace) {
                            window.clearInterval(timer);
                            resolve();
                            return;
                        }

                        attempts += 1;

                        if (attempts >= 150) {
                            window.clearInterval(timer);
                            reject(
                                new Error(
                                    'Blockly workspace initialization timed out'
                                )
                            );
                        }
                    }, 100);
                });
            }

            if (!workspace) {
                throw new Error(
                    'Blockly workspace is not ready'
                );
            }

                        console.log(
                'AI LAB ? MATCHES SIGNAL BOT',
                {
                    market,
                    entryDigit,
                    barrierDigit
                }
            );

            /*
             * MATCHES USER TRADE SETTINGS
             *
             * Inject the user's current AI LAB
             * settings into the XML BEFORE Blockly
             * loads the bot.
             *
             * This prevents the MATCHES XML
             * initialization blocks from restoring
             * their default values.
             */

            const initialStake =
                Number(matchesInitialStake);

            const stake =
                Number(matchesStake);

            const takeProfit =
                Number(matchesTakeProfit);

            const martingaleLevel =
                Number(matchesMartingaleLevel);

            const martingale =
                Number(matchesMartingale);

            if (
                !Number.isFinite(initialStake) ||
                !Number.isFinite(stake) ||
                !Number.isFinite(takeProfit) ||
                !Number.isFinite(martingaleLevel) ||
                !Number.isFinite(martingale) ||
                initialStake < 0 ||
                stake < 0 ||
                takeProfit < 0 ||
                martingaleLevel < 0 ||
                !Number.isInteger(martingaleLevel) ||
                martingale < 0
            ) {
                throw new Error(
                    'Invalid MATCHES trade settings'
                );
            }

            /*
             * MATCHES XML block IDs contain regex
             * special characters, so escape the ID
             * before creating the replacement pattern.
             */

            const replaceMatchesXmlNumber = (
                xml: string,
                blockId: string,
                value: number
            ) => {

                const escapedId =
                    blockId.replace(
                        /[.*+?^${}()|[\]\\]/g,
                        '\\$&'
                    );

                const pattern =
                    new RegExp(
                        `(<block[^>]*id="${escapedId}"[^>]*>[\\s\\S]*?<field[^>]*name="NUM"[^>]*>)([^<]*)(</field>)`
                    );

                return xml.replace(
                    pattern,
                    `$1${value}$3`
                );

            };

            /*
             * Preserve the original XML so we can
             * verify that the settings were actually
             * injected before Blockly loads.
             */

            const originalMatchesBotXml =
                bot.xml;

            let matchesBotXml =
                bot.xml;

            /*
             * InitialStake
             */

            matchesBotXml =
                replaceMatchesXmlNumber(
                    matchesBotXml,
                    'Bkh)MPXIEb*OkBYj#pK7',
                    initialStake
                );

            /*
             * Initial Stake / runtime Stake
             *
             * This is ONLY the initial Stake number.
             * Runtime Stake setters used by the
             * martingale logic remain untouched.
             */

            matchesBotXml =
                replaceMatchesXmlNumber(
                    matchesBotXml,
                    'OnFEAsEI_^z?;!g+Kw[R',
                    stake
                );

            /*
             * TakeProfit
             */

            matchesBotXml =
                replaceMatchesXmlNumber(
                    matchesBotXml,
                    'L[oTdLAFR(Q4,,@v+g?/',
                    takeProfit
                );

            /*
             * MartingaleLevel
             */

            matchesBotXml =
                replaceMatchesXmlNumber(
                    matchesBotXml,
                    'Z58N0I5$5mdai2Aa#I77',
                    martingaleLevel
                );

            /*
             * Martingale
             */

            matchesBotXml =
                replaceMatchesXmlNumber(
                    matchesBotXml,
                    'x!-}V/5Jd1}I}|030Scu',
                    martingale
                );

            console.log(
                'AI LAB ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ MATCHES XML SETTINGS INJECTED',
                {
                    initialStake,
                    stake,
                    takeProfit,
                    martingaleLevel,
                    martingale,

                    initialStakeApplied:
                        matchesBotXml.includes(
                            `id="Bkh)MPXIEb*OkBYj#pK7"`
                        ) &&
                        matchesBotXml.includes(
                            `>${initialStake}</field>`
                        ),

                    stakeApplied:
                        matchesBotXml.includes(
                            `id="OnFEAsEI_^z?;!g+Kw[R"`
                        ) &&
                        matchesBotXml.includes(
                            `>${stake}</field>`
                        ),

                    takeProfitApplied:
                        matchesBotXml.includes(
                            `id="L[oTdLAFR(Q4,,@v+g?/"`
                        ) &&
                        matchesBotXml.includes(
                            `>${takeProfit}</field>`
                        ),

                    martingaleLevelApplied:
                        matchesBotXml.includes(
                            `id="Z58N0I5$5mdai2Aa#I77"`
                        ) &&
                        matchesBotXml.includes(
                            `>${martingaleLevel}</field>`
                        ),

                    martingaleApplied:
                        matchesBotXml.includes(
                            `id="x!-}V/5Jd1}I}|030Scu"`
                        ) &&
                        matchesBotXml.includes(
                            `>${martingale}</field>`
                        ),

                    xmlChanged:
                        matchesBotXml !==
                        originalMatchesBotXml
                }
            );

            await load({
                block_string: matchesBotXml,
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

            /*
 * Apply Prediction only for strategies
 * that use the generic AI barrier.
 *
 * OVER 2 is different:
 * its Prediction is permanently 2
 * and must NOT be overwritten by
 * barrierDigit / leastDigit.
 */

if (bot.id !== 'over2-signal') {

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
/*
 * Apply user-controlled OVER 2 trade settings.
 *
 * These values come directly from the
 * AI LAB signal display.
 *
 * Do NOT use the XML defaults here.
 */

const over2TradeSettings = [
    {
        variable: 'InitialStake',
        value: over2InitialStake
    },
    {
        variable: 'Stake',
        value: over2Stake
    },
    {
        variable: 'TakeProfit',
        value: over2TakeProfit
    },
    {
        variable: 'MartingaleLevel',
        value: over2MartingaleLevel
    },
    {
        variable: 'Martingale',
        value: over2Martingale
    }
];

over2TradeSettings.forEach(
    ({ variable, value }) => {

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
                    variable
                );
            });

        if (!variableBlock) {

            console.warn(
                `AI LAB: ${variable} variable block not found`
            );

            return;
        }

        const numberBlock =
            variableBlock
                .getInputTargetBlock(
                    'VALUE'
                );

        if (!numberBlock) {

            console.warn(
                `AI LAB: ${variable} VALUE block not found`
            );

            return;
        }

        const numericValue =
            Number(value);

        if (
            !Number.isFinite(
                numericValue
            )
        ) {

            console.warn(
                `AI LAB: INVALID ${variable} VALUE`,
                value
            );

            return;
        }

        numberBlock
            ?.getField('NUM')
            ?.setValue(
                String(numericValue)
            );

    }
);

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
const applyOver2SignalToBot = async (result?: any) => {
    const signal = result?.signal ?? over2SelectedSignal;
    const marketSymbol = result?.symbol ?? over2SelectedMarket?.symbol;
    const leastDigit = signal?.leastDigit;

    if (
        !signal?.qualifying ||
        !signal?.ready ||
        typeof marketSymbol !== 'string' ||
        !marketSymbol.trim() ||
        !Number.isInteger(leastDigit) ||
        leastDigit < 0 ||
        leastDigit > 2
    ) {
        console.warn('AI LAB: Apply Signal blocked; selected signal is invalid.');
        return;
    }

    const bot = FREE_BOTS.find(item => item.id === 'over2-signal');

    if (!bot?.xml) {
        console.error('AI LAB: OVER 2 SIGNAL BOT XML is unavailable.');
        return;
    }

    setLoading(true);

    try {
        selectMonehuntBot(bot);

        sessionStorage.setItem(
            MONEHUNT_PENDING_OVER2_SIGNAL_KEY,
            JSON.stringify({
                botId: 'over2-signal',
                marketSymbol,
                leastDigit,
                prediction: 2,
            })
        );

        console.log('AI LAB: OVER 2 SIGNAL HANDOFF READY', {
            marketSymbol,
            leastDigit,
            prediction: 2,
            autoRun: false,
        });

        navigate('/preview');
    } catch (error) {
        console.error('AI LAB: OVER 2 SIGNAL HANDOFF FAILED', error);
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

    requestAnimationFrame(() => {
        const aiCore = document.querySelector(
            '.ai-lab-signal'
        );

        if (aiCore instanceof HTMLElement) {
            aiCore.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });

            console.log(
                '[AI LAB] SELECTED MARKET HANDED TO AI CORE:',
                symbol
            );
        } else {
            console.warn(
                '[AI LAB] AI CORE SECTION NOT FOUND'
            );
        }
    });

};


    /*
     * Create one Matches adapter
     * for the current AI Lab session.
     */

    useEffect(() => {
        setEngineState(aiState.matches.engineState);
        setCurrentSignal(aiState.matches.signal);
        setStats(aiState.matches.stats);
    }, [aiState.matches]);
    useEffect(() => {

        localStorage.setItem(
            'ai_lab_market',
            market
        );

    }, [market]);
const signal =
    currentSignal;


    const digit =
        engineState?.digit;


    const aiInitialStake =
        isOver2Strategy ? over2InitialStake : matchesInitialStake;

    const setAiInitialStake =
        isOver2Strategy
            ? setOver2InitialStake
            : setMatchesInitialStake;

    const aiStake =
        isOver2Strategy ? over2Stake : matchesStake;

    const setAiStake =
        isOver2Strategy
            ? setOver2Stake
            : setMatchesStake;

    const aiTakeProfit =
        isOver2Strategy ? over2TakeProfit : matchesTakeProfit;

    const setAiTakeProfit =
        isOver2Strategy
            ? setOver2TakeProfit
            : setMatchesTakeProfit;

    const aiMartingaleLevel =
        isOver2Strategy
            ? over2MartingaleLevel
            : matchesMartingaleLevel;

    const setAiMartingaleLevel =
        isOver2Strategy
            ? setOver2MartingaleLevel
            : setMatchesMartingaleLevel;

    const aiMartingale =
        isOver2Strategy ? over2Martingale : matchesMartingale;

    const setAiMartingale =
        isOver2Strategy
            ? setOver2Martingale
            : setMatchesMartingale;

    return (
    <div className="ai-lab-page over2-signal-only">
        <header className="ai-lab-header">
            <div>
                <div className="ai-lab-title">OVER 2 SIGNAL SCANNER</div>
                <div className="ai-lab-subtitle">
                    Select a valid live signal, review the details, then apply it.
                </div>
            </div>
        </header>

        <main>
            <section className="over2-scanner-panel ai-lab-panel">
                <div className="over2-scanner-header">
                    <div>
                        <div className="section-heading">OVER 2 LIVE SCANNER</div>
                        <div className="over2-scanner-subtitle">
                            Select a qualifying market to inspect its signal.
                        </div>
                    </div>
                    <div className="over2-scanner-count">
                        <strong>{over2ScannerState?.qualifyingMarkets?.length ?? 0}</strong>
                        <span> VALID </span>
                        <small>/ {over2ScannerState?.totalMarkets ?? 0} MARKETS</small>
                    </div>
                </div>

                <div className="over2-scanner-list">
                    {(over2ScannerState?.qualifyingMarkets ?? []).length === 0 ? (
                        <div className="over2-scanner-empty">
                            <strong>NO VALID OVER 2 SIGNALS</strong>
                            <span>Scanner is monitoring available markets. Select a signal when one qualifies.</span>
                        </div>
                    ) : (
                        (over2ScannerState?.qualifyingMarkets ?? []).map((result: any) => {
                            const isSelected =
                                over2SelectedMarket?.symbol === result.symbol;

                            return (
                                <div
                                    key={result.symbol}
                                    className={
                                        isSelected
                                            ? "over2-signal-row selected"
                                            : "over2-signal-row"
                                    }
                                >
                                    <div className="over2-signal-market">
                                        <strong>{result.name}</strong>
                                        <span>{result.symbol}</span>
                                    </div>

                                    <div className="over2-signal-type">OVER 2</div>
                                    <div className="over2-signal-valid">VALID</div>

                                    <div className="over2-signal-digit">
                                        <span>ENTRY DIGIT</span>
                                        <strong>{result.signal?.leastDigit ?? '--'}</strong>
                                    </div>

                                    <div className="over2-signal-age">
                                        {formatOver2SignalAge(result.signal?.generatedAt)}
                                    </div>

                                    <button
                                        type="button"
                                        className="over2-select-button"
                                        onClick={() => { void applyOver2SignalToBot(result); }}
                                        disabled={
                                            !result.signal?.qualifying ||
                                            !result.signal?.ready ||
                                            typeof result.symbol !== 'string' ||
                                            !result.symbol.trim() ||
                                            !Number.isInteger(result.signal?.leastDigit) ||
                                            result.signal.leastDigit < 0 ||
                                            result.signal.leastDigit > 2
                                        }
                                    >
                                        APPLY
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </section>


        </main>
    </div>

    );

});

export default AiLab;