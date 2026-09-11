import type {
    OnlyUpsDownsDirection,
    OnlyUpsDownsRegime,
    OnlyUpsDownsStatus,
    OnlyUpsDownsSignal,
    StructureAnalysis,
    PressureAnalysis,
    ExhaustionAnalysis,
    MomentumTransfer,
    RSIAnalysis,
    BollingerAnalysis,
    ADXAnalysis,
    VolatilityAnalysis,
    StabilityAnalysis,
    ReversalAnalysis,
    ContinuationAnalysis,
    OnlyUpsDownsEngineResult,
} from "../types/only-ups-downs-types";

import {
    analyzeOnlyUpsDownsMarketStructure,
} from "./only-ups-downs-structure";

import {
    calculateOnlyUpsDownsPressure,
} from "./only-ups-downs-pressure";

import {
    analyzeOnlyUpsDownsReversal,
} from "./only-ups-downs-reversal";

import {
    calculateRSI,
    calculateBollingerBands,
    calculateADX,
    calculateVolatility,
    calculateStability,
    calculateMomentumTransfer,
} from "../indicators/only-ups-downs-indicators";

export interface OnlyUpsDownsStrategyInput {
    prices: number[];
    timestamp?: number;
}

const clamp = (value: number, min = 0, max = 100): number =>
    Math.max(min, Math.min(max, value));

const finitePrices = (prices: number[]): number[] =>
    prices.filter(
        (price): price is number =>
            Number.isFinite(price) && price > 0,
    );

function regimeIsUp(
    regime: OnlyUpsDownsRegime,
): boolean {
    return regime === "STRONG_UP" || regime === "WEAK_UP";
}

function regimeIsDown(
    regime: OnlyUpsDownsRegime,
): boolean {
    return regime === "STRONG_DOWN" || regime === "WEAK_DOWN";
}

function emptyStructure(): StructureAnalysis {
    return {
        points: [],
        currentStructure: "UNKNOWN",
        shift: "NONE",
        higherHigh: false,
        higherLow: false,
        lowerHigh: false,
        lowerLow: false,
        recentHigh: null,
        recentLow: null,
        breakOfStructure: false,
        failedBreak: false,
        score: 0,
    };
}

function emptyPressure(): PressureAnalysis {
    const window = {
        size: 0,
        upMoves: 0,
        downMoves: 0,
        flatMoves: 0,
        upPressure: 0,
        downPressure: 0,
        dominant: "BALANCED" as const,
        strength: 0,
    };

    return {
        short: window,
        medium: window,
        long: window,
        currentDirection: "BALANCED",
        oppositePressure: 0,
        pressureShift: "NO_CLEAR_SHIFT",
        acceleration: "NONE",
        score: 0,
    };
}

function emptyExhaustion(): ExhaustionAnalysis {
    return {
        detected: false,
        direction: "NONE",
        momentumDecay: 0,
        extensionScore: 0,
        failureToContinueScore: 0,
        oppositePressureScore: 0,
        volatilityChangeScore: 0,
        totalScore: 0,
    };
}

function emptyMomentumTransfer(): MomentumTransfer {
    return {
        detected: false,
        from: "NONE",
        to: "NONE",
        previousPressure: 0,
        currentPressure: 0,
        transferStrength: 0,
        acceleration: 0,
        score: 0,
    };
}

function emptyRSI(): RSIAnalysis {
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

function emptyBollinger(): BollingerAnalysis {
    return {
        middle: null,
        upper: null,
        lower: null,
        bandwidth: 0,
        pricePosition: "UNKNOWN",
        bullishLocation: false,
        bearishLocation: false,
        reenteredBand: false,
        score: 0,
    };
}

function emptyADX(): ADXAnalysis {
    return {
        value: null,
        plusDI: null,
        minusDI: null,
        trendStrength: "UNKNOWN",
        directionalBias: "NEUTRAL",
        score: 0,
    };
}

function emptyVolatility(): VolatilityAnalysis {
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

function emptyStability(): StabilityAnalysis {
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

function emptyReversal(): ReversalAnalysis {
    return {
        candidate: false,
        direction: "NONE",
        previousRegime: "NEUTRAL",
        exhaustion: emptyExhaustion(),
        oppositePressure: 0,
        structureShift: "NONE",
        momentumTransfer: emptyMomentumTransfer(),
        confirmationCount: 0,
        reversalScore: 0,
        invalidated: false,
        invalidationReason: null,
    };
}

function emptyContinuation(): ContinuationAnalysis {
    return {
        candidate: false,
        direction: "NONE",
        trendScore: 0,
        momentumScore: 0,
        structureScore: 0,
        exhaustionRisk: 100,
        continuationScore: 0,
    };
}

function getTrendScore(
    regime: OnlyUpsDownsRegime,
): number {
    switch (regime) {
        case "STRONG_UP":
        case "STRONG_DOWN":
            return 100;
        case "WEAK_UP":
        case "WEAK_DOWN":
            return 65;
        default:
            return 0;
    }
}

function calculateContinuation(
    regime: OnlyUpsDownsRegime,
    structure: StructureAnalysis,
    pressure: PressureAnalysis,
    exhaustion: ExhaustionAnalysis,
    adx: ADXAnalysis,
): ContinuationAnalysis {
    const up = regimeIsUp(regime);
    const down = regimeIsDown(regime);

    if (!up && !down) {
        return emptyContinuation();
    }

    const direction =
        up ? "UP" : "DOWN";

    const trendScore = getTrendScore(regime);

    const momentumScore = clamp(
        pressure.score,
    );

    const structureScore = clamp(
        structure.score,
    );

    const exhaustionRisk = clamp(
        exhaustion.totalScore,
    );

    const directionalAdx =
        (direction === "UP" && adx.directionalBias === "UP") ||
        (direction === "DOWN" && adx.directionalBias === "DOWN");

    const adxBonus = directionalAdx ? 10 : 0;

    const continuationScore = clamp(
        trendScore * 0.35 +
        momentumScore * 0.30 +
        structureScore * 0.20 +
        (100 - exhaustionRisk) * 0.15 +
        adxBonus,
    );

    const candidate =
        continuationScore >= 68 &&
        exhaustionRisk < 45 &&
        pressure.score >= 45 &&
        !structure.failedBreak;

    return {
        candidate,
        direction,
        trendScore,
        momentumScore,
        structureScore,
        exhaustionRisk,
        continuationScore,
    };
}

function buildReversalFromEvidence(
    regime: OnlyUpsDownsRegime,
    structure: StructureAnalysis,
    pressure: PressureAnalysis,
    reversalBase: ReversalAnalysis,
    momentum: MomentumTransfer,
    rsi: RSIAnalysis,
    bollinger: BollingerAnalysis,
    volatility: VolatilityAnalysis,
    stability: StabilityAnalysis,
): ReversalAnalysis {
    const previousUp = regimeIsUp(regime);
    const previousDown = regimeIsDown(regime);

    let direction:
        | "UP"
        | "DOWN"
        | "NONE" = "NONE";

    if (
        previousDown &&
        (
            structure.shift === "BULLISH" ||
            pressure.pressureShift === "UP_TRANSFER" ||
            momentum.to === "UP"
        )
    ) {
        direction = "UP";
    }

    if (
        previousUp &&
        (
            structure.shift === "BEARISH" ||
            pressure.pressureShift === "DOWN_TRANSFER" ||
            momentum.to === "DOWN"
        )
    ) {
        direction = "DOWN";
    }

    if (direction === "NONE") {
        return {
            ...reversalBase,
            candidate: false,
            direction: "NONE",
            reversalScore: 0,
        };
    }

    const bullish =
        direction === "UP";

    const structureConfirmation =
        bullish
            ? (
                structure.higherLow ||
                structure.shift === "BULLISH"
            )
            : (
                structure.lowerHigh ||
                structure.shift === "BEARISH"
            );

    const structureBreak =
        structure.breakOfStructure;

    const pressureConfirmation =
        bullish
            ? pressure.pressureShift === "UP_TRANSFER"
            : pressure.pressureShift === "DOWN_TRANSFER";

    const momentumConfirmation =
        bullish
            ? momentum.to === "UP"
            : momentum.to === "DOWN";

    const rsiConfirmation =
        bullish
            ? rsi.bullishConfirmation
            : rsi.bearishConfirmation;

    const bbConfirmation =
        bullish
            ? bollinger.bullishLocation
            : bollinger.bearishLocation;

    const previousTrendQuality =
        previousUp || previousDown
            ? getTrendScore(regime)
            : 0;

    const exhaustionScore =
        clamp(reversalBase.exhaustion.totalScore);

    const oppositePressureScore =
        clamp(reversalBase.oppositePressure);

    const structureScore =
        structureConfirmation
            ? 70
            : structureBreak
                ? 55
                : clamp(structure.score * 0.5);

    const momentumScore =
        momentumConfirmation
            ? clamp(momentum.score)
            : clamp(momentum.score * 0.6);

    const rsiScore =
        rsiConfirmation ? 100 : clamp(rsi.score);

    const bbScore =
        bbConfirmation ? 100 : clamp(bollinger.score);

    const stabilityScore =
        stability.orderly
            ? clamp(stability.score)
            : clamp(stability.score * 0.6);

    const volatilityPenalty =
        volatility.spikeRisk
            ? 25
            : volatility.abnormalMove
                ? 10
                : 0;

    const reversalScore = clamp(
        previousTrendQuality * 0.15 +
        exhaustionScore * 0.15 +
        oppositePressureScore * 0.20 +
        structureScore * 0.20 +
        momentumScore * 0.15 +
        rsiScore * 0.05 +
        bbScore * 0.05 +
        stabilityScore * 0.05 -
        volatilityPenalty,
    );

    const confirmations = [
        exhaustionScore >= 55,
        oppositePressureScore >= 50,
        structureConfirmation,
        structureBreak,
        momentumConfirmation,
        rsiConfirmation,
        bbConfirmation,
        stabilityScore >= 50,
    ].filter(Boolean).length;

    const failedReversal =
        structure.failedBreak ||
        (
            bullish &&
            pressure.currentDirection === "DOWN" &&
            pressure.oppositePressure < 35
        ) ||
        (
            !bullish &&
            pressure.currentDirection === "UP" &&
            pressure.oppositePressure < 35
        );

    let invalidationReason: string | null = null;

    if (structure.failedBreak) {
        invalidationReason =
            "Structural break failed.";
    } else if (failedReversal) {
        invalidationReason =
            "Opposite pressure disappeared before confirmation.";
    }

    const ready =
        !failedReversal &&
        previousTrendQuality >= 60 &&
        exhaustionScore >= 55 &&
        oppositePressureScore >= 50 &&
        structureConfirmation &&
        momentumConfirmation &&
        confirmations >= 4 &&
        stabilityScore >= 40 &&
        !volatility.spikeRisk &&
        reversalScore >= 75;

    const watch =
        !failedReversal &&
        !ready &&
        previousTrendQuality >= 60 &&
        exhaustionScore >= 45 &&
        oppositePressureScore >= 35 &&
        (
            structureConfirmation ||
            momentumConfirmation
        ) &&
        reversalScore >= 55;

    return {
        ...reversalBase,
        candidate: ready || watch,
        direction,
        confirmationCount: confirmations,
        reversalScore,
        invalidated: failedReversal,
        invalidationReason,
    };
}

function buildSignal(
    reversal: ReversalAnalysis,
    continuation: ContinuationAnalysis,
    volatility: VolatilityAnalysis,
    stability: StabilityAnalysis,
    timestamp: number,
    rsiConfirmation: boolean,
    bollingerConfirmation: boolean,
    adxConfirmation: boolean,
): OnlyUpsDownsSignal | null {
    const reversalReady =
        reversal.reversalScore >= 75 &&
        !reversal.invalidated;

    const continuationReady =
        continuation.candidate &&
        continuation.continuationScore >= 68;

    let mode:
        | "REVERSAL"
        | "CONTINUATION"
        | "NONE" = "NONE";

    let direction:
        | OnlyUpsDownsDirection
        | null = null;

    let status:
        | OnlyUpsDownsStatus = "WAIT";

    let confidence = 0;
    let reason = "No valid setup.";

    if (reversalReady) {
        mode = "REVERSAL";

        direction =
            reversal.direction === "UP"
                ? "ups"
                : reversal.direction === "DOWN"
                    ? "downs"
                    : null;

        status = "READY";
        confidence = clamp(reversal.reversalScore);

        reason =
            direction === "ups"
                ? "Downtrend exhaustion followed by bullish pressure transfer and structural confirmation."
                : "Uptrend exhaustion followed by bearish pressure transfer and structural confirmation.";
    } else if (
        reversal.candidate &&
        !reversal.invalidated
    ) {
        mode = "REVERSAL";

        direction =
            reversal.direction === "UP"
                ? "ups"
                : reversal.direction === "DOWN"
                    ? "downs"
                    : null;

        status = "WATCH";
        confidence = clamp(reversal.reversalScore);

        reason =
            "Potential reversal forming; waiting for stronger confirmation.";
    } else if (continuationReady) {
        mode = "CONTINUATION";

        direction =
            continuation.direction === "UP"
                ? "ups"
                : "downs";

        status = "READY";
        confidence =
            clamp(continuation.continuationScore);

        reason =
            direction === "ups"
                ? "Healthy bullish trend continuation."
                : "Healthy bearish trend continuation.";
    }

    if (!direction) {
        return null;
    }

    if (volatility.spikeRisk) {
        status = "WAIT";
        reason =
            "Setup rejected because abnormal spike risk is too high.";
    }

    if (stability.chaotic) {
        status = "WAIT";
        reason =
            "Setup rejected because tick movement is too chaotic.";
    }

    const entryQuality =
        status !== "READY"
            ? "NONE"
            : confidence >= 85
                ? "HIGH"
                : confidence >= 75
                    ? "MEDIUM"
                    : "LOW";

    const reversalRisk =
        reversal.invalidated
            ? "EXTREME"
            : volatility.spikeRisk || stability.chaotic
                ? "HIGH"
                : confidence >= 85
                    ? "LOW"
                    : confidence >= 75
                        ? "MEDIUM"
                        : "HIGH";

    const botDirection =
        direction === "ups"
            ? "ups"
            : "downs";

    return {
        direction:
            direction === "ups"
                ? "Only Ups"
                : direction === "downs"
                    ? "Only Downs"
                    : "None",
        botDirection,
        mode,
        confidence,
        trendScore:
            mode === "REVERSAL"
                ? getTrendScore(reversal.previousRegime)
                : continuation.trendScore,
        exhaustionScore:
            reversal.exhaustion.totalScore,
        oppositePressureScore:
            reversal.oppositePressure,
        structureScore:
            mode === "REVERSAL"
                ? reversal.reversalScore
                : continuation.structureScore,
        momentumShiftScore:
            reversal.momentumTransfer.score,
        rsiConfirmation,
        bollingerConfirmation,
        adxConfirmation,
        volatilitySafe:
            !volatility.abnormalMove &&
            !volatility.spikeRisk,
        stabilitySafe:
            !stability.chaotic,
        reversalRisk,
        entryQuality,
        entryScore: confidence,
        status,
        reason,
        timestamp,
    };
}

export function evaluateOnlyUpsDownsStrategy(
    input: OnlyUpsDownsStrategyInput,
): OnlyUpsDownsEngineResult {
    const prices = finitePrices(input.prices);
    const timestamp =
        input.timestamp ?? Date.now();

    if (prices.length < 40) {
        const structure = emptyStructure();
        const pressure = emptyPressure();
        const exhaustion = emptyExhaustion();
        const momentumTransfer = emptyMomentumTransfer();
        const reversal = emptyReversal();
        const continuation = emptyContinuation();
        const rsi = emptyRSI();
        const bollinger = emptyBollinger();
        const adx = emptyADX();
        const volatility = emptyVolatility();
        const stability = emptyStability();

        return {
            signal: null,
            regime: "NEUTRAL",
            structure,
            pressure,
            exhaustion,
            momentumTransfer,
            reversal,
            continuation,
            rsi,
            bollinger,
            adx,
            volatility,
            stability,
        };
    }

    const structureResult =
        analyzeOnlyUpsDownsMarketStructure(prices);

    const pressureResult =
        calculateOnlyUpsDownsPressure(prices);

    const rsi =
        calculateRSI(prices);

    const bollinger =
        calculateBollingerBands(prices);

    const adx =
        calculateADX(prices);

    const volatility =
        calculateVolatility(prices);

    const stability =
        calculateStability(prices);

    const momentumResult =
        calculateMomentumTransfer(prices);

    const regime =
        structureResult.regime;

    const baseReversal =
        analyzeOnlyUpsDownsReversal(prices);

    const momentumTransfer: MomentumTransfer = {
        detected: momentumResult.detected,
        from:
            momentumResult.from === "UP"
                ? "UP"
                : momentumResult.from === "DOWN"
                    ? "DOWN"
                    : "NONE",
        to:
            momentumResult.to === "UP"
                ? "UP"
                : momentumResult.to === "DOWN"
                    ? "DOWN"
                    : "NONE",
        previousPressure:
            momentumResult.previousPressure,
        currentPressure:
            momentumResult.currentPressure,
        transferStrength:
            clamp(momentumResult.transferStrength),
        acceleration:
            momentumResult.acceleration,
        score:
            clamp(momentumResult.score),
    };

    const structure: StructureAnalysis = {
        points: [
            ...structureResult.swingHighs.map(
                (point, index, arr) => ({
                    type: (
                        index === 0
                            ? "HH"
                            : point.price >= arr[index - 1].price
                                ? "HH"
                                : "LH"
                    ) as "HH" | "LH",
                    price: point.price,
                    index: point.index,
                }),
            ),
            ...structureResult.swingLows.map(
                (point, index, arr) => ({
                    type: (
                        index === 0
                            ? "HL"
                            : point.price >= arr[index - 1].price
                                ? "HL"
                                : "LL"
                    ) as "HL" | "LL",
                    price: point.price,
                    index: point.index,
                }),
            ),
        ],
        currentStructure:
            structureResult.higherHigh &&
            structureResult.higherLow
                ? "HH_HL"
                : structureResult.lowerHigh &&
                    structureResult.lowerLow
                    ? "LH_LL"
                    : structureResult.bullishShift ||
                        structureResult.bearishShift
                        ? "TRANSITION"
                        : "MIXED",
        shift:
            structureResult.bullishShift
                ? "BULLISH"
                : structureResult.bearishShift
                    ? "BEARISH"
                    : "NONE",
        higherHigh:
            structureResult.higherHigh,
        higherLow:
            structureResult.higherLow,
        lowerHigh:
            structureResult.lowerHigh,
        lowerLow:
            structureResult.lowerLow,
        recentHigh:
            structureResult.recentHigh,
        recentLow:
            structureResult.recentLow,
        breakOfStructure:
            structureResult.bullishBreak ||
            structureResult.bearishBreak,
        failedBreak:
            false,
        score:
            clamp(structureResult.structureScore),
    };

    const pressure: PressureAnalysis = {
        short: {
            size: pressureResult.short.windowSize,
            upMoves: 0,
            downMoves: 0,
            flatMoves: 0,
            upPressure: pressureResult.short.upPressure,
            downPressure: pressureResult.short.downPressure,
            dominant:
                pressureResult.short.dominance === "ups"
                    ? "UP"
                    : pressureResult.short.dominance === "downs"
                        ? "DOWN"
                        : "BALANCED",
            strength:
                clamp(pressureResult.short.strength),
        },
        medium: {
            size: pressureResult.medium.windowSize,
            upMoves: 0,
            downMoves: 0,
            flatMoves: 0,
            upPressure: pressureResult.medium.upPressure,
            downPressure: pressureResult.medium.downPressure,
            dominant:
                pressureResult.medium.dominance === "ups"
                    ? "UP"
                    : pressureResult.medium.dominance === "downs"
                        ? "DOWN"
                        : "BALANCED",
            strength:
                clamp(pressureResult.medium.strength),
        },
        long: {
            size: pressureResult.long.windowSize,
            upMoves: 0,
            downMoves: 0,
            flatMoves: 0,
            upPressure: pressureResult.long.upPressure,
            downPressure: pressureResult.long.downPressure,
            dominant:
                pressureResult.long.dominance === "ups"
                    ? "UP"
                    : pressureResult.long.dominance === "downs"
                        ? "DOWN"
                        : "BALANCED",
            strength:
                clamp(pressureResult.long.strength),
        },
        currentDirection:
            pressureResult.dominantDirection === "ups"
                ? "UP"
                : pressureResult.dominantDirection === "downs"
                    ? "DOWN"
                    : "BALANCED",
        oppositePressure:
            clamp(pressureResult.oppositePressure),
        pressureShift:
            pressureResult.transfer.to === "ups"
                ? "UP_TRANSFER"
                : pressureResult.transfer.to === "downs"
                    ? "DOWN_TRANSFER"
                    : "NO_CLEAR_SHIFT",
        acceleration:
            pressureResult.acceleration > 0
                ? "UP"
                : pressureResult.acceleration < 0
                    ? "DOWN"
                    : "NONE",
        score:
            clamp(pressureResult.overallStrength),
    };

    const exhaustionDirection =
        baseReversal.direction === "bullish"
            ? "DOWN"
            : baseReversal.direction === "bearish"
                ? "UP"
                : "NONE";

    const exhaustion: ExhaustionAnalysis = {
        detected:
            baseReversal.exhaustionScore >= 55,
        direction:
            exhaustionDirection,
        momentumDecay:
            clamp(baseReversal.exhaustionScore),
        extensionScore:
            clamp(baseReversal.exhaustionScore),
        failureToContinueScore:
            clamp(baseReversal.exhaustionScore),
        oppositePressureScore:
            clamp(baseReversal.oppositePressure),
        volatilityChangeScore:
            clamp(baseReversal.reversalRisk),
        totalScore:
            clamp(baseReversal.exhaustionScore),
    };

    const legacyReversalBase: ReversalAnalysis = {
        candidate:
            baseReversal.direction !== "none" &&
            baseReversal.status !== "WAIT",
        direction:
            baseReversal.direction === "bullish"
                ? "UP"
                : baseReversal.direction === "bearish"
                    ? "DOWN"
                    : "NONE",
        previousRegime:
            baseReversal.previousRegime,
        exhaustion,
        oppositePressure:
            clamp(baseReversal.oppositePressure),
        structureShift:
            structure.shift,
        momentumTransfer,
        confirmationCount: 0,
        reversalScore:
            clamp(baseReversal.score),
        invalidated:
            baseReversal.failedReversal,
        invalidationReason:
            baseReversal.failedReversal
                ? "Current reversal engine marked the reversal as failed."
                : null,
    };

    const reversal =
        buildReversalFromEvidence(
            regime,
            structure,
            pressure,
            legacyReversalBase,
            momentumTransfer,
            rsi,
            bollinger,
            volatility,
            stability,
        );

    const continuation =
        calculateContinuation(
            regime,
            structure,
            pressure,
            exhaustion,
            adx,
        );

    const signal =
        buildSignal(
            reversal,
            continuation,
            volatility,
            stability,
            timestamp,
            baseReversal.rsiConfirmation > 0,
            baseReversal.bollingerConfirmation > 0,
            adx.trendStrength === "STRONG",
        );

    return {
        signal,
        regime,
        structure,
        pressure,
        exhaustion,
        momentumTransfer,
        reversal,
        continuation,
        rsi,
        bollinger,
        adx,
        volatility,
        stability,
    };
}

export const OnlyUpsDownsStrategy = {
    evaluate: evaluateOnlyUpsDownsStrategy,
};




