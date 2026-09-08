import { api_base } from '@/external/bot-skeleton/services/api/api-base';
import { Over2Engine } from './over2-engine';
import {
    Over2Signal,
    Over2Tick,
    Over2EngineState,
} from './over2-types';

export interface Over2ScanMarket {
    symbol: string;
    name: string;
    market: string;
}

export interface Over2MarketResult {
    symbol: string;
    name: string;
    market: string;
    state: Over2EngineState;
    signal: Over2Signal | null;
}

export interface Over2ScannerState {
    scanning: boolean;
    totalMarkets: number;
    readyMarkets: number;
    qualifyingMarkets: Over2MarketResult[];
    bestMarket: Over2MarketResult | null;
}

type ScannerSubscription = {
    unsubscribe?: () => void;
};

const WINDOW_SIZE = 1000;

export class Over2MarketScanner {

    private engines =
        new Map<string, Over2Engine>();

    private markets =
        new Map<string, Over2ScanMarket>();

    private subscription:
        ScannerSubscription | null = null;

    private subscriptionIds =
        new Map<string, string>();

    private historyRequestIds =
        new Set<number>();

    private state: Over2ScannerState = {
        scanning: false,
        totalMarkets: 0,
        readyMarkets: 0,
        qualifyingMarkets: [],
        bestMarket: null,
    };

    private listeners =
        new Set<
            (state: Over2ScannerState) => void
        >();

    subscribe(
        listener: (
            state: Over2ScannerState
        ) => void
    ): () => void {

        this.listeners.add(listener);

        listener(this.state);

        return () => {
            this.listeners.delete(listener);
        };
    }

    private emit(): void {

        for (const listener of this.listeners) {
            listener(this.state);
        }

    }

    private updateState(): void {

        const results =
            Array.from(
                this.markets.values()
            )
                .map(market => {

                    const engine =
                        this.engines.get(
                            market.symbol
                        );

                    if (!engine) {
                        return null;
                    }

                    return {
                        symbol:
                            market.symbol,

                        name:
                            market.name,

                        market:
                            market.market,

                        state:
                            engine.getState(),

                        signal:
                            engine.getSignal(),
                    };

                })
                .filter(
                    (
                        item
                    ): item is Over2MarketResult =>
                        item !== null
                );

        const qualifyingMarkets =
            results.filter(
                result =>
                    result.signal?.ready === true &&
                    result.signal?.leastDigit !== null
            );

        /*
         * Strongest market selection.
         *
         * Primary:
         * lowest combined percentage
         * of digits 0, 1 and 2.
         *
         * Secondary:
         * lowest leastDigit percentage.
         *
         * This gives the scanner a deterministic
         * best market when several qualify.
         */

        const sorted =
            [...qualifyingMarkets]
                .sort((a, b) => {

                    const aSignal =
                        a.signal!;

                    const bSignal =
                        b.signal!;

                    const aCombined =
                        aSignal.percentages[0] +
                        aSignal.percentages[1] +
                        aSignal.percentages[2];

                    const bCombined =
                        bSignal.percentages[0] +
                        bSignal.percentages[1] +
                        bSignal.percentages[2];

                    if (
                        aCombined !==
                        bCombined
                    ) {
                        return (
                            aCombined -
                            bCombined
                        );
                    }

                    const aLeast =
                        aSignal
                            .percentages[
                                aSignal.leastDigit!
                            ];

                    const bLeast =
                        bSignal
                            .percentages[
                                bSignal.leastDigit!
                            ];

                    return (
                        aLeast -
                        bLeast
                    );

                });

        this.state = {

            scanning:
                this.state.scanning,

            totalMarkets:
                this.markets.size,

            readyMarkets:
                results.filter(
                    result =>
                        result.state.tickCount >=
                        WINDOW_SIZE
                ).length,

            qualifyingMarkets:
                sorted,

            bestMarket:
                sorted[0] ?? null,

        };

        this.emit();

    }

    async start(
        markets: Over2ScanMarket[]
    ): Promise<void> {

        this.stop();

        this.engines.clear();
        this.markets.clear();
        this.subscriptionIds.clear();
        this.historyRequestIds.clear();

        /*
         * Accept every active market supplied
         * by AI LAB.
         *
         * No R_ filter.
         * No 1HZ filter.
         * No Jump-index filter.
         *
         * Therefore Jump indices are included.
         */

        for (const market of markets) {

            if (!market?.symbol) {
                continue;
            }

            this.markets.set(
                market.symbol,
                market
            );

            this.engines.set(
                market.symbol,
                new Over2Engine()
            );

        }

        this.state = {

            scanning: true,

            totalMarkets:
                this.markets.size,

            readyMarkets: 0,

            qualifyingMarkets: [],

            bestMarket: null,

        };

        this.emit();

        if (!api_base?.api) {

            console.error(
                'OVER 2 SCANNER: API NOT READY'
            );

            this.state = {
                ...this.state,
                scanning: false,
            };

            this.emit();

            return;
        }

        const api =
            api_base.api;

        /*
         * One shared listener handles every
         * history response and every live tick.
         */

        this.subscription =
            api.onMessage().subscribe(
                ({ data }: any) => {

                    this.handleMessage(
                        data
                    );

                }
            );

        /*
         * Load 1000 ticks independently
         * for EVERY market.
         */

        const historyPromises =
            Array.from(
                this.markets.values()
            )
                .map(
                    market =>
                        this.loadHistory(
                            market.symbol
                        )
                );

        await Promise.allSettled(
            historyPromises
        );

        /*
         * Subscribe to live ticks for every
         * market after histories have loaded.
         */

        for (
            const market
            of this.markets.values()
        ) {

            const reqId =
                Date.now() +
                Math.floor(
                    Math.random() * 1000000
                );

            this.historyRequestIds.add(
                reqId
            );

            try {

                await api.send({

                    req_id:
                        reqId,

                    ticks:
                        market.symbol,

                    subscribe:
                        1,

                });

            } catch (error) {

                console.error(
                    'OVER 2 LIVE SUBSCRIBE ERROR',
                    market.symbol,
                    error
                );

            }

        }

        this.updateState();

    }

    private async loadHistory(
        symbol: string
    ): Promise<void> {

        if (!api_base?.api) {
            return;
        }

        const reqId =
            Date.now() +
            Math.floor(
                Math.random() * 1000000
            );

        this.historyRequestIds.add(
            reqId
        );

        try {

            const response =
                await api_base.api.send({

                    req_id:
                        reqId,

                    ticks_history:
                        symbol,

                    count:
                        WINDOW_SIZE,

                    end:
                        'latest',

                    style:
                        'ticks',

                });

            this.handleHistory(
                symbol,
                response
            );

        } catch (error) {

            console.error(
                'OVER 2 HISTORY ERROR',
                symbol,
                error
            );

        }

    }

        private handleMessage(
        data: any
    ): void {

        if (!data) {
            return;
        }

        /*
         * Handle history responses first.
         */
        if (
            data.history &&
            data.echo_req?.ticks_history
        ) {
            this.handleHistory(
                data.echo_req.ticks_history,
                data
            );

            return;
        }

        /*
         * Capture the subscription ID for each
         * market so stop() can unsubscribe cleanly.
         */
        if (
            data.subscription?.id &&
            data.echo_req?.ticks
        ) {
            const symbol =
                data.echo_req.ticks;

            if (
                this.engines.has(symbol)
            ) {
                this.subscriptionIds.set(
                    symbol,
                    data.subscription.id
                );
            }
        }

        /*
         * IMPORTANT:
         * Deriv can reject a live subscription with
         * an error response that does not contain data.tick.
         *
         * Therefore this error check MUST happen
         * before the !data.tick guard.
         */
        if (
            data?.error &&
            data?.echo_req?.ticks
        ) {
            console.error(
                'OVER 2 DERIV LIVE SUBSCRIBE REJECTED',
                {
                    symbol:
                        data.echo_req.ticks,

                    code:
                        data.error.code,

                    message:
                        data.error.message,

                    error:
                        data.error,

                    echo_req:
                        data.echo_req,
                }
            );

            return;
        }

        /*
         * Ignore messages that are not live tick messages.
         */
        if (!data.tick) {
            return;
        }

        const symbol =
            data.tick.symbol;

        if (
            !symbol ||
            !this.engines.has(symbol)
        ) {
            return;
        }

        const quote =
            String(
                data.tick.quote
            );

        const pipSize =
            Number(
                data.tick.pip_size ?? 2
            );

        const digit =
            this.extractDigit(
                quote,
                pipSize
            );

        const tick: Over2Tick = {
            digit,
            quote,
            epoch:
                Number(
                    data.tick.epoch
                ),
            market:
                symbol,
        };

        const engine =
            this.engines.get(
                symbol
            );

        if (!engine) {
            return;
        }

        engine.processTick(
            tick
        );

        this.updateState();
    }

    private handleHistory(
        symbol: string,
        data: any
    ): void {

        if (
            !symbol ||
            !this.engines.has(symbol)
        ) {
            return;
        }

        if (
            !data?.history?.prices
        ) {
            return;
        }

        const prices =
            data.history.prices;

        const times =
            data.history.times;

        const pipSize =
            Number(
                data.history.pip_size ?? 2
            );

        const ticks: Over2Tick[] =
            prices.map(
                (
                    price: any,
                    index: number
                ) => {

                    const quote =
                        String(price);

                    return {

                        digit:
                            this.extractDigit(
                                quote,
                                pipSize
                            ),

                        quote,

                        epoch:
                            Number(
                                times[index]
                            ),

                        market:
                            symbol,

                    };

                }
            );

        const engine =
            this.engines.get(
                symbol
            );

        if (!engine) {
            return;
        }

        engine.reset();

                engine.processTicks(
            ticks.slice(-WINDOW_SIZE)
        );

        console.log(
            'OVER 2 MARKET ANALYZED',
            {
                symbol,
                ticks:
                    engine.getTickCount(),
                ready:
                    engine.getState()
                        ?.signal?.ready,
                digit0:
                    engine.getState()
                        ?.signal?.percentages?.[0],
                digit1:
                    engine.getState()
                        ?.signal?.percentages?.[1],
                digit2:
                    engine.getState()
                        ?.signal?.percentages?.[2]
            }
        );

        this.updateState();

    }

    private extractDigit(
        quote: string,
        pipSize: number
    ): number {

        const formatted =
            Number(quote)
                .toFixed(pipSize);

        const clean =
            formatted.replace(
                '.',
                ''
            );

        return Number(
            clean.slice(-1)
        );

    }

    getState():
        Over2ScannerState {

        return this.state;

    }

    getBestMarket():
        Over2MarketResult | null {

        return this.state.bestMarket;

    }

    getQualifyingMarkets():
        Over2MarketResult[] {

        return [
            ...this.state.qualifyingMarkets
        ];

    }

    stop(): void {

        if (this.subscription) {

            this.subscription.unsubscribe();

            this.subscription =
                null;

        }

        if (
            api_base?.api
        ) {

            for (
                const subscriptionId
                of this.subscriptionIds.values()
            ) {

                try {

                    api_base.api.send({

                        forget:
                            subscriptionId,

                    });

                } catch {
                    // Ignore cleanup errors.
                }

            }

        }

        this.subscriptionIds.clear();

        this.state = {

            scanning: false,

            totalMarkets: 0,

            readyMarkets: 0,

            qualifyingMarkets: [],

            bestMarket: null,

        };

        this.emit();

    }

}