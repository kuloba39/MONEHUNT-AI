import { DataProcessor } from './data-processor';
import { calculateDigitScores } from './digit-engine';
import { findBarrier } from './barrier-engine';

export class MatchesBacktester {

    processor =
        new DataProcessor();

    processTick(price: number) {

        const digit =
            Number(
                price
                    .toString()
                    .slice(-1)
            );

        this.processor.addTick({
            timestamp: Date.now(),
            symbol: 'R_100',
            price,
            digit,
            index: Date.now()
        });

        const scores =
            calculateDigitScores(
                this.processor.get100()
            );

        const barrier =
            findBarrier(scores);

        return {
            scores,
            barrier
        };
    }
}