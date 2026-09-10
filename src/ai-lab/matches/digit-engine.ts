import { TickRecord } from './data-processor';

export interface DigitScore {
    digit: number;
    frequency: number;
    frequencyPercent: number;
    recency: number;
    gap: number;
    momentum: number;
    score: number;
}

export interface Over2SignalCheck {
    valid: boolean;
    entryDigit: number | null;
    overallLeastDigit: number | null;
    reason: string;
}

export function calculateDigitScores(
    ticks: TickRecord[]
): DigitScore[] {

    const results: DigitScore[] = [];

    const totalTicks = ticks.length;

    for (let digit = 0; digit <= 9; digit++) {

        const matches =
            ticks.filter(
                tick => tick.digit === digit
            );

        const frequency =
            matches.length;

        const frequencyPercent =
            totalTicks > 0
                ? (frequency / totalTicks) * 100
                : 0;

        let lastIndex = -1;

        for (
            let i = ticks.length - 1;
            i >= 0;
            i--
        ) {
            if (ticks[i].digit === digit) {
                lastIndex = i;
                break;
            }
        }

        const gap =
            lastIndex === -1
                ? ticks.length
                : ticks.length - lastIndex;

        const recency =
            Math.max(
                0,
                100 - gap
            );

        const momentum =
            frequency;

        const score =
            frequency * 2 +
            recency * 0.5 +
            momentum;

        results.push({
            digit,
            frequency,
            frequencyPercent,
            recency,
            gap,
            momentum,
            score
        });
    }

    return results.sort(
        (a, b) => {

            if (b.score !== a.score) {
                return b.score - a.score;
            }

            return a.digit - b.digit;
        }
    );
}


/**
 * Evaluate the exact OVER 2 signal rules.
 *
 * RULE 1:
 * Digits 0, 1 and 2 must each be <= 10%.
 *
 * RULE 2:
 * The least frequent digit among 0, 1 and 2
 * becomes the candidate entry digit.
 *
 * RULE 3:
 * Find the overall least frequent digit
 * among 0-9.
 *
 * RULE 4:
 * The least frequent digit among 0-2
 * must NOT be the overall least digit.
 */
export function evaluateOver2Signal(
    digitScores: DigitScore[]
): Over2SignalCheck {

    if (digitScores.length < 10) {

        return {
            valid: false,
            entryDigit: null,
            overallLeastDigit: null,
            reason: 'INSUFFICIENT DIGIT DATA'
        };
    }

    const byDigit =
        new Map<number, DigitScore>();

    digitScores.forEach(
        score => {

            byDigit.set(
                score.digit,
                score
            );

        }
    );

    const digit0 =
        byDigit.get(0);

    const digit1 =
        byDigit.get(1);

    const digit2 =
        byDigit.get(2);

    if (
        !digit0 ||
        !digit1 ||
        !digit2
    ) {

        return {
            valid: false,
            entryDigit: null,
            overallLeastDigit: null,
            reason: 'MISSING 0-2 DIGIT DATA'
        };
    }

    /*
     * RULE 1
     *
     * Digits 0, 1 and 2 must all
     * be at or below 10%.
     *
     * Exactly 10% is valid.
     */
    const over2Digits: DigitScore[] = [
        digit0,
        digit1,
        digit2
    ];

    const exceededDigit =
        over2Digits.find(
            item =>
                item.frequencyPercent > 10
        );

    if (exceededDigit) {

        return {
            valid: false,
            entryDigit: null,
            overallLeastDigit: null,
            reason:
                `DIGIT ${exceededDigit.digit} ABOVE 10%`
        };
    }

    /*
     * RULE 2
     *
     * Find the least frequent digit
     * among 0, 1 and 2.
     *
     * Lower digit wins an exact tie.
     */
    const least012 =
        [...over2Digits].sort(
            (a, b) => {

                if (
                    a.frequency !==
                    b.frequency
                ) {

                    return (
                        a.frequency -
                        b.frequency
                    );
                }

                return (
                    a.digit -
                    b.digit
                );
            }
        )[0];

    /*
     * RULE 3
     *
     * Find the overall least frequent
     * digit among 0-9.
     *
     * Lower digit wins an exact tie.
     */
    const overallLeast =
        [...digitScores].sort(
            (a, b) => {

                if (
                    a.frequency !==
                    b.frequency
                ) {

                    return (
                        a.frequency -
                        b.frequency
                    );
                }

                return (
                    a.digit -
                    b.digit
                );
            }
        )[0];

    /*
     * RULE 4
     *
     * The least digit among 0-2
     * must NOT be the overall least digit.
     */
    if (
        least012.digit ===
        overallLeast.digit
    ) {

        return {
            valid: false,
            entryDigit:
                least012.digit,
            overallLeastDigit:
                overallLeast.digit,
            reason:
                'ENTRY DIGIT IS OVERALL LEAST'
        };
    }

    /*
     * ALL OVER 2 RULES PASSED.
     */
    return {
        valid: true,
        entryDigit:
            least012.digit,
        overallLeastDigit:
            overallLeast.digit,
        reason:
            'OVER 2 SIGNAL VALID'
    };
}