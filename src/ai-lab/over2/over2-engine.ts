import {
    Over2EngineState,
    Over2Signal,
    Over2Tick,
    Over2DigitStats,
} from './over2-types';

const WINDOW_SIZE = 1000;
const MAX_ALLOWED_COUNT = 100;

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

    processTick(tick: Over2Tick): Over2EngineState {
        this.ticks.push(tick);

        if (this.ticks.length > WINDOW_SIZE) {
            this.ticks.shift();
        }

        this.state = this.analyze();

        return this.state;
    }

    processTicks(ticks: Over2Tick[]): Over2EngineState {
        for (const tick of ticks) {
            this.processTick(tick);
        }

        return this.state;
    }

    private analyze(): Over2EngineState {
        const counts: Record<number, number> = {
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

        for (const tick of this.ticks) {
            const digit = Number(tick.digit);

            if (
                Number.isInteger(digit) &&
                digit >= 0 &&
                digit <= 9
            ) {
                counts[digit]++;
            }
        }

        const total = this.ticks.length;

        const percentages: Record<number, number> = {
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

        for (let digit = 0; digit <= 9; digit++) {
            percentages[digit] =
                total > 0
                    ? (counts[digit] / total) * 100
                    : 0;
        }

        const digitStats: Over2DigitStats[] =
            Array.from({ length: 10 }, (_, digit) => ({
                digit,
                count: counts[digit],
                percentage: percentages[digit],
            }));

        const ready =
            total >= WINDOW_SIZE &&
            counts[0] <= MAX_ALLOWED_COUNT &&
            counts[1] <= MAX_ALLOWED_COUNT &&
            counts[2] <= MAX_ALLOWED_COUNT;

        let leastDigit: number | null = null;

        if (ready) {
            const candidates = [0, 1, 2];

            leastDigit = candidates.reduce((least, digit) => {
                if (counts[digit] < counts[least]) {
                    return digit;
                }

                return least;
            });
        }

        const signal: Over2Signal = {
            strategy: 'OVER_2',
            ready,
            leastDigit,
            counts,
            percentages,
            qualifying: ready,
            generatedAt: Date.now(),
        };

        return {
            digitStats,
            signal,
            latestDigit:
                this.ticks.length > 0
                    ? this.ticks[this.ticks.length - 1].digit
                    : null,
            tickCount: total,
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