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
    SpikeReversalAnalysis,
    ContinuationAnalysis,
    OnlyUpsDownsEngineResult,
    OnlyUpsDownsAnalysisHorizon,
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
    horizon?: OnlyUpsDownsAnalysisHorizon;
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

/**
 * Market Regime Fusion
 *
 * Structure remains the primary regime source when meaningful
 * swing information exists.
 *
 * When structure is NEUTRAL, directional pressure can identify
 * clean monotonic trends that do not generate enough traditional
 * swing highs/lows.
 *
 * Conflicting pressure does not override an established strong
 * structural regime. That conflict remains useful to reversal
 * logic.
 */
function fuseMarketRegime(
    structureRegime: OnlyUpsDownsRegime,
    pressure: ReturnType<typeof calculateOnlyUpsDownsPressure>,
): OnlyUpsDownsRegime {
    const pressureDirection =
        pressure.dominantDirection;

    const pressureStrength =
        clamp(pressure.overallStrength);

    if (
        structureRegime === "STRONG_UP" ||
        structureRegime === "STRONG_DOWN"
    ) {
        return structureRegime;
    }

    if (structureRegime === "WEAK_UP") {
        if (
            pressureDirection === "ups" &&
            pressureStrength >= 70
        ) {
            return "STRONG_UP";
        }

        return "WEAK_UP";
    }

    if (structureRegime === "WEAK_DOWN") {
        if (
            pressureDirection === "downs" &&
            pressureStrength >= 70
        ) {
            return "STRONG_DOWN";
        }

        return "WEAK_DOWN";
    }

    if (structureRegime === "NEUTRAL") {
        if (
            pressureDirection === "ups" &&
            pressureStrength >= 70
        ) {
            return "STRONG_UP";
        }

        if (
            pressureDirection === "ups" &&
            pressureStrength >= 45
        ) {
            return "WEAK_UP";
        }

        if (
            pressureDirection === "downs" &&
            pressureStrength >= 70
        ) {
            return "STRONG_DOWN";
        }

        if (
            pressureDirection === "downs" &&
            pressureStrength >= 45
        ) {
            return "WEAK_DOWN";
        }
    }

    return structureRegime;
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

/**
 * Detects a historical spike followed by a sustained move
 * in the opposite direction.
 *
 * This detector is intentionally independent from the normal
 * reversal regime logic. It is evidence generation only.
 */
function detectHistoricalSpikeReversal(
    prices: number[],
): SpikeReversalAnalysis {
    const emptyResult: SpikeReversalAnalysis = {
        detected: false,
        direction: "NONE",
        spikeIndex: -1,
        ticksSinceSpike: 0,
        magnitude: 0,
        baselineMove: 0,
        relativeMagnitude: 0,
        oppositeMoveCount: 0,
        oppositeNetMove: 0,
        rejectionDetected: false,
        persistenceDetected: false,
        score: 0,
    };

    if (prices.length < 20) {
        return emptyResult;
    }

    const moves: number[] = [];

    for (let i = 1; i < prices.length; i++) {
        moves.push(prices[i] - prices[i - 1]);
    }

    if (moves.length < 19) {
        return emptyResult;
    }

    /*
     * Search newest-to-oldest so the detector prefers the most
     * recent qualifying historical spike.
     *
     * A candidate must have at least 6 ticks after the spike
     * and no more than 20 ticks after the spike.
     */
    for (let spikeMoveIndex = moves.length - 7; spikeMoveIndex >= 12; spikeMoveIndex--) {
        const ticksSinceSpike =
            moves.length - 1 - spikeMoveIndex;

        if (
            ticksSinceSpike < 6 ||
            ticksSinceSpike > 20
        ) {
            continue;
        }

        const baselineWindow = moves.slice(
            Math.max(0, spikeMoveIndex - 12),
            spikeMoveIndex,
        );

        if (baselineWindow.length < 8) {
            continue;
        }

        const baselineMove =
            baselineWindow.reduce(
                (sum, value) => sum + Math.abs(value),
                0,
            ) / baselineWindow.length;

        if (baselineMove <= 0) {
            continue;
        }

        const spikeMove = moves[spikeMoveIndex];
        const magnitude = Math.abs(spikeMove);
        const direction =
            spikeMove > 0
                ? "DOWN"
                : spikeMove < 0
                    ? "UP"
                    : "NONE";

        if (direction === "NONE") {
            continue;
        }

        const relativeMagnitude =
            magnitude / baselineMove;

        /*
         * Require a genuinely abnormal move rather than an
         * ordinary trend tick.
         */
        if (relativeMagnitude < 3) {
            continue;
        }

        const followingMoves = moves.slice(
            spikeMoveIndex + 1,
        );

        const oppositeMoves = followingMoves.filter(
            (move) =>
                (
                    direction === "UP" &&
                    move > 0
                ) ||
                (
                    direction === "DOWN" &&
                    move < 0
                ),
        );

        const oppositeMoveCount =
            oppositeMoves.length;

        /*
         * Measure total movement in the reversal direction.
         * This is deliberately magnitude-based evidence rather
         * than a raw signed displacement.
         */
        const oppositeNetMove =
            oppositeMoves.reduce(
                (sum, value) => sum + Math.abs(value),
                0,
            );

        /*
         * Rejection:
         * at least two moves against the spike direction.
         */
        const rejectionDetected =
            oppositeMoveCount >= 2;

        /*
         * Persistence:
         * at least six opposite-direction moves AND
         * accumulated opposite movement >= 3 baseline moves.
         */
        const persistenceDetected =
            oppositeMoveCount >= 6 &&
            oppositeNetMove >= baselineMove * 3;

        const magnitudeScore = Math.min(
            100,
            Math.max(
                0,
                (relativeMagnitude - 3) * 20 + 60,
            ),
        );

        const rejectionScore =
            rejectionDetected ? 15 : 0;

        const persistenceScore =
            persistenceDetected ? 20 : 0;

        const netMoveScore =
            Math.min(
                15,
                (
                    oppositeNetMove /
                    Math.max(baselineMove, 0.00000001)
                ) * 3,
            );

        const score = Math.min(
            100,
            magnitudeScore +
            rejectionScore +
            persistenceScore +
            netMoveScore,
        );

        /*
         * A spike alone is not enough.
         * Detection requires sustained opposite behavior.
         */
        const detected =
            persistenceDetected &&
            rejectionDetected &&
            score >= 75;

        if (!detected) {
            continue;
        }

        return {
            detected: true,
            direction,
            spikeIndex: spikeMoveIndex + 1,
            ticksSinceSpike,
            magnitude,
            baselineMove,
            relativeMagnitude,
            oppositeMoveCount,
            oppositeNetMove,
            rejectionDetected,
            persistenceDetected,
            score,
        };
    }

    return emptyResult;
}
function deriveHistoricalRegime(
    prices: number[],
    horizon: OnlyUpsDownsAnalysisHorizon = "SHORT_TERM",
): OnlyUpsDownsRegime {
    /*
     * Historical regime is the directional context that existed
     * before the current market phase.
     *
     * SHORT_TERM intentionally preserves the original 12-tick
     * behavior so existing short-term reversal behavior remains
     * stable.
     *
     * MEDIUM_TERM, LONG_TERM and MULTI_TIMEFRAME use progressively
     * larger historical sections of the 2000-tick analysis history.
     *
     * The historical window is taken from the OLDER side of the
     * available history. This is important: using only the newest
     * ticks would describe the current trend rather than the regime
     * that existed before the transition.
     */

    if (prices.length < 12) {
        return "NEUTRAL";
    }

    const resolveHistoricalWindow = (
        selectedHorizon: OnlyUpsDownsAnalysisHorizon,
    ): number => {
        switch (selectedHorizon) {
            case "MEDIUM_TERM":
                return 120;

            case "LONG_TERM":
                return 500;

            case "MULTI_TIMEFRAME":
                return 500;

            case "AUTO":
                return 120;

            case "SHORT_TERM":
            default:
                return 12;
        }
    };

    const requestedWindow =
        resolveHistoricalWindow(horizon);

    const availableWindow =
        Math.min(
            requestedWindow,
            prices.length,
        );

    /*
     * For longer horizons, leave the newest market phase out of the
     * historical sample. We want the regime BEFORE the current phase,
     * not the current trend itself.
     */
    const exclusionWindow =
        horizon === "SHORT_TERM"
            ? 0
            : Math.min(
                Math.max(
                    40,
                    Math.floor(
                        availableWindow * 0.25,
                    ),
                ),
                Math.max(
                    0,
                    prices.length - 12,
                ),
            );

    const historicalEnd =
        horizon === "SHORT_TERM"
            ? Math.min(
                12,
                prices.length,
            )
            : Math.max(
                12,
                prices.length - exclusionWindow,
            );

    const historicalStart =
        horizon === "SHORT_TERM"
            ? 0
            : Math.max(
                0,
                historicalEnd - availableWindow,
            );

    const historicalPrices =
        prices.slice(
            historicalStart,
            historicalEnd,
        );

    if (historicalPrices.length < 9) {
        return "NEUTRAL";
    }

    /*
     * Multi-timeframe uses the long historical context as its base.
     * The active horizon evidence elsewhere in the strategy still
     * supplies the cross-timeframe confirmation.
     */
    const historicalStructure =
        analyzeOnlyUpsDownsMarketStructure(
            historicalPrices,
        );

    const historicalPressure =
        calculateOnlyUpsDownsPressure(
            historicalPrices,
            horizon === "LONG_TERM" ||
            horizon === "MULTI_TIMEFRAME"
                ? {
                    shortWindow: 40,
                    mediumWindow: 120,
                    longWindow: Math.min(
                        500,
                        historicalPrices.length,
                    ),
                    minimumSamples: 10,
                }
                : undefined,
        );

    return fuseMarketRegime(
        historicalStructure.regime,
        historicalPressure,
    );
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

    /*
     * A verified transition is different from exhaustion.
     *
     * It requires:
     *   1. a strong historical regime,
     *   2. momentum originating from that old direction,
     *   3. momentum transferring into the reversal direction,
     *   4. meaningful opposite pressure,
     *   5. no failed structural break.
     *
     * This prevents normal continuation from being promoted
     * to reversal simply because momentum is strong.
     */
    const transitionConfirmation =
        (
            bullish &&
            previousDown &&
            momentum.from === "DOWN" &&
            momentum.to === "UP"
        ) ||
        (
            !bullish &&
            previousUp &&
            momentum.from === "UP" &&
            momentum.to === "DOWN"
        );

    const verifiedTransition =
        transitionConfirmation &&
        oppositePressureScore >= 50 &&
        momentum.detected &&
        !structure.failedBreak;

    const transitionScore =
        verifiedTransition
            ? 100
            : 0;

    const structureScore =
        verifiedTransition
            ? 80
            : structureConfirmation
                ? 70
                : structureBreak
                    ? 55
                    : clamp(structure.score * 0.5);

    const momentumScore =
        momentumConfirmation
            ? clamp(momentum.score)
            : clamp(momentum.score * 0.6);

    const rsiScore =
        rsiConfirmation
            ? 100
            : clamp(rsi.score);

    const bbScore =
        bbConfirmation
            ? 100
            : clamp(bollinger.score);

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

    /*
     * For a verified regime transition, the 15% reversal-evidence
     * slot uses transition evidence instead of pretending that
     * exhaustion occurred.
     */
    const reversalEvidenceScore =
        verifiedTransition
            ? transitionScore
            : exhaustionScore;

    const reversalScore = clamp(
        previousTrendQuality * 0.15 +
        reversalEvidenceScore * 0.15 +
        oppositePressureScore * 0.20 +
        structureScore * 0.20 +
        momentumScore * 0.15 +
        rsiScore * 0.05 +
        bbScore * 0.05 +
        stabilityScore * 0.05 -
        volatilityPenalty,
    );

    const confirmations = [
        exhaustionScore >= 55 ||
            verifiedTransition,
        oppositePressureScore >= 50,
        structureConfirmation ||
            verifiedTransition,
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
        (
            exhaustionScore >= 55 ||
            verifiedTransition
        ) &&
        oppositePressureScore >= 50 &&
        (
            structureConfirmation ||
            verifiedTransition
        ) &&
        momentumConfirmation &&
        confirmations >= 4 &&
        stabilityScore >= 40 &&
        !volatility.spikeRisk &&
        reversalScore >= 75;

    const watch =
        !failedReversal &&
        !ready &&
        previousTrendQuality >= 60 &&
        (
            exhaustionScore >= 45 ||
            verifiedTransition
        ) &&
        oppositePressureScore >= 35 &&
        (
            structureConfirmation ||
            momentumConfirmation ||
            verifiedTransition
        ) &&
        reversalScore >= 55;

    return {
        ...reversalBase,
        candidate: ready || watch,
        direction,
        previousRegime: regime,
        momentumTransfer: momentum,
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
    horizonQualification: {
        requestedHorizon: OnlyUpsDownsAnalysisHorizon;
        selectedHorizon: OnlyUpsDownsAnalysisHorizon;
        reversalConfirmed: boolean;
        confirmationScore: number;
        structureShift: boolean;
        pressureTransfer: boolean;
        multiTimeframeAgreement: boolean;
        currentDirection: "UP" | "DOWN" | "NONE";
    },
): OnlyUpsDownsSignal | null {
    const selectedHorizon =
        horizonQualification.selectedHorizon;

    const requestedHorizon =
        horizonQualification.requestedHorizon;

    const horizonIsShortTerm =
        selectedHorizon === "SHORT_TERM";

    const horizonIsMediumTerm =
        selectedHorizon === "MEDIUM_TERM";

    const horizonIsLongTerm =
        selectedHorizon === "LONG_TERM";

    const horizonIsMultiTimeframe =
        requestedHorizon === "MULTI_TIMEFRAME";

        const verifiedTransitionEvidence =
    horizonQualification.reversalConfirmed &&
    horizonQualification.pressureTransfer &&
    horizonQualification.confirmationScore >= 55 &&
    horizonQualification.currentDirection !== "NONE";

const strongHorizonEvidence =
    horizonQualification.reversalConfirmed &&
    (
        horizonQualification.confirmationScore >= 70 ||
        verifiedTransitionEvidence
    );

    /*
     * The selected horizon is now an independent
     * qualification path.
     *
     * The legacy reversal score remains useful for
     * confidence/risk, but it no longer blocks a
     * properly confirmed long-term transition.
     */

    const shortTermEvidence =
        horizonIsShortTerm &&
        strongHorizonEvidence &&
        (
            horizonQualification.pressureTransfer ||
            horizonQualification.structureShift
        );

    const mediumTermEvidence =
        horizonIsMediumTerm &&
        strongHorizonEvidence &&
        (
            horizonQualification.pressureTransfer ||
            horizonQualification.structureShift
        );

    const longTermEvidence =
        horizonIsLongTerm &&
        strongHorizonEvidence &&
        (
            horizonQualification.pressureTransfer ||
            horizonQualification.structureShift
        );

    const multiTimeframeEvidence =
        horizonIsMultiTimeframe &&
        strongHorizonEvidence &&
        horizonQualification.multiTimeframeAgreement;

    const horizonAwareReversalReady =
        !reversal.invalidated &&
        (
            shortTermEvidence ||
            mediumTermEvidence ||
            longTermEvidence ||
            multiTimeframeEvidence
        );

    const legacyReversalReady =
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

    let reason =
        "No valid setup.";

    /*
     * Horizon-aware reversal takes priority.
     *
     * This is important for LONG_TERM because a
     * genuine 500/1000/2000-tick transition should
     * not be blocked by a short-term legacy score.
     */

    if (
        horizonAwareReversalReady ||
        legacyReversalReady
    ) {
        mode = "REVERSAL";

        direction =
            horizonAwareReversalReady
                ? horizonQualification.currentDirection === "UP"
                    ? "ups"
                    : horizonQualification.currentDirection === "DOWN"
                        ? "downs"
                        : reversal.direction === "UP"
                            ? "ups"
                            : reversal.direction === "DOWN"
                                ? "downs"
                                : null
                : reversal.direction === "UP"
                    ? "ups"
                    : reversal.direction === "DOWN"
                        ? "downs"
                        : null;

        status = "READY";

        confidence =
            clamp(
                Math.max(
                    reversal.reversalScore,
                    horizonQualification.confirmationScore,
                ),
            );

        if (longTermEvidence) {
            reason =
                direction === "ups"
                    ? "Long-term bullish reversal confirmed by 500/1000/2000-tick pressure and structural evidence."
                    : "Long-term bearish reversal confirmed by 500/1000/2000-tick pressure and structural evidence.";
        } else if (multiTimeframeEvidence) {
            reason =
                direction === "ups"
                    ? "Bullish reversal confirmed across multiple analysis horizons."
                    : "Bearish reversal confirmed across multiple analysis horizons.";
        } else if (mediumTermEvidence) {
            reason =
                direction === "ups"
                    ? "Medium-term bullish reversal confirmed by historical pressure and structural evidence."
                    : "Medium-term bearish reversal confirmed by historical pressure and structural evidence.";
        } else if (shortTermEvidence) {
            reason =
                direction === "ups"
                    ? "Short-term bullish reversal confirmed by pressure transfer and structural evidence."
                    : "Short-term bearish reversal confirmed by pressure transfer and structural evidence.";
        } else {
            reason =
                direction === "ups"
                    ? "Reversal confirmed by the core reversal engine."
                    : "Reversal confirmed by the core reversal engine.";
        }
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

        confidence =
            clamp(
                Math.max(
                    reversal.reversalScore,
                    horizonQualification.confirmationScore,
                ),
            );

        reason =
            "Potential reversal forming; waiting for stronger horizon confirmation.";
    } else if (continuationReady) {
        mode = "CONTINUATION";

        direction =
            continuation.direction === "UP"
                ? "ups"
                : "downs";

        status = "READY";

        confidence =
            clamp(
                continuation.continuationScore,
            );

        reason =
            direction === "ups"
                ? "Healthy bullish trend continuation."
                : "Healthy bearish trend continuation.";
    }

    if (!direction) {
        return null;
    }

    /*
     * Safety gates remain absolute.
     *
     * Horizon confirmation can qualify a reversal,
     * but it can never override abnormal spike risk
     * or chaotic market conditions.
     */

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
            : volatility.spikeRisk ||
                stability.chaotic
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
        requestedHorizon:
            horizonQualification.requestedHorizon,

        selectedHorizon:
            horizonQualification.selectedHorizon,

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
                ? getTrendScore(
                    reversal.previousRegime,
                )
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

        entryScore:
            confidence,

        status,

        reason,

        timestamp,
    };
}
interface HorizonEvidence {
    horizon: OnlyUpsDownsAnalysisHorizon;
    primaryWindow: number;
    availableWindows: number[];
    previousDirection: "UP" | "DOWN" | "NONE";
    currentDirection: "UP" | "DOWN" | "NONE";
    pressureTransfer: boolean;
    pressureTransferStrength: number;
    structureShift: boolean;
    trendPersistence: number;
    reversalPressure: number;
    agreementScore: number;
}

function getHorizonWindows(
    horizon: OnlyUpsDownsAnalysisHorizon,
): number[] {
    switch (horizon) {
        case "SHORT_TERM":
            return [40, 80, 120];

        case "MEDIUM_TERM":
            return [120, 240, 500];

        case "LONG_TERM":
            return [500, 1000, 2000];

        case "MULTI_TIMEFRAME":
            return [40, 120, 240, 500, 1000, 2000];

        case "AUTO":
        default:
            return [40, 120, 240, 500, 1000, 2000];
    }
}

function getAvailableHorizonWindows(
    prices: number[],
    horizon: OnlyUpsDownsAnalysisHorizon,
): number[] {
    return getHorizonWindows(horizon).filter(
        (window) => prices.length >= window,
    );
}

function directionFromPressure(
    pressure: ReturnType<typeof calculateOnlyUpsDownsPressure>,
): "UP" | "DOWN" | "NONE" {
    if (pressure.dominantDirection === "ups") {
        return "UP";
    }

    if (pressure.dominantDirection === "downs") {
        return "DOWN";
    }

    return "NONE";
}

function calculateHorizonEvidence(
    prices: number[],
    horizon: OnlyUpsDownsAnalysisHorizon,
): HorizonEvidence {
    const requestedWindows =
        getAvailableHorizonWindows(
            prices,
            horizon,
        );

    const windows =
        requestedWindows.length
            ? requestedWindows
            : [Math.min(40, prices.length)];

    const primaryWindow =
        windows[windows.length - 1];

    /*
     * The current window must leave enough history available
     * for a genuine before/after comparison.
     *
     * This is especially important for LONG_TERM:
     * with 2000 ticks available, a 2000-tick current window
     * would start at index 0 and leave no previous window.
     *
     * Therefore the effective current window is capped so
     * that the preceding comparison window can always exist.
     */
    const comparisonWindowSize =
        Math.max(
            40,
            Math.min(
                Math.floor(
                    primaryWindow * 0.5,
                ),
                Math.floor(
                    prices.length * 0.5,
                ),
            ),
        );

    const currentWindowSize =
        Math.max(
            40,
            Math.min(
                primaryWindow,
                prices.length -
                comparisonWindowSize,
            ),
        );

    const currentEnd =
        prices.length;

    const currentStart =
        Math.max(
            0,
            currentEnd -
            currentWindowSize,
        );

    const currentWindow =
        prices.slice(
            currentStart,
            currentEnd,
        );

    const previousEnd =
        currentStart;

    const previousStart =
        Math.max(
            0,
            previousEnd -
            comparisonWindowSize,
        );

    const previousWindow =
        prices.slice(
            previousStart,
            previousEnd,
        );

    const pressureWindows =
        getHorizonWindows(
            horizon,
        );

    const horizonShortWindow =
        pressureWindows[0];

    const horizonMediumWindow =
        pressureWindows.length >= 3
            ? pressureWindows[
                pressureWindows.length - 2
            ]
            : pressureWindows[0];

    const horizonLongWindow =
        pressureWindows[
            pressureWindows.length - 1
        ];

    const currentPressure =
        calculateOnlyUpsDownsPressure(
            currentWindow,
            {
                shortWindow:
                    horizonShortWindow,
                mediumWindow:
                    horizonMediumWindow,
                longWindow:
                    horizonLongWindow,
                minimumSamples: 10,
            },
        );

    const previousPressure =
        previousWindow.length >= 10
            ? calculateOnlyUpsDownsPressure(
                previousWindow,
                {
                    shortWindow:
                        horizonShortWindow,
                    mediumWindow:
                        horizonMediumWindow,
                    longWindow:
                        horizonLongWindow,
                    minimumSamples: 10,
                },
            )
            : calculateOnlyUpsDownsPressure(
                currentWindow,
                {
                    shortWindow:
                        horizonShortWindow,
                    mediumWindow:
                        horizonMediumWindow,
                    longWindow:
                        horizonLongWindow,
                    minimumSamples: 10,
                },
            );

    const currentDirection =
        directionFromPressure(
            currentPressure,
        );

    const previousDirection =
    directionFromPressure(
        previousPressure,
    );

/*
 * Detect a genuine sustained directional transition
 * directly from tick-to-tick movement.
 *
 * The normal pressure engine can smooth a transition away
 * when the old and new phases occupy the same large window.
 *
 * This detector is intentionally strict:
 * - the old phase must have a sustained run;
 * - the new phase must also have a sustained run;
 * - the new phase must be meaningfully longer than a small pullback.
 *
 * This prevents a short 2-6 tick retracement inside a trend
 * from being promoted to a reversal.
 */
const transitionMoves =
    currentWindow
        .slice(-60)
        .reduce(
            (
                moves: number[],
                price,
                index,
                values,
            ) => {
                if (index === 0) {
                    return moves;
                }

                const previous =
                    values[index - 1];

                const delta =
                    price - previous;

                if (delta > 0) {
                    moves.push(1);
                } else if (delta < 0) {
                    moves.push(-1);
                }

                return moves;
            },
            [],
        );

let sustainedTransitionFrom:
    | "UP"
    | "DOWN"
    | "NONE" = "NONE";

let sustainedTransitionTo:
    | "UP"
    | "DOWN"
    | "NONE" = "NONE";

let sustainedTransitionStrength = 0;

const runs: Array<{
    direction: 1 | -1;
    length: number;
}> = [];

if (transitionMoves.length >= 20) {
    let runDirection =
        transitionMoves[0];

    let runLength = 1;

    for (
        let i = 1;
        i < transitionMoves.length;
        i++
    ) {
        if (
            transitionMoves[i] ===
            runDirection
        ) {
            runLength++;
            continue;
        }

        runs.push({
            direction:
                runDirection as 1 | -1,
            length: runLength,
        });

        runDirection =
            transitionMoves[i];

        runLength = 1;
    }

    runs.push({
        direction:
            runDirection as 1 | -1,
        length: runLength,
    });

    /*
     * Search newest-to-oldest so the most recent
     * genuine transition is preferred.
     *
     * Old phase:
     *   at least 8 consecutive ticks
     *
     * New phase:
     *   at least 10 consecutive ticks
     *
     * This deliberately rejects short pullbacks.
     */
    for (
        let i = runs.length - 1;
        i >= 1;
        i--
    ) {
        const currentRun =
            runs[i];

        const previousRun =
            runs[i - 1];

        if (
            currentRun.length < 10 ||
            previousRun.length < 8 ||
            currentRun.direction ===
                previousRun.direction
        ) {
            continue;
        }

        /*
         * The new phase must dominate the transition.
         * A small retracement followed by continuation
         * should not qualify.
         */
        if (
            currentRun.length <
            previousRun.length
        ) {
            continue;
        }

        sustainedTransitionFrom =
            previousRun.direction === 1
                ? "UP"
                : "DOWN";

        sustainedTransitionTo =
            currentRun.direction === 1
                ? "UP"
                : "DOWN";

        sustainedTransitionStrength =
            clamp(
                50 +
                Math.min(
                    50,
                    (
                        currentRun.length -
                        previousRun.length
                    ) * 5,
                ),
            );

        break;
    }
}
console.log(
    "[ONLY UPS/DOWNS TRANSITION DEBUG]",
    {
        currentWindowLength:
            currentWindow.length,
        transitionMovesLength:
            transitionMoves.length,
        runs,
        sustainedTransitionFrom,
        sustainedTransitionTo,
        sustainedTransitionStrength,
    },
);

const sustainedDirectionalTransition =
    sustainedTransitionFrom !== "NONE" &&
    sustainedTransitionTo !== "NONE" &&
    sustainedTransitionFrom !==
        sustainedTransitionTo;
const evidencePreviousDirection =
    sustainedDirectionalTransition
        ? sustainedTransitionFrom
        : previousDirection;

const evidenceCurrentDirection =
    sustainedDirectionalTransition
        ? sustainedTransitionTo
        : currentDirection;

const pressureTransfer =
    (
        previousDirection !== "NONE" &&
        currentDirection !== "NONE" &&
        previousDirection !==
            currentDirection
    ) ||
    sustainedDirectionalTransition;

const pressureTransferStrength =
    pressureTransfer
        ? clamp(
            Math.max(
                previousPressure.overallStrength +
                currentPressure.overallStrength,
                sustainedDirectionalTransition
                    ? sustainedTransitionStrength
                    : 0,
            ),
        )
        : 0;

    const currentStructure =
        analyzeOnlyUpsDownsMarketStructure(
            currentWindow,
        );

    const previousStructure =
        previousWindow.length >= 20
            ? analyzeOnlyUpsDownsMarketStructure(
                previousWindow,
            )
            : currentStructure;

    const structureShift =
        (
            currentStructure.bullishShift ||
            currentStructure.bearishShift ||
            currentStructure.bullishBreak ||
            currentStructure.bearishBreak
        ) &&
        (
            previousStructure.structure !==
            currentStructure.structure ||
            previousDirection !== currentDirection
        );

    const currentStrength =
        clamp(currentPressure.overallStrength);

    const previousStrength =
        clamp(previousPressure.overallStrength);

    const trendPersistence =
        clamp(
            Math.abs(
                currentStrength -
                previousStrength,
            ) +
            (
                currentDirection ===
                previousDirection &&
                currentDirection !== "NONE"
                    ? 50
                    : 0
            ),
        );

    const reversalPressure =
        clamp(
            (
                pressureTransfer
                    ? pressureTransferStrength
                    : 0
            ) * 0.60 +
            (
                structureShift
                    ? currentStructure.structureScore
                    : 0
            ) * 0.40,
        );

    const agreementScore =
        clamp(
            (
                currentDirection !== "NONE"
                    ? 50
                    : 0
            ) +
            (
                pressureTransfer
                    ? 25
                    : 0
            ) +
            (
                structureShift
                    ? 25
                    : 0
            ),
        );

    return {
    horizon,
    primaryWindow,
    availableWindows: windows,
    previousDirection:
        evidencePreviousDirection,
    currentDirection:
        evidenceCurrentDirection,
    pressureTransfer,
    pressureTransferStrength,
    structureShift,
    trendPersistence,
    reversalPressure,
    agreementScore,
};
}

function selectAutoHorizon(
    prices: number[],
): OnlyUpsDownsAnalysisHorizon {
    const candidates: OnlyUpsDownsAnalysisHorizon[] = [
        "SHORT_TERM",
        "MEDIUM_TERM",
        "LONG_TERM",
    ];

    let best:
        | OnlyUpsDownsAnalysisHorizon
        | null = null;

    let bestScore = -1;

    for (const candidate of candidates) {
        /*
         * AUTO must only consider a horizon when its
         * actual configured window exists in the
         * available history.
         *
         * calculateHorizonEvidence() intentionally has
         * a 40-tick fallback for direct/manual analysis.
         * That fallback must NOT make an unavailable
         * MEDIUM_TERM or LONG_TERM horizon appear valid
         * to AUTO.
         */
        const availableWindows =
            getAvailableHorizonWindows(
                prices,
                candidate,
            );

        if (availableWindows.length === 0) {
            continue;
        }

        const evidence =
            calculateHorizonEvidence(
                prices,
                candidate,
            );

        const score =
            evidence.reversalPressure * 0.45 +
            evidence.agreementScore * 0.35 +
            evidence.trendPersistence * 0.20;

        if (score > bestScore) {
            bestScore = score;
            best = candidate;
        }
    }

    return best ?? "SHORT_TERM";
}

function calculateMultiTimeframeEvidence(
    prices: number[],
): HorizonEvidence[] {
    const horizons: OnlyUpsDownsAnalysisHorizon[] = [
        "SHORT_TERM",
        "MEDIUM_TERM",
        "LONG_TERM",
    ];

    return horizons
        .filter(
            (horizon) =>
                getAvailableHorizonWindows(
                    prices,
                    horizon,
                ).length > 0,
        )
        .map(
            (horizon) =>
                calculateHorizonEvidence(
                    prices,
                    horizon,
                ),
        );
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
        fuseMarketRegime(
            structureResult.regime,
            pressureResult,
        );

    /*
     * Resolve the requested analysis horizon before the
     * historical regime is calculated. The selected horizon
     * now controls both horizon evidence and historical
     * reversal context.
     */
    const requestedHorizon =
        input.horizon ?? "AUTO";

    const selectedHorizon =
        requestedHorizon === "AUTO"
            ? selectAutoHorizon(prices)
            : requestedHorizon;

    const historicalRegime =
        deriveHistoricalRegime(
            prices,
            selectedHorizon,
        );

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
            upMoves: pressureResult.short.upMoves,
            downMoves: pressureResult.short.downMoves,
            flatMoves: pressureResult.short.flatMoves,
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
            upMoves: pressureResult.medium.upMoves,
            downMoves: pressureResult.medium.downMoves,
            flatMoves: pressureResult.medium.flatMoves,
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
            upMoves: pressureResult.long.upMoves,
            downMoves: pressureResult.long.downMoves,
            flatMoves: pressureResult.long.flatMoves,
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

    /*
     * Horizon-aware transition engine.
     *
     * Unlike the old implementation, this does NOT compare
     * the first 12 prices against the current market.
     *
     * The engine compares the current market against the
     * immediately preceding window at the selected horizon.
     *
     * SHORT_TERM:
     *   40 / 80 / 120 ticks
     *
     * MEDIUM_TERM:
     *   120 / 240 / 500 ticks
     *
     * LONG_TERM:
     *   500 / 1000 / 2000 ticks
     *
     * MULTI_TIMEFRAME:
     *   evaluates all available horizons together.
     *
     * AUTO:
     *   selects the strongest usable horizon.
     */

    const horizonEvidence =
        calculateHorizonEvidence(
            prices,
            selectedHorizon,
        );

    const multiTimeframeEvidence =
        requestedHorizon === "MULTI_TIMEFRAME"
            ? calculateMultiTimeframeEvidence(
                prices,
            )
            : [];

    const activeEvidence =
        requestedHorizon === "MULTI_TIMEFRAME"
            ? multiTimeframeEvidence
            : [horizonEvidence];

    const strongestEvidence =
        activeEvidence.reduce(
            (best, current) =>
                current.reversalPressure >
                best.reversalPressure
                    ? current
                    : best,
            horizonEvidence,
        );

    const pressureTransferred =
        activeEvidence.some(
            (evidence) =>
                evidence.pressureTransfer,
        );

    const selectedTransferStrength =
        clamp(
            activeEvidence.length
                ? activeEvidence.reduce(
                    (sum, evidence) =>
                        sum +
                        evidence.pressureTransferStrength,
                    0,
                ) /
                    activeEvidence.length
                : strongestEvidence.pressureTransferStrength,
        );

    const selectedStructureShift =
        activeEvidence.some(
            (evidence) =>
                evidence.structureShift,
        );

    const horizonAgreement =
        requestedHorizon === "MULTI_TIMEFRAME"
            ? clamp(
                activeEvidence.reduce(
                    (sum, evidence) =>
                        sum +
                        evidence.agreementScore,
                    0,
                ) /
                    Math.max(
                        1,
                        activeEvidence.length,
                    ),
            )
            : strongestEvidence.agreementScore;

    const horizonReversalConfirmation =
        clamp(
            strongestEvidence.reversalPressure * 0.60 +
            horizonAgreement * 0.25 +
            (
                selectedStructureShift
                    ? 15
                    : 0
            ),
        );

    let transitionMomentum =
        momentumTransfer;

    let transitionReversalBase =
        legacyReversalBase;

    if (pressureTransferred) {
        const fromDirection =
            strongestEvidence.previousDirection;

        const toDirection =
            strongestEvidence.currentDirection;

        const previousPressure =
            fromDirection === "UP"
                ? clamp(
                    selectedTransferStrength,
                )
                : fromDirection === "DOWN"
                    ? -clamp(
                        selectedTransferStrength,
                    )
                    : 0;

        const currentPressure =
            toDirection === "UP"
                ? clamp(
                    pressure.score,
                )
                : toDirection === "DOWN"
                    ? -clamp(
                        pressure.score,
                    )
                    : 0;

        transitionMomentum = {
            detected: true,

            from:
                fromDirection,

            to:
                toDirection,

            previousPressure,

            currentPressure,

            transferStrength:
                clamp(
                    Math.abs(previousPressure) +
                    Math.abs(currentPressure),
                ),

            acceleration:
                clamp(
                    Math.abs(currentPressure) -
                    Math.abs(previousPressure),
                    -100,
                    100,
                ),

            score:
                clamp(
                    selectedTransferStrength +
                    (
                        selectedStructureShift
                            ? 25
                            : 0
                    ),
                ),
        };

        transitionReversalBase = {
            ...legacyReversalBase,

            oppositePressure:
                clamp(
                    Math.max(
                        pressure.score,
                        selectedTransferStrength,
                    ),
                ),

            reversalScore:
                clamp(
                    legacyReversalBase.reversalScore +
                    horizonReversalConfirmation * 0.35 +
                    strongestEvidence.trendPersistence * 0.10,
                ),
        };
    } else if (
        strongestEvidence.reversalPressure >= 45 &&
        (
            selectedStructureShift ||
            strongestEvidence.agreementScore >= 75
        )
    ) {
        transitionReversalBase = {
            ...legacyReversalBase,

            reversalScore:
                clamp(
                    legacyReversalBase.reversalScore +
                    horizonReversalConfirmation * 0.20,
                ),
        };
    }
        const transitionHistoricalRegime =
        pressureTransferred &&
        strongestEvidence.previousDirection === "UP"
            ? "STRONG_UP"
            : pressureTransferred &&
                strongestEvidence.previousDirection === "DOWN"
                ? "STRONG_DOWN"
                : historicalRegime;

    const reversal =
        buildReversalFromEvidence(
            transitionHistoricalRegime,
            structure,
            pressure,
            transitionReversalBase,
            transitionMomentum,
            rsi,
            bollinger,
            volatility,
            stability,
        );
console.log(
    "[ONLY UPS/DOWNS REVERSAL INPUT DEBUG]",
    JSON.stringify(
        {
            requestedHorizon,
            selectedHorizon,

            historicalRegime,
            transitionHistoricalRegime,

            pressureTransferred,
            selectedTransferStrength,

            transitionReversalBase: {
                direction:
                    transitionReversalBase.direction,
                previousRegime:
                    transitionReversalBase.previousRegime,
                oppositePressure:
                    transitionReversalBase.oppositePressure,
                reversalScore:
                    transitionReversalBase.reversalScore,
            },

            transitionMomentum: {
                detected:
                    transitionMomentum.detected,
                from:
                    transitionMomentum.from,
                to:
                    transitionMomentum.to,
                previousPressure:
                    transitionMomentum.previousPressure,
                currentPressure:
                    transitionMomentum.currentPressure,
                transferStrength:
                    transitionMomentum.transferStrength,
                score:
                    transitionMomentum.score,
            },

            structure: {
                shift:
                    structure.shift,
                higherLow:
                    structure.higherLow,
                lowerHigh:
                    structure.lowerHigh,
                breakOfStructure:
                    structure.breakOfStructure,
                failedBreak:
                    structure.failedBreak,
                score:
                    structure.score,
            },

            pressure: {
                currentDirection:
                    pressure.currentDirection,
                pressureShift:
                    pressure.pressureShift,
                oppositePressure:
                    pressure.oppositePressure,
                score:
                    pressure.score,
            },

            reversal: {
                direction:
                    reversal.direction,
                reversalScore:
                    reversal.reversalScore,
                candidate:
                    reversal.candidate,
                invalidated:
                    reversal.invalidated,
            },
        },
        null,
        2,
    ),
);

    const continuation =
        calculateContinuation(
            regime,
            structure,
            pressure,
            exhaustion,
            adx,
        );

    const horizonConfirmationScore =
        clamp(
            horizonReversalConfirmation +
            strongestEvidence.trendPersistence * 0.10,
        );

    const horizonReversalConfirmed =
        strongestEvidence.reversalPressure >= 55 &&
        strongestEvidence.agreementScore >= 60 &&
        (
            pressureTransferred ||
            selectedStructureShift
        );

    const multiTimeframeAgreement =
        requestedHorizon === "MULTI_TIMEFRAME" &&
        activeEvidence.length >= 2 &&
        activeEvidence.filter(
            (evidence) =>
                evidence.currentDirection !== "NONE",
        ).length >= 2 &&
        activeEvidence.filter(
            (evidence) =>
                evidence.reversalPressure >= 55,
        ).length >= 2 &&
        horizonAgreement >= 70;

    const horizonQualification = {
        requestedHorizon,
        selectedHorizon,
        reversalConfirmed:
            horizonReversalConfirmed,
        confirmationScore:
            horizonConfirmationScore,
        structureShift:
            selectedStructureShift,
        pressureTransfer:
            pressureTransferred,
        multiTimeframeAgreement,
        currentDirection:
            horizonEvidence.currentDirection,
    };

    console.log(
        "[ONLY UPS/DOWNS HORIZON DEBUG]",
        JSON.stringify(
            {
                selectedHorizon,
                requestedHorizon,

                strongestEvidence: {
                    horizon:
                        strongestEvidence.horizon,
                    currentDirection:
                        strongestEvidence.currentDirection,
                    reversalPressure:
                        strongestEvidence.reversalPressure,
                    agreementScore:
                        strongestEvidence.agreementScore,
                    structureShift:
                        strongestEvidence.structureShift,
                    pressureTransfer:
                        strongestEvidence.pressureTransfer,
                    trendPersistence:
                        strongestEvidence.trendPersistence,
                },

                horizonEvidence: {
                    horizon:
                        horizonEvidence.horizon,
                    currentDirection:
                        horizonEvidence.currentDirection,
                    reversalPressure:
                        horizonEvidence.reversalPressure,
                    agreementScore:
                        horizonEvidence.agreementScore,
                    structureShift:
                        horizonEvidence.structureShift,
                    pressureTransfer:
                        horizonEvidence.pressureTransfer,
                    trendPersistence:
                        horizonEvidence.trendPersistence,
                },

                horizonAgreement,
                pressureTransferred,
                selectedStructureShift,
                horizonReversalConfirmation,
                horizonReversalConfirmed,
                horizonConfirmationScore,

                reversalScore:
                    reversal.reversalScore,

                reversalCandidate:
                    reversal.candidate,

                reversalInvalidated:
                    reversal.invalidated,

                continuationScore:
                    continuation.continuationScore,

                continuationCandidate:
                    continuation.candidate,
            },
            null,
            2,
        ),
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
        horizonQualification,
    );

const horizonAwareReversalReady =
    !reversal.invalidated &&
    horizonQualification.reversalConfirmed &&
    (
        (
            horizonQualification.pressureTransfer &&
            horizonQualification.confirmationScore >= 55
        ) ||
        (
            horizonQualification.structureShift &&
            horizonQualification.confirmationScore >= 70
        )
    ) &&
    horizonQualification.currentDirection !== "NONE";

const returnedReversal: ReversalAnalysis = {
    ...reversal,
    candidate:
        reversal.candidate ||
        horizonAwareReversalReady,
};

return {
    signal,
    regime,
    structure,
    pressure,
    exhaustion,
    momentumTransfer,
    reversal: returnedReversal,
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