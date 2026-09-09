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
    Over2MarketScanner,
    Over2ScannerState
} from '@/ai-lab/over2/over2-market-scanner';

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
/*
 * OVER 2 MULTI-MARKET SCANNER
 *
 * Independent from MATCHES and D CIRCLES.
 *
 * Every market gets its own 1000-tick
 * Over2Engine.
 */

const over2ScannerRef =
    useRef<Over2MarketScanner | null>(null);

const [
    over2ScannerState,
    setOver2ScannerState
] =
    useState<Over2ScannerState | null>(null);

const [
    over2State,
    setOver2State
] =
    useState<any>(null);

const [
    over2Signal,
    setOver2Signal
] =
    useState<any>(null);

const [
    over2BestMarket,
    setOver2BestMarket
] =
    useState<any>(null);
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
] = useState('10');

const [
    over2Stake,
    setOver2Stake
] = useState('10');

const [
    over2TakeProfit,
    setOver2TakeProfit
] = useState('15');

const [
    over2MartingaleLevel,
    setOver2MartingaleLevel
] = useState('6');

const [
    over2Martingale,
    setOver2Martingale
] = useState('2');/*
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
            const workspace =
                window.Blockly?.derivWorkspace;

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
                'AI LAB → MATCHES XML SETTINGS INJECTED',
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
const applyOver2SignalToBot = async () => {

    const bestMarket =
        over2BestMarket;

    const signal =
        bestMarket?.signal;

    if (
    !bestMarket ||
    !signal?.ready ||
    signal.leastDigit === null
) {
        console.warn(
            'AI LAB: No READY OVER 2 signal available'
        );
        return;
    }


    const bot = FREE_BOTS.find(
        item => item.id === 'over2-signal'
    );


    if (!bot?.xml) {

        console.error(
            'AI LAB: OVER 2 SIGNAL BOT XML NOT FOUND'
        );

        return;
    }


    const leastDigit =
        Number(signal.leastDigit);
const signalMarket =
    bestMarket.symbol;


    if (
        !Number.isInteger(leastDigit) ||
        leastDigit < 0 ||
        leastDigit > 2
    ) {

        console.error(
            'AI LAB: INVALID OVER 2 LEAST DIGIT',
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
    'AI LAB ? OVER 2 SIGNAL BOT',
    {
        market:
            signalMarket,

        leastDigit,

        prediction: 2,

        scanner:
            'ALL MARKETS',

        qualifyingMarkets:
            over2ScannerState
                ?.qualifyingMarkets
                ?.length ?? 0
    }
);


                /*
         * OVER 2 USER TRADE SETTINGS
         *
         * Inject the user's current AI LAB
         * settings into the XML BEFORE Blockly
         * loads the bot.
         *
         * This prevents the XML initialization
         * blocks from restoring their defaults.
         */

        const initialStake =
            Number(over2InitialStake);

        const stake =
            Number(over2Stake);

        const takeProfit =
            Number(over2TakeProfit);

        const martingaleLevel =
            Number(over2MartingaleLevel);

        const martingale =
            Number(over2Martingale);

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
                'Invalid OVER 2 trade settings'
            );
        }


        /*
         * Replace ONLY the five initialization
         * number blocks.
         *
         * We use their unique XML IDs so that
         * runtime Stake changes used by the
         * martingale logic remain untouched.
         */

        const replaceOver2XmlNumber = (
            xml: string,
            blockId: string,
            value: number
        ) => {

            const pattern =
                new RegExp(
                    `(<block[^>]*id="${blockId}"[^>]*>[\\s\\S]*?<field[^>]*name="NUM"[^>]*>)([^<]*)(</field>)`
                );

            return xml.replace(
                pattern,
                `$1${value}$3`
            );

        };


        let over2BotXml =
            bot.xml;
        const originalOver2BotXml =
            over2BotXml;


        over2BotXml =
            replaceOver2XmlNumber(
                over2BotXml,
                'o2_initial_stake_num',
                initialStake
            );


        over2BotXml =
            replaceOver2XmlNumber(
                over2BotXml,
                'o2_stake_num',
                stake
            );


        over2BotXml =
            replaceOver2XmlNumber(
                over2BotXml,
                'o2_tp_num',
                takeProfit
            );


        over2BotXml =
            replaceOver2XmlNumber(
                over2BotXml,
                'o2_mart_level_num',
                martingaleLevel
            );


        over2BotXml =
            replaceOver2XmlNumber(
                over2BotXml,
                'o2_mart_num',
                martingale
            );
        console.log(
            'AI LAB → OVER 2 XML SETTINGS INJECTED',
            {
                initialStake,
                stake,
                takeProfit,
                martingaleLevel,
                martingale,

                initialStakeApplied:
                    over2BotXml.includes(
                        `id="o2_initial_stake_num"`
                    ) &&
                    over2BotXml.includes(
                        `>${initialStake}</field>`
                    ),

                stakeApplied:
                    over2BotXml.includes(
                        `id="o2_stake_num"`
                    ) &&
                    over2BotXml.includes(
                        `>${stake}</field>`
                    ),

                takeProfitApplied:
                    over2BotXml.includes(
                        `id="o2_tp_num"`
                    ) &&
                    over2BotXml.includes(
                        `>${takeProfit}</field>`
                    ),

                martingaleLevelApplied:
                    over2BotXml.includes(
                        `id="o2_mart_level_num"`
                    ) &&
                    over2BotXml.includes(
                        `>${martingaleLevel}</field>`
                    ),

                martingaleApplied:
                    over2BotXml.includes(
                        `id="o2_mart_num"`
                    ) &&
                    over2BotXml.includes(
                        `>${martingale}</field>`
                    ),

                xmlChanged:
                    over2BotXml !==
                    originalOver2BotXml
            }
        );


        console.log(
            'AI LAB → OVER 2 USER SETTINGS',
            {
                initialStake,
                stake,
                takeProfit,
                martingaleLevel,
                martingale
            }
        );


        await load({

            block_string:
                over2BotXml,

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
         * Apply selected market.
         */

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

                symbolField.setValue(
    signalMarket
);

            }

        }


        /*
         * Apply AI LAB leastDigit.
         *
         * This is the ONLY signal value
         * passed from AI LAB into the
         * OVER 2 bot.
         */

        const leastDigitBlock =
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
                    'leastDigit'
                );

            });


                if (leastDigitBlock) {

            const numberBlock =
                leastDigitBlock
                    .getInputTargetBlock(
                        'VALUE'
                    );


            numberBlock
                ?.getField('NUM')
                ?.setValue(
                    String(leastDigit)
                );

        } else {

            console.warn(
                'AI LAB: leastDigit variable block not found'
            );

        }


        /*
         * Apply AI LAB Prediction.
         *
         * OVER 2 always uses prediction 2,
         * but the trade option receives it
         * through the Blockly Prediction variable.
         */

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
                    '2'
                );

        } else {

            console.warn(
                'AI LAB: Prediction variable block not found'
            );

        }


        /*
         * Prediction is permanently OVER 2.
         *
         * Do NOT take this from MATCHES.
         */

        /*
 * OVER 2 Prediction is permanently 2.
 *
 * The XML already contains Prediction = 2.
 * Do not modify it here.
 *
 * leastDigit is the ONLY value received
 * from the scanner.
 */

/*
 * Always start the OVER 2 bot in
         * WAITING mode.
         *
         * 0 = waiting for leastDigit
         */

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
         * Make absolutely sure the bot is
         * NOT waiting on an old confirmation.
         *
         * 0 = not armed
         */

        const armedBlock =
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
                    'entry armed'
                );

            });


        if (armedBlock) {

            const numberBlock =
                armedBlock
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
            'AI LAB: OVER 2 SIGNAL APPLIED SUCCESSFULLY',
            {
                market,
                leastDigit,
                prediction: 2
            }
        );


    } catch (error) {

        console.error(
            'AI LAB: OVER 2 APPLY TO BOT ERROR',
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

    /*
     * MATCHES ENGINE
     */

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


   /*
 * OVER 2 MULTI-MARKET SCANNER
 *
 * The scanner does NOT follow the selected
 * AI LAB market.
 *
 * It scans every active market.
 */

if (
    over2ScannerRef.current
) {
    over2ScannerRef.current.stop();
}

setOver2ScannerState(null);
setOver2State(null);
setOver2Signal(null);
setOver2BestMarket(null);

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
/*
 * OVER 2 MULTI-MARKET SCANNER
 *
 * Scan ALL active AI LAB markets simultaneously.
 *
 * Each market has:
 *
 *     1000 historical ticks
 *          +
 *     continuous live ticks
 *          +
 *     independent Over2Engine
 *
 * Jump indices are included automatically
 * because the scanner receives the complete
 * AI LAB active-symbol list.
 */

useEffect(() => {

    if (
        !markets ||
        markets.length === 0
    ) {
        return;
    }

    /*
     * Stop the previous scanner before
     * creating a new one.
     */

    if (
        over2ScannerRef.current
    ) {
        over2ScannerRef.current.stop();
    }

    const scanner =
        new Over2MarketScanner();

    over2ScannerRef.current =
        scanner;

    /*
     * Receive scanner updates.
     */

    const unsubscribe =
        scanner.subscribe(
            state => {

                setOver2ScannerState(
                    state
                );

                /*
                 * Best qualifying market.
                 */

                const best =
                    state.bestMarket;

                setOver2BestMarket(
                    best
                );

                /*
                 * Preserve the existing
                 * OVER 2 signal shape.
                 */

                setOver2State(
                    best?.state ??
                    null
                );

                setOver2Signal(
                    best?.signal ??
                    null
                );

                if (best) {

                    console.log(
                        'AI LAB OVER 2 BEST MARKET',
                        {
                            symbol:
                                best.symbol,

                            name:
                                best.name,

                            leastDigit:
                                best.signal
                                    ?.leastDigit,

                            percentages:
                                best.signal
                                    ?.percentages,

                            tickCount:
                                best.state
                                    ?.tickCount
                        }
                    );

                }

            }
        );

    /*
     * Convert the AI LAB market list into
     * scanner markets.
     *
     * NO symbol filtering here.
     *
     * This deliberately includes:
     *
     * R_*
     * 1HZ*
     * Jump indices
     * and other active synthetic markets
     * supplied by Deriv.
     */

    const scanMarkets =
        markets.map(item => ({

            symbol:
                item.symbol,

            name:
                item.name,

            market:
                item.market

        }));

    console.log(
        'AI LAB OVER 2 SCANNING ALL MARKETS',
        {
            total:
                scanMarkets.length,

            markets:
                scanMarkets.map(
                    item =>
                        item.symbol
                )
        }
    );

    scanner.start(
        scanMarkets
    );

    return () => {

        unsubscribe();

        scanner.stop();

        if (
            over2ScannerRef.current ===
            scanner
        ) {
            over2ScannerRef.current =
                null;
        }

    };

}, [markets]);


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

    <div className="ai-core-header">

        <div className="ai-core-title">

            <span className="ai-core-kicker">
                MONEHUNT INTELLIGENCE ENGINE
            </span>

            <div className="section-heading">
                AI CORE
            </div>

        </div>

        <div className="ai-core-status">

            <span className="ai-core-status-dot" />

            ONLINE

        </div>

    </div>


    <div className="ai-core-section-label">
        ⚙ TRADE SETTINGS
    </div>


    <div className="ai-core-settings">

        <div className="ai-core-setting ai-core-setting-market">

            <span className="ai-core-setting-label">
                MARKET
            </span>

            <div className="ai-core-linked-value">

                <span>
                    {markets.find(
                        item =>
                            item.symbol === market
                    )?.name ?? market}
                </span>

                <span className="ai-core-value-symbol">
                    {market}
                </span>

                <span className="ai-core-chevron">
                    ▾
                </span>

            </div>

        </div>


        <div className="ai-core-setting ai-core-setting-strategy">

            <span className="ai-core-setting-label">
                STRATEGY / CONTRACT
            </span>

            <div className="ai-core-linked-value">

                <span>
                    {over2Signal?.ready || over2State
                        ? 'DIGIT OVER 2'
                        : 'MATCHES'}
                </span>

                <span className="ai-core-linked-badge">
                    AI LINKED
                </span>

            </div>

        </div>


        <div className="ai-core-section-label ai-core-inner-label">
            MONEY MANAGEMENT
        </div>


        <div className="ai-core-money-grid">

            <label className="ai-core-control-card">

                <span className="ai-core-control-label">
                    INITIAL STAKE
                </span>

                <div className="ai-core-input-shell">

                    <span className="ai-core-input-prefix">
                        $
                    </span>

                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={over2InitialStake}
                        onChange={event =>
                            setOver2InitialStake(
                                event.target.value
                            )
                        }
                    />

                </div>

            </label>


            <label className="ai-core-control-card">

                <span className="ai-core-control-label">
                    CURRENT STAKE
                </span>

                <div className="ai-core-input-shell">

                    <span className="ai-core-input-prefix">
                        $
                    </span>

                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={over2Stake}
                        onChange={event =>
                            setOver2Stake(
                                event.target.value
                            )
                        }
                    />

                </div>

            </label>


            <label className="ai-core-control-card">

                <span className="ai-core-control-label">
                    TAKE PROFIT
                </span>

                <div className="ai-core-input-shell">

                    <span className="ai-core-input-prefix">
                        $
                    </span>

                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={over2TakeProfit}
                        onChange={event =>
                            setOver2TakeProfit(
                                event.target.value
                            )
                        }
                    />

                </div>

            </label>

        </div>


        <div className="ai-core-section-label ai-core-inner-label">
            RECOVERY / MARTINGALE
        </div>


        <div className="ai-core-recovery-grid">

            <label className="ai-core-control-card">

                <span className="ai-core-control-label">
                    MARTINGALE LEVEL
                </span>

                <div className="ai-core-input-shell ai-core-centered-input">

                    <input
                        type="number"
                        min="0"
                        step="1"
                        value={over2MartingaleLevel}
                        onChange={event =>
                            setOver2MartingaleLevel(
                                event.target.value
                            )
                        }
                    />

                </div>

            </label>


            <label className="ai-core-control-card">

                <span className="ai-core-control-label">
                    MARTINGALE MULTIPLIER
                </span>

                <div className="ai-core-input-shell ai-core-centered-input">

                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={over2Martingale}
                        onChange={event =>
                            setOver2Martingale(
                                event.target.value
                            )
                        }
                    />

                    <span className="ai-core-input-suffix">
                        x
                    </span>

                </div>

            </label>

        </div>


        <div className="ai-core-section-label ai-core-inner-label">
            AI-LINKED VALUES
        </div>


        <div className="ai-core-ai-grid">

            <div className="ai-core-ai-card">

                <span className="ai-core-control-label">
                    ENTRY DIGIT
                </span>

                <div className="ai-core-digit-value">

                    {over2Signal?.ready
                        ? over2Signal.leastDigit ?? '--'
                        : signal?.entryDigit ??
                          engineState?.entry?.entryDigit ??
                          '--'}

                </div>

            </div>


            <div className="ai-core-ai-card">

                <span className="ai-core-control-label">
                    BARRIER
                </span>

                <div className="ai-core-digit-value">

                    {signal?.barrierDigit ??
                        engineState?.barrier?.barrierDigit ??
                        '--'}

                </div>

            </div>


            <div className="ai-core-ai-card">

                <span className="ai-core-control-label">
                    TRADING MODE
                </span>

                <div className="ai-core-mode-value">

                    {over2Signal?.ready || over2State
                        ? 'AI SIGNAL'
                        : signal?.regime ??
                          engineState?.regime?.regime ??
                          'AI SIGNAL'}

                </div>

            </div>

        </div>


        <div className="ai-core-action">

            {over2Signal?.ready ? (

                <button
                    type="button"
                    onClick={applyOver2SignalToBot}
                    disabled={
                        over2Signal.leastDigit === null
                    }
                    className="apply-signal-button"
                >
                    ⚡ APPLY TO BOT
                </button>

            ) : (

                <button
                    type="button"
                    onClick={applySignalToBot}
                    disabled={!signal?.ready}
                    className="apply-signal-button"
                >
                    ⚡ APPLY TO BOT
                </button>

            )}

            <span className="ai-core-action-helper">
                Applies AI signal + trade settings to the selected bot.
            </span>

        </div>

    </div>

</section>


<section className="ai-lab-grid">


    <div className="ai-lab-panel">

        <div className="panel-command-header">

            <div>

                <span className="panel-kicker">
                    AI INTELLIGENCE
                </span>

                <div className="section-heading">
                    {over2Signal?.ready || over2State
                        ? 'OVER 2 INTELLIGENCE'
                        : 'ENGINE BREAKDOWN'}
                </div>

            </div>

            <span className="panel-live-indicator">
                LIVE
            </span>

        </div>


        {over2Signal?.ready || over2State ? (

            <>

                <div className="engine-row">

                    <span>
                        WINDOW
                    </span>

                    <strong>
                        {over2State?.tickCount ?? 0} / 1000
                    </strong>

                </div>


                <div className="engine-row">

                    <span>
                        DIGIT 0
                    </span>

                    <strong>
                        {over2Signal?.percentages?.[0] !== undefined
                            ? `${over2Signal.percentages[0].toFixed(1)}%`
                            : '--'}
                    </strong>

                </div>


                <div className="engine-row">

                    <span>
                        DIGIT 1
                    </span>

                    <strong>
                        {over2Signal?.percentages?.[1] !== undefined
                            ? `${over2Signal.percentages[1].toFixed(1)}%`
                            : '--'}
                    </strong>

                </div>


                <div className="engine-row">

                    <span>
                        DIGIT 2
                    </span>

                    <strong>
                        {over2Signal?.percentages?.[2] !== undefined
                            ? `${over2Signal.percentages[2].toFixed(1)}%`
                            : '--'}
                    </strong>

                </div>


                <div className="engine-row">

                    <span>
                        LEAST DIGIT
                    </span>

                    <strong>
                        {over2Signal?.leastDigit ?? '--'}
                    </strong>

                </div>


                <div className="engine-row">

                    <span>
                        QUALIFICATION
                    </span>

                    <strong>
                        {over2Signal?.qualifying
                            ? 'QUALIFIED'
                            : 'SCANNING'}
                    </strong>

                </div>


                <div className="engine-row">

                    <span>
                        LATEST DIGIT
                    </span>

                    <strong>
                        {over2State?.latestDigit ?? '--'}
                    </strong>

                </div>

            </>

        ) : (

            <>

                <div className="engine-row">

                    <span>
                        DIGIT ENGINE
                    </span>

                    <strong>
                        {engineState?.scores?.[0]
                            ? engineState.scores[0].digit
                            : '--'}
                    </strong>

                </div>


                <div className="engine-row">

                    <span>
                        BARRIER ENGINE
                    </span>

                    <strong>
                        {engineState?.barrier?.barrierDigit ?? '--'}
                    </strong>

                </div>


                <div className="engine-row">

                    <span>
                        ENTRY ENGINE
                    </span>

                    <strong>
                        {engineState?.entry?.entryDigit ?? '--'}
                    </strong>

                </div>


                <div className="engine-row">

                    <span>
                        FIBONACCI
                    </span>

                    <strong>
                        {signal?.fibLevel ?? '--'}
                    </strong>

                </div>


                <div className="engine-row">

                    <span>
                        REGIME
                    </span>

                    <strong>
                        {engineState?.regime?.regime ?? '--'}
                    </strong>

                </div>


                <div className="engine-row">

                    <span>
                        CONFLUENCE
                    </span>

                    <strong>
                        {signal
                            ? signal.confluenceScore.toFixed(1)
                            : '--'}
                    </strong>

                </div>


                <div className="engine-row">

                    <span>
                        QUALITY
                    </span>

                    <strong>
                        {signal
                            ? signal.qualityScore.toFixed(1)
                            : '--'}
                    </strong>

                </div>

            </>

        )}

    </div>


    <div className="ai-lab-panel">

        <div className="panel-command-header">

            <div>

                <span className="panel-kicker">
                    EXECUTION MONITOR
                </span>

                <div className="section-heading">
                    {over2State
                        ? 'OVER 2 SIGNAL STATUS'
                        : 'SIGNAL STATUS'}
                </div>

            </div>

            <span className="panel-live-indicator">
                MONITORING
            </span>

        </div>


        {over2State ? (

            <>

                <div className="status-main">

                    <span
                        className={
                            over2Signal?.ready
                                ? 'status-ready'
                                : 'status-waiting'
                        }
                    >
                        {over2Signal?.ready
                            ? 'READY'
                            : 'SCANNING'}
                    </span>

                </div>


                <div className="status-row">

                    <span>
                        WINDOW
                    </span>

                    <strong>
                        {over2State.tickCount ?? 0} / 1000
                    </strong>

                </div>


                <div className="status-row">

                    <span>
                        LEAST DIGIT
                    </span>

                    <strong>
                        {over2Signal?.leastDigit ?? '--'}
                    </strong>

                </div>


                <div className="status-row">

                    <span>
                        QUALIFICATION
                    </span>

                    <strong>
                        {over2Signal?.qualifying
                            ? 'QUALIFIED'
                            : 'NOT READY'}
                    </strong>

                </div>


                <div className="status-row">

                    <span>
                        LATEST DIGIT
                    </span>

                    <strong>
                        {over2State.latestDigit ?? '--'}
                    </strong>

                </div>


                <div className="status-row">

                    <span>
                        STRATEGY
                    </span>

                    <strong>
                        DIGIT OVER 2
                    </strong>

                </div>

            </>

        ) : (

            <>

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
                        ENTRY
                    </span>

                    <strong>
                        {signal?.entryDigit ?? '--'}
                    </strong>

                </div>


                <div className="status-row">

                    <span>
                        BARRIER
                    </span>

                    <strong>
                        {signal?.barrierDigit ?? '--'}
                    </strong>

                </div>


                <div className="status-row">

                    <span>
                        RELATIONSHIP
                    </span>

                    <strong>
                        {signal
                            ? signal.relationshipScore.toFixed(1)
                            : '--'}
                    </strong>

                </div>


                <div className="status-row">

                    <span>
                        REGIME
                    </span>

                    <strong>
                        {signal?.regime ?? '--'}
                    </strong>

                </div>


                <div className="status-row">

                    <span>
                        PENDING SIGNALS
                    </span>

                    <strong>
                        {adapterRef.current
                            ?.getPendingCount() ?? 0}
                    </strong>

                </div>

            </>

        )}

    </div>


</section>


            <section className="ai-lab-grid">

                <div className="ai-lab-panel">

                    <div className="section-heading">
    {over2Signal?.ready || over2State
        ? 'OVER 2 INTELLIGENCE'
        : 'ENGINE BREAKDOWN'}
</div>

{over2Signal?.ready || over2State ? (

    <>
        <div className="engine-row">

            <span>
                WINDOW
            </span>

            <strong>
                {over2State?.tickCount ?? 0} / 1000
            </strong>

        </div>

        <div className="engine-row">

            <span>
                DIGIT 0
            </span>

            <strong>
                {over2Signal?.percentages?.[0] !== undefined
                    ? `${over2Signal.percentages[0].toFixed(1)}%`
                    : '--'}
            </strong>

        </div>

        <div className="engine-row">

            <span>
                DIGIT 1
            </span>

            <strong>
                {over2Signal?.percentages?.[1] !== undefined
                    ? `${over2Signal.percentages[1].toFixed(1)}%`
                    : '--'}
            </strong>

        </div>

        <div className="engine-row">

            <span>
                DIGIT 2
            </span>

            <strong>
                {over2Signal?.percentages?.[2] !== undefined
                    ? `${over2Signal.percentages[2].toFixed(1)}%`
                    : '--'}
            </strong>

        </div>

        <div className="engine-row">

            <span>
                LEAST DIGIT
            </span>

            <strong>
                {over2Signal?.leastDigit ?? '--'}
            </strong>

        </div>

        <div className="engine-row">

            <span>
                QUALIFICATION
            </span>

            <strong>
                {over2Signal?.qualifying
                    ? 'QUALIFIED'
                    : 'SCANNING'}
            </strong>

        </div>

        <div className="engine-row">

            <span>
                LATEST DIGIT
            </span>

            <strong>
                {over2State?.latestDigit ?? '--'}
            </strong>

        </div>
    </>

) : (

    <>
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
                {engineState?.barrier?.barrierDigit ?? '--'}
            </strong>

        </div>

        <div className="engine-row">

            <span>
                Entry Engine
            </span>

            <strong>
                {engineState?.entry?.entryDigit ?? '--'}
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
                {engineState?.regime?.regime ?? '--'}
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
    </>
)}

                </div>


                    <div className="ai-lab-panel">

    <div className="section-heading">
        {over2State
            ? 'OVER 2 SIGNAL STATUS'
            : 'SIGNAL STATUS'}
    </div>


    {over2State ? (

        <>

            <div className="status-main">

                <span
                    className={
                        over2Signal?.ready
                            ? 'status-ready'
                            : 'status-waiting'
                    }
                >
                    {over2Signal?.ready
                        ? 'READY'
                        : 'SCANNING'}
                </span>

            </div>


            <div className="status-row">

                <span>
                    Window
                </span>

                <strong>
                    {over2State.tickCount ?? 0} / 1000
                </strong>

            </div>


            <div className="status-row">

                <span>
                    Least Digit
                </span>

                <strong>
                    {over2Signal?.leastDigit ?? '--'}
                </strong>

            </div>


            <div className="status-row">

                <span>
                    Qualification
                </span>

                <strong>
                    {over2Signal?.qualifying
                        ? 'QUALIFIED'
                        : 'NOT READY'}
                </strong>

            </div>


            <div className="status-row">

                <span>
                    Latest Digit
                </span>

                <strong>
                    {over2State.latestDigit ?? '--'}
                </strong>

            </div>


            <div className="status-row">

                <span>
                    Strategy
                </span>

                <strong>
                    DIGIT OVER 2
                </strong>

            </div>

        </>

    ) : (

        <>

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

        </>

    )}

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
                                        {' → '}
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
