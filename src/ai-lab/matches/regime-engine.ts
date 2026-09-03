export type Regime =
    | 'TRENDING'
    | 'RANGING'
    | 'HIGH_VOLATILITY'
    | 'LOW_VOLATILITY'
    | 'UNSTABLE';

export function detectRegime(
    volatility: number,
    trendStrength: number
): Regime {

    if (volatility > 80)
        return 'HIGH_VOLATILITY';

    if (volatility < 20)
        return 'LOW_VOLATILITY';

    if (trendStrength > 70)
        return 'TRENDING';

    return 'RANGING';
}