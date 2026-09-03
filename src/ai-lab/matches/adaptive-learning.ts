import {
    RecordedOutcome,
    LearningKey,
    LearningStats
} from './types';


export class AdaptiveLearning {

    private outcomes: RecordedOutcome[] = [];


    addOutcome(
        outcome: RecordedOutcome
    ): void {

        this.outcomes.push(
            outcome
        );

    }


    addOutcomes(
        outcomes: RecordedOutcome[]
    ): void {

        this.outcomes.push(
            ...outcomes
        );

    }


    getTotalOutcomes(): number {

        return this.outcomes.length;

    }


    clear(): void {

        this.outcomes = [];

    }


    private createKey(
        outcome: RecordedOutcome
    ): string {

        return [
            outcome.symbol,
            outcome.regime,
            outcome.entryDigit,
            outcome.barrierDigit,
            outcome.fibLevel
        ].join('|');

    }


    private calculateExpectancy(
        winRate: number
    ): number {

        /*
         * Initial expectancy model.
         *
         * This assumes a normalized outcome:
         * WIN  = +1
         * LOSS = -1
         *
         * Actual contract payout will be introduced
         * later when real contract economics are added.
         */

        const winProbability =
            winRate / 100;

        const lossProbability =
            1 - winProbability;

        return (
            winProbability -
            lossProbability
        );

    }


    analyze(): LearningStats[] {

        const groups =
            new Map<
                string,
                RecordedOutcome[]
            >();


        for (
            const outcome
            of this.outcomes
        ) {

            const key =
                this.createKey(
                    outcome
                );


            const existing =
                groups.get(key);


            if (existing) {

                existing.push(
                    outcome
                );

            } else {

                groups.set(
                    key,
                    [outcome]
                );

            }

        }


        const results:
            LearningStats[] = [];


        for (
            const group
            of groups.values()
        ) {

            if (group.length === 0) {
                continue;
            }


            const first =
                group[0];


            const wins =
                group.filter(
                    outcome =>
                        outcome.result === 'WIN'
                ).length;


            const losses =
                group.filter(
                    outcome =>
                        outcome.result === 'LOSS'
                ).length;


            const trades =
                wins + losses;


            const winRate =
                trades > 0
                    ? (wins / trades) * 100
                    : 0;


            const expectancy =
                this.calculateExpectancy(
                    winRate
                );


            const key: LearningKey = {

                symbol:
                    first.symbol,

                regime:
                    first.regime,

                entryDigit:
                    first.entryDigit,

                barrierDigit:
                    first.barrierDigit,

                fibLevel:
                    first.fibLevel

            };


            results.push({

                key,

                trades,

                wins,

                losses,

                winRate,

                expectancy

            });

        }


        return results.sort(
            (a, b) =>
                b.expectancy -
                a.expectancy
        );

    }


    getBestCombinations(
        minimumTrades = 10
    ): LearningStats[] {

        return this.analyze().filter(
            stats =>
                stats.trades >=
                minimumTrades
        );

    }


    getReliableCombinations(
        minimumTrades = 30,
        minimumWinRate = 55
    ): LearningStats[] {

        return this.analyze().filter(
            stats =>
                stats.trades >=
                minimumTrades &&
                stats.winRate >=
                minimumWinRate &&
                stats.expectancy > 0
        );

    }

}