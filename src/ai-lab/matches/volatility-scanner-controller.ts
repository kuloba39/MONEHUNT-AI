import {
    MarketSuitability,
} from './volatility-engine';

import {
    VolatilityHistoryLoader,
} from './volatility-history-loader';

import {
    VolatilityMarketScanner,
    VolatilityScannerResult,
} from './volatility-market-scanner';

import {
    api_base,
} from '@/external/bot-skeleton/services/api/api-base';

export interface VolatilityScannerRunResult
    extends VolatilityScannerResult {
    loadedMarkets: number;
    failedMarkets: number;
    timestamp: number;
}

export class VolatilityScannerController {
    private readonly scanner: VolatilityMarketScanner;

    private readonly historyLoader: VolatilityHistoryLoader;

    private running = false;

    constructor() {
        this.scanner =
            new VolatilityMarketScanner({
                historySize: 100,
                minimumTicks: 50,
                analysisWindow: 100,
            });

        this.historyLoader =
            new VolatilityHistoryLoader({
                count: 100,
                delayMs: 100,
            });
    }

    async run(): Promise<VolatilityScannerRunResult> {
        if (this.running) {
            throw new Error(
                'Volatility scanner is already running',
            );
        }

        this.running = true;

        try {
            const activeSymbols =
                this.getActiveSymbols();

            const markets =
                this.scanner.discoverMarkets(
                    activeSymbols,
                );

            if (markets.length === 0) {
                console.warn(
                    '[VOLATILITY SCANNER] No Volatility markets found',
                );

                return {
                    markets: [],
                    rankings: [],
                    selected: null,
                    loadedMarkets: 0,
                    failedMarkets: 0,
                    timestamp: Date.now(),
                };
            }

            console.log(
                '[VOLATILITY SCANNER] Markets discovered:',
                markets.map(
                    market =>
                        `${market.symbol} — ${market.name}`,
                ),
            );

            const historyResults =
                await this.historyLoader.loadMarkets(
                    markets,
                    this.scanner,
                );

            const loadedMarkets =
                historyResults.filter(
                    result => result.success,
                ).length;

            const failedMarkets =
                historyResults.length -
                loadedMarkets;

            const rankings =
                this.scanner.rankMarkets(
                    markets,
                );

            const selected =
                this.scanner.selectBestMarket(
                    rankings,
                );

            this.logResults(
                rankings,
                selected,
                loadedMarkets,
                failedMarkets,
            );

            return {
                markets,
                rankings,
                selected,
                loadedMarkets,
                failedMarkets,
                timestamp: Date.now(),
            };
        } finally {
            this.running = false;
        }
    }

    getScanner(): VolatilityMarketScanner {
        return this.scanner;
    }

    getHistoryLoader(): VolatilityHistoryLoader {
        return this.historyLoader;
    }

    isRunning(): boolean {
        return this.running;
    }

    private getActiveSymbols(): any[] {
        return Array.isArray(
            api_base.active_symbols,
        )
            ? api_base.active_symbols
            : [];
    }

    private logResults(
        rankings: MarketSuitability[],
        selected: MarketSuitability | null,
        loadedMarkets: number,
        failedMarkets: number,
    ): void {
        console.group(
            '[VOLATILITY SCANNER]',
        );

        console.log(
            `Markets loaded: ${loadedMarkets}`,
        );

        console.log(
            `Markets failed: ${failedMarkets}`,
        );

        rankings.forEach(
            (ranking, index) => {
                console.log(
                    `${index + 1}. ${
                        ranking.symbol
                    } | Score: ${
                        ranking.score.toFixed(2)
                    } | ${
                        ranking.decision
                    } | ${
                        ranking.reason
                    }`,
                );
            },
        );

        if (selected) {
            console.log(
                'SELECTED MARKET:',
                selected.symbol,
                selected.score,
            );
        } else {
            console.log(
                'NO MARKET SELECTED',
            );
        }

        console.groupEnd();
    }
}