import {
    api_base,
} from '@/external/bot-skeleton/services/api/api-base';

import {
    VolatilityScannerController,
} from './volatility-scanner-controller';

export async function testVolatilityScanner(): Promise<void> {
    console.log(
        '========================================',
    );

    console.log(
        '[VOLATILITY TEST] Starting scanner...',
    );

    console.log(
        '========================================',
    );

    try {
        if (!api_base.api) {
            throw new Error(
                'Deriv API connection is not available',
            );
        }

        if (
            !Array.isArray(
                api_base.active_symbols,
            ) ||
            api_base.active_symbols.length === 0
        ) {
            console.log(
                '[VOLATILITY TEST] Active symbols not loaded yet.',
            );

            await api_base.getActiveSymbols();
        }

        const controller =
            new VolatilityScannerController();

        const result =
            await controller.run();

        console.log(
            '[VOLATILITY TEST] Complete',
        );

        console.log(
            'Markets:',
            result.markets.length,
        );

        console.log(
            'Loaded:',
            result.loadedMarkets,
        );

        console.log(
            'Failed:',
            result.failedMarkets,
        );

        console.table(
            result.rankings.map(
                ranking => ({
                    Symbol:
                        ranking.symbol,

                    Score:
                        ranking.score,

                    Decision:
                        ranking.decision,

                    Volatility:
                        ranking.metrics.volatility,

                    Stability:
                        ranking.metrics.stability,

                    Trend:
                        ranking.metrics.trendStrength,

                    Pattern:
                        ranking.metrics.patternPersistence,

                    Samples:
                        ranking.metrics.sampleSize,
                }),
            ),
        );

        if (result.selected) {
            console.log(
                '[VOLATILITY TEST] Selected market:',
                result.selected.symbol,
            );

            console.log(
                '[VOLATILITY TEST] Selected score:',
                result.selected.score,
            );

            console.log(
                '[VOLATILITY TEST] Reason:',
                result.selected.reason,
            );
        } else {
            console.log(
                '[VOLATILITY TEST] No suitable market currently found.',
            );
        }
    } catch (error) {
        console.error(
            '[VOLATILITY TEST] Failed:',
            error,
        );
    }
}