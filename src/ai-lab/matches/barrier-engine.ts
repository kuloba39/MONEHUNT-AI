import { DigitScore } from './digit-engine';


export interface BarrierResult {

    barrierDigit: number;

    topScore: number;

    secondScore: number;

    confidence: number;

    frequency: number;

    ready: boolean;

}


const MIN_FREQUENCY = 2;

const MIN_CONFIDENCE = 15;


function calculateSeparation(
    topScore: number,
    secondScore: number
): number {

    if (topScore <= 0) {
        return 0;
    }

    const separation =
        (
            (topScore - secondScore) /
            topScore
        ) * 100;

    return Math.max(
        0,
        Math.min(
            100,
            separation
        )
    );
}


function calculateFrequencyScore(
    frequency: number
): number {

    /*
     * Frequency is converted into a capped
     * 0-100 evidence score.
     *
     * 2 occurrences = minimum useful evidence.
     * 10+ occurrences = maximum frequency evidence.
     */

    if (frequency <= 0) {
        return 0;
    }

    return Math.min(
        100,
        frequency * 10
    );
}


function calculateConfidence(
    topScore: number,
    secondScore: number,
    frequency: number
): number {

    const separation =
        calculateSeparation(
            topScore,
            secondScore
        );

    const frequencyScore =
        calculateFrequencyScore(
            frequency
        );

    /*
     * Barrier confidence is based on:
     *
     * 60% score separation
     * 40% frequency evidence
     *
     * This keeps the engine focused on the
     * difference between the leading digit and
     * its nearest competitor while still
     * requiring repeated evidence.
     */

    return (
        separation * 0.60 +
        frequencyScore * 0.40
    );
}


export function findBarrier(
    scores: DigitScore[]
): BarrierResult {

    if (
        scores.length === 0
    ) {

        return {

            barrierDigit: -1,

            topScore: 0,

            secondScore: 0,

            confidence: 0,

            frequency: 0,

            ready: false

        };

    }


    const first =
        scores[0];


    const second =
        scores[1];


    const secondScore =
        second
            ? second.score
            : 0;


    const frequency =
        first.frequency;


    const confidence =
        calculateConfidence(
            first.score,
            secondScore,
            frequency
        );


    const ready =
        first.digit >= 0 &&
        frequency >= MIN_FREQUENCY &&
        confidence >= MIN_CONFIDENCE;


    return {

        barrierDigit:
            first.digit,

        topScore:
            first.score,

        secondScore,

        confidence,

        frequency,

        ready

    };

}