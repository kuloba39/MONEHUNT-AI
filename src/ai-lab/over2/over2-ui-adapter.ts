import {
    Over2Engine
} from './over2-engine';

export interface Over2AnalysisTick {
    digit: number;
    quote: string;
    epoch: number;
    market: string;
}

export class Over2UIAdapter {
    private engine = new Over2Engine();

    reset(): void {
        this.engine.reset();
    }

    processTick(tick: Over2AnalysisTick) {
        return this.engine.processTick({
            digit: tick.digit,
            quote: tick.quote,
            epoch: tick.epoch,
            market: tick.market,
        });
    }

    processTicks(ticks: Over2AnalysisTick[]) {
        return this.engine.processTicks(
            ticks.map(tick => ({
                digit: tick.digit,
                quote: tick.quote,
                epoch: tick.epoch,
                market: tick.market,
            }))
        );
    }

    getEngine() {
        return this.engine;
    }

    getState() {
        return this.engine.getState();
    }

    getSignal() {
        return this.engine.getSignal();
    }

    getTicks() {
        return this.engine.getTicks();
    }

    getTickCount() {
        return this.engine.getTickCount();
    }
}