import { VolatilityTick } from './volatility-engine';

export interface VolatilityMarket {
    symbol: string;
    name: string;
    market: string;
}

export interface MarketTickHistory {
    symbol: string;
    ticks: VolatilityTick[];
}

export type VolatilityMarketMap =
    Map<string, MarketTickHistory>;

const DEFAULT_HISTORY_SIZE = 100;

export class VolatilityMarketFeed {
    private readonly histories: VolatilityMarketMap = new Map();

    private readonly historySize: number;

    constructor(historySize = DEFAULT_HISTORY_SIZE) {
        this.historySize = Math.max(50, historySize);
    }

    addMarket(symbol: string): void {
        if (!symbol) {
            return;
        }

        if (!this.histories.has(symbol)) {
            this.histories.set(symbol, {
                symbol,
                ticks: [],
            });
        }
    }

    removeMarket(symbol: string): void {
        this.histories.delete(symbol);
    }

    clear(): void {
        this.histories.clear();
    }

    setHistory(
        symbol: string,
        ticks: VolatilityTick[],
    ): void {
        this.addMarket(symbol);

        const history = this.histories.get(symbol);

        if (!history) {
            return;
        }

        history.ticks = ticks
            .filter(
                tick =>
                    Number.isFinite(tick.price) &&
                    Number.isFinite(tick.timestamp),
            )
            .sort(
                (a, b) =>
                    a.timestamp - b.timestamp,
            )
            .slice(-this.historySize);
    }

    addTick(
        symbol: string,
        tick: VolatilityTick,
    ): void {
        if (!symbol) {
            return;
        }

        this.addMarket(symbol);

        const history = this.histories.get(symbol);

        if (!history) {
            return;
        }

        if (
            !Number.isFinite(tick.price) ||
            !Number.isFinite(tick.timestamp)
        ) {
            return;
        }

        history.ticks.push(tick);

        if (
            history.ticks.length >
            this.historySize
        ) {
            history.ticks.splice(
                0,
                history.ticks.length -
                    this.historySize,
            );
        }
    }

    getTicks(
        symbol: string,
    ): VolatilityTick[] {
        return (
            this.histories.get(symbol)?.ticks || []
        );
    }

    getMarket(
        symbol: string,
    ): MarketTickHistory | undefined {
        return this.histories.get(symbol);
    }

    getMarkets(): MarketTickHistory[] {
        return Array.from(
            this.histories.values(),
        );
    }

    getSymbols(): string[] {
        return Array.from(
            this.histories.keys(),
        );
    }

    getMarketCount(): number {
        return this.histories.size;
    }

    hasMarket(symbol: string): boolean {
        return this.histories.has(symbol);
    }

    getSnapshot(): MarketTickHistory[] {
        return this.getMarkets().map(
            market => ({
                symbol: market.symbol,
                ticks: [...market.ticks],
            }),
        );
    }
}