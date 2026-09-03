import {
    RecordedOutcome,
    MatchesSignal
} from './types';


export class OutcomeRecorder {

    private outcomes: RecordedOutcome[] = [];


    record(
        signal: MatchesSignal,
        result: 'WIN' | 'LOSS'
    ): RecordedOutcome {

        const outcome: RecordedOutcome = {

            timestamp:
                signal.timestamp,

            symbol:
                signal.symbol,

            entryDigit:
                signal.entryDigit,

            barrierDigit:
                signal.barrierDigit,

            fibLevel:
                signal.fibLevel,

            trend:
                signal.trend,

            regime:
                signal.regime,

            qualityScore:
                signal.qualityScore,

            confluenceScore:
                signal.confluenceScore,

            result

        };


        this.outcomes.push(
            outcome
        );


        return outcome;
    }


    getAll(): RecordedOutcome[] {

        return [
            ...this.outcomes
        ];

    }


    getWins(): RecordedOutcome[] {

        return this.outcomes.filter(
            outcome =>
                outcome.result === 'WIN'
        );

    }


    getLosses(): RecordedOutcome[] {

        return this.outcomes.filter(
            outcome =>
                outcome.result === 'LOSS'
        );

    }


    getTotal(): number {

        return this.outcomes.length;

    }


    getWinRate(): number {

        if (this.outcomes.length === 0) {
            return 0;
        }


        const wins =
            this.getWins().length;


        return (
            wins /
            this.outcomes.length
        ) * 100;

    }


    clear(): void {

        this.outcomes = [];

    }

}