import {
    analyzeOnlyUpsDownsMarketStructure,
} from "../engine/only-ups-downs-structure";

import {
    calculateOnlyUpsDownsPressure,
} from "../engine/only-ups-downs-pressure";

import {
    analyzeOnlyUpsDownsReversal,
} from "../engine/only-ups-downs-reversal";

import type {
    OnlyUpsDownsDirection,
    OnlyUpsDownsDisplayDirection,
    OnlyUpsDownsMode,
    ReversalRisk,
    EntryQuality,
    OnlyUpsDownsSignal,
} from "../types/only-ups-downs-types";

export interface OnlyUpsDownsScannerOptions {
    maxPoints?: number;
    minimumPoints?: number;
    structureLookback?: number;
    minimumMovePercent?: number;
}

export interface OnlyUpsDownsScannerSnapshot {
    ready: boolean;
    price: number | null;
    prices: number[];
    pointCount: number;

    direction: OnlyUpsDownsDirection | null;

    structure: ReturnType<typeof analyzeOnlyUpsDownsMarketStructure>;
    pressure: ReturnType<typeof calculateOnlyUpsDownsPressure>;
    reversal: ReturnType<typeof analyzeOnlyUpsDownsReversal>;

    signal: OnlyUpsDownsSignal | null;

    updatedAt: number;
}

const DEFAULT_MAX_POINTS = 250;
const DEFAULT_MINIMUM_POINTS = 40;

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function sanitizePrices(
    prices: number[],
    maxPoints: number,
): number[] {
    const clean = prices.filter(
        (price) => Number.isFinite(price) && price > 0,
    );

    if (clean.length <= maxPoints) {
        return clean;
    }

    return clean.slice(clean.length - maxPoints);
}

function getLatestDirection(
    reversal: ReturnType<typeof analyzeOnlyUpsDownsReversal>,
    pressure: ReturnType<typeof calculateOnlyUpsDownsPressure>,
): OnlyUpsDownsDirection | null {
    if (reversal.direction === "bullish") {
        return "ups";
    }

    if (reversal.direction === "bearish") {
        return "downs";
    }

    if (pressure.dominantDirection === "ups") {
        return "ups";
    }

    if (pressure.dominantDirection === "downs") {
        return "downs";
    }

    return null;
}

function getDisplayDirection(
    direction: OnlyUpsDownsDirection | null,
): OnlyUpsDownsDisplayDirection {
    if (direction === "ups") {
        return "Only Ups";
    }

    if (direction === "downs") {
        return "Only Downs";
    }

    return "None";
}

function getMode(
    reversal: ReturnType<typeof analyzeOnlyUpsDownsReversal>,
): OnlyUpsDownsMode {
    if (reversal.direction !== "none") {
        return "REVERSAL";
    }

    if (reversal.status !== "WAIT") {
        return "CONTINUATION";
    }

    return "NONE";
}

function getReversalRisk(
    risk: number,
): ReversalRisk {
    if (risk >= 80) {
        return "EXTREME";
    }

    if (risk >= 60) {
        return "HIGH";
    }

    if (risk >= 35) {
        return "MEDIUM";
    }

    return "LOW";
}

function getEntryQuality(
    score: number,
    status: string,
): EntryQuality {
    if (status === "READY" && score >= 75) {
        return "HIGH";
    }

    if (
        (status === "READY" && score >= 55) ||
        (status === "WATCH" && score >= 70)
    ) {
        return "MEDIUM";
    }

    if (status === "WATCH" && score >= 40) {
        return "LOW";
    }

    return "NONE";
}

function buildSignal(
    reversal: ReturnType<typeof analyzeOnlyUpsDownsReversal>,
    direction: OnlyUpsDownsDirection | null,
    structure: ReturnType<typeof analyzeOnlyUpsDownsMarketStructure>,
): OnlyUpsDownsSignal | null {
    if (!direction) {
        return null;
    }

    const botDirection =
        direction === "ups"
            ? "ups"
            : "downs";

    const displayDirection =
        getDisplayDirection(direction);

    const mode =
        getMode(reversal);

    const structureScore = Math.max(
        0,
        Math.min(
            100,
            (
                (structure.higherHigh ? 25 : 0) +
                (structure.higherLow ? 25 : 0) +
                (structure.lowerHigh ? 25 : 0) +
                (structure.lowerLow ? 25 : 0)
            ),
        ),
    );

    const trendScore =
        typeof reversal.previousRegime === "string"
            ? (
                reversal.previousRegime === "STRONG_UP" ||
                reversal.previousRegime === "STRONG_DOWN"
                    ? 100
                    : reversal.previousRegime === "WEAK_UP" ||
                      reversal.previousRegime === "WEAK_DOWN"
                        ? 65
                        : 0
            )
            : 0;

    const entryScore = Math.max(
        0,
        Math.min(
            100,
            reversal.score * 0.65 +
            structureScore * 0.35,
        ),
    );

    return {
        direction: displayDirection,
        botDirection,
        mode,
        status: reversal.status,
        confidence: Math.max(
            0,
            Math.min(100, reversal.score),
        ),
        trendScore,
        exhaustionScore: reversal.exhaustionScore,
        oppositePressureScore: reversal.oppositePressure,
        structureScore,
        momentumShiftScore: Math.max(0, Math.min(100, reversal.momentumShift)),
        rsiConfirmation: reversal.rsiConfirmation >= 50,
        bollingerConfirmation: reversal.bollingerConfirmation >= 50,
        adxConfirmation: reversal.pressureStrength >= 50,
        volatilitySafe: reversal.stabilityScore >= 50,
        stabilitySafe: reversal.stabilityScore >= 50,
        reversalRisk: getReversalRisk(
            reversal.reversalRisk,
        ),
        entryQuality: getEntryQuality(
            entryScore,
            reversal.status,
        ),
        entryScore,
        reason: reversal.reasons.join(" | "),
        timestamp: Date.now(),
    };
}
export class OnlyUpsDownsScanner {
    private prices: number[] = [];

    private readonly maxPoints: number;

    private readonly minimumPoints: number;

    private readonly structureLookback: number;

    private readonly minimumMovePercent: number;

    constructor(options: OnlyUpsDownsScannerOptions = {}) {
        this.maxPoints = Math.max(
            DEFAULT_MINIMUM_POINTS,
            Math.floor(options.maxPoints ?? DEFAULT_MAX_POINTS),
        );

        this.minimumPoints = clamp(
            Math.floor(
                options.minimumPoints ?? DEFAULT_MINIMUM_POINTS,
            ),
            10,
            this.maxPoints,
        );

        this.structureLookback = Math.max(
            2,
            Math.floor(options.structureLookback ?? 3),
        );

        this.minimumMovePercent = Math.max(
            0,
            options.minimumMovePercent ?? 0.0025,
        );
    }

    reset(): void {
        this.prices = [];
    }

    addPrice(price: number): OnlyUpsDownsScannerSnapshot {
        if (!Number.isFinite(price) || price <= 0) {
            return this.snapshot();
        }

        this.prices.push(price);

        if (this.prices.length > this.maxPoints) {
            this.prices = this.prices.slice(
                this.prices.length - this.maxPoints,
            );
        }

        return this.snapshot();
    }

    addPrices(prices: number[]): OnlyUpsDownsScannerSnapshot {
        for (const price of prices) {
            if (Number.isFinite(price) && price > 0) {
                this.prices.push(price);
            }
        }

        this.prices = sanitizePrices(
            this.prices,
            this.maxPoints,
        );

        return this.snapshot();
    }

    setPrices(prices: number[]): OnlyUpsDownsScannerSnapshot {
        this.prices = sanitizePrices(
            prices,
            this.maxPoints,
        );

        return this.snapshot();
    }

    getPrices(): number[] {
        return [...this.prices];
    }

    getLatestPrice(): number | null {
        if (!this.prices.length) {
            return null;
        }

        return this.prices[this.prices.length - 1];
    }

    isReady(): boolean {
        return this.prices.length >= this.minimumPoints;
    }

    snapshot(): OnlyUpsDownsScannerSnapshot {
        const prices = [...this.prices];
        const ready = prices.length >= this.minimumPoints;

        if (!ready) {
            const emptyStructure =
                analyzeOnlyUpsDownsMarketStructure(
                    prices,
                    {
                        swingLookback: this.structureLookback,
                        minimumMovePercent: this.minimumMovePercent,
                    },
                );

            const emptyPressure =
                calculateOnlyUpsDownsPressure(prices);

            const emptyReversal =
                analyzeOnlyUpsDownsReversal(prices);

            return {
                ready: false,
                price: prices.length
                    ? prices[prices.length - 1]
                    : null,
                prices,
                pointCount: prices.length,
                direction: null,
                structure: emptyStructure,
                pressure: emptyPressure,
                reversal: emptyReversal,
                signal: null,
                updatedAt: Date.now(),
            };
        }

        const structure =
            analyzeOnlyUpsDownsMarketStructure(
                prices,
                {
                    swingLookback: this.structureLookback,
                    minimumMovePercent: this.minimumMovePercent,
                },
            );

        const pressure =
            calculateOnlyUpsDownsPressure(prices);

        const reversal =
            analyzeOnlyUpsDownsReversal(prices);

        const direction =
            getLatestDirection(
                reversal,
                pressure,
            );

        const signal =
            buildSignal(
                reversal,
                direction,
                structure,
            );

        return {
            ready: true,
            price: prices[prices.length - 1],
            prices,
            pointCount: prices.length,
            direction,
            structure,
            pressure,
            reversal,
            signal,
            updatedAt: Date.now(),
        };
    }
}

export function createOnlyUpsDownsScanner(
    options: OnlyUpsDownsScannerOptions = {},
): OnlyUpsDownsScanner {
    return new OnlyUpsDownsScanner(options);
}




