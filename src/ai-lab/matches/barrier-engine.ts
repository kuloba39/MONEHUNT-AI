import { DigitScore } from './digit-engine';

export interface BarrierResult {
    barrierDigit: number;
    topScore: number;
    secondScore: number;
    confidence: number;
}

export function findBarrier(
    scores: DigitScore[]
): BarrierResult {

    const first = scores[0];
    const second = scores[1];

    return {
        barrierDigit: first.digit,
        topScore: first.score,
        secondScore: second.score,
        confidence: first.score - second.score
    };
}