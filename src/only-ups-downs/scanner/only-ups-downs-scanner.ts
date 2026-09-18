import {
    evaluateOnlyUpsDownsStrategy,
} from "../engine/only-ups-downs-strategy";

import type {
    OnlyUpsDownsDirection,
    OnlyUpsDownsSignal,
    OnlyUpsDownsEngineResult,
    OnlyUpsDownsAnalysisHorizon,
} from "../types/only-ups-downs-types";

export interface OnlyUpsDownsScannerOptions {
    maxPoints?: number;
    minimumPoints?: number;
    horizon?: OnlyUpsDownsAnalysisHorizon;
}

export interface OnlyUpsDownsScannerSnapshot {
    ready: boolean;
    price: number | null;
    prices: number[];
    pointCount: number;

    direction: OnlyUpsDownsDirection | null;

    structure: OnlyUpsDownsEngineResult["structure"];
    pressure: OnlyUpsDownsEngineResult["pressure"];
    reversal: OnlyUpsDownsEngineResult["reversal"];

    signal: OnlyUpsDownsSignal | null;

    updatedAt: number;
}

const DEFAULT_MAX_POINTS = 2000;
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

export class OnlyUpsDownsScanner {
    private prices: number[] = [];

    private readonly maxPoints: number;

    private readonly minimumPoints: number;

    private readonly horizon: OnlyUpsDownsAnalysisHorizon;



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

        this.horizon = options.horizon ?? "AUTO";
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
        const result = evaluateOnlyUpsDownsStrategy({
            prices,
            horizon: this.horizon,
        });

        const signal = result.signal;

        const direction: OnlyUpsDownsDirection | null =
            signal?.botDirection === "ups"
                ? "ups"
                : signal?.botDirection === "downs"
                    ? "downs"
                    : null;

        return {
            ready,
            price: prices.length
                ? prices[prices.length - 1]
                : null,
            prices,
            pointCount: prices.length,
            direction,
            structure: result.structure,
            pressure: result.pressure,
            reversal: result.reversal,
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



