import { AdaptiveLearning } from '../adaptive-learning';
import { OutcomeRecorder } from '../outcome-recorder';
import { MatchesSignal } from '../types';

function createSignal(
    entryDigit: number,
    barrierDigit: number,
    fibLevel: number,
    regime: MatchesSignal['regime']
): MatchesSignal {
    return {
        timestamp: Date.now(),
        symbol: 'R_100',
        price: 100.123,
        entryDigit,
        barrierDigit,
        barrierScore: 80,
        barrierConfidence: 70,
        entryScore: 80,
        relationshipScore: 80,
        fibLevel,
        fibPrice: 100.123,
        fibDistance: 0.001,
        trend: 'UP',
        regime,
        regimeConfidence: 80,
        confluenceScore: 80,
        qualityScore: 80,
        confidence: 80,
        ready: true,
        result: 'PENDING',
    };
}

function recordOutcomes(
    recorder: OutcomeRecorder,
    learning: AdaptiveLearning,
    signal: MatchesSignal,
    wins: number,
    losses: number
): void {
    for (let i = 0; i < wins; i++) {
        const outcome =
            recorder.record(
                signal,
                'WIN'
            );

        learning.addOutcome(
            outcome
        );
    }

    for (let i = 0; i < losses; i++) {
        const outcome =
            recorder.record(
                signal,
                'LOSS'
            );

        learning.addOutcome(
            outcome
        );
    }
}

describe('Matches adaptive learning combinations', () => {
    test('keeps combinations separate and ranks them correctly', () => {
        const recorder =
            new OutcomeRecorder();

        const learning =
            new AdaptiveLearning();

        const combinationA =
            createSignal(
                7,
                2,
                0.618,
                'TRENDING'
            );

        recordOutcomes(
            recorder,
            learning,
            combinationA,
            8,
            2
        );

        const combinationB =
            createSignal(
                7,
                2,
                0.500,
                'TRENDING'
            );

        recordOutcomes(
            recorder,
            learning,
            combinationB,
            5,
            5
        );

        const combinationC =
            createSignal(
                7,
                2,
                0.618,
                'RANGING'
            );

        recordOutcomes(
            recorder,
            learning,
            combinationC,
            3,
            7
        );

        const combinationD =
            createSignal(
                5,
                8,
                0.618,
                'TRENDING'
            );

        recordOutcomes(
            recorder,
            learning,
            combinationD,
            6,
            4
        );

        expect(
            learning.getTotalOutcomes()
        ).toBe(40);

        const stats =
            learning.analyze();

        expect(stats)
            .toHaveLength(4);

        const findCombination = (
            entryDigit: number,
            barrierDigit: number,
            fibLevel: number,
            regime: MatchesSignal['regime']
        ) =>
            stats.find(
                stat =>
                    stat.key.symbol === 'R_100' &&
                    stat.key.entryDigit === entryDigit &&
                    stat.key.barrierDigit === barrierDigit &&
                    stat.key.fibLevel === fibLevel &&
                    stat.key.regime === regime
            );

        const statA =
            findCombination(
                7,
                2,
                0.618,
                'TRENDING'
            );

        const statB =
            findCombination(
                7,
                2,
                0.500,
                'TRENDING'
            );

        const statC =
            findCombination(
                7,
                2,
                0.618,
                'RANGING'
            );

        const statD =
            findCombination(
                5,
                8,
                0.618,
                'TRENDING'
            );

        expect(statA).toBeDefined();
        expect(statB).toBeDefined();
        expect(statC).toBeDefined();
        expect(statD).toBeDefined();

        expect(statA!.trades).toBe(10);
        expect(statA!.wins).toBe(8);
        expect(statA!.losses).toBe(2);
        expect(statA!.winRate).toBe(80);
        expect(statA!.expectancy)
            .toBeCloseTo(0.6, 10);

        expect(statB!.trades).toBe(10);
        expect(statB!.wins).toBe(5);
        expect(statB!.losses).toBe(5);
        expect(statB!.winRate).toBe(50);
        expect(statB!.expectancy)
            .toBeCloseTo(0, 10);

        expect(statC!.trades).toBe(10);
        expect(statC!.wins).toBe(3);
        expect(statC!.losses).toBe(7);
        expect(statC!.winRate).toBe(30);
        expect(statC!.expectancy)
            .toBeCloseTo(-0.4, 10);

        expect(statD!.trades).toBe(10);
        expect(statD!.wins).toBe(6);
        expect(statD!.losses).toBe(4);
        expect(statD!.winRate).toBe(60);
        expect(statD!.expectancy)
            .toBeCloseTo(0.2, 10);

        const ranked =
            learning.analyze();

        expect(
            ranked[0].expectancy
        ).toBe(statA!.expectancy);

        expect(
            ranked[1].expectancy
        ).toBe(statD!.expectancy);

        expect(
            ranked[2].expectancy
        ).toBe(statB!.expectancy);

        expect(
            ranked[3].expectancy
        ).toBe(statC!.expectancy);
    });

    test(
        'best and reliable combination filters use their trade requirements',
        () => {
            const recorder =
                new OutcomeRecorder();

            const learning =
                new AdaptiveLearning();

            const signals = [
                {
                    signal: createSignal(
                        7,
                        2,
                        0.618,
                        'TRENDING'
                    ),
                    wins: 8,
                    losses: 2,
                },
                {
                    signal: createSignal(
                        7,
                        2,
                        0.500,
                        'TRENDING'
                    ),
                    wins: 5,
                    losses: 5,
                },
                {
                    signal: createSignal(
                        7,
                        2,
                        0.618,
                        'RANGING'
                    ),
                    wins: 3,
                    losses: 7,
                },
                {
                    signal: createSignal(
                        5,
                        8,
                        0.618,
                        'TRENDING'
                    ),
                    wins: 6,
                    losses: 4,
                },
            ];

            for (const item of signals) {
                recordOutcomes(
                    recorder,
                    learning,
                    item.signal,
                    item.wins,
                    item.losses
                );
            }

            expect(
                learning.getBestCombinations(10)
            ).toHaveLength(4);

            expect(
                learning.getReliableCombinations()
            ).toHaveLength(0);
        }
    );
});