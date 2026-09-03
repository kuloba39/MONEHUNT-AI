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
     * a stronger relationship score.
     *
     * This is only a structural score for now.
     * Historical edge will be learned later.
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


export function findEntryDigit(
    ticks: TickRecord[],
    barrier: BarrierResult
): EntryResult {

    if (ticks.length === 0) {

        return {
            entryDigit: -1,
            barrierDigit: barrier.barrierDigit,
            entryScore: 0,
            relationshipScore: 0,
            ready: false,
            reason: 'NO TICK DATA'
        };
    }


    const barrierDigit =
        barrier.barrierDigit;


    /*
     * Count which digits appeared immediately
     * before the barrier digit.
     */

    const precedingCounts =
        new Map<number, number>();


    for (let i = 1; i < ticks.length; i++) {

        const previous =
            ticks[i - 1].digit;

        const current =
            ticks[i].digit;


        if (current === barrierDigit) {

            precedingCounts.set(
                previous,
                (precedingCounts.get(previous) || 0) + 1
            );
        }
    }


    /*
     * Remove the barrier digit itself.
     */

    precedingCounts.delete(barrierDigit);


    /*
     * If we have no historical relationship yet,
     * do not invent an entry signal.
     */

    if (precedingCounts.size === 0) {

        return {
            entryDigit: -1,
            barrierDigit,
            entryScore: 0,
            relationshipScore: 0,
            ready: false,
            reason: 'NO HISTORICAL ENTRY RELATIONSHIP'
        };
    }


    let bestDigit = -1;
    let bestCount = 0;


    for (const [digit, count] of precedingCounts) {

        if (count > bestCount) {

            bestDigit = digit;
            bestCount = count;
        }
    }


    const totalRelationships =
        Array.from(
            precedingCounts.values()
        ).reduce(
            (sum, value) => sum + value,
            0
        );


    const entryScore =
        totalRelationships > 0
            ? (bestCount / totalRelationships) * 100
            : 0;


    const relationshipScore =
        calculateRelationshipScore(
            bestDigit,
            barrierDigit
        );


    /*
     * Entry is considered ready only when the
     * historical relationship has enough evidence.
     *
     * We deliberately keep this conservative.
     */

    const ready =
        bestCount >= 2 &&
        entryScore >= 40;


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