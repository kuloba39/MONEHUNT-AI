import { api_base } from '@/external/bot-skeleton/services/api/api-base';
import {
    VolatilityTick,
} from './volatility-engine';
import {
    VolatilityMarketSymbol,
} from './volatility-market-filter';
import {
    VolatilityMarketScanner,
} from './volatility-market-scanner';

interface DerivTicksHistoryResponse {
    history?: {
        times?: number[];
        prices?: number[];
    };
    error?: {
        code?: string;
        message?: string;
    };
}

export interface VolatilityHistoryLoadResult {
    symbol: string;
    ticks: VolatilityTick[];
    success: boolean;
    error?: string;
}

export interface VolatilityHistoryLoaderConfig {
    count: number;
    delayMs: number;
}

const DEFAULT_CONFIG: VolatilityHistoryLoaderConfig = {
    count: 100,
    delayMs: 100,
};

export class VolatilityHistoryLoader {
    private readonly config: VolatilityHistoryLoaderConfig;

    constructor(
        config: Partial<VolatilityHistoryLoaderConfig> = {},
    ) {
        this.config = {
            ...DEFAULT_CONFIG,
            ...config,
        };
    }

    async loadMarket(
        market: VolatilityMarketSymbol,
    ): Promise<VolatilityHistoryLoadResult> {
        if (!api_base.api) {
            return {
                symbol: market.symbol,
                ticks: [],
                success: false,
                error: 'Deriv API connection is not available',
            };
        }

        try {
            const response =
                (await this.sendHistoryRequest(
                    market.symbol,
                )) as DerivTicksHistoryResponse;

            if (response.error) {
                return {
                    symbol: market.symbol,
                    ticks: [],
                    success: false,
                    error:
                        response.error.message ||
                        response.error.code ||
                        'Deriv ticks history error',
                };
            }

            const ticks =
                this.parseHistory(response);

            return {
                symbol: market.symbol,
                ticks,
                success: ticks.length > 0,
                error:
                    ticks.length > 0
                        ? undefined
                        : 'No tick history returned',
            };
        } catch (error) {
            return {
                symbol: market.symbol,
                ticks: [],
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : 'Unknown history loading error',
            };
        }
    }

    async loadMarkets(
        markets: VolatilityMarketSymbol[],
        scanner: VolatilityMarketScanner,
    ): Promise<VolatilityHistoryLoadResult[]> {
        const results: VolatilityHistoryLoadResult[] = [];

        for (const market of markets) {
            const result =
                await this.loadMarket(market);

            results.push(result);

            if (
                result.success &&
                result.ticks.length > 0
            ) {
                scanner.setMarketHistory(
                    result.symbol,
                    result.ticks,
                );
            }

            if (this.config.delayMs > 0) {
                await this.delay(
                    this.config.delayMs,
                );
            }
        }

        return results;
    }

    private sendHistoryRequest(
        symbol: string,
    ): Promise<DerivTicksHistoryResponse> {
        return new Promise(
            (resolve, reject) => {
                if (!api_base.api) {
                    reject(
                        new Error(
                            'Deriv API connection is not available',
                        ),
                    );
                    return;
                }

                const requestId = Date.now() +
                    Math.floor(
                        Math.random() * 100000,
                    );

                const unsubscribe =
                    api_base.api
                        .onMessage()
                        .subscribe(
                            ({
                                data,
                            }: {
                                data: DerivTicksHistoryResponse & {
                                    req_id?: number;
                                };
                            }) => {
                                if (
                                    data?.req_id !==
                                    requestId
                                ) {
                                    return;
                                }

                                unsubscribe.unsubscribe();

                                resolve(data);
                            },
                        );

                try {
                    api_base.api.send({
                        req_id: requestId,
                        ticks_history:
                            symbol,
                        end: 'latest',
                        count:
                            this.config.count,
                        style: 'ticks',
                    });
                } catch (error) {
                    unsubscribe.unsubscribe();

                    reject(error);
                }

                setTimeout(() => {
                    unsubscribe.unsubscribe();

                    reject(
                        new Error(
                            `Timeout loading tick history for ${symbol}`,
                        ),
                    );
                }, 10000);
            },
        );
    }

    private parseHistory(
        response: DerivTicksHistoryResponse,
    ): VolatilityTick[] {
        const times =
            response.history?.times || [];

        const prices =
            response.history?.prices || [];

        const length = Math.min(
            times.length,
            prices.length,
        );

        const ticks: VolatilityTick[] = [];

        for (let i = 0; i < length; i++) {
            const timestamp =
                Number(times[i]);

            const price =
                Number(prices[i]);

            if (
                !Number.isFinite(timestamp) ||
                !Number.isFinite(price)
            ) {
                continue;
            }

            const digit =
                this.extractLastDigit(
                    prices[i],
                );

            ticks.push({
                timestamp,
                price,
                digit,
            });
        }

        return ticks;
    }

    private extractLastDigit(
        value: number,
    ): number {
        const text = String(value);

        const digits =
            text.replace(
                /\D/g,
                '',
            );

        if (!digits) {
            return 0;
        }

        return Number(
            digits.charAt(
                digits.length - 1,
            ),
        );
    }

    private delay(
        milliseconds: number,
    ): Promise<void> {
        return new Promise(resolve =>
            setTimeout(
                resolve,
                milliseconds,
            ),
        );
    }
}