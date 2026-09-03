import {
    findEntryDigit,
    isEntryTriggered
} from '../entry-engine';

import {
    TickRecord
} from '../data-processor';

import {
    BarrierResult
} from '../barrier-engine';


function createTick(
    digit: number,
    index: number
): TickRecord {
    return {
        timestamp: index,
        symbol: 'R_100',
        price: 100 + index + digit / 10,
        digit,
        index
    };
}


function createBarrier(
    digit: number,
    ready = true
): BarrierResult {
    return {
        barrierDigit: digit,
        topScore: 80,
        secondScore: 40,
        confidence: 50,
        frequency: 6,
        ready
    };
}


describe('Matches entry engine', () => {

    test('returns no entry when barrier is not ready', () => {

        const ticks = [
            createTick(3, 0),
            createTick(7, 1),
            createTick(3, 2),
            createTick(7, 3)
        ];

        const result =
            findEntryDigit(
                ticks,
                createBarrier(7, false)
            );

        expect(result.entryDigit)
            .toBe(-1);

        expect(result.ready)
            .toBe(false);

        expect(result.reason)
            .toBe('BARRIER NOT READY');

    });


    test('returns no entry when no historical relationship exists', () => {

        const ticks = [
            createTick(1, 0),
            createTick(2, 1),
            createTick(3, 2),
            createTick(4, 3)
        ];

        const result =
            findEntryDigit(
                ticks,
                createBarrier(7)
            );

        expect(result.entryDigit)
            .toBe(-1);

        expect(result.ready)
            .toBe(false);

        expect(result.reason)
            .toBe(
                'NO HISTORICAL ENTRY RELATIONSHIP'
            );

    });


    test('requires at least two historical occurrences', () => {

        const ticks = [
            createTick(3, 0),
            createTick(7, 1),
            createTick(4, 2),
            createTick(7, 3)
        ];

        const result =
            findEntryDigit(
                ticks,
                createBarrier(7)
            );

        expect(result.entryDigit)
            .toBe(3);

        expect(result.entryScore)
            .toBe(50);

        expect(result.ready)
            .toBe(false);

    });


    test('selects the strongest historical entry relationship', () => {

        const ticks = [
            createTick(3, 0),
            createTick(7, 1),
            createTick(3, 2),
            createTick(7, 3),
            createTick(3, 4),
            createTick(7, 5),
            createTick(5, 6),
            createTick(7, 7)
        ];

        const result =
            findEntryDigit(
                ticks,
                createBarrier(7)
            );

        expect(result.entryDigit)
            .toBe(3);

        expect(result.ready)
            .toBe(true);

        expect(result.entryScore)
            .toBeGreaterThanOrEqual(40);

    });


    test('uses recent evidence to break historical ties', () => {

        const ticks: TickRecord[] = [];

        /*
         * Older history:
         *
         * 3 -> 7 occurs twice.
         *
         * These relationships will fall outside
         * the recent 20-tick window.
         */

        ticks.push(
            createTick(3, 0),
            createTick(7, 1),
            createTick(3, 2),
            createTick(7, 3)
        );


        /*
         * Fill the middle of the history with
         * unrelated transitions.
         */

        for (let i = 4; i < 22; i++) {

            ticks.push(
                createTick(
                    i % 6,
                    i
                )
            );
        }


        /*
         * Recent history:
         *
         * 5 -> 7 occurs twice.
         */

        ticks.push(
            createTick(5, 22),
            createTick(7, 23),
            createTick(5, 24),
            createTick(7, 25)
        );


        const result =
            findEntryDigit(
                ticks,
                createBarrier(7)
            );


        expect(result.entryDigit)
            .toBe(5);

    });


    test('calculates relationship score from digit distance', () => {

        const ticks = [
            createTick(6, 0),
            createTick(7, 1),
            createTick(6, 2),
            createTick(7, 3)
        ];

        const result =
            findEntryDigit(
                ticks,
                createBarrier(7)
            );

        expect(result.entryDigit)
            .toBe(6);

        expect(result.relationshipScore)
            .toBe(100);

    });


    test('detects the entry trigger digit', () => {

        const entry = {
            entryDigit: 6,
            barrierDigit: 7,
            entryScore: 75,
            relationshipScore: 100,
            ready: true,
            reason: 'ENTRY RELATIONSHIP CONFIRMED'
        };

        expect(
            isEntryTriggered(
                6,
                entry
            )
        ).toBe(true);

        expect(
            isEntryTriggered(
                5,
                entry
            )
        ).toBe(false);

    });


    test('does not trigger when entry is not ready', () => {

        const entry = {
            entryDigit: 6,
            barrierDigit: 7,
            entryScore: 30,
            relationshipScore: 100,
            ready: false,
            reason: 'WAIT FOR STRONGER ENTRY EVIDENCE'
        };

        expect(
            isEntryTriggered(
                6,
                entry
            )
        ).toBe(false);

    });

});