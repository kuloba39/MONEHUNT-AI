import { DigitScore } from './digit-engine';


export interface BarrierResult {

    barrierDigit: number;

    topScore: number;

    secondScore: number;

    confidence: number;

}


function calculateConfidence(
    topScore: number,
    secondScore: number
): number {

    if (
        topScore <= 0
    ) {

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

            confidence: 0

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


    return {

        barrierDigit:
            first.digit,

        topScore:
            first.score,

        secondScore,

        confidence:
            calculateConfidence(
                first.score,
                secondScore
            )

    };

}