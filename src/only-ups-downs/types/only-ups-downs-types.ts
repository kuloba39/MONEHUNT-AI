/**
 * ONLY UPS / ONLY DOWNS
 * Independent Strategy Type Definitions
 *
 * IMPORTANT:
 * This module is intentionally isolated from AI Lab,
 * Matches, Over 2, and the execution path.
 */

/* =========================================================
   CORE DIRECTIONS
   ========================================================= */

export type OnlyUpsDownsDirection =
    | 'ups'
    | 'downs'
    | 'none';

export type OnlyUpsDownsDisplayDirection =
    | 'Only Ups'
    | 'Only Downs'
    | 'None';

/* =========================================================
   STRATEGY MODES
   ========================================================= */

export type OnlyUpsDownsMode =
    | 'REVERSAL'
    | 'CONTINUATION'
    | 'NONE';

/* =========================================================
   SIGNAL STATUS
   ========================================================= */

export type OnlyUpsDownsStatus =
    | 'WAIT'
    | 'WATCH'
    | 'READY';

/* =========================================================
   MARKET REGIME
   ========================================================= */

export type OnlyUpsDownsRegime =
    | 'STRONG_UP'
    | 'WEAK_UP'
    | 'NEUTRAL'
    | 'WEAK_DOWN'
    | 'STRONG_DOWN';

/* =========================================================
   MARKET STRUCTURE
   ========================================================= */

export type StructurePointType =
    | 'HH' // Higher High
    | 'HL' // Higher Low
    | 'LH' // Lower High
    | 'LL'; // Lower Low

export type StructureShift =
    | 'BULLISH'
    | 'BEARISH'
    | 'NONE';

export interface StructurePoint {
    type: StructurePointType;
    price: number;
    index: number;
}

export interface StructureAnalysis {
    points: StructurePoint[];

    currentStructure:
        | 'HH_HL'
        | 'LH_LL'
        | 'MIXED'
        | 'TRANSITION'
        | 'UNKNOWN';

    shift: StructureShift;

    higherHigh: boolean;
    higherLow: boolean;
    lowerHigh: boolean;
    lowerLow: boolean;

    recentHigh: number | null;
    recentLow: number | null;

    breakOfStructure: boolean;
    failedBreak: boolean;

    score: number;
}

/* =========================================================
   TICK PRESSURE
   ========================================================= */

export interface PressureWindow {
    size: number;

    upMoves: number;
    downMoves: number;
    flatMoves: number;

    upPressure: number;
    downPressure: number;

    dominant:
        | 'UP'
        | 'DOWN'
        | 'BALANCED';

    strength: number;
}

export interface PressureAnalysis {
    short: PressureWindow;
    medium: PressureWindow;
    long: PressureWindow;

    currentDirection:
        | 'UP'
        | 'DOWN'
        | 'BALANCED';

    oppositePressure: number;

    pressureShift:
        | 'UP_TRANSFER'
        | 'DOWN_TRANSFER'
        | 'NO_CLEAR_SHIFT';

    acceleration:
        | 'UP'
        | 'DOWN'
        | 'NONE';

    score: number;
}

/* =========================================================
   EXHAUSTION
   ========================================================= */

export interface ExhaustionAnalysis {
    detected: boolean;

    direction:
        | 'UP'
        | 'DOWN'
        | 'NONE';

    momentumDecay: number;

    extensionScore: number;

    failureToContinueScore: number;

    oppositePressureScore: number;

    volatilityChangeScore: number;

    totalScore: number;
}

/* =========================================================
   MOMENTUM TRANSFER
   ========================================================= */

export interface MomentumTransfer {
    detected: boolean;

    from:
        | 'UP'
        | 'DOWN'
        | 'NONE';

    to:
        | 'UP'
        | 'DOWN'
        | 'NONE';

    previousPressure: number;
    currentPressure: number;

    transferStrength: number;

    acceleration: number;

    score: number;
}

/* =========================================================
   RSI
   ========================================================= */

export interface RSIAnalysis {
    value: number | null;

    previousValue: number | null;

    slope: number;

    rising: boolean;
    falling: boolean;

    oversoldContext: boolean;
    overboughtContext: boolean;

    bullishConfirmation: boolean;
    bearishConfirmation: boolean;

    score: number;
}

/* =========================================================
   BOLLINGER BANDS
   ========================================================= */

export interface BollingerAnalysis {
    middle: number | null;
    upper: number | null;
    lower: number | null;

    bandwidth: number;

    pricePosition:
        | 'ABOVE_UPPER'
        | 'UPPER_ZONE'
        | 'MIDDLE'
        | 'LOWER_ZONE'
        | 'BELOW_LOWER'
        | 'UNKNOWN';

    bullishLocation: boolean;
    bearishLocation: boolean;

    reenteredBand: boolean;

    score: number;
}

/* =========================================================
   ADX / DIRECTIONAL MOVEMENT
   ========================================================= */

export interface ADXAnalysis {
    value: number | null;

    plusDI: number | null;
    minusDI: number | null;

    trendStrength:
        | 'STRONG'
        | 'MODERATE'
        | 'WEAK'
        | 'UNKNOWN';

    directionalBias:
        | 'UP'
        | 'DOWN'
        | 'NEUTRAL';

    score: number;
}

/* =========================================================
   VOLATILITY / ATR
   ========================================================= */

export interface VolatilityAnalysis {
    atr: number | null;

    averageMove: number;

    currentMove: number;

    relativeVolatility: number;

    abnormalMove: boolean;

    spikeRisk: boolean;

    score: number;
}

/* =========================================================
   TICK STABILITY
   ========================================================= */

export interface StabilityAnalysis {
    score: number;

    averageMove: number;

    standardDeviation: number;

    jumpFrequency: number;

    jumpCount: number;

    orderly: boolean;

    chaotic: boolean;
}

/* =========================================================
   SPIKE REVERSAL ANALYSIS
   ========================================================= */

export interface SpikeReversalAnalysis {
    detected: boolean;

    direction:
        | 'UP'
        | 'DOWN'
        | 'NONE';

    spikeIndex: number;

    ticksSinceSpike: number;

    magnitude: number;

    baselineMove: number;

    relativeMagnitude: number;

    oppositeMoveCount: number;

    oppositeNetMove: number;

    rejectionDetected: boolean;

    persistenceDetected: boolean;

    score: number;
}

/* =========================================================
   REVERSAL ANALYSIS
   ========================================================= */

export interface ReversalAnalysis {
    candidate: boolean;

    direction:
        | 'UP'
        | 'DOWN'
        | 'NONE';

    previousRegime: OnlyUpsDownsRegime;

    exhaustion: ExhaustionAnalysis;

    oppositePressure: number;

    structureShift: StructureShift;

    momentumTransfer: MomentumTransfer;

    spikeReversal?: SpikeReversalAnalysis;

    confirmationCount: number;

    reversalScore: number;

    invalidated: boolean;

    invalidationReason: string | null;
}

/* =========================================================
   CONTINUATION ANALYSIS
   ========================================================= */

export interface ContinuationAnalysis {
    candidate: boolean;

    direction:
        | 'UP'
        | 'DOWN'
        | 'NONE';

    trendScore: number;

    momentumScore: number;

    structureScore: number;

    exhaustionRisk: number;

    continuationScore: number;
}

/* =========================================================
   ENTRY QUALITY
   ========================================================= */

export type EntryQuality =
    | 'HIGH'
    | 'MEDIUM'
    | 'LOW'
    | 'NONE';

export type ReversalRisk =
    | 'LOW'
    | 'MEDIUM'
    | 'HIGH'
    | 'EXTREME';

export interface EntryAnalysis {
    quality: EntryQuality;

    score: number;

    confirmationComplete: boolean;

    pullbackConfirmed: boolean;

    snapbackRisk: number;

    chaseRisk: number;

    timing:
        | 'EARLY'
        | 'CONFIRMED'
        | 'LATE'
        | 'INVALID';
}

/* =========================================================
   FINAL SIGNAL
   ========================================================= */

export interface OnlyUpsDownsSignal {
    direction: OnlyUpsDownsDisplayDirection;

    botDirection: 'ups' | 'downs' | null;

    mode: OnlyUpsDownsMode;

    status: OnlyUpsDownsStatus;

    confidence: number;

    trendScore: number;

    exhaustionScore: number;

    oppositePressureScore: number;

    structureScore: number;

    momentumShiftScore: number;

    rsiConfirmation: boolean;

    bollingerConfirmation: boolean;

    adxConfirmation: boolean;

    volatilitySafe: boolean;

    stabilitySafe: boolean;

    reversalRisk: ReversalRisk;

    entryQuality: EntryQuality;

    entryScore: number;

    reason: string;

    timestamp: number;
}

/* =========================================================
   ENGINE INPUT
   ========================================================= */

export interface OnlyUpsDownsInput {
    symbol: string;

    prices: number[];

    timestamp?: number;
}

/* =========================================================
   ENGINE RESULT
   ========================================================= */

export interface OnlyUpsDownsEngineResult {
    signal: OnlyUpsDownsSignal | null;

    regime: OnlyUpsDownsRegime;

    structure: StructureAnalysis;

    pressure: PressureAnalysis;

    exhaustion: ExhaustionAnalysis;

    momentumTransfer: MomentumTransfer;

    reversal: ReversalAnalysis;

    continuation: ContinuationAnalysis;

    rsi: RSIAnalysis;

    bollinger: BollingerAnalysis;

    adx: ADXAnalysis;

    volatility: VolatilityAnalysis;

    stability: StabilityAnalysis;
}

