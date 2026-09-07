export interface VolatilityTick {
    timestamp: number;
    price: number;
    digit?: number;
}

export interface VolatilityMetrics {
    volatility: number;
    stability: number;
    trendStrength: number;
    patternPersistence: number;
    movementQuality: number;
    sampleSize: number;
}

export interface MarketSuitability {
    symbol: string;
    score: number;
    decision: 'SELECT MARKET' | 'WAIT' | 'NO SUITABLE MARKET';
    metrics: VolatilityMetrics;
    reason: string;
}

export interface VolatilityEngineConfig {
    minimumTicks: number;
    analysisWindow: number;
}

const DEFAULT_CONFIG: VolatilityEngineConfig = {
    minimumTicks: 50,
    analysisWindow: 100,
};

function clamp(value: number, min = 0, max = 100): number {
    return Math.max(min, Math.min(max, value));
}

function average(values: number[]): number {
    if (values.length === 0) return 0;

    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = average(values);

    const variance =
        values.reduce((sum, value) => {
            const difference = value - mean;
            return sum + difference * difference;
        }, 0) / values.length;

    return Math.sqrt(variance);
}

/**
 * Calculates statistical market quality from one isolated market.
 *
 * Important:
 * - This engine never mixes symbols.
 * - It does not predict the next tick.
 * - It measures current market conditions.
 */
export class VolatilityEngine {
    private readonly config: VolatilityEngineConfig;

    constructor(config: Partial<VolatilityEngineConfig> = {}) {
        this.config = {
            ...DEFAULT_CONFIG,
            ...config,
        };
    }

    analyze(
        symbol: string,
        ticks: VolatilityTick[],
        aiSignalConfidence = 0,
        recentPerformance = 0,
    ): MarketSuitability {
        const history = ticks
            .filter(
                tick =>
                    Number.isFinite(tick.price) &&
                    Number.isFinite(tick.timestamp),
            )
            .slice(-this.config.analysisWindow);

        if (history.length < this.config.minimumTicks) {
            return {
                symbol,
                score: 0,
                decision: 'NO SUITABLE MARKET',
                metrics: {
                    volatility: 0,
                    stability: 0,
                    trendStrength: 0,
                    patternPersistence: 0,
                    movementQuality: 0,
                    sampleSize: history.length,
                },
                reason: `Insufficient data: ${history.length}/${this.config.minimumTicks} ticks`,
            };
        }

        const prices = history.map(tick => tick.price);

        const returns: number[] = [];

        for (let i = 1; i < prices.length; i++) {
            const previous = prices[i - 1];
            const current = prices[i];

            if (previous === 0) continue;

            returns.push(Math.abs((current - previous) / previous));
        }

        const volatility = this.calculateVolatility(returns);
        const stability = this.calculateStability(returns);
        const trendStrength = this.calculateTrendStrength(prices);
        const patternPersistence = this.calculatePatternPersistence(history);
        const movementQuality = this.calculateMovementQuality(
            prices,
            returns,
        );

        const metrics: VolatilityMetrics = {
            volatility,
            stability,
            trendStrength,
            patternPersistence,
            movementQuality,
            sampleSize: history.length,
        };

        const score = this.calculateSuitabilityScore(
            metrics,
            aiSignalConfidence,
            recentPerformance,
        );

        const decision = this.getDecision(score, metrics);

        return {
            symbol,
            score,
            decision,
            metrics,
            reason: this.buildReason(metrics, score, decision),
        };
    }

    private calculateVolatility(returns: number[]): number {
        if (returns.length === 0) return 0;

        const mean = average(returns);
        const deviation = standardDeviation(returns);

        /*
         * We deliberately normalize the result instead of using raw
         * price movement. This makes markets with different price scales
         * more comparable.
         */
        const normalized = mean + deviation;

        /*
         * 0.01% movement = roughly 20 points.
         * 0.05% movement = roughly 100 points.
         * This is a scoring scale, not a prediction.
         */
        return clamp(normalized * 2_000_000);
    }

    private calculateStability(returns: number[]): number {
        if (returns.length < 2) return 0;

        const mean = average(returns);
        const deviation = standardDeviation(returns);

        if (mean === 0) {
            return 0;
        }

        /*
         * Lower coefficient of variation means more consistent movement.
         */
        const coefficientOfVariation = deviation / mean;

        return clamp(100 - coefficientOfVariation * 35);
    }

    private calculateTrendStrength(prices: number[]): number {
        if (prices.length < 2) return 0;

        const first = prices[0];
        const last = prices[prices.length - 1];

        const totalMovement = prices
            .slice(1)
            .reduce(
                (sum, price, index) =>
                    sum + Math.abs(price - prices[index]),
                0,
            );

        if (totalMovement === 0) {
            return 0;
        }

        const netMovement = Math.abs(last - first);

        return clamp((netMovement / totalMovement) * 100);
    }

    private calculatePatternPersistence(
        ticks: VolatilityTick[],
    ): number {
        const digits = ticks
            .map(tick => tick.digit)
            .filter(
                (digit): digit is number =>
                    Number.isInteger(digit) &&
                    digit >= 0 &&
                    digit <= 9,
            );

        if (digits.length < 10) {
            return 50;
        }

        let repeatedTransitions = 0;

        for (let i = 1; i < digits.length; i++) {
            if (digits[i] === digits[i - 1]) {
                repeatedTransitions++;
            }
        }

        const repeatRate =
            repeatedTransitions / Math.max(1, digits.length - 1);

        /*
         * We measure persistence without assuming that repetition itself
         * is automatically bullish/bearish or profitable.
         */
        return clamp(50 + repeatRate * 100);
    }

    private calculateMovementQuality(
        prices: number[],
        returns: number[],
    ): number {
        if (prices.length < 2 || returns.length === 0) {
            return 0;
        }

        const averageReturn = average(returns);
        const deviation = standardDeviation(returns);

        if (deviation === 0) {
            return averageReturn > 0 ? 100 : 0;
        }

        const consistencyRatio = averageReturn / deviation;

        return clamp(50 + consistencyRatio * 50);
    }

    private calculateSuitabilityScore(
        metrics: VolatilityMetrics,
        aiSignalConfidence: number,
        recentPerformance: number,
    ): number {
        /*
         * Market selection weights.
         *
         * Volatility quality:      30%
         * Stability:               25%
         * AI signal confidence:    20%
         * Pattern persistence:     15%
         * Recent performance:      10%
         */

        const volatilityQuality = this.calculateVolatilityQuality(
            metrics.volatility,
        );

        const score =
            volatilityQuality * 0.30 +
            metrics.stability * 0.25 +
            clamp(aiSignalConfidence) * 0.20 +
            metrics.patternPersistence * 0.15 +
            clamp(recentPerformance) * 0.10;

        return Math.round(clamp(score) * 100) / 100;
    }

    private calculateVolatilityQuality(volatility: number): number {
        /*
         * We do not simply reward maximum volatility.
         *
         * Extremely low volatility can produce poor movement.
         * Extremely high volatility can indicate unstable conditions.
         *
         * The preferred zone is therefore a middle/high range.
         */
        if (volatility < 20) {
            return clamp(volatility * 2);
        }

        if (volatility <= 70) {
            return volatility;
        }

        if (volatility <= 85) {
            return 100;
        }

        return clamp(100 - (volatility - 85) * 2);
    }

    private getDecision(
        score: number,
        metrics: VolatilityMetrics,
    ): MarketSuitability['decision'] {
        /*
         * These thresholds are intentionally conservative.
         */

        if (metrics.sampleSize < this.config.minimumTicks) {
            return 'NO SUITABLE MARKET';
        }

        if (score >= 70) {
            return 'SELECT MARKET';
        }

        if (score >= 50) {
            return 'WAIT';
        }

        return 'NO SUITABLE MARKET';
    }

    private buildReason(
        metrics: VolatilityMetrics,
        score: number,
        decision: MarketSuitability['decision'],
    ): string {
        const reasons: string[] = [];

        if (metrics.volatility >= 70) {
            reasons.push('strong movement');
        } else if (metrics.volatility < 30) {
            reasons.push('low movement');
        }

        if (metrics.stability >= 70) {
            reasons.push('stable movement');
        } else if (metrics.stability < 40) {
            reasons.push('unstable movement');
        }

        if (metrics.trendStrength >= 70) {
            reasons.push('strong directional structure');
        }

        if (metrics.patternPersistence >= 65) {
            reasons.push('persistent digit behavior');
        }

        if (reasons.length === 0) {
            reasons.push('mixed market conditions');
        }

        return `${decision} — score ${score.toFixed(
            1,
        )}/100 — ${reasons.join(', ')}`;
    }
}