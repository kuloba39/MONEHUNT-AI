export type Regime =
    | 'TRENDING'
    | 'RANGING'
    | 'HIGH_VOLATILITY'
    | 'LOW_VOLATILITY'
    | 'UNSTABLE';


export interface RegimeResult {

    regime: Regime;

    volatilityScore: number;

    trendStrength: number;

    confidence: number;

    reason: string;

}


function clamp(
    value: number,
    minimum: number,
    maximum: number
): number {

    return Math.max(
        minimum,
        Math.min(maximum, value)
    );

}


export function detectRegime(
    volatility: number,
    trendStrength: number
): RegimeResult {

    const normalizedVolatility =
        clamp(volatility, 0, 100);

    const normalizedTrend =
        clamp(trendStrength, 0, 100);


    /*
     * Extreme volatility combined with weak trend
     * indicates an unstable market rather than a
     * clean trading regime.
     */

    if (
        normalizedVolatility >= 85 &&
        normalizedTrend < 40
    ) {

        return {

            regime:
                'UNSTABLE',

            volatilityScore:
                normalizedVolatility,

            trendStrength:
                normalizedTrend,

            confidence:
                90,

            reason:
                'EXTREME VOLATILITY WITH WEAK TREND'

        };

    }


    if (
        normalizedVolatility >= 80
    ) {

        return {

            regime:
                'HIGH_VOLATILITY',

            volatilityScore:
                normalizedVolatility,

            trendStrength:
                normalizedTrend,

            confidence:
                85,

            reason:
                'VOLATILITY ABOVE HIGH-VOLATILITY THRESHOLD'

        };

    }


    if (
        normalizedVolatility <= 20 &&
        normalizedTrend < 35
    ) {

        return {

            regime:
                'LOW_VOLATILITY',

            volatilityScore:
                normalizedVolatility,

            trendStrength:
                normalizedTrend,

            confidence:
                80,

            reason:
                'LOW VOLATILITY WITH WEAK TREND'

        };

    }


    if (
        normalizedTrend >= 70
    ) {

        return {

            regime:
                'TRENDING',

            volatilityScore:
                normalizedVolatility,

            trendStrength:
                normalizedTrend,

            confidence:
                85,

            reason:
                'STRONG PRICE TREND DETECTED'

        };

    }


    return {

        regime:
            'RANGING',

        volatilityScore:
            normalizedVolatility,

        trendStrength:
            normalizedTrend,

        confidence:
            70,

        reason:
            'NO STRONG TREND OR VOLATILITY EXTREME'

    };

}