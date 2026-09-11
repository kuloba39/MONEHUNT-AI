import {
    OnlyUpsDownsRegime,
} from "../types/only-ups-downs-types";
export type OnlyUpsDownsMarketStructure =
    | "bullish"
    | "bearish"
    | "NEUTRAL";

/**
 * Only Ups / Only Downs
 * Step 3 — Market Structure Engine
 *
 * Purpose:
 * - Detect meaningful swing highs/lows from tick prices.
 * - Classify HH / HL / LH / LL.
 * - Detect bullish/bearish structure.
 * - Detect structure shifts and breaks.
 * - Avoid treating every tiny tick movement as a structural event.
 *
 * IMPORTANT:
 * This file is analysis-only.
 * It does NOT execute trades.
 * It does NOT modify AI Lab.
 * It does NOT modify Matches.
 * It does NOT modify Over 2.
 */

export interface StructurePoint {
    index: number;
    price: number;
    type: "high" | "low";
}

export type StructureEvent =
    | "NONE"
    | "HH"
    | "HL"
    | "LH"
    | "LL"
    | "BULLISH_BREAK"
    | "BEARISH_BREAK"
    | "BULLISH_SHIFT"
    | "BEARISH_SHIFT";

export interface OnlyUpsDownsMarketStructureAnalysis {
    regime: OnlyUpsDownsRegime;

    structure: OnlyUpsDownsMarketStructure;

    swingHighs: StructurePoint[];
    swingLows: StructurePoint[];

    lastSwingHigh: number | null;
    lastSwingLow: number | null;

    previousSwingHigh: number | null;
    previousSwingLow: number | null;

    event: StructureEvent;

    bullishBreak: boolean;
    bearishBreak: boolean;

    bullishShift: boolean;
    bearishShift: boolean;

    higherHigh: boolean;
    higherLow: boolean;
    lowerHigh: boolean;
    lowerLow: boolean;

    distanceFromHigh: number | null;
    distanceFromLow: number | null;

    structureScore: number;

    recentHigh: number | null;
    recentLow: number | null;

    explanation: string;
}

export interface StructureEngineOptions {
    /**
     * Number of ticks on each side required to validate a swing.
     * Higher = fewer but stronger swings.
     */
    swingLookback?: number;

    /**
     * Minimum percentage movement required between structural points.
     * Example: 0.00005 = 0.005%.
     */
    minimumMovePercent?: number;

    /**
     * Maximum number of swing points retained.
     */
    maxPoints?: number;
}

const DEFAULT_OPTIONS: Required<StructureEngineOptions> = {
    swingLookback: 3,
    minimumMovePercent: 0.0025,
    maxPoints: 20,
};

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function safePercentMove(from: number, to: number): number {
    if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0) {
        return 0;
    }

    return Math.abs((to - from) / from) * 100;
}

function findSwingHighs(
    prices: number[],
    lookback: number,
    minimumMovePercent: number
): StructurePoint[] {
    const swings: StructurePoint[] = [];

    if (prices.length < lookback * 2 + 1) {
        return swings;
    }

    for (
        let i = lookback;
        i < prices.length - lookback;
        i++
    ) {
        const price = prices[i];

        if (!Number.isFinite(price)) {
            continue;
        }

        let isHighest = true;

        for (let j = i - lookback; j <= i + lookback; j++) {
            if (j === i) {
                continue;
            }

            if (prices[j] > price) {
                isHighest = false;
                break;
            }
        }

        if (!isHighest) {
            continue;
        }

        const previous = swings.length
            ? swings[swings.length - 1]
            : null;

        if (
            previous &&
            safePercentMove(previous.price, price) <
                minimumMovePercent
        ) {
            if (price > previous.price) {
                swings[swings.length - 1] = {
                    index: i,
                    price,
                    type: "high",
                };
            }

            continue;
        }

        swings.push({
            index: i,
            price,
            type: "high",
        });
    }

    return swings;
}

function findSwingLows(
    prices: number[],
    lookback: number,
    minimumMovePercent: number
): StructurePoint[] {
    const swings: StructurePoint[] = [];

    if (prices.length < lookback * 2 + 1) {
        return swings;
    }

    for (
        let i = lookback;
        i < prices.length - lookback;
        i++
    ) {
        const price = prices[i];

        if (!Number.isFinite(price)) {
            continue;
        }

        let isLowest = true;

        for (let j = i - lookback; j <= i + lookback; j++) {
            if (j === i) {
                continue;
            }

            if (prices[j] < price) {
                isLowest = false;
                break;
            }
        }

        if (!isLowest) {
            continue;
        }

        const previous = swings.length
            ? swings[swings.length - 1]
            : null;

        if (
            previous &&
            safePercentMove(previous.price, price) <
                minimumMovePercent
        ) {
            if (price < previous.price) {
                swings[swings.length - 1] = {
                    index: i,
                    price,
                    type: "low",
                };
            }

            continue;
        }

        swings.push({
            index: i,
            price,
            type: "low",
        });
    }

    return swings;
}

function limitPoints(
    points: StructurePoint[],
    maxPoints: number
): StructurePoint[] {
    if (points.length <= maxPoints) {
        return points;
    }

    return points.slice(points.length - maxPoints);
}

function determineStructure(
    swingHighs: StructurePoint[],
    swingLows: StructurePoint[]
): {
    structure: OnlyUpsDownsMarketStructure;
    higherHigh: boolean;
    higherLow: boolean;
    lowerHigh: boolean;
    lowerLow: boolean;
} {
    const lastHigh =
        swingHighs.length >= 1
            ? swingHighs[swingHighs.length - 1].price
            : null;

    const previousHigh =
        swingHighs.length >= 2
            ? swingHighs[swingHighs.length - 2].price
            : null;

    const lastLow =
        swingLows.length >= 1
            ? swingLows[swingLows.length - 1].price
            : null;

    const previousLow =
        swingLows.length >= 2
            ? swingLows[swingLows.length - 2].price
            : null;

    const higherHigh =
        lastHigh !== null &&
        previousHigh !== null &&
        lastHigh > previousHigh;

    const lowerHigh =
        lastHigh !== null &&
        previousHigh !== null &&
        lastHigh < previousHigh;

    const higherLow =
        lastLow !== null &&
        previousLow !== null &&
        lastLow > previousLow;

    const lowerLow =
        lastLow !== null &&
        previousLow !== null &&
        lastLow < previousLow;

    let structure: OnlyUpsDownsMarketStructure = "NEUTRAL";

    if (higherHigh && higherLow) {
        structure = "bullish";
    } else if (lowerHigh && lowerLow) {
        structure = "bearish";
    } else if (higherLow && !lowerHigh) {
        structure = "bullish";
    } else if (lowerHigh && !higherLow) {
        structure = "bearish";
    }

    return {
        structure,
        higherHigh,
        higherLow,
        lowerHigh,
        lowerLow,
    };
}

function determineRegime(
    structure: OnlyUpsDownsMarketStructure,
    score: number
): OnlyUpsDownsRegime {
    if (structure === "bullish") {
        return score >= 70 ? "STRONG_UP" : "WEAK_UP";
    }

    if (structure === "bearish") {
        return score >= 70 ? "STRONG_DOWN" : "WEAK_DOWN";
    }

    return "NEUTRAL";
}

function calculateStructureScore(
    higherHigh: boolean,
    higherLow: boolean,
    lowerHigh: boolean,
    lowerLow: boolean,
    swingCount: number
): number {
    let score = 0;

    if (higherHigh) {
        score += 25;
    }

    if (higherLow) {
        score += 25;
    }

    if (lowerHigh) {
        score += 25;
    }

    if (lowerLow) {
        score += 25;
    }

    if (swingCount >= 4) {
        score += 10;
    } else if (swingCount >= 2) {
        score += 5;
    }

    return clamp(score, 0, 100);
}

function detectStructureEvent(
    prices: number[],
    swingHighs: StructurePoint[],
    swingLows: StructurePoint[],
    structure: OnlyUpsDownsMarketStructure
): {
    event: StructureEvent;
    bullishBreak: boolean;
    bearishBreak: boolean;
    bullishShift: boolean;
    bearishShift: boolean;
} {
    if (!prices.length) {
        return {
            event: "NONE",
            bullishBreak: false,
            bearishBreak: false,
            bullishShift: false,
            bearishShift: false,
        };
    }

    const currentPrice = prices[prices.length - 1];

    const lastHigh =
        swingHighs.length
            ? swingHighs[swingHighs.length - 1].price
            : null;

    const previousHigh =
        swingHighs.length >= 2
            ? swingHighs[swingHighs.length - 2].price
            : null;

    const lastLow =
        swingLows.length
            ? swingLows[swingLows.length - 1].price
            : null;

    const previousLow =
        swingLows.length >= 2
            ? swingLows[swingLows.length - 2].price
            : null;

    const bullishBreak =
        lastHigh !== null &&
        currentPrice > lastHigh;

    const bearishBreak =
        lastLow !== null &&
        currentPrice < lastLow;

    const bullishShift =
        structure === "bullish" &&
        (
            bullishBreak ||
            (
                lastLow !== null &&
                previousLow !== null &&
                lastLow > previousLow
            )
        );

    const bearishShift =
        structure === "bearish" &&
        (
            bearishBreak ||
            (
                lastHigh !== null &&
                previousHigh !== null &&
                lastHigh < previousHigh
            )
        );

    let event: StructureEvent = "NONE";

    if (bullishBreak) {
        event = "BULLISH_BREAK";
    } else if (bearishBreak) {
        event = "BEARISH_BREAK";
    } else if (bullishShift) {
        event = "BULLISH_SHIFT";
    } else if (bearishShift) {
        event = "BEARISH_SHIFT";
    } else if (
        lastHigh !== null &&
        previousHigh !== null &&
        lastHigh > previousHigh
    ) {
        event = "HH";
    } else if (
        lastLow !== null &&
        previousLow !== null &&
        lastLow > previousLow
    ) {
        event = "HL";
    } else if (
        lastHigh !== null &&
        previousHigh !== null &&
        lastHigh < previousHigh
    ) {
        event = "LH";
    } else if (
        lastLow !== null &&
        previousLow !== null &&
        lastLow < previousLow
    ) {
        event = "LL";
    }

    return {
        event,
        bullishBreak,
        bearishBreak,
        bullishShift,
        bearishShift,
    };
}

export function analyzeOnlyUpsDownsMarketStructure(
    prices: number[],
    options: StructureEngineOptions = {}
): OnlyUpsDownsMarketStructureAnalysis {
    const config = {
        ...DEFAULT_OPTIONS,
        ...options,
    };

    const cleanPrices = prices.filter(
        (price) => Number.isFinite(price)
    );

    if (cleanPrices.length < config.swingLookback * 2 + 3) {
        return {
            regime: "NEUTRAL",
            structure: "NEUTRAL",
            swingHighs: [],
            swingLows: [],
            lastSwingHigh: null,
            lastSwingLow: null,
            previousSwingHigh: null,
            previousSwingLow: null,
            event: "NONE",
            bullishBreak: false,
            bearishBreak: false,
            bullishShift: false,
            bearishShift: false,
            higherHigh: false,
            higherLow: false,
            lowerHigh: false,
            lowerLow: false,
            distanceFromHigh: null,
            distanceFromLow: null,
            structureScore: 0,
            recentHigh: null,
            recentLow: null,
            explanation: "Not enough tick history for reliable structure.",
        };
    }

    const rawHighs = findSwingHighs(
        cleanPrices,
        config.swingLookback,
        config.minimumMovePercent
    );

    const rawLows = findSwingLows(
        cleanPrices,
        config.swingLookback,
        config.minimumMovePercent
    );

    const swingHighs = limitPoints(
        rawHighs,
        config.maxPoints
    );

    const swingLows = limitPoints(
        rawLows,
        config.maxPoints
    );

    const structureResult = determineStructure(
        swingHighs,
        swingLows
    );

    const structureScore = calculateStructureScore(
        structureResult.higherHigh,
        structureResult.higherLow,
        structureResult.lowerHigh,
        structureResult.lowerLow,
        swingHighs.length + swingLows.length
    );

    const regime = determineRegime(
        structureResult.structure,
        structureScore
    );

    const eventResult = detectStructureEvent(
        cleanPrices,
        swingHighs,
        swingLows,
        structureResult.structure
    );

    const lastSwingHigh =
        swingHighs.length
            ? swingHighs[swingHighs.length - 1].price
            : null;

    const previousSwingHigh =
        swingHighs.length >= 2
            ? swingHighs[swingHighs.length - 2].price
            : null;

    const lastSwingLow =
        swingLows.length
            ? swingLows[swingLows.length - 1].price
            : null;

    const previousSwingLow =
        swingLows.length >= 2
            ? swingLows[swingLows.length - 2].price
            : null;

    const currentPrice =
        cleanPrices[cleanPrices.length - 1];

    const distanceFromHigh =
        lastSwingHigh !== null
            ? safePercentMove(lastSwingHigh, currentPrice)
            : null;

    const distanceFromLow =
        lastSwingLow !== null
            ? safePercentMove(lastSwingLow, currentPrice)
            : null;

    let explanation =
        "Neutral market structure.";

    if (structureResult.structure === "bullish") {
        explanation =
            "Bullish structure: higher-high / higher-low behavior detected.";
    } else if (
        structureResult.structure === "bearish"
    ) {
        explanation =
            "Bearish structure: lower-high / lower-low behavior detected.";
    }

    if (eventResult.bullishBreak) {
        explanation +=
            " Price has broken the latest structural high.";
    }

    if (eventResult.bearishBreak) {
        explanation +=
            " Price has broken the latest structural low.";
    }

    if (eventResult.bullishShift) {
        explanation +=
            " Bullish structure shift detected.";
    }

    if (eventResult.bearishShift) {
        explanation +=
            " Bearish structure shift detected.";
    }

    return {
        regime,
        structure: structureResult.structure,

        swingHighs,
        swingLows,

        lastSwingHigh,
        lastSwingLow,

        previousSwingHigh,
        previousSwingLow,

        event: eventResult.event,

        bullishBreak: eventResult.bullishBreak,
        bearishBreak: eventResult.bearishBreak,

        bullishShift: eventResult.bullishShift,
        bearishShift: eventResult.bearishShift,

        higherHigh: structureResult.higherHigh,
        higherLow: structureResult.higherLow,

        lowerHigh: structureResult.lowerHigh,
        lowerLow: structureResult.lowerLow,

        distanceFromHigh,
        distanceFromLow,

        structureScore,

        recentHigh: lastSwingHigh,
        recentLow: lastSwingLow,

        explanation,
    };
}

/**
 * Lightweight helper for callers that only need
 * the most recent structural state.
 */
export function getOnlyUpsDownsMarketStructure(
    prices: number[],
    options: StructureEngineOptions = {}
): OnlyUpsDownsMarketStructure {
    return analyzeOnlyUpsDownsMarketStructure(
        prices,
        options
    ).structure;
}

/**
 * Detect whether the latest price is approaching
 * a meaningful structural high or low.
 *
 * This is intentionally contextual.
 * It does NOT produce a trade signal.
 */
export function isNearStructuralLevel(
    price: number,
    level: number | null,
    tolerancePercent = 0.05
): boolean {
    if (
        !Number.isFinite(price) ||
        level === null ||
        !Number.isFinite(level) ||
        level === 0
    ) {
        return false;
    }

    const distance =
        Math.abs((price - level) / level) * 100;

    return distance <= tolerancePercent;
}

