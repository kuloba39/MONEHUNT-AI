import {
    ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {
    createInitialMonehuntAIState,
    MonehuntAIContext,
    MonehuntAIController,
    MonehuntAIState,
} from './monehunt-ai-context';

import {
    MatchesUIAdapter,
} from '@/ai-lab/matches/matches-ui-adapter';

import {
    Over2MarketScanner,
    Over2ScannerState,
} from '@/ai-lab/over2/over2-market-scanner';

import {
    api_base,
} from '@/external/bot-skeleton';

import {
    useAnalysisTicks,
} from '@/pages/analysis/use-analysis-ticks';

type AiCoreMarket = {
    symbol: string;
    name: string;
    market: string;
};

type MonehuntAIProviderProps = {
    children: ReactNode;
};

const AI_LAB_TICK_COUNT = 1000;

export const MonehuntAIProvider = ({
    children,
}: MonehuntAIProviderProps) => {
    const [state, setState] =
        useState<MonehuntAIState>(
            createInitialMonehuntAIState
        );

    const [markets, setMarkets] =
        useState<AiCoreMarket[]>([]);

    const [selectedMarket, setSelectedMarket] =
        useState(() => {
            if (
                typeof window === 'undefined'
            ) {
                return 'R_100';
            }

            return (
                localStorage.getItem(
                    'ai_lab_market'
                ) || 'R_100'
            );
        });

    const stateRef =
        useRef<MonehuntAIState>(state);

    const matchesAdapterRef =
        useRef<MatchesUIAdapter | null>(null);

    const matchesInitializedRef =
        useRef(false);

    const matchesLastTickRef =
        useRef<string | null>(null);

    const over2MatchesHistoryRef =
        useRef<string | null>(null);

    const over2ScannerRef =
        useRef<Over2MarketScanner | null>(null);

    const updateState = useCallback(
        (
            updater: (
                current: MonehuntAIState
            ) => MonehuntAIState
        ) => {
            setState(current => {
                const next =
                    updater(current);

                stateRef.current =
                    next;

                return next;
            });
        },
        []
    );

    /*
     * --------------------------------------------------
     * MARKET DISCOVERY
     * --------------------------------------------------
     *
     * This reproduces the existing AI LAB market
     * discovery logic, but ownership now lives above
     * the route level.
     */

    useEffect(() => {
        let cancelled = false;
        let subscription: any = null;

        const requestId =
            Date.now();

        const loadMarkets = async () => {
            try {
                if (!api_base?.api) {
                    console.log(
                        '[MONEHUNT AI CORE] API NOT READY'
                    );
                    return;
                }

                subscription =
                    api_base.api
                        .onMessage()
                        .subscribe(
                            ({ data }: any) => {
                                if (
                                    cancelled
                                ) {
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
                                        '[MONEHUNT AI CORE] MARKET LOAD ERROR',
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
                                    AiCoreMarket[] =
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
                                                    item.market || '',
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
                                    setSelectedMarket(
                                        savedMarket
                                    );
                                } else if (
                                    discoveredMarkets.some(
                                        item =>
                                            item.symbol ===
                                            'R_100'
                                    )
                                ) {
                                    setSelectedMarket(
                                        'R_100'
                                    );
                                } else if (
                                    discoveredMarkets.length > 0
                                ) {
                                    setSelectedMarket(
                                        discoveredMarkets[0]
                                            .symbol
                                    );
                                }

                                console.log(
                                    '[MONEHUNT AI CORE] MARKETS READY',
                                    {
                                        total:
                                            discoveredMarkets.length,
                                    }
                                );
                            }
                        );

                api_base.api.send({
                    req_id: requestId,
                    active_symbols: 'brief',
                    contract_type: [
                        'DIGITOVER',
                        'DIGITUNDER',
                        'DIGITEVEN',
                        'DIGITODD',
                        'DIGITMATCH',
                        'DIGITDIFF',
                    ],
                });
            } catch (error) {
                console.error(
                    '[MONEHUNT AI CORE] MARKET LOAD ERROR',
                    error
                );
            }
        };

        void loadMarkets();

        return () => {
            cancelled = true;

            if (subscription) {
                subscription.unsubscribe();
            }
        };
    }, []);

    /*
     * --------------------------------------------------
     * MATCHES OWNER
     * --------------------------------------------------
     */

    const matchesTicks =
        useAnalysisTicks(
            selectedMarket,
            AI_LAB_TICK_COUNT
        );

    useEffect(() => {
        const adapter =
            new MatchesUIAdapter();

        matchesAdapterRef.current =
            adapter;

        matchesInitializedRef.current =
            false;

        matchesLastTickRef.current =
            null;

        over2MatchesHistoryRef.current =
            null;

        setState(current => ({
            ...current,
            matches: {
                ...current.matches,
                engineState: null,
                signal: null,
                stats: {
                    total: 0,
                    wins: 0,
                    losses: 0,
                    winRate: 0,
                },
                active: false,
            },
        }));

        return () => {
            matchesAdapterRef.current =
                null;

            matchesInitializedRef.current =
                false;

            matchesLastTickRef.current =
                null;
        };
    }, [selectedMarket]);

    useEffect(() => {
        const adapter =
            matchesAdapterRef.current;

        if (
            !adapter ||
            matchesTicks.length === 0
        ) {
            return;
        }

        if (
            !matchesInitializedRef.current
        ) {
            adapter.processTicks(
                matchesTicks
            );

            matchesInitializedRef.current =
                true;

            const lastTick =
                matchesTicks[
                    matchesTicks.length - 1
                ];

            matchesLastTickRef.current =
                [
                    lastTick.epoch,
                    lastTick.quote,
                    lastTick.digit,
                ].join('|');

            updateState(current => ({
                ...current,
                matches: {
                    engineState:
                        adapter.getCurrentState(),

                    signal:
                        adapter.getCurrentState()
                            ?.pendingSignal?.signal ??
                        null,

                    stats: {
                        total:
                            adapter.getTotalOutcomes(),

                        wins:
                            adapter.getWins().length,

                        losses:
                            adapter.getLosses().length,

                        winRate:
                            adapter.getWinRate(),
                    },

                    active: true,
                },
            }));

            return;
        }

        const lastTick =
            matchesTicks[
                matchesTicks.length - 1
            ];

        const tickKey =
            [
                lastTick.epoch,
                lastTick.quote,
                lastTick.digit,
            ].join('|');

        if (
            tickKey ===
            matchesLastTickRef.current
        ) {
            return;
        }

        const result =
            adapter.processTick(
                lastTick
            );

        matchesLastTickRef.current =
            tickKey;

        updateState(current => ({
            ...current,
            matches: {
                engineState:
                    result ??
                    adapter.getCurrentState(),

                signal:
                    result?.pendingSignal?.signal ??
                    current.matches.signal,

                stats: {
                    total:
                        adapter.getTotalOutcomes(),

                    wins:
                        adapter.getWins().length,

                    losses:
                        adapter.getLosses().length,

                    winRate:
                        adapter.getWinRate(),
                },

                active: true,
            },
        }));
    }, [
        matchesTicks,
        updateState,
    ]);

    /*
     * --------------------------------------------------
     * OVER 2 OWNER
     * --------------------------------------------------
     *
     * Scanner owns analysis only.
     * Provider owns the shared Deriv market-data feed.
     *
     * The selected Matches market is excluded because
     * useAnalysisTicks already owns that subscription.
     */

    useEffect(() => {
        if (markets.length === 0) {
            return;
        }

        if (over2ScannerRef.current) {
            over2ScannerRef.current.stop();
        }

        const scanner =
            new Over2MarketScanner();

        over2ScannerRef.current =
            scanner;

        const unsubscribeScanner =
            scanner.subscribe(
                scannerState => {
                    updateState(current => ({
                        ...current,
                        over2: {
                            scannerState,
                            state:
                                current.over2.state,
                            signal:
                                current.over2.signal,
                            active:
                                scannerState.scanning,
                        },
                    }));
                }
            );

        const scanMarkets =
            markets.map(item => ({
                symbol:
                    item.symbol,
                name:
                    item.name,
                market:
                    item.market,
            }));

        scanner.start(
            scanMarkets
        );

        const api =
            api_base?.api;

        if (!api) {
            console.log(
                '[MONEHUNT AI CORE] OVER 2 API NOT READY'
            );

            return () => {
                unsubscribeScanner();
                scanner.stop();

                if (
                    over2ScannerRef.current ===
                    scanner
                ) {
                    over2ScannerRef.current =
                        null;
                }
            };
        }

        let cancelled = false;

        const subscriptions =
            new Map<string, string>();

        const requestIds =
            new Map<number, string>();

        const messageSubscription =
            api
                .onMessage()
                .subscribe(
                    ({ data }: any) => {
                        if (cancelled) {
                            return;
                        }

                        const reqId =
                            data?.echo_req?.req_id;

                        const symbol =
                            reqId !== undefined
                                ? requestIds.get(reqId)
                                : undefined;

                        if (
                            data?.error
                        ) {
                            if (symbol) {
                                console.warn(
                                    '[MONEHUNT AI CORE] OVER 2 MARKET DATA ERROR',
                                    {
                                        symbol,
                                        error:
                                            data.error,
                                    }
                                );
                            }

                            return;
                        }

                        if (
                            data?.history &&
                            symbol
                        ) {
                            scanner.feedHistory(
                                symbol,
                                data
                            );
                        }

                        if (
                            data?.tick?.symbol
                        ) {
                            const tickSymbol =
                                data.tick.symbol;

                            if (
                                scanMarkets.some(
                                    item =>
                                        item.symbol ===
                                        tickSymbol
                                ) &&
                                tickSymbol !==
                                    selectedMarket
                            ) {
                                scanner.feedTick(
                                    data
                                );
                            }
                        }

                        if (
                            data?.subscription?.id &&
                            symbol
                        ) {
                            subscriptions.set(
                                symbol,
                                data.subscription.id
                            );
                        }
                    }
                );

        const feedMarkets =
            scanMarkets.filter(
                item =>
                    item.symbol !==
                    selectedMarket
            );

        console.log(
            '[MONEHUNT AI CORE] OVER 2 SHARED MARKET DATA',
            {
                total:
                    scanMarkets.length,
                providerFeeds:
                    feedMarkets.length,
                selectedMarket,
            }
        );

        feedMarkets.forEach(
            item => {
                const reqId =
                    Date.now() +
                    Math.floor(
                        Math.random() * 100000
                    );

                requestIds.set(
                    reqId,
                    item.symbol
                );

                api.send({
                    ticks_history:
                        item.symbol,
                    count: 600,
                    end: 'latest',
                    style: 'ticks',
                    subscribe: 1,
                    req_id: reqId,
                });
            }
        );

        return () => {
            cancelled = true;

            messageSubscription.unsubscribe();

            subscriptions.forEach(
                subscriptionId => {
                    api.send({
                        forget:
                            subscriptionId,
                    });
                }
            );

            requestIds.clear();
            subscriptions.clear();

            unsubscribeScanner();
            scanner.stop();

            if (
                over2ScannerRef.current ===
                scanner
            ) {
                over2ScannerRef.current =
                    null;
            }
        };
    }, [
        markets,
        selectedMarket,
        updateState,
    ]);

    /*
     * --------------------------------------------------
     * FEED SELECTED MATCHES MARKET INTO OVER 2
     * --------------------------------------------------
     *
     * R_100 (or another selected market) is already
     * owned by useAnalysisTicks. Feed its existing
     * history into Over 2 instead of opening another
     * Deriv subscription.
     */

    useEffect(() => {
        const scanner =
            over2ScannerRef.current;

        if (
            !scanner ||
            matchesTicks.length === 0
        ) {
            return;
        }

        const lastTick =
            matchesTicks[
                matchesTicks.length - 1
            ];

        const tickKey =
            [
                lastTick.epoch,
                lastTick.quote,
                lastTick.digit,
            ].join('|');

        if (
            over2MatchesHistoryRef.current === null
        ) {
            scanner.feedHistory(
                selectedMarket,
                {
                    history: {
                        prices:
                            matchesTicks.map(
                                tick =>
                                    Number(
                                        tick.quote
                                    )
                            ),
                        times:
                            matchesTicks.map(
                                tick =>
                                    tick.epoch
                            ),
                    },
                    pip_size: 2,
                }
            );

            over2MatchesHistoryRef.current =
                tickKey;

            return;
        }

        if (
            over2MatchesHistoryRef.current ===
            tickKey
        ) {
            return;
        }

        scanner.feedTick({
            tick: {
                symbol:
                    selectedMarket,
                quote:
                    Number(
                        lastTick.quote
                    ),
                epoch:
                    lastTick.epoch,
                pip_size: 2,
            },
        });

        over2MatchesHistoryRef.current =
            tickKey;
    }, [
        matchesTicks,
        selectedMarket,
    ]);
    /*
     * --------------------------------------------------
     * PUBLIC CONTROLLER
     * --------------------------------------------------
     */

    const publishMatches =
        useCallback(
            (
                engineState: any | null,
                signal: any | null,
                stats: MonehuntAIState['matches']['stats']
            ) => {
                updateState(current => ({
                    ...current,
                    matches: {
                        engineState,
                        signal,
                        stats,
                        active:
                            engineState !== null ||
                            signal !== null,
                    },
                }));
            },
            [updateState]
        );

    const publishOver2 =
        useCallback(
            (
                scannerState: any | null,
                over2State: any | null,
                signal: any | null
            ) => {
                updateState(current => ({
                    ...current,
                    over2: {
                        scannerState,
                        state: over2State,
                        signal,
                        active:
                            scannerState !== null ||
                            over2State !== null ||
                            signal !== null,
                    },
                }));
            },
            [updateState]
        );

    const publishOnlyUpsDowns =
        useCallback(
            (snapshot: any | null) => {
                updateState(current => ({
                    ...current,
                    onlyUpsDowns: {
                        snapshot,
                        active:
                            snapshot !== null,
                    },
                }));
            },
            [updateState]
        );

    const resetMatches =
        useCallback(() => {
            updateState(current => ({
                ...current,
                matches: {
                    engineState: null,
                    signal: null,
                    stats: {
                        total: 0,
                        wins: 0,
                        losses: 0,
                        winRate: 0,
                    },
                    active: false,
                },
            }));
        }, [updateState]);

    const resetOver2 =
        useCallback(() => {
            updateState(current => ({
                ...current,
                over2: {
                    scannerState: null,
                    state: null,
                    signal: null,
                    active: false,
                },
            }));
        }, [updateState]);

    const resetOnlyUpsDowns =
        useCallback(() => {
            updateState(current => ({
                ...current,
                onlyUpsDowns: {
                    snapshot: null,
                    active: false,
                },
            }));
        }, [updateState]);

    const controller =
        useMemo<MonehuntAIController>(
            () => ({
                state,

                publishMatches,
                publishOver2,
                publishOnlyUpsDowns,

                resetMatches,
                resetOver2,
                resetOnlyUpsDowns,
            }),
            [
                state,
                publishMatches,
                publishOver2,
                publishOnlyUpsDowns,
                resetMatches,
                resetOver2,
                resetOnlyUpsDowns,
            ]
        );

    return (
        <MonehuntAIContext.Provider
            value={controller}
        >
            {children}
        </MonehuntAIContext.Provider>
    );
};

export default MonehuntAIProvider;


