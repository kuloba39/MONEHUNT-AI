import { TickRecord } from './data-processor';

export interface DigitScore {
    digit: number;
    frequency: number;
    recency: number;
    gap: number;
    momentum: number;
    score: number;
}

export function calculateDigitScores(
    ticks: TickRecord[]
): DigitScore[] {

    const results: DigitScore[] = [];

    for (let digit = 0; digit <= 9; digit++) {

        const matches =
            ticks.filter(t => t.digit === digit);

        const frequency = matches.length;

        let lastIndex = -1;

for (let i = ticks.length - 1; i >= 0; i--) {
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
            Math.max(0, 100 - gap);

        const momentum = frequency;

        const score =
            frequency * 2 +
            recency * 0.5 +
            momentum;

        results.push({
            digit,
            frequency,
            recency,
            gap,
            momentum,
            score
        });
    }

    return results.sort(
        (a, b) => b.score - a.score
    );
}