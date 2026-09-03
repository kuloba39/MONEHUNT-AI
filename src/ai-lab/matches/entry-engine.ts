import { TickRecord } from './data-processor';
import { BarrierResult } from './barrier-engine';

export interface EntryResult {
    entryDigit: number;
    barrierDigit: number;
    entryScore: number;
    relationshipScore: number;
    ready: boolean;
    reason: string;
}


const MIN_OCCURRENCES = 2;
const MIN_ENTRY_SCORE = 40;
const RECENT_WINDOW = 20;


function calculateRelationshipScore(
    entryDigit: number,
    barrierDigit: number
): number {

    if (entryDigit === barrierDigit) {
        return 0;
    }

    const distance =
        Math.abs(entryDigit - barrierDigit);

    /*
     * Digits close to the barrier are given
     * a stronger structural relationship score.
     *
     * This is not treated as proven probability.
     * Historical outcomes will determine whether
     * the relationship actually has an edge.
     */

    if (distance === 1) {
        return 100;
    }

    if (distance === 2) {
        return 85;
    }

    if (distance === 3) {
        return 70;
    }

    if (distance === 4) {
        return 55;
    }

    return 40;
}


function calculateRecentScore(
    recentCount: number,
    recentTotal: number
): number {

    if (recentTotal <= 0) {
        return 0;
    }

    return (
        recentCount /
        recentTotal
    ) * 100;
}


export function findEntryDigit(
    ticks: TickRecord[],
    barrier: BarrierResult
): EntryResult {

    const barrierDigit =
        barrier.barrierDigit;


    if (ticks.length === 0) {

        return {
            entryDigit: -1,
            barrierDigit,
            entryScore: 0,
            relationshipScore: 0,
            ready: false,
            reason: 'NO TICK DATA'
        };
    }


    /*
     * The Barrier Engine must first confirm that
     * the selected barrier has enough evidence.
     *
     * This prevents the Entry Engine from building
     * an entry signal around a weak barrier.
     */

    if (
        barrierDigit < 0 ||
        !barrier.ready
    ) {

        return {
            entryDigit: -1,
            barrierDigit,
            entryScore: 0,
            relationshipScore: 0,
            ready: false,
            reason: 'BARRIER NOT READY'
        };
    }


    /*
     * Count which digits appeared immediately
     * before the barrier digit.
     */

    const precedingCounts =
        new Map<number, number>();


    for (
        let i = 1;
        i < ticks.length;
        i++
    ) {

        const previous =
            ticks[i - 1].digit;

        const current =
            ticks[i].digit;


        if (
            current === barrierDigit &&
            previous !== barrierDigit
        ) {

            precedingCounts.set(
                previous,
                (precedingCounts.get(previous) || 0) + 1
            );
        }
    }


    /*
     * Remove the barrier digit itself as an
     * additional safety measure.
     */

    precedingCounts.delete(
        barrierDigit
    );


    if (
        precedingCounts.size === 0
    ) {

        return {
            entryDigit: -1,
            barrierDigit,
            entryScore: 0,
            relationshipScore: 0,
            ready: false,
            reason:
                'NO HISTORICAL ENTRY RELATIONSHIP'
        };
    }


    /*
     * Calculate recent relationships.
     *
     * Only the most recent RECENT_WINDOW
     * transitions are considered here.
     */

    const recentStart =
        Math.max(
            1,
            ticks.length - RECENT_WINDOW
        );


    const recentCounts =
        new Map<number, number>();

    let recentTotal = 0;


    for (
        let i = recentStart;
        i < ticks.length;
        i++
    ) {

        const previous =
            ticks[i - 1].digit;

        const current =
            ticks[i].digit;


        if (
            current === barrierDigit &&
            previous !== barrierDigit
        ) {

            recentCounts.set(
                previous,
                (recentCounts.get(previous) || 0) + 1
            );

            recentTotal++;
        }
    }


    /*
     * Select the strongest historical relationship.
     *
     * Primary factor:
     *   total historical occurrences
     *
     * Secondary factor:
     *   recent relationship frequency
     */

    let bestDigit = -1;
    let bestCount = 0;
    let bestRecentScore = 0;


    for (
        const [
            digit,
            count
        ] of precedingCounts
    ) {

        const recentCount =
            recentCounts.get(digit) || 0;

        const recentScore =
            calculateRecentScore(
                recentCount,
                recentTotal
            );


        if (
            count > bestCount ||
            (
                count === bestCount &&
                recentScore > bestRecentScore
            )
        ) {

            bestDigit = digit;
            bestCount = count;
            bestRecentScore = recentScore;
        }
    }


    const totalRelationships =
        Array.from(
            precedingCounts.values()
        ).reduce(
            (sum, value) =>
                sum + value,
            0
        );


    const historicalScore =
        totalRelationships > 0
            ? (
                bestCount /
                totalRelationships
            ) * 100
            : 0;


    /*
     * Combine historical and recent evidence.
     *
     * Historical evidence remains dominant.
     * Recent evidence helps break ties and
     * adapt to changing market behavior.
     */

    const entryScore =
        historicalScore * 0.70 +
        bestRecentScore * 0.30;


    const relationshipScore =
        calculateRelationshipScore(
            bestDigit,
            barrierDigit
        );


    /*
     * Entry requires:
     *
     * 1. A valid entry digit
     * 2. At least two historical occurrences
     * 3. A minimum combined evidence score
     */

    const ready =
        bestDigit >= 0 &&
        bestCount >= MIN_OCCURRENCES &&
        entryScore >= MIN_ENTRY_SCORE;


    return {

        entryDigit:
            bestDigit,

        barrierDigit,

        entryScore,

        relationshipScore,

        ready,

        reason:
            ready
                ? 'ENTRY RELATIONSHIP CONFIRMED'
                : 'WAIT FOR STRONGER ENTRY EVIDENCE'

    };
}


/*
 * Checks whether the current tick is the
 * trigger digit identified by the Entry Engine.
 */

export function isEntryTriggered(
    currentDigit: number,
    entry: EntryResult
): boolean {

    return (
        entry.ready &&
        entry.entryDigit >= 0 &&
        currentDigit === entry.entryDigit
    );
}