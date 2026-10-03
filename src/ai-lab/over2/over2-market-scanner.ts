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
}

const WINDOW_SIZE = 600;

export class Over2MarketScanner {

    private engines =
        new Map<string, Over2Engine>();

    private markets =
        new Map<string, Over2ScanMarket>();
    private state: Over2ScannerState = {
        scanning: false,
        totalMarkets: 0,
        readyMarkets: 0,
        qualifyingMarkets: [],
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
            result.signal?.qualifying === true &&
            result.signal?.ready === true &&
            result.signal?.leastDigit !== null
    );


        const allValidMarkets =
            [...qualifyingMarkets];

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
                allValidMarkets,


        };
        this.emit();

    }

    async start(
        markets: Over2ScanMarket[]
    ): Promise<void> {

        this.stop();

        this.engines.clear();
        this.markets.clear();

        const OVER2_ALLOWED_SYMBOLS = new Set([
            '1HZ10V',
            '1HZ15V',
            '1HZ25V',
            '1HZ30V',
            '1HZ50V',
            '1HZ75V',
            '1HZ90V',
            '1HZ100V',
            'R_10',
            'R_25',
            'R_50',
            'R_75',
            'R_100',
        ]);

        const scanMarkets = markets.filter(
            market =>
                market?.symbol &&
                OVER2_ALLOWED_SYMBOLS.has(
                    market.symbol
                )
        );

        console.log(
            'OVER 2 MARKET WHITELIST',
            {
                requestedMarkets: markets.length,
                scanningMarkets: scanMarkets.length,
                symbols: scanMarkets.map(
                    market => market.symbol
                ),
            }
        );

        for (const market of scanMarkets) {

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
            totalMarkets: this.markets.size,
            readyMarkets: 0,
            qualifyingMarkets: [],
        };

        this.emit();
        this.updateState();

    }

    public feedHistory(
        symbol: string,
        data: any
    ): void {

        if (!this.markets.has(symbol)) {
            return;
        }

        this.handleHistory(
            symbol,
            data
        );

    }

    public feedTick(
        data: any
    ): void {

        this.handleMessage(data);

    }
    private handleMessage(
        data: any
    ): void {

        if (!data) {
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

    getQualifyingMarkets():
        Over2MarketResult[] {

        return [
            ...this.state.qualifyingMarkets
        ];

    }

    stop(): void {

        this.state = {
            scanning: false,
            totalMarkets: 0,
            readyMarkets: 0,
            qualifyingMarkets: [],
        };

        this.emit();

    }}









