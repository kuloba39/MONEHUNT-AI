import { AdaptiveLearning } from '../adaptive-learning';
import { OutcomeRecorder } from '../outcome-recorder';
import { MatchesSignal } from '../types';

function createSignal(
    entryDigit: number,
    barrierDigit: number
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
        fibLevel: 0.618,
        fibPrice: 100.123,
        fibDistance: 0.001,
        trend: 'UP',
        regime: 'TRENDING',
        regimeConfidence: 80,
        confluenceScore: 80,
        qualityScore: 80,
        confidence: 80,
        ready: true,
        result: 'PENDING',
    };
}

describe('Matches adaptive learning', () => {
    test('records and analyzes a single combination correctly', () => {
        const recorder =
            new OutcomeRecorder();

        const learning =
            new AdaptiveLearning();

        const signal =
            createSignal(7, 2);

        for (let i = 0; i < 7; i++) {
            const outcome =
                recorder.record(
                    signal,
                    'WIN'
                );

            learning.addOutcome(
                outcome
            );
        }

        for (let i = 0; i < 3; i++) {
            const outcome =
                recorder.record(
                    signal,
                    'LOSS'
                );

            learning.addOutcome(
                outcome
            );
        }

        expect(recorder.getTotal())
            .toBe(10);

        expect(recorder.getWins())
            .toHaveLength(7);

        expect(recorder.getLosses())
            .toHaveLength(3);

        expect(recorder.getWinRate())
            .toBe(70);

        expect(
            learning.getTotalOutcomes()
        ).toBe(10);

        const stats =
            learning.analyze();

        expect(stats)
            .toHaveLength(1);

        const combination =
            stats[0];

        expect(combination.trades)
            .toBe(10);

        expect(combination.wins)
            .toBe(7);

        expect(combination.losses)
            .toBe(3);

        expect(combination.winRate)
            .toBe(70);

        expect(
            combination.expectancy
        ).toBeCloseTo(0.4, 10);
    });

    test(
        'does not classify a 10-trade combination as reliable yet',
        () => {
            const recorder =
                new OutcomeRecorder();

            const learning =
                new AdaptiveLearning();

            const signal =
                createSignal(7, 2);

            for (let i = 0; i < 7; i++) {
                const outcome =
                    recorder.record(
                        signal,
                        'WIN'
                    );

                learning.addOutcome(
                    outcome
                );
            }

            for (let i = 0; i < 3; i++) {
                const outcome =
                    recorder.record(
                        signal,
                        'LOSS'
                    );

                learning.addOutcome(
                    outcome
                );
            }

            expect(
                learning.getReliableCombinations()
            ).toHaveLength(0);
        }
    );
});