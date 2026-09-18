import {
    evaluateOnlyUpsDownsStrategy,
} from "../engine/only-ups-downs-strategy";

interface Scenario {
    name: string;
    prices: number[];
    expectedDirection:
        | "Only Ups"
        | "Only Downs"
        | "None";
    expectedMode:
        | "REVERSAL"
        | "CONTINUATION"
        | "NONE";
}

const makeTrend = (
    start: number,
    moves: number[],
): number[] => {
    const prices = [start];

    for (const move of moves) {
        const previous = prices[prices.length - 1];
        prices.push(previous + move);
    }

    return prices;
};

const scenarios: Scenario[] = [
    {
        name: "Strong bullish continuation",
        prices: makeTrend(100, [
            0.20, 0.22, 0.18, 0.25, 0.21,
            0.24, 0.20, 0.23, 0.19, 0.25,
            0.22, 0.24, 0.21, 0.23, 0.25,
            0.20, 0.24, 0.22, 0.25, 0.21,
            0.24, 0.22, 0.26, 0.23, 0.25,
            0.22, 0.24, 0.23, 0.25, 0.24,
            0.22, 0.26, 0.24, 0.25, 0.23,
            0.24, 0.25, 0.22, 0.24,
        ]),
        expectedDirection: "Only Ups",
        expectedMode: "CONTINUATION",
    },

    {
        name: "Strong bearish continuation",
        prices: makeTrend(200, [
            -0.20, -0.22, -0.18, -0.25, -0.21,
            -0.24, -0.20, -0.23, -0.19, -0.25,
            -0.22, -0.24, -0.21, -0.23, -0.25,
            -0.20, -0.24, -0.22, -0.25, -0.21,
            -0.24, -0.22, -0.26, -0.23, -0.25,
            -0.22, -0.24, -0.23, -0.25, -0.24,
            -0.22, -0.26, -0.24, -0.25, -0.23,
            -0.24, -0.25, -0.22, -0.24,
        ]),
        expectedDirection: "Only Downs",
        expectedMode: "CONTINUATION",
    },

    {
        name: "Neutral / noisy market",
        prices: [
            100.00, 100.01, 99.99, 100.02, 100.00,
            100.01, 99.98, 100.00, 100.02, 99.99,
            100.01, 100.00, 99.98, 100.01, 100.00,
            99.99, 100.02, 100.00, 100.01, 99.99,
            100.00, 100.02, 99.98, 100.00, 100.01,
            99.99, 100.00, 100.02, 99.98, 100.00,
            100.01, 99.99, 100.00, 100.02, 99.98,
            100.00, 100.01, 99.99, 100.00, 100.01,
        ],
        expectedDirection: "None",
        expectedMode: "NONE",
    },

    {
        name: "Bullish reversal candidate",
        prices: makeTrend(120, [
            -0.30, -0.32, -0.28, -0.35, -0.30,
            -0.27, -0.24, -0.20, -0.16, -0.12,
            -0.08, -0.04,
            0.03, 0.06, 0.09, 0.12, 0.15,
            0.12, 0.14, 0.16, 0.18,
            0.10, 0.08, 0.12, 0.16,
            0.19, 0.17, 0.20, 0.18,
            0.21, 0.19, 0.22, 0.20,
            0.18, 0.21, 0.23, 0.20, 0.22,
            0.20, 0.24,
        ]),
        expectedDirection: "Only Ups",
        expectedMode: "REVERSAL",
    },

    {
        name: "Weak bullish drift",
        prices: [
            100.00, 100.03, 100.02, 100.05, 100.04,
            100.07, 100.06, 100.08, 100.07, 100.10,
            100.09, 100.11, 100.10, 100.12, 100.11,
            100.13, 100.12, 100.14, 100.13, 100.15,
            100.14, 100.16, 100.15, 100.17, 100.16,
        ],
        expectedDirection: "None",
        expectedMode: "NONE",
    },

    {
        name: "Sharp bullish spike",
        prices: [
            100.00, 100.02, 99.99, 100.01, 100.00,
            100.03, 100.01, 100.02, 100.00, 100.04,
            100.02, 100.03,
            100.80,
            101.60,
            102.40,
            103.20,
            103.22,
            103.21,
            103.23,
            103.22,
        ],
        expectedDirection: "None",
        expectedMode: "NONE",
    },

    {
        name: "Bullish trend with failed reversal",
        prices: [
            100.00, 100.25, 100.48, 100.70, 100.95,
            101.18, 101.42, 101.65, 101.88, 102.10,
            102.32, 102.55,
            102.25, 102.00, 102.18, 102.08,
            102.20, 102.12,
            102.40, 102.62, 102.85, 103.08,
            103.30, 103.52,
        ],
        expectedDirection: "None",
        expectedMode: "NONE",
    },

    {
        name: "Bearish trend with failed reversal",
        prices: [
            200.00, 199.75, 199.52, 199.30, 199.05,
            198.82, 198.58, 198.35, 198.12, 197.90,
            197.68, 197.45,
            197.75, 198.00, 197.82, 197.92,
            197.80, 197.88,
            197.60, 197.38, 197.15, 196.92,
            196.70, 196.48,
        ],
        expectedDirection: "None",
        expectedMode: "NONE",
    },
    {
        name: "Bearish reversal candidate",
        prices: makeTrend(180, [
            0.30, 0.32, 0.28, 0.35, 0.30,
            0.27, 0.24, 0.20, 0.16, 0.12,
            0.08, 0.04,
            -0.03, -0.06, -0.09, -0.12, -0.15,
            -0.12, -0.14, -0.16, -0.18,
            -0.10, -0.08, -0.12, -0.16,
            -0.19, -0.17, -0.20, -0.18,
            -0.21, -0.19, -0.22, -0.20,
            -0.18, -0.21, -0.23, -0.20, -0.22,
            -0.20, -0.24,
        ]),
        expectedDirection: "Only Downs",
        expectedMode: "REVERSAL",
    },
];

describe("Only Ups / Only Downs strategy", () => {
    for (const scenario of scenarios) {
        test(scenario.name, () => {
            const result = evaluateOnlyUpsDownsStrategy({
                prices: scenario.prices,
                timestamp: Date.now(),
            });

            const signal = result.signal;

            const actualDirection =
                signal?.direction ?? "None";

            const actualMode =
                signal?.mode ?? "NONE";

            expect(actualDirection).toBe(
                scenario.expectedDirection,
            );

            expect(actualMode).toBe(
                scenario.expectedMode,
            );

            if (
                scenario.expectedMode === "REVERSAL"
            ) {
                expect(result.reversal).toBeDefined();

                expect(
                    result.reversal.candidate,
                ).toBe(true);

                expect(
                    result.reversal.invalidated,
                ).toBe(false);

                expect(
                    result.reversal.reversalScore,
                ).toBeGreaterThanOrEqual(75);

                expect(
                    result.reversal.momentumTransfer.detected,
                ).toBe(true);

                expect(
                    result.reversal.momentumTransfer.score,
                ).toBeGreaterThanOrEqual(50);
            }

            if (
                scenario.expectedMode === "CONTINUATION"
            ) {
                expect(
                    result.continuation.candidate,
                ).toBe(true);

                expect(
                    result.continuation.continuationScore,
                ).toBeGreaterThanOrEqual(68);
            }

            if (
                scenario.expectedDirection === "None"
            ) {
                expect(signal).toBeDefined();

                expect(
                    signal?.confidence ?? 0,
                ).toBe(0);
            }
        });
    }
});


describe("Only Ups / Only Downs analysis horizons", () => {
    const buildLongReversal = (
        oldMove: number,
        newMove: number,
        oldTicks: number,
        transitionTicks: number,
        currentTicks: number,
    ): number[] => {
        const moves: number[] = [];

        for (let index = 0; index < oldTicks; index += 1) {
            moves.push(oldMove);
        }

        /*
         * Controlled transition:
         * gradually reduce the old pressure before
         * establishing the new directional regime.
         */
        for (let index = 0; index < transitionTicks; index += 1) {
            const progress =
                (index + 1) / transitionTicks;

            moves.push(
                oldMove * (1 - progress) +
                newMove * progress,
            );
        }

        for (let index = 0; index < currentTicks; index += 1) {
            moves.push(newMove);
        }

        return makeTrend(100, moves);
    };

    test("LONG_TERM uses the long historical window", () => {
        const prices = buildLongReversal(
            -0.20,
            0.20,
            900,
            100,
            1000,
        );

        const result =
            evaluateOnlyUpsDownsStrategy({
                prices,
                timestamp: Date.now(),
                horizon: "LONG_TERM",
            });

        expect(result.signal).toBeDefined();

        expect(
            result.signal?.requestedHorizon,
        ).toBe("LONG_TERM");

        expect(
            result.signal?.selectedHorizon,
        ).toBe("LONG_TERM");

        expect(
            result.signal?.direction,
        ).toBe("Only Ups");
    });

    test("SHORT_TERM remains available independently", () => {
        const prices = buildLongReversal(
            -0.20,
            0.20,
            120,
            20,
            120,
        );

        const result =
            evaluateOnlyUpsDownsStrategy({
                prices,
                timestamp: Date.now(),
                horizon: "SHORT_TERM",
            });

        expect(result.signal).toBeDefined();

        expect(
            result.signal?.requestedHorizon,
        ).toBe("SHORT_TERM");

        expect(
            result.signal?.selectedHorizon,
        ).toBe("SHORT_TERM");
    });

    test("MULTI_TIMEFRAME evaluates across multiple horizons", () => {
        const prices = buildLongReversal(
            -0.20,
            0.20,
            900,
            100,
            1000,
        );

        const result =
            evaluateOnlyUpsDownsStrategy({
                prices,
                timestamp: Date.now(),
                horizon: "MULTI_TIMEFRAME",
            });

        expect(result.signal).toBeDefined();

        expect(
            result.signal?.requestedHorizon,
        ).toBe("MULTI_TIMEFRAME");
    });

    test("AUTO selects a usable horizon from long history", () => {
        const prices = buildLongReversal(
            -0.20,
            0.20,
            900,
            100,
            1000,
        );

        const result =
            evaluateOnlyUpsDownsStrategy({
                prices,
                timestamp: Date.now(),
                horizon: "AUTO",
            });

        expect(result.signal).toBeDefined();

        expect(
            result.signal?.requestedHorizon,
        ).toBe("AUTO");

        expect(
            [
                "SHORT_TERM",
                "MEDIUM_TERM",
                "LONG_TERM",
            ],
        ).toContain(
            result.signal?.selectedHorizon,
        );
    });

    test("LONG_TERM receives enough history for a 2000-tick analysis", () => {
        const prices = buildLongReversal(
            -0.20,
            0.20,
            900,
            100,
            1000,
        );

        expect(prices.length).toBe(2001);

        const result =
            evaluateOnlyUpsDownsStrategy({
                prices,
                timestamp: Date.now(),
                horizon: "LONG_TERM",
            });

        expect(result.signal).toBeDefined();

        expect(
            result.signal?.requestedHorizon,
        ).toBe("LONG_TERM");

        expect(
            result.signal?.selectedHorizon,
        ).toBe("LONG_TERM");
    });
});
