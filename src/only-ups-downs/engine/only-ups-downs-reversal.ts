import type {
    OnlyUpsDownsDirection,
    OnlyUpsDownsRegime,
} from "../types/only-ups-downs-types";

import {
    analyzeOnlyUpsDownsMarketStructure,
} from "./only-ups-downs-structure";

import {
    calculateOnlyUpsDownsPressure,
} from "./only-ups-downs-pressure";

import {
    calculateRSI,
    calculateBollingerBands,
} from "../indicators/only-ups-downs-indicators";

export type OnlyUpsDownsReversalDirection =
    | "bullish"
    | "bearish"
    | "none";

export type OnlyUpsDownsReversalStatus =
    | "WAIT"
    | "WATCH"
    | "READY";

export interface OnlyUpsDownsReversalOptions {
    swingLookback?: number;
    minimumMovePercent?: number;
    maxStructurePoints?: number;

    rsiPeriod?: number;
    bollingerPeriod?: number;
    bollingerDeviation?: number;

    watchScore?: number;
    readyScore?: number;
}

export interface OnlyUpsDownsReversalAnalysis {
    direction: OnlyUpsDownsReversalDirection;
    status: OnlyUpsDownsReversalStatus;

    score: number;

    previousRegime: OnlyUpsDownsRegime;
    currentStructure: string;
    structureShift: boolean;
    structureBreak: boolean;

    exhaustionScore: number;
    oppositePressure: number;
    pressureStrength: number;

    momentumShift: number;
    momentumTransferQuality: number;

    rsiValue: number | null;
    rsiConfirmation: number;

    bollingerLocation: "lower" | "upper" | "middle" | "outside" | "none";
    bollingerConfirmation: number;

    reversalRisk: number;
    stabilityScore: number;

    failedReversal: boolean;

    reasons: string[];
}

const clamp = (value: number, min = 0, max = 100): number => {
    if (!Number.isFinite(value)) {
        return min;
    }

    return Math.max(min, Math.min(max, value));
};

const finite = (value: number, fallback = 0): number =>
    Number.isFinite(value) ? value : fallback;

const cleanPrices = (prices: number[]): number[] =>
    prices.filter((price) => Number.isFinite(price) && price > 0);

const directionFromStructure = (
    structure: string,
): OnlyUpsDownsReversalDirection => {
    if (structure === "bullish") {
        return "bullish";
    }

    if (structure === "bearish") {
        return "bearish";
    }

    return "none";
};

const oppositeDirection = (
    direction: OnlyUpsDownsReversalDirection,
): OnlyUpsDownsDirection | null => {
    if (direction === "bullish") {
        return "ups";
    }

    if (direction === "bearish") {
        return "downs";
    }

    return null;
};

const scoreStructureShift = (
    structureShift: boolean,
    structureBreak: boolean,
    structureScore: number,
): number => {
    let score = clamp(structureScore);

    if (structureShift) {
        score += 15;
    }

    if (structureBreak) {
        score += 15;
    }

    return clamp(score);
};

const calculateExhaustion = (
    prices: number[],
    previousRegime: OnlyUpsDownsRegime,
): number => {
    if (prices.length < 8) {
        return 0;
    }

    const recent = prices.slice(-8);

    let positiveMoves = 0;
    let negativeMoves = 0;

    const absoluteMoves: number[] = [];

    for (let index = 1; index < recent.length; index += 1) {
        const move = recent[index] - recent[index - 1];

        if (move > 0) {
            positiveMoves += move;
        } else if (move < 0) {
            negativeMoves += Math.abs(move);
        }

        absoluteMoves.push(Math.abs(move));
    }

    const oldMoves = absoluteMoves.slice(0, 3);
    const newMoves = absoluteMoves.slice(-3);

    const oldAverage =
        oldMoves.length > 0
            ? oldMoves.reduce((sum, value) => sum + value, 0) /
              oldMoves.length
            : 0;

    const newAverage =
        newMoves.length > 0
            ? newMoves.reduce((sum, value) => sum + value, 0) /
              newMoves.length
            : 0;

    const trendMagnitude =
        Math.max(positiveMoves, negativeMoves);

    if (trendMagnitude <= 0) {
        return 0;
    }

    const dominantMoves =
        previousRegime === "STRONG_UP" || previousRegime === "WEAK_UP"
            ? positiveMoves
            : previousRegime === "STRONG_DOWN" ||
                previousRegime === "WEAK_DOWN"
                ? negativeMoves
                : 0;

    if (dominantMoves <= 0) {
        return 0;
    }

    const slowdown =
        oldAverage > 0
            ? clamp((1 - newAverage / oldAverage) * 100)
            : 0;

    const range =
        Math.max(...recent) - Math.min(...recent);

    const lastPrice = recent[recent.length - 1];
    const firstPrice = recent[0];

    const displacement =
        firstPrice > 0
            ? (Math.abs(lastPrice - firstPrice) / firstPrice) * 100
            : 0;

    const extension =
        range > 0 && displacement > 0
            ? clamp((displacement / range) * 100)
            : 0;

    const exhaustion =
        slowdown * 0.55 +
        clamp(extension) * 0.25 +
        (newAverage < oldAverage ? 20 : 0);

    return clamp(exhaustion);
};

const calculateRSIConfirmation = (
    prices: number[],
    direction: OnlyUpsDownsReversalDirection,
    period: number,
): {
    value: number | null;
    score: number;
} => {
    if (prices.length < period + 2 || direction === "none") {
        return {
            value: null,
            score: 0,
        };
    }

    const rsi = calculateRSI(prices, period);

    const value =
        typeof rsi === "number"
            ? rsi
            : null;

    if (value === null || !Number.isFinite(value)) {
        return {
            value: null,
            score: 0,
        };
    }

    const recent = prices.slice(-(period + 2));

    if (recent.length < 3) {
        return {
            value,
            score: 0,
        };
    }

    const midpoint = Math.max(
        1,
        Math.floor(recent.length / 2),
    );

    const firstHalf = recent.slice(0, midpoint);
    const secondHalf = recent.slice(midpoint);

    const firstAverage =
        firstHalf.reduce((sum, price) => sum + price, 0) /
        Math.max(1, firstHalf.length);

    const secondAverage =
        secondHalf.reduce((sum, price) => sum + price, 0) /
        Math.max(1, secondHalf.length);

    const priceShift =
        firstAverage > 0
            ? ((secondAverage - firstAverage) / firstAverage) * 100
            : 0;

    if (direction === "bullish") {
        const oversoldComponent =
            value <= 35
                ? 55
                : value <= 45
                    ? 35
                    : value <= 55
                        ? 20
                        : 0;

        const turningComponent =
            priceShift >= 0
                ? clamp(priceShift * 15)
                : 0;

        return {
            value,
            score: clamp(
                oversoldComponent + turningComponent,
            ),
        };
    }

    const overboughtComponent =
        value >= 65
            ? 55
            : value >= 55
                ? 35
                : value >= 45
                    ? 20
                    : 0;

    const turningComponent =
        priceShift <= 0
            ? clamp(Math.abs(priceShift) * 15)
            : 0;

    return {
        value,
        score: clamp(
            overboughtComponent + turningComponent,
        ),
    };
};

const calculateBollingerConfirmation = (
    prices: number[],
    direction: OnlyUpsDownsReversalDirection,
    period: number,
    deviation: number,
): {
    location: "lower" | "upper" | "middle" | "outside" | "none";
    score: number;
} => {
    if (
        prices.length < period ||
        direction === "none"
    ) {
        return {
            location: "none",
            score: 0,
        };
    }

    const bands = calculateBollingerBands(
        prices,
        period,
        deviation,
    );

    if (!bands) {
        return {
            location: "none",
            score: 0,
        };
    }

    const lastPrice = prices[prices.length - 1];

    const upper = finite(
        (bands as any).upper,
        NaN,
    );

    const lower = finite(
        (bands as any).lower,
        NaN,
    );

    const middle = finite(
        (bands as any).middle,
        NaN,
    );

    if (
        !Number.isFinite(upper) ||
        !Number.isFinite(lower) ||
        !Number.isFinite(middle)
    ) {
        return {
            location: "none",
            score: 0,
        };
    }

    const range = Math.max(
        0.0000000001,
        upper - lower,
    );

    const normalized =
        (lastPrice - lower) / range;

    if (direction === "bullish") {
        if (normalized <= 0) {
            return {
                location: "outside",
                score: 85,
            };
        }

        if (normalized <= 0.2) {
            return {
                location: "lower",
                score: 75,
            };
        }

        if (normalized <= 0.4) {
            return {
                location: "lower",
                score: 50,
            };
        }

        return {
            location:
                lastPrice < middle
                    ? "middle"
                    : "middle",
            score:
                lastPrice < middle
                    ? 20
                    : 5,
        };
    }

    if (normalized >= 1) {
        return {
            location: "outside",
            score: 85,
        };
    }

    if (normalized >= 0.8) {
        return {
            location: "upper",
            score: 75,
        };
    }

    if (normalized >= 0.6) {
        return {
            location: "upper",
            score: 50,
        };
    }

    return {
        location: "middle",
        score:
            lastPrice > middle
                ? 20
                : 5,
    };
};

const calculateMomentumShift = (
    pressure: ReturnType<typeof calculateOnlyUpsDownsPressure>,
): {
    value: number;
    quality: number;
} => {
    const transfer = pressure.transfer;

    const magnitude = clamp(
        Math.abs(finite(transfer.magnitude)),
    );

    const acceleration = clamp(
        Math.abs(finite(transfer.acceleration)) * 100,
    );

    const quality = clamp(
        finite(transfer.quality),
    );

    return {
        value: clamp(
            magnitude * 0.55 +
            acceleration * 0.2 +
            quality * 0.25,
        ),
        quality,
    };
};

const calculateReversalRisk = (
    previousRegime: OnlyUpsDownsRegime,
    direction: OnlyUpsDownsReversalDirection,
    structureShift: boolean,
    structureBreak: boolean,
    pressureStrength: number,
    oppositePressure: number,
    exhaustion: number,
): number => {
    if (direction === "none") {
        return 100;
    }

    let risk = 55;

    if (
        previousRegime === "STRONG_UP" ||
        previousRegime === "STRONG_DOWN"
    ) {
        risk += 10;
    }

    if (structureShift) {
        risk -= 15;
    }

    if (structureBreak) {
        risk -= 10;
    }

    if (pressureStrength >= 60) {
        risk -= 10;
    }

    if (oppositePressure >= 45) {
        risk -= 10;
    }

    if (exhaustion >= 60) {
        risk -= 10;
    }

    return clamp(risk);
};

const detectFailedReversal = (
    prices: number[],
    direction: OnlyUpsDownsReversalDirection,
    structureShift: boolean,
    pressureDirection: OnlyUpsDownsDirection | "neutral",
): boolean => {
    if (
        direction === "none" ||
        prices.length < 5
    ) {
        return false;
    }

    const recent = prices.slice(-5);
    const last = recent[recent.length - 1];

    const previousLow = Math.min(
        ...recent.slice(0, -1),
    );

    const previousHigh = Math.max(
        ...recent.slice(0, -1),
    );

    if (direction === "bullish") {
        const freshLow = last < previousLow;

        return (
            freshLow &&
            !structureShift &&
            pressureDirection === "downs"
        );
    }

    const freshHigh = last > previousHigh;

    return (
        freshHigh &&
        !structureShift &&
        pressureDirection === "ups"
    );
};

const buildReasons = (
    direction: OnlyUpsDownsReversalDirection,
    previousRegime: OnlyUpsDownsRegime,
    exhaustion: number,
    oppositePressure: number,
    structureShift: boolean,
    structureBreak: boolean,
    momentumShift: number,
    rsiConfirmation: number,
    bollingerConfirmation: number,
    failedReversal: boolean,
): string[] => {
    const reasons: string[] = [];

    if (direction === "bullish") {
        reasons.push("Bullish reversal candidate");
    } else if (direction === "bearish") {
        reasons.push("Bearish reversal candidate");
    } else {
        reasons.push("No confirmed reversal direction");
    }

    if (
        previousRegime === "STRONG_UP" ||
        previousRegime === "WEAK_UP"
    ) {
        reasons.push("Previous upside regime detected");
    }

    if (
        previousRegime === "STRONG_DOWN" ||
        previousRegime === "WEAK_DOWN"
    ) {
        reasons.push("Previous downside regime detected");
    }

    if (exhaustion >= 60) {
        reasons.push("Directional exhaustion is elevated");
    }

    if (oppositePressure >= 50) {
        reasons.push("Opposite pressure is meaningful");
    }

    if (structureShift) {
        reasons.push("Market structure has shifted");
    }

    if (structureBreak) {
        reasons.push("Recent structural level has been broken");
    }

    if (momentumShift >= 60) {
        reasons.push("Momentum transfer is significant");
    }

    if (rsiConfirmation >= 45) {
        reasons.push("RSI supports the reversal");
    }

    if (bollingerConfirmation >= 50) {
        reasons.push("Bollinger location supports reversal context");
    }

    if (failedReversal) {
        reasons.push("Reversal invalidated by fresh continuation pressure");
    }

    return reasons;
};

export const analyzeOnlyUpsDownsReversal = (
    pricesInput: number[],
    options: OnlyUpsDownsReversalOptions = {},
): OnlyUpsDownsReversalAnalysis => {
    const prices = cleanPrices(pricesInput);

    const swingLookback =
        options.swingLookback ?? 3;

    const minimumMovePercent =
        options.minimumMovePercent ?? 0.0025;

    const maxStructurePoints =
        options.maxStructurePoints ?? 20;

    const rsiPeriod =
        options.rsiPeriod ?? 14;

    const bollingerPeriod =
        options.bollingerPeriod ?? 20;

    const bollingerDeviation =
        options.bollingerDeviation ?? 2;

    const watchScore =
        options.watchScore ?? 60;

    const readyScore =
        options.readyScore ?? 75;

    if (prices.length < 12) {
        return {
            direction: "none",
            status: "WAIT",
            score: 0,
            previousRegime: "NEUTRAL",
            currentStructure: "neutral",
            structureShift: false,
            structureBreak: false,
            exhaustionScore: 0,
            oppositePressure: 0,
            pressureStrength: 0,
            momentumShift: 0,
            momentumTransferQuality: 0,
            rsiValue: null,
            rsiConfirmation: 0,
            bollingerLocation: "none",
            bollingerConfirmation: 0,
            reversalRisk: 100,
            stabilityScore: 0,
            failedReversal: false,
            reasons: [
                "Not enough tick history for reversal analysis",
            ],
        };
    }

    const structure = analyzeOnlyUpsDownsMarketStructure(
        prices,
        {
            swingLookback,
            minimumMovePercent,
            maxPoints: maxStructurePoints,
        },
    );

    const pressure = calculateOnlyUpsDownsPressure(prices);

    const structureDirection =
        directionFromStructure(
            (structure as any).structure,
        );

    const previousRegime =
        (structure as any).regime ??
        "NEUTRAL";

    const structureShift =
        Boolean(
            (structure as any).structureShift,
        );

    const structureBreak =
        Boolean(
            (structure as any).structureBreak,
        );

    const structureScore =
        finite(
            (structure as any).structureScore,
        );

    const exhaustionScore =
        calculateExhaustion(
            prices,
            previousRegime,
        );

    const oppositePressure =
        clamp(
            finite(
                pressure.oppositePressure,
            ),
        );

    const pressureStrength =
        clamp(
            finite(
                pressure.overallStrength,
            ),
        );

    const momentum =
        calculateMomentumShift(
            pressure,
        );

    const pressureDirection =
        pressure.dominantDirection;

    let direction: OnlyUpsDownsReversalDirection =
        structureDirection;

    if (direction === "none") {
        if (pressureDirection === "ups") {
            direction = "bullish";
        } else if (pressureDirection === "downs") {
            direction = "bearish";
        }
    }

    const expectedOpposite =
        oppositeDirection(direction);

    const hasOppositePressure =
        expectedOpposite !== null &&
        pressureDirection === expectedOpposite;

    const rsi =
        calculateRSIConfirmation(
            prices,
            direction,
            rsiPeriod,
        );

    const bollinger =
        calculateBollingerConfirmation(
            prices,
            direction,
            bollingerPeriod,
            bollingerDeviation,
        );

    const structureComponent =
        scoreStructureShift(
            structureShift,
            structureBreak,
            structureScore,
        );

    const pressureComponent =
        hasOppositePressure
            ? clamp(
                oppositePressure * 0.65 +
                pressureStrength * 0.35,
            )
            : clamp(
                oppositePressure * 0.4,
            );

    const exhaustionComponent =
        exhaustionScore;

    const momentumComponent =
        momentum.value;

    const rsiComponent =
        rsi.score;

    const bollingerComponent =
        bollinger.score;

    const priorTrendQuality =
        previousRegime === "STRONG_UP" ||
        previousRegime === "STRONG_DOWN"
            ? 100
            : previousRegime === "WEAK_UP" ||
                previousRegime === "WEAK_DOWN"
                ? 65
                : 0;

    const score =
        clamp(
            priorTrendQuality * 0.15 +
            exhaustionComponent * 0.15 +
            pressureComponent * 0.20 +
            structureComponent * 0.20 +
            momentumComponent * 0.15 +
            rsiComponent * 0.05 +
            bollingerComponent * 0.05 +
            pressureStrength * 0.05,
        );

    const failedReversal =
        detectFailedReversal(
            prices,
            direction,
            structureShift,
            pressureDirection,
        );

    const adjustedScore =
        failedReversal
            ? clamp(score - 35)
            : score;

    const status =
        adjustedScore >= readyScore &&
        !failedReversal
            ? "READY"
            : adjustedScore >= watchScore
                ? "WATCH"
                : "WAIT";

    const reversalRisk =
        calculateReversalRisk(
            previousRegime,
            direction,
            structureShift,
            structureBreak,
            pressureStrength,
            oppositePressure,
            exhaustionScore,
        );

    const stabilityScore =
        clamp(
            finite(
                (pressure as any).pressureQuality,
            ),
        );

    const reasons =
        buildReasons(
            direction,
            previousRegime,
            exhaustionScore,
            oppositePressure,
            structureShift,
            structureBreak,
            momentum.value,
            rsi.score,
            bollinger.score,
            failedReversal,
        );

    return {
        direction,
        status,
        score: adjustedScore,
        previousRegime,
        currentStructure:
            String(
                (structure as any).structure ??
                "neutral",
            ),
        structureShift,
        structureBreak,
        exhaustionScore,
        oppositePressure,
        pressureStrength,
        momentumShift: momentum.value,
        momentumTransferQuality:
            momentum.quality,
        rsiValue: rsi.value,
        rsiConfirmation: rsi.score,
        bollingerLocation:
            bollinger.location,
        bollingerConfirmation:
            bollinger.score,
        reversalRisk,
        stabilityScore,
        failedReversal,
        reasons,
    };
};

export const getOnlyUpsDownsReversal = (
    prices: number[],
    options?: OnlyUpsDownsReversalOptions,
): OnlyUpsDownsReversalAnalysis =>
    analyzeOnlyUpsDownsReversal(
        prices,
        options,
    );

