import {
    MatchesBacktester,
    BacktestTickInput
} from './matches-backtester';

export interface AnalysisTick {
    digit: number;
    quote: string;
    epoch: number;
    market: string;
}

export class MatchesUIAdapter {

    private backtester =
        new MatchesBacktester();

    private nextIndex = 0;

    private currentState:
        ReturnType<
            MatchesBacktester['processTick']
        > | null = null;

    reset(): void {
        this.backtester.clear();

        this.nextIndex = 0;

        this.currentState = null;
    }

    processTick(
        tick: AnalysisTick
    ) {
        const input:
            BacktestTickInput = {
            timestamp: tick.epoch,
            symbol: tick.market,
            price: Number(tick.quote),
            digit: tick.digit,
            index: this.nextIndex++
        };

        this.currentState =
            this.backtester.processTick(
                input
            );

        return this.currentState;
    }

    processTicks(
        ticks: AnalysisTick[]
    ) {
        for (const tick of ticks) {
            this.processTick(tick);
        }

        return this.currentState;
    }

    getBacktester() {
        return this.backtester;
    }

    getCurrentState() {
        return this.currentState;
    }

    getPendingCount() {
        return this.backtester.getPendingCount();
    }

    getCompletedOutcomes() {
        return this.backtester.getCompletedOutcomes();
    }

    getTotalOutcomes() {
        return this.backtester.getTotalOutcomes();
    }

    getWins() {
        return this.backtester.getWins();
    }

    getLosses() {
        return this.backtester.getLosses();
    }

    getWinRate() {
        return this.backtester.getWinRate();
    }

    getLearningStats() {
        return this.backtester.getLearningStats();
    }

    getBestCombinations(
        minimumTrades = 10
    ) {
        return this.backtester.getBestCombinations(
            minimumTrades
        );
    }

    getReliableCombinations(
        minimumTrades = 30,
        minimumWinRate = 55
    ) {
        return this.backtester.getReliableCombinations(
            minimumTrades,
            minimumWinRate
        );
    }
}