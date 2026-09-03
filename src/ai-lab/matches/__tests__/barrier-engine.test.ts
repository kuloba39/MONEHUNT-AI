import {
    findBarrier,
    BarrierResult
} from '../barrier-engine';

import {
    DigitScore
} from '../digit-engine';


function createScore(
    digit: number,
    score: number,
    frequency: number
): DigitScore {
    return {
        digit,
        frequency,
        recency: 80,
        gap: 2,
        momentum: frequency,
        score
    };
}


describe('Matches barrier engine', () => {

    test('selects the highest scoring digit', () => {

        const scores: DigitScore[] = [
            createScore(7, 80, 8),
            createScore(2, 60, 6),
            createScore(5, 40, 4)
        ];

        const result =
            findBarrier(scores);

        expect(result.barrierDigit)
            .toBe(7);

        expect(result.topScore)
            .toBe(80);

        expect(result.secondScore)
            .toBe(60);

        expect(result.frequency)
            .toBe(8);

    });


    test('calculates confidence from separation and frequency', () => {

        const scores: DigitScore[] = [
            createScore(7, 80, 8),
            createScore(2, 60, 6)
        ];

        const result =
            findBarrier(scores);

        /*
         * Separation:
         *
         * (80 - 60) / 80 * 100
         * = 25
         *
         * Frequency score:
         *
         * 8 * 10 = 80
         *
         * Confidence:
         *
         * 25 * 0.60 + 80 * 0.40
         * = 47
         */

        expect(result.confidence)
            .toBeCloseTo(47, 10);

    });


    test('requires minimum frequency evidence', () => {

        const scores: DigitScore[] = [
            createScore(7, 100, 1),
            createScore(2, 40, 4)
        ];

        const result =
            findBarrier(scores);

        expect(result.barrierDigit)
            .toBe(7);

        expect(result.frequency)
            .toBe(1);

        expect(result.ready)
            .toBe(false);

    });


    test('marks a sufficiently supported barrier as ready', () => {

        const scores: DigitScore[] = [
            createScore(7, 100, 6),
            createScore(2, 40, 4)
        ];

        const result =
            findBarrier(scores);

        expect(result.ready)
            .toBe(true);

        expect(result.confidence)
            .toBeGreaterThanOrEqual(15);

    });


    test('returns an invalid barrier when no scores exist', () => {

        const result =
            findBarrier([]);

        const expected: BarrierResult = {
            barrierDigit: -1,
            topScore: 0,
            secondScore: 0,
            confidence: 0,
            frequency: 0,
            ready: false
        };

        expect(result)
            .toEqual(expected);

    });

});