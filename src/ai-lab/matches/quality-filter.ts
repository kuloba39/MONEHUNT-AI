import { Regime } from './regime-engine';


export interface QualityFilterInput {

    confluenceScore: number;

    barrierConfidence: number;

    entryScore: number;

    entryReady: boolean;

    regime: Regime;

}


export interface QualityFilterResult {

    passed: boolean;

    qualityScore: number;

    reason: string;

}


const MIN_CONFLUENCE_SCORE = 60;

const MIN_BARRIER_CONFIDENCE = 15;

const MIN_ENTRY_SCORE = 40;


function clamp(
    value: number,
    minimum: number,
    maximum: number
): number {

    return Math.max(
        minimum,
        Math.min(
            maximum,
            value
        )
    );

}


export function evaluateQuality(
    input: QualityFilterInput
): QualityFilterResult {

    if (
        input.regime ===
        'UNSTABLE'
    ) {

        return {

            passed: false,

            qualityScore: 0,

            reason:
                'UNSTABLE REGIME'

        };

    }


    if (
        !input.entryReady
    ) {

        return {

            passed: false,

            qualityScore: 0,

            reason:
                'ENTRY NOT READY'

        };

    }


    const confluenceScore =
        clamp(
            input.confluenceScore,
            0,
            100
        );


    const barrierScore =
        clamp(
            input.barrierConfidence,
            0,
            100
        );


    const entryScore =
        clamp(
            input.entryScore,
            0,
            100
        );


    /*
     * Weighted quality score.
     *
     * Confluence receives the highest weight because
     * it represents agreement between multiple layers.
     *
     * These weights are structural starting points.
     * Adaptive learning will later test whether they
     * actually improve historical expectancy.
     */

    const qualityScore =
        (
            confluenceScore * 0.50 +
            barrierScore * 0.25 +
            entryScore * 0.25
        );


    if (
        confluenceScore <
        MIN_CONFLUENCE_SCORE
    ) {

        return {

            passed: false,

            qualityScore,

            reason:
                'CONFLUENCE BELOW THRESHOLD'

        };

    }


    if (
        barrierScore <
        MIN_BARRIER_CONFIDENCE
    ) {

        return {

            passed: false,

            qualityScore,

            reason:
                'BARRIER CONFIDENCE TOO LOW'

        };

    }


    if (
        entryScore <
        MIN_ENTRY_SCORE
    ) {

        return {

            passed: false,

            qualityScore,

            reason:
                'ENTRY SCORE TOO LOW'

        };

    }


    return {

        passed:
            qualityScore >= 60,

        qualityScore,

        reason:
            qualityScore >= 60
                ? 'QUALITY PASSED'
                : 'QUALITY SCORE BELOW THRESHOLD'

    };

}


/*
 * Backward-compatible helper.
 *
 * Existing code can continue using the old
 * boolean-style quality check while the new
 * structured evaluator is introduced.
 */

export function passesQualityFilter(
    quality: number,
    confidence: number
): boolean {

    return (
        quality >= 80 &&
        confidence >= 15
    );

}