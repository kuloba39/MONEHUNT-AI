/**
 * ONLY UPS / ONLY DOWNS
 * Independent Indicator Engine
 *
 * This file contains mathematical measurements only.
 * It does NOT execute trades and does NOT modify the
 * existing execution path.
 */

import type {
    ADXAnalysis,
    BollingerAnalysis,
    MomentumTransfer,
    PressureAnalysis,
    PressureWindow,
    RSIAnalysis,
    StabilityAnalysis,
    VolatilityAnalysis,
} from '../types/only-ups-downs-types';


/* =========================================================
   HELPERS
   ========================================================= */

function clamp(value: number, min = 0, max = 100): number {
    if (!Number.isFinite(value)) return min;
    return Math.max(min, Math.min(max, value));
}

function finitePrices(prices: number[]): number[] {
    return prices
        .map(Number)
        .filter(Number.isFinite);
}

function average(values: number[]): number {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = average(values);

    const variance = average(
        values.map(value => Math.pow(value - mean, 2)),
    );

    return Math.sqrt(variance);
}

function percentage(value: number, total: number): number {
    if (!total) return 0;
    return (value / total) * 100;
}


/* =========================================================
   TICK PRESSURE
   ========================================================= */

/**
 * Measures directional pressure inside a specific window.
 *
 * Example:
 * 8 up moves / 2 down moves
 * => up pressure 80
 * => down pressure 20
 */
export function calculatePressureWindow(
    prices: number[],
    requestedSize: number,
): PressureWindow {
    const clean = finitePrices(prices);

    const size = Math.max(2, Math.min(
        requestedSize,
        Math.max(2, clean.length),
    ));

    const window = clean.slice(-size);

    let upMoves = 0;
    let downMoves = 0;
    let flatMoves = 0;

    for (let i = 1; i < window.length; i++) {
        if (window[i] > window[i - 1]) {
            upMoves++;
        } else if (window[i] < window[i - 1]) {
            downMoves++;
        } else {
            flatMoves++;
        }
    }

    const totalMoves = upMoves + downMoves + flatMoves;

    const upPressure = percentage(upMoves, totalMoves);
    const downPressure = percentage(downMoves, totalMoves);

    let dominant: PressureWindow['dominant'] = 'BALANCED';

    if (upPressure >= 55 && upPressure > downPressure) {
        dominant = 'UP';
    } else if (downPressure >= 55 && downPressure > upPressure) {
        dominant = 'DOWN';
    }

    const strength = clamp(
        Math.abs(upPressure - downPressure),
        0,
        100,
    );

    return {
        size,
        upMoves,
        downMoves,
        flatMoves,
        upPressure,
        downPressure,
        dominant,
        strength,
    };
}


/* =========================================================
   MULTI-WINDOW PRESSURE
   ========================================================= */

/**
 * Uses short / medium / long windows.
 *
 * Short:
 *   current control
 *
 * Medium:
 *   recent momentum
 *
 * Long:
 *   previous directional regime
 */
export function calculatePressure(
    prices: number[],
): PressureAnalysis {
    const clean = finitePrices(prices);

    const short = calculatePressureWindow(clean, 8);
    const medium = calculatePressureWindow(clean, 20);
    const long = calculatePressureWindow(clean, 40);

    const currentDirection =
        short.upPressure > short.downPressure + 8
            ? 'UP'
            : short.downPressure > short.upPressure + 8
                ? 'DOWN'
                : 'BALANCED';

    let pressureShift: PressureAnalysis['pressureShift'] =
        'NO_CLEAR_SHIFT';

    /*
     * UP_TRANSFER:
     * Previous pressure was down, but current pressure
     * has moved strongly toward buyers.
     */
    if (
        long.downPressure >= 55 &&
        medium.downPressure > medium.upPressure &&
        short.upPressure >= 55
    ) {
        pressureShift = 'UP_TRANSFER';
    }

    /*
     * DOWN_TRANSFER:
     * Previous pressure was up, but current pressure
     * has moved strongly toward sellers.
     */
    if (
        long.upPressure >= 55 &&
        medium.upPressure > medium.downPressure &&
        short.downPressure >= 55
    ) {
        pressureShift = 'DOWN_TRANSFER';
    }

    let acceleration: PressureAnalysis['acceleration'] = 'NONE';

    const shortBalance = short.upPressure - short.downPressure;
    const mediumBalance = medium.upPressure - medium.downPressure;

    if (shortBalance - mediumBalance >= 15) {
        acceleration = 'UP';
    } else if (mediumBalance - shortBalance >= 15) {
        acceleration = 'DOWN';
    }

    let oppositePressure = 0;

    if (long.dominant === 'DOWN') {
        oppositePressure = clamp(
            short.upPressure * 0.55 +
            medium.upPressure * 0.30 +
            Math.max(0, short.upPressure - medium.upPressure) * 0.15,
        );
    } else if (long.dominant === 'UP') {
        oppositePressure = clamp(
            short.downPressure * 0.55 +
            medium.downPressure * 0.30 +
            Math.max(0, short.downPressure - medium.downPressure) * 0.15,
        );
    }

    let score = 50;

    if (pressureShift === 'UP_TRANSFER') {
        score += 25;
    }

    if (pressureShift === 'DOWN_TRANSFER') {
        score += 25;
    }

    if (acceleration !== 'NONE') {
        score += 10;
    }

    score += Math.min(15, oppositePressure * 0.15);

    return {
        short,
        medium,
        long,
        currentDirection,
        oppositePressure: Math.round(clamp(oppositePressure)),
        pressureShift,
        acceleration,
        score: Math.round(clamp(score)),
    };
}


/* =========================================================
   MOMENTUM TRANSFER
   ========================================================= */

/**
 * Measures whether control is transferring from one side
 * to the other.
 *
 * This is deliberately different from simply measuring
 * current momentum.
 */
export function calculateMomentumTransfer(
    prices: number[],
): MomentumTransfer {
    const clean = finitePrices(prices);

    if (clean.length < 20) {
        return {
            detected: false,
            from: 'NONE',
            to: 'NONE',
            previousPressure: 0,
            currentPressure: 0,
            transferStrength: 0,
            acceleration: 0,
            score: 0,
        };
    }

    const previous = calculatePressureWindow(
        clean.slice(0, -8),
        20,
    );

    const current = calculatePressureWindow(
        clean,
        8,
    );

    const previousBalance =
        previous.upPressure - previous.downPressure;

    const currentBalance =
        current.upPressure - current.downPressure;

    const delta = currentBalance - previousBalance;

    let from: MomentumTransfer['from'] = 'NONE';
    let to: MomentumTransfer['to'] = 'NONE';

    if (
        previousBalance <= -15 &&
        currentBalance >= 15
    ) {
        from = 'DOWN';
        to = 'UP';
    } else if (
        previousBalance >= 15 &&
        currentBalance <= -15
    ) {
        from = 'UP';
        to = 'DOWN';
    }

    const detected = from !== 'NONE' && to !== 'NONE';

    const transferStrength = clamp(
        Math.abs(delta),
        0,
        100,
    );

    const acceleration = clamp(
        Math.abs(
            current.upPressure - previous.upPressure,
        ) +
        Math.abs(
            current.downPressure - previous.downPressure,
        ),
        0,
        100,
    );

    let score = transferStrength * 0.65 +
        acceleration * 0.35;

    if (detected) {
        score += 15;
    }

    return {
        detected,
        from,
        to,
        previousPressure: Math.round(previousBalance),
        currentPressure: Math.round(currentBalance),
        transferStrength: Math.round(transferStrength),
        acceleration: Math.round(acceleration),
        score: Math.round(clamp(score)),
    };
}


/* =========================================================
   RSI
   ========================================================= */

export function calculateRSI(
    prices: number[],
    period = 14,
): RSIAnalysis {
    const clean = finitePrices(prices);

    if (clean.length < period + 2) {
        return {
            value: null,
            previousValue: null,
            slope: 0,
            rising: false,
            falling: false,
            oversoldContext: false,
            overboughtContext: false,
            bullishConfirmation: false,
            bearishConfirmation: false,
            score: 0,
        };
    }

    function rsiAt(data: number[]): number | null {
        if (data.length < period + 1) return null;

        const changes: number[] = [];

        for (let i = 1; i < data.length; i++) {
            changes.push(data[i] - data[i - 1]);
        }

        const recent = changes.slice(-period);

        let gains = 0;
        let losses = 0;

        for (const change of recent) {
            if (change > 0) gains += change;
            if (change < 0) losses += Math.abs(change);
        }

        const averageGain = gains / period;
        const averageLoss = losses / period;

        if (averageLoss === 0) {
            return averageGain === 0 ? 50 : 100;
        }

        const rs = averageGain / averageLoss;

        return 100 - (100 / (1 + rs));
    }

    const value = rsiAt(clean);
    const previousValue = rsiAt(clean.slice(0, -1));

    if (value === null || previousValue === null) {
        return {
            value: null,
            previousValue: null,
            slope: 0,
            rising: false,
            falling: false,
            oversoldContext: false,
            overboughtContext: false,
            bullishConfirmation: false,
            bearishConfirmation: false,
            score: 0,
        };
    }

    const slope = value - previousValue;

    const rising = slope >= 1;
    const falling = slope <= -1;

    const oversoldContext = value <= 35;
    const overboughtContext = value >= 65;

    const bullishConfirmation =
        (oversoldContext && rising) ||
        (value >= 40 && value <= 55 && rising);

    const bearishConfirmation =
        (overboughtContext && falling) ||
        (value >= 45 && value <= 60 && falling);

    let score = 0;

    if (bullishConfirmation || bearishConfirmation) {
        score = 60;
    }

    if (
        oversoldContext &&
        rising
    ) {
        score += 25;
    }

    if (
        overboughtContext &&
        falling
    ) {
        score += 25;
    }

    return {
        value: Number(value.toFixed(2)),
        previousValue: Number(previousValue.toFixed(2)),
        slope: Number(slope.toFixed(2)),
        rising,
        falling,
        oversoldContext,
        overboughtContext,
        bullishConfirmation,
        bearishConfirmation,
        score: Math.round(clamp(score)),
    };
}


/* =========================================================
   BOLLINGER BANDS
   ========================================================= */

export function calculateBollingerBands(
    prices: number[],
    period = 20,
    multiplier = 2,
): BollingerAnalysis {
    const clean = finitePrices(prices);

    if (clean.length < period) {
        return {
            middle: null,
            upper: null,
            lower: null,
            bandwidth: 0,
            pricePosition: 'UNKNOWN',
            bullishLocation: false,
            bearishLocation: false,
            reenteredBand: false,
            score: 0,
        };
    }

    const window = clean.slice(-period);

    const middle = average(window);
    const deviation = standardDeviation(window);

    const upper = middle + deviation * multiplier;
    const lower = middle - deviation * multiplier;

    const last = clean[clean.length - 1];
    const previous = clean.length >= 2 ? clean[clean.length - 2] : last;

    const bandwidth =
        middle !== 0
            ? ((upper - lower) / Math.abs(middle)) * 100
            : 0;

    let pricePosition: BollingerAnalysis['pricePosition'] =
        'MIDDLE';

    if (last > upper) {
        pricePosition = 'ABOVE_UPPER';
    } else if (last >= middle + deviation * 0.5) {
        pricePosition = 'UPPER_ZONE';
    } else if (last < lower) {
        pricePosition = 'BELOW_LOWER';
    } else if (last <= middle - deviation * 0.5) {
        pricePosition = 'LOWER_ZONE';
    }

    const previousOutsideLower =
        previous < lower;

    const previousOutsideUpper =
        previous > upper;

    const reenteredBand =
        (
            previousOutsideLower &&
            last >= lower
        ) ||
        (
            previousOutsideUpper &&
            last <= upper
        );

    const bullishLocation =
        pricePosition === 'BELOW_LOWER' ||
        pricePosition === 'LOWER_ZONE' ||
        reenteredBand && previousOutsideLower;

    const bearishLocation =
        pricePosition === 'ABOVE_UPPER' ||
        pricePosition === 'UPPER_ZONE' ||
        reenteredBand && previousOutsideUpper;

    let score = 0;

    if (bullishLocation || bearishLocation) {
        score = 50;
    }

    if (reenteredBand) {
        score += 30;
    }

    if (
        pricePosition === 'BELOW_LOWER' ||
        pricePosition === 'ABOVE_UPPER'
    ) {
        score += 20;
    }

    return {
        middle: Number(middle.toFixed(8)),
        upper: Number(upper.toFixed(8)),
        lower: Number(lower.toFixed(8)),
        bandwidth: Number(bandwidth.toFixed(4)),
        pricePosition,
        bullishLocation,
        bearishLocation,
        reenteredBand,
        score: Math.round(clamp(score)),
    };
}


/* =========================================================
   ADX / DIRECTIONAL MOVEMENT
   ========================================================= */

/**
 * Tick-data approximation.
 *
 * Because the source is a tick-price series rather than
 * OHLC candles, this is a directional-strength filter,
 * not a textbook candle ADX implementation.
 */
export function calculateADX(
    prices: number[],
    period = 14,
): ADXAnalysis {
    const clean = finitePrices(prices);

    if (clean.length < period * 2 + 1) {
        return {
            value: null,
            plusDI: null,
            minusDI: null,
            trendStrength: 'UNKNOWN',
            directionalBias: 'NEUTRAL',
            score: 0,
        };
    }

    const changes: number[] = [];

    for (let i = 1; i < clean.length; i++) {
        changes.push(clean[i] - clean[i - 1]);
    }

    const recent = changes.slice(-period * 2);

    let positive = 0;
    let negative = 0;
    let totalMovement = 0;

    for (const change of recent) {
        if (change > 0) {
            positive += change;
        } else if (change < 0) {
            negative += Math.abs(change);
        }

        totalMovement += Math.abs(change);
    }

    if (totalMovement === 0) {
        return {
            value: 0,
            plusDI: 0,
            minusDI: 0,
            trendStrength: 'WEAK',
            directionalBias: 'NEUTRAL',
            score: 0,
        };
    }

    const plusDI =
        (positive / totalMovement) * 100;

    const minusDI =
        (negative / totalMovement) * 100;

    const directionalDifference =
        Math.abs(plusDI - minusDI);

    const directionalSum =
        plusDI + minusDI;

    const dx =
        directionalSum === 0
            ? 0
            : (
                directionalDifference /
                directionalSum
            ) * 100;

    const adx = dx;

    let trendStrength: ADXAnalysis['trendStrength'];

    if (adx >= 35) {
        trendStrength = 'STRONG';
    } else if (adx >= 22) {
        trendStrength = 'MODERATE';
    } else {
        trendStrength = 'WEAK';
    }

    let directionalBias: ADXAnalysis['directionalBias'] =
        'NEUTRAL';

    if (plusDI > minusDI + 8) {
        directionalBias = 'UP';
    } else if (minusDI > plusDI + 8) {
        directionalBias = 'DOWN';
    }

    let score = adx;

    if (directionalBias !== 'NEUTRAL') {
        score += 10;
    }

    return {
        value: Number(adx.toFixed(2)),
        plusDI: Number(plusDI.toFixed(2)),
        minusDI: Number(minusDI.toFixed(2)),
        trendStrength,
        directionalBias,
        score: Math.round(clamp(score)),
    };
}


/* =========================================================
   ATR / VOLATILITY
   ========================================================= */

export function calculateVolatility(
    prices: number[],
    period = 14,
): VolatilityAnalysis {
    const clean = finitePrices(prices);

    if (clean.length < period + 2) {
        return {
            atr: null,
            averageMove: 0,
            currentMove: 0,
            relativeVolatility: 0,
            abnormalMove: false,
            spikeRisk: false,
            score: 0,
        };
    }

    const moves: number[] = [];

    for (let i = 1; i < clean.length; i++) {
        moves.push(
            Math.abs(clean[i] - clean[i - 1]),
        );
    }

    const recentMoves = moves.slice(-period);
    const baselineMoves = moves.slice(
        -Math.min(moves.length, period * 3),
        -period,
    );

    const atr = average(recentMoves);
    const averageMove =
        baselineMoves.length
            ? average(baselineMoves)
            : atr;

    const currentMove =
        moves.length ? moves[moves.length - 1] : 0;

    const relativeVolatility =
        averageMove > 0
            ? atr / averageMove
            : 1;

    const abnormalMove =
        averageMove > 0 &&
        currentMove > averageMove * 2.5;

    const spikeRisk =
        relativeVolatility >= 2 ||
        currentMove > averageMove * 3;

    let score = 70;

    if (abnormalMove) {
        score -= 30;
    }

    if (spikeRisk) {
        score -= 35;
    }

    if (
        relativeVolatility >= 0.7 &&
        relativeVolatility <= 1.6
    ) {
        score += 10;
    }

    return {
        atr: Number(atr.toFixed(8)),
        averageMove: Number(averageMove.toFixed(8)),
        currentMove: Number(currentMove.toFixed(8)),
        relativeVolatility: Number(
            relativeVolatility.toFixed(3),
        ),
        abnormalMove,
        spikeRisk,
        score: Math.round(clamp(score)),
    };
}


/* =========================================================
   TICK STABILITY
   ========================================================= */

export function calculateStability(
    prices: number[],
): StabilityAnalysis {
    const clean = finitePrices(prices);

    if (clean.length < 10) {
        return {
            score: 0,
            averageMove: 0,
            standardDeviation: 0,
            jumpFrequency: 0,
            jumpCount: 0,
            orderly: false,
            chaotic: false,
        };
    }

    const recent = clean.slice(-100);

    const moves: number[] = [];

    for (let i = 1; i < recent.length; i++) {
        moves.push(
            Math.abs(recent[i] - recent[i - 1]),
        );
    }

    const averageMove = average(moves);
    const stdDev = standardDeviation(moves);

    const jumpThreshold =
        averageMove * 3;

    const jumpCount =
        moves.filter(
            move => move > jumpThreshold,
        ).length;

    const jumpFrequency =
        moves.length
            ? jumpCount / moves.length
            : 0;

    const relativeStd =
        averageMove > 0
            ? stdDev / averageMove
            : 0;

    const score = clamp(
        100 -
        relativeStd * 40 -
        jumpFrequency * 300,
    );

    const orderly = score >= 60;
    const chaotic = score < 40;

    return {
        score: Math.round(score),
        averageMove,
        standardDeviation: stdDev,
        jumpFrequency,
        jumpCount,
        orderly,
        chaotic,
    };
}


/* =========================================================
   EXTENSION / EXHAUSTION SUPPORT
   ========================================================= */

/**
 * Measures whether the latest price is unusually extended
 * from a recent mean.
 *
 * This is used by the reversal engine later.
 */
export function calculateExtensionScore(
    prices: number[],
    period = 20,
): number {
    const clean = finitePrices(prices);

    if (clean.length < period) {
        return 0;
    }

    const window = clean.slice(-period);
    const mean = average(window);
    const deviation = standardDeviation(window);

    const last = clean[clean.length - 1];

    if (deviation === 0) {
        return 0;
    }

    const zScore =
        Math.abs(last - mean) / deviation;

    return Math.round(
        clamp(
            (zScore - 1) * 35,
            0,
            100,
        ),
    );
}


/* =========================================================
   EXPORT BUNDLE
   ========================================================= */

export const OnlyUpsDownsIndicators = {
    calculatePressureWindow,
    calculatePressure,
    calculateMomentumTransfer,
    calculateRSI,
    calculateBollingerBands,
    calculateADX,
    calculateVolatility,
    calculateStability,
    calculateExtensionScore,
};


