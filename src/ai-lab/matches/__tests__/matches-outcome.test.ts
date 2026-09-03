import { MatchesBacktester } from '../matches-backtester';

interface TestCase {
    name: string;
    expected: 'WIN' | 'LOSS';
    barrierPosition?: 0 | 1 | 2;
}

function priceForDigit(digit: number): number {
    return 1000 + digit / 10;
}

function processTick(
    backtester: MatchesBacktester,
    digit: number,
    index: number
) {
    return backtester.processTick({
        timestamp: index + 1,
        symbol: 'TEST',
        price: priceForDigit(digit),
        index,
    });
}

function createBacktester(): {
    backtester: MatchesBacktester;
    nextIndex: number;
} {
    const backtester = new MatchesBacktester();

    const historyDigits = [
        4, 7, 2,
        4, 7, 2,
        4, 7, 2,
        4, 7, 2,
        4, 7, 2,
        4, 7, 2,
    ];

    let index = 0;

    for (const digit of historyDigits) {
        processTick(backtester, digit, index);
        index++;
    }

    return {
        backtester,
        nextIndex: index,
    };
}

function createSinglePendingSignal(): {
    backtester: MatchesBacktester;
    entryDigit: number;
    barrierDigit: number;
    nextIndex: number;
} {
    for (
        let candidateDigit = 0;
        candidateDigit <= 9;
        candidateDigit++
    ) {
        const attempt = createBacktester();

        const result = processTick(
            attempt.backtester,
            candidateDigit,
            attempt.nextIndex
        );

        if (result.pendingSignal) {
            return {
                backtester: attempt.backtester,
                entryDigit:
                    result.pendingSignal.signal.entryDigit,
                barrierDigit:
                    result.pendingSignal.signal.barrierDigit,
                nextIndex:
                    attempt.nextIndex + 1,
            };
        }
    }

    throw new Error(
        'Test setup could not produce any valid pending Matches signal'
    );
}

describe('Matches three-tick outcome engine', () => {
    const tests: TestCase[] = [
        {
            name: 'Barrier appears on T+3',
            expected: 'WIN',
            barrierPosition: 2,
        },
        {
            name: 'Barrier appears on T+2',
            expected: 'WIN',
            barrierPosition: 1,
        },
        {
            name: 'Barrier appears on T+1',
            expected: 'WIN',
            barrierPosition: 0,
        },
        {
            name: 'Barrier never appears',
            expected: 'LOSS',
        },
    ];

    test.each(tests)(
        '$name',
        ({
            expected,
            barrierPosition,
        }) => {
            const {
                backtester,
                entryDigit,
                barrierDigit,
                nextIndex,
            } = createSinglePendingSignal();

            expect(entryDigit).toBeGreaterThanOrEqual(0);
            expect(barrierDigit).toBeGreaterThanOrEqual(0);
            expect(backtester.getPendingCount()).toBe(1);

            const pending =
                backtester.getPendingSignals()[0];

            expect(pending.signal.result).toBe('PENDING');

            const safeDigits = [
                0, 1, 2, 3, 4,
                5, 6, 7, 8, 9,
            ].filter(
                digit => digit !== barrierDigit
            );

            const futureDigits = [
                safeDigits[0],
                safeDigits[1],
                safeDigits[2],
            ];

            if (
                expected === 'WIN' &&
                barrierPosition !== undefined
            ) {
                futureDigits[barrierPosition] =
                    barrierDigit;
            }

            let index = nextIndex;

            /*
             * T+1
             */
            processTick(
                backtester,
                futureDigits[0],
                index
            );

            index++;

            expect(
                backtester.getCompletedOutcomes()
            ).toHaveLength(0);

            expect(
                backtester.getPendingCount()
            ).toBe(1);

            /*
             * T+2
             */
            processTick(
                backtester,
                futureDigits[1],
                index
            );

            index++;

            expect(
                backtester.getCompletedOutcomes()
            ).toHaveLength(0);

            expect(
                backtester.getPendingCount()
            ).toBe(1);

            /*
             * T+3
             */
            processTick(
                backtester,
                futureDigits[2],
                index
            );

            /*
             * Final result
             */
            const outcomes =
                backtester.getCompletedOutcomes();

            expect(outcomes).toHaveLength(1);
            expect(
                backtester.getPendingCount()
            ).toBe(0);

            const outcome = outcomes[0];

            expect(outcome.result)
                .toBe(expected);

            expect(
                outcome.futureDigits
            ).toHaveLength(3);

            expect(
                outcome.barrierFound
            ).toBe(expected === 'WIN');

            expect(
                outcome.futureTicks
            ).toHaveLength(3);
        }
    );
});