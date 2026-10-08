import { ActiveSymbol } from '@deriv-com/smartcharts-champion';
import type {
    ActiveSymbols,
    AdapterConfig,
    SmartchartsChampionAdapter,
    TGetQuotesRequest,
    TGetQuotesResult,
    TGranularity,
    TQuote,
    TradingTimesMap,
    TServices,
    TSubscriptionCallback,
    TTransport,
    TUnsubscribeFunction,
} from './types';
const transformations = {
    toTGetQuotesResult(
        response: any,
        granularity: TGranularity
    ): TGetQuotesResult {
        const quotes: TQuote[] = [];

        if (!response) {
            return {
                quotes,
                meta: {
                    symbol: '',
                    granularity,
                },
            };
        }

        const {
            history,
            candles,
            prices,
            times,
        } = response;

        const symbol =
            response.echo_req?.ticks_history || '';

        if (granularity === 0 && history) {
            const {
                prices: tick_prices,
                times: tick_times,
            } = history;

            if (tick_prices && tick_times) {
                for (
                    let i = 0;
                    i < tick_prices.length;
                    i++
                ) {
                    quotes.push({
                        Date: String(tick_times[i]),
                        Close: tick_prices[i],
                        DT: new Date(
                            tick_times[i] * 1000
                        ),
                    });
                }
            }
        } else if (
            granularity > 0 &&
            candles
        ) {
            candles.forEach((candle: any) => {
                quotes.push({
                    Date: String(candle.epoch),
                    Open: candle.open,
                    High: candle.high,
                    Low: candle.low,
                    Close: candle.close,
                    DT: new Date(
                        candle.epoch * 1000
                    ),
                });
            });
        } else if (prices && times) {
            for (
                let i = 0;
                i < prices.length;
                i++
            ) {
                quotes.push({
                    Date: String(times[i]),
                    Close: prices[i],
                    DT: new Date(
                        times[i] * 1000
                    ),
                });
            }
        }

        return {
            quotes,
            meta: {
                symbol,
                granularity,
                delay_amount:
                    response.pip_size || 0,
            },
        };
    },

    toTQuoteFromStream(
        message: any,
        granularity: TGranularity
    ): TQuote {
        if (
            granularity === 0 &&
            message.tick
        ) {
            const { tick } = message;

            return {
                Date: String(tick.epoch),
                Close: tick.quote,
                tick,
                DT: new Date(
                    tick.epoch * 1000
                ),
            };
        }

        if (
            granularity > 0 &&
            message.ohlc
        ) {
            const { ohlc } = message;

            return {
                Date: String(ohlc.epoch),
                Open: ohlc.open,
                High: ohlc.high,
                Low: ohlc.low,
                Close: ohlc.close,
                ohlc,
                DT: new Date(
                    ohlc.epoch * 1000
                ),
            };
        }

        return {
            Date: String(
                message.epoch ||
                    Date.now() / 1000
            ),
            Close:
                message.quote ||
                message.price ||
                0,
            DT: new Date(
                (
                    message.epoch ||
                    Date.now() / 1000
                ) * 1000
            ),
        };
    },

    toActiveSymbols(
        activeSymbolsData: any[]
    ): ActiveSymbol[] {
        const symbols: ActiveSymbol[] = [];

        if (!Array.isArray(activeSymbolsData)) {
            return symbols;
        }

        for (const symbol of activeSymbolsData) {
            const symbolCode =
                symbol.underlying_symbol ||
                symbol.symbol;

            symbols.push({
                display_name:
                    symbol.display_name ||
                    symbolCode,
                market: symbol.market,
                market_display_name:
                    symbol.market_display_name,
                subgroup: symbol.subgroup,
                subgroup_display_name:
                    symbol.subgroup_display_name,
                submarket: symbol.submarket,
                submarket_display_name:
                    symbol.submarket_display_name,
                symbol: symbolCode,
                symbol_type:
                    symbol.symbol_type || '',
                pip:
                    symbol.pip ||
                    symbol.pip_size ||
                    0.01,
                exchange_is_open:
                    symbol.exchange_is_open || 0,
                is_trading_suspended:
                    symbol.is_trading_suspended ||
                    0,
                delay_amount:
                    symbol.delay_amount,
            });
        }

        return symbols;
    },

    toTradingTimesMap(
        tradingTimesData: any
    ): TradingTimesMap {
        const tradingTimes: TradingTimesMap = {};

        if (
            !tradingTimesData ||
            typeof tradingTimesData !== 'object'
        ) {
            return tradingTimes;
        }

        Object.keys(tradingTimesData).forEach(
            symbol => {
                const symbolData =
                    tradingTimesData[symbol];

                if (!symbolData) {
                    return;
                }

                if (
                    symbolData.open &&
                    symbolData.close
                ) {
                    const openTimes =
                        Array.isArray(
                            symbolData.open
                        )
                            ? symbolData.open
                            : [symbolData.open];

                    const closeTimes =
                        Array.isArray(
                            symbolData.close
                        )
                            ? symbolData.close
                            : [symbolData.close];

                    tradingTimes[symbol] = {
                        isOpen:
                            openTimes.length > 0 &&
                            openTimes[0] !== '--',
                        openTime:
                            openTimes[0] || '',
                        closeTime:
                            closeTimes[0] || '',
                    };
                } else if (
                    symbolData.times &&
                    Array.isArray(
                        symbolData.times
                    )
                ) {
                    const firstSession =
                        symbolData.times[0];

                    if (
                        firstSession &&
                        firstSession.open &&
                        firstSession.close
                    ) {
                        const openTime =
                            new Date(
                                firstSession.open
                            )
                                .toISOString()
                                .substr(11, 8);

                        const closeTime =
                            new Date(
                                firstSession.close
                            )
                                .toISOString()
                                .substr(11, 8);

                        tradingTimes[symbol] = {
                            isOpen: true,
                            openTime,
                            closeTime,
                        };
                    }
                } else if (
                    'isOpen' in symbolData &&
                    'openTime' in symbolData &&
                    'closeTime' in symbolData
                ) {
                    tradingTimes[symbol] = {
                        isOpen:
                            symbolData.isOpen,
                        openTime:
                            symbolData.openTime,
                        closeTime:
                            symbolData.closeTime,
                    };
                }
            }
        );

        return tradingTimes;
    },
};
export function buildSmartchartsChampionAdapter(
    transport: TTransport,
    services: TServices,
    config: AdapterConfig = {}
): SmartchartsChampionAdapter {
    /*
     * One active subscription per symbol + granularity.
     *
     * SmartChart can mount/unmount or resubscribe during lifecycle changes.
     * Without this guard, a second subscription could replace the first
     * unsubscribe function in the Map and leave the first Deriv stream
     * running forever.
     */
    const subscriptions = new Map<
        string,
        TUnsubscribeFunction
    >();

    const debug = config.debug || false;

    const logger = {
        log: debug
            ? console.log.bind(console, '[SmartCharts]')
            : () => {},
        warn: debug
            ? console.warn.bind(console, '[SmartCharts]')
            : () => {},
        error: console.error.bind(console, '[SmartCharts]'),
    };

    const adapter: SmartchartsChampionAdapter = {
        transport,
        services,

        async getQuotes(
            request: TGetQuotesRequest
        ) {
            try {
                const apiRequest: any = {
                    ticks_history: request.symbol,
                    end: 'latest',
                    count: request.count ?? 500,
                };

                if (request.granularity === 0) {
                    apiRequest.style = 'ticks';
                } else {
                    apiRequest.style = 'candles';
                    apiRequest.granularity =
                        request.granularity;
                }

                logger.log(
                    'getQuotes request:',
                    apiRequest
                );

                const response =
                    await transport.send(apiRequest);

                logger.log(
                    'getQuotes response:',
                    response
                );

                return response;
            } catch (error) {
                logger.error(
                    'Error in getQuotes:',
                    error
                );

                throw error;
            }
        },

        subscribeQuotes(
            request: TGetQuotesRequest,
            callback: TSubscriptionCallback
        ): TUnsubscribeFunction {
            const subscriptionKey =
                `${request.symbol}-${request.granularity}`;

            /*
             * IMPORTANT:
             *
             * If SmartChart asks for the exact same stream again,
             * terminate the old stream first.
             *
             * This prevents:
             *
             *   subscription A -> active
             *   subscription B -> active
             *   Map now only remembers B
             *   A becomes orphaned
             *
             * The transport layer also handles the case where A is
             * still waiting for Deriv to return its real subscription ID.
             */
            const existingUnsubscribe =
                subscriptions.get(subscriptionKey);

            if (existingUnsubscribe) {
                logger.log(
                    'Replacing existing subscription:',
                    subscriptionKey
                );

                existingUnsubscribe();

                subscriptions.delete(
                    subscriptionKey
                );
            }

            const apiRequest: any = {
                ticks_history: request.symbol,
                subscribe: 1,
                end: 'latest',
                count: 1,
            };

            if (request.granularity === 0) {
                apiRequest.style = 'ticks';
            } else {
                apiRequest.style = 'candles';
                apiRequest.granularity =
                    request.granularity;
            }

            let subscriptionId: string | null = null;

            try {
                subscriptionId = transport.subscribe(
                    apiRequest,
                    (response: any) => {
                        try {
                            callback(response);
                        } catch (error) {
                            logger.error(
                                'Error transforming stream message:',
                                error
                            );
                        }
                    }
                );

                /*
                 * Keep the unsubscribe function associated with this
                 * exact subscription.
                 */
                const unsubscribe: TUnsubscribeFunction =
                    () => {
                        if (subscriptionId) {
                            transport.unsubscribe(
                                subscriptionId
                            );
                        }

                        /*
                         * Only remove this entry if it still points
                         * to THIS unsubscribe function.
                         *
                         * This protects a newer subscription from
                         * being accidentally deleted by an older
                         * cleanup callback.
                         */
                        if (
                            subscriptions.get(
                                subscriptionKey
                            ) === unsubscribe
                        ) {
                            subscriptions.delete(
                                subscriptionKey
                            );
                        }
                    };

                subscriptions.set(
                    subscriptionKey,
                    unsubscribe
                );

                logger.log(
                    'Subscription created:',
                    {
                        key: subscriptionKey,
                        subscriptionId,
                    }
                );

                return unsubscribe;
            } catch (error) {
                logger.error(
                    'Error in subscribeQuotes:',
                    error
                );

                return () => {};
            }
        },

        unsubscribeQuotes(
            request: TGetQuotesRequest
        ): void {
            const subscriptionKey =
                `${request.symbol}-${request.granularity}`;

            const unsubscribe =
                subscriptions.get(subscriptionKey);

            if (unsubscribe) {
                logger.log(
                    'Unsubscribing:',
                    subscriptionKey
                );

                unsubscribe();
            } else {
                logger.warn(
                    'No active subscription found for:',
                    subscriptionKey
                );
            }
        },        async getChartData(): Promise<{
            activeSymbols: ActiveSymbols;
            tradingTimes: TradingTimesMap;
        }> {
            try {
                const [
                    activeSymbolsData,
                    tradingTimesData,
                ] = await Promise.all([
                    services.getActiveSymbols(),
                    services.getTradingTimes(),
                ]);

                const activeSymbols =
                    transformations.toActiveSymbols(
                        activeSymbolsData
                    );

                const tradingTimes =
                    transformations.toTradingTimesMap(
                        tradingTimesData
                    );

                return {
                    activeSymbols,
                    tradingTimes,
                };
            } catch (error) {
                logger.error(
                    'Error in getChartData:',
                    error
                );

                return {
                    activeSymbols:
                        [] as ActiveSymbols,
                    tradingTimes:
                        {} as TradingTimesMap,
                };
            }
        },
    };

    return adapter;
}
