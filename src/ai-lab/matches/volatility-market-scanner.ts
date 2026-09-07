import {
    VolatilityEngine,
    VolatilityTick,
    MarketSuitability,
} from './volatility-engine';
import {
    VolatilityMarketSymbol,
    extractVolatilityMarkets,
} from './volatility-market-filter';
import { VolatilityMarketFeed } from './volatility-market-feed';

export interface VolatilityScannerResult {
    markets: VolatilityMarketSymbol[];
    rankings: MarketSuitability[];
    selected: MarketSuitability | null;
}

export interface VolatilityScannerConfig {
    historySize: number;
    minimumTicks: number;
    analysisWindow: number;
}

const DEFAULT_CONFIG: VolatilityScannerConfig = {
    historySize: 100,
    minimumTicks: 50,
    analysisWindow: 100,
};

export class VolatilityMarketScanner {
    private readonly feed: VolatilityMarketFeed;

    private readonly engine: VolatilityEngine;

    private readonly config: VolatilityScannerConfig;

    constructor(
        config: Partial<VolatilityScannerConfig> = {},
    ) {
        this.config = {
            ...DEFAULT_CONFIG,
            ...config,
        };

        this.feed = new VolatilityMarketFeed(
            this.config.historySize,
        );

        this.engine = new VolatilityEngine({
            minimumTicks: this.config.minimumTicks,
            analysisWindow: this.config.analysisWindow,
        });
    }

    discoverMarkets(
        activeSymbols: any[],
    ): VolatilityMarketSymbol[] {
        return extractVolatilityMarkets(
            activeSymbols,
        );
    }

    setMarketHistory(
        symbol: string,
        ticks: VolatilityTick[],
    ): void {
        this.feed.setHistory(
            symbol,
            ticks,
        );
    }

    addTick(
        symbol: string,
        tick: VolatilityTick,
    ): void {
        this.feed.addTick(
            symbol,
            tick,
        );
    }

    analyzeMarket(
        symbol: string,
        aiSignalConfidence = 0,
        recentPerformance = 0,
    ): MarketSuitability {
        return this.engine.analyze(
            symbol,
            this.feed.getTicks(symbol),
            aiSignalConfidence,
            recentPerformance,
        );
    }

    rankMarkets(
        markets: VolatilityMarketSymbol[],
        aiSignalConfidenceBySymbol: Map<
            string,
            number
        > = new Map(),
        recentPerformanceBySymbol: Map<
            string,
            number
        > = new Map(),
    ): MarketSuitability[] {
        const rankings = markets.map(
            market =>
                this.analyzeMarket(
                    market.symbol,
                    aiSignalConfidenceBySymbol.get(
                        market.symbol,
                    ) || 0,
                    recentPerformanceBySymbol.get(
                        market.symbol,
                    ) || 0,
                ),
        );

        return rankings.sort(
            (a, b) =>
                b.score - a.score,
        );
    }

    selectBestMarket(
        rankings: MarketSuitability[],
    ): MarketSuitability | null {
        const selected = rankings.find(
            ranking =>
                ranking.decision ===
                'SELECT MARKET',
        );

        return selected || null;
    }

    scan(
        activeSymbols: any[],
        aiSignalConfidenceBySymbol: Map<
            string,
            number
        > = new Map(),
        recentPerformanceBySymbol: Map<
            string,
            number
        > = new Map(),
    ): VolatilityScannerResult {
        const markets =
            this.discoverMarkets(
                activeSymbols,
            );

        const rankings =
            this.rankMarkets(
                markets,
                aiSignalConfidenceBySymbol,
                recentPerformanceBySymbol,
            );

        return {
            markets,
            rankings,
            selected:
                this.selectBestMarket(
                    rankings,
                ),
        };
    }

    getFeed(): VolatilityMarketFeed {
        return this.feed;
    }

    getEngine(): VolatilityEngine {
        return this.engine;
    }

    clear(): void {
        this.feed.clear();
    }
}