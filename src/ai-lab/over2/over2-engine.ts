import {
    Over2EngineState,
    Over2Signal,
    Over2Tick,
    Over2DigitStats,
} from './over2-types';

import {
    calculateDigitScores,
    evaluateOver2Signal,
} from '../matches/digit-engine';

const WINDOW_SIZE = 600;

export class Over2Engine {
    private ticks: Over2Tick[] = [];

    private state: Over2EngineState = {
        digitStats: [],
        signal: null,
        latestDigit: null,
        tickCount: 0,
    };

    reset(): void {
        this.ticks = [];

        this.state = {
            digitStats: [],
            signal: null,
            latestDigit: null,
            tickCount: 0,
        };
    }

    processTick(
        tick: Over2Tick
    ): Over2EngineState {
        this.ticks.push(tick);

        if (this.ticks.length > WINDOW_SIZE) {
            this.ticks.shift();
        }

        this.state = this.analyze();

        return this.state;
    }

    processTicks(
        ticks: Over2Tick[]
    ): Over2EngineState {
        for (const tick of ticks) {
            this.processTick(tick);
        }

        return this.state;
    }

    private analyze(): Over2EngineState {
        const total =
            this.ticks.length;

        /*
         * Convert OVER 2 ticks into the
         * shared Matches digit-engine format.
         */
        const analysisTicks =
            this.ticks.map(
                (tick, index) => ({
                    timestamp:
                        tick.epoch,

                    symbol:
                        tick.market,

                    price:
                        Number(tick.quote),

                    digit:
                        Number(tick.digit),

                    index,
                })
            );

        const scores =
            calculateDigitScores(
                analysisTicks
            );

        /*
         * The shared engine contains the
         * exact OVER 2 qualification rules:
         *
         * 1. 0 <= 10%
         * 2. 1 <= 10%
         * 3. 2 <= 10%
         * 4. Least of 0/1/2 becomes entry digit
         * 5. Entry digit must NOT be overall least
         */
        const over2Check =
            total >= WINDOW_SIZE
                ? evaluateOver2Signal(scores)
                : {
                    valid: false,
                    entryDigit: null,
                    overallLeastDigit: null,
                    reason:
                        'INSUFFICIENT TICK DATA',
                };

        const counts:
            Record<number, number> = {
            0: 0,
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0,
            6: 0,
            7: 0,
            8: 0,
            9: 0,
        };

        for (
            const tick
            of this.ticks
        ) {
            const digit =
                Number(tick.digit);

            if (
                Number.isInteger(digit) &&
                digit >= 0 &&
                digit <= 9
            ) {
                counts[digit]++;
            }
        }

        const percentages:
            Record<number, number> = {
            0: 0,
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0,
            6: 0,
            7: 0,
            8: 0,
            9: 0,
        };

        for (
            let digit = 0;
            digit <= 9;
            digit++
        ) {
            percentages[digit] =
                total > 0
                    ? (
                        counts[digit] /
                        total
                    ) * 100
                    : 0;
        }

        const digitStats:
            Over2DigitStats[] =
            Array.from(
                { length: 10 },
                (_, digit) => ({
                    digit,
                    count:
                        counts[digit],
                    percentage:
                        percentages[digit],
                })
            );

        const signal:
            Over2Signal = {
            strategy: 'OVER_2',

            ready:
                over2Check.valid,

            leastDigit:
                over2Check.entryDigit,

            counts,

            percentages,

            qualifying:
                over2Check.valid,

            generatedAt:
                Date.now(),

            overallLeastDigit:
                over2Check.overallLeastDigit,

            reason:
                over2Check.reason,
        };

        return {
            digitStats,

            signal,

            latestDigit:
                total > 0
                    ? this.ticks[
                        total - 1
                    ].digit
                    : null,

            tickCount:
                total,
        };
    }

        getState(): Over2EngineState {
        return this.state;
    }

    getTicks(): Over2Tick[] {
        return [...this.ticks];
    }

    getSignal(): Over2Signal | null {
        return this.state.signal;
    }

    getTickCount(): number {
        return this.ticks.length;
    }
}