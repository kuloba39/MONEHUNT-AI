import { DataProcessor } from './data-processor';
import { calculateDigitScores } from './digit-engine';
import { findBarrier } from './barrier-engine';
import { findEntryDigit } from './entry-engine';
import {
    calculatePriceContext
} from './price-engine';
import {
    detectRegime
} from './regime-engine';


export interface BacktestTickInput {

    timestamp: number;

    symbol: string;

    price: number;

    index: number;

}


export type BacktestOutcomeResult =
    | 'WIN'
    | 'LOSS';


export interface PendingMatchesSignal {

    entryTimestamp: number;

    entryIndex: number;

    symbol: string;

    entryDigit: number;

    barrierDigit: number;

    barrierScore: number;

    barrierConfidence: number;

    entryScore: number;

    relationshipScore: number;

    fibLevel: number;

    fibPrice: number;

    fibDistance: number;

    trend: ReturnType<typeof calculatePriceContext>['trend'];

    regime: ReturnType<typeof detectRegime>['regime'];

    regimeConfidence: number;

    confluenceScore: number;

    qualityScore: number;

    futureTicks: BacktestTickInput[];

    futureDigits: number[];

}


export interface CompletedMatchesOutcome {

    entryTimestamp: number;

    entryIndex: number;

    symbol: string;

    entryDigit: number;

    barrierDigit: number;

    futureTicks: BacktestTickInput[];

    futureDigits: number[];

    barrierFound: boolean;

    result: BacktestOutcomeResult;

}


export class MatchesBacktester {

    private processor =
        new DataProcessor();


    private pendingSignals:
        PendingMatchesSignal[] = [];


    /*
     * Matches outcome window.
     *
     * After the entry digit appears,
     * the engine MUST collect all 3 future ticks
     * before deciding WIN or LOSS.
     */

    private readonly OUTCOME_TICKS =
        3;


    /*
     * Extract the final decimal digit from the
     * price representation.
     *
     * We intentionally use the string representation
     * rather than arithmetic rounding so that decimal
     * quotes can preserve their final displayed digit.
     */

    private extractLastDigit(
        price: number
    ): number {

        const priceString =
            price.toString();


        const digitsOnly =
            priceString.replace(
                /\D/g,
                ''
            );


        if (
            digitsOnly.length === 0
        ) {

            return 0;

        }


        return Number(
            digitsOnly[
                digitsOnly.length - 1
            ]
        );

    }


    /*
     * Process one historical tick.
     *
     * IMPORTANT:
     *
     * 1. Existing pending signals are evaluated
     *    against this tick as a FUTURE tick.
     *
     * 2. The prediction context for a NEW signal
     *    is calculated BEFORE the current tick is
     *    added to historical data.
     *
     * 3. A new signal is created only when the
     *    current digit matches the proposed entry digit.
     *
     * 4. A pending signal is NEVER decided early.
     *    Exactly 3 future ticks are collected first.
     */

    processTick(
        input: BacktestTickInput
    ) {

        const history =
            this.processor.get100();


        /*
         * Extract the current tick digit.
         */

        const digit =
            this.extractLastDigit(
                input.price
            );


        /*
         * Completed outcomes produced by
         * pending signals during this tick.
         */

        const completedOutcomes:
            CompletedMatchesOutcome[] = [];


        /*
         * --------------------------------------------------
         * STEP 1
         * --------------------------------------------------
         *
         * The current tick is a FUTURE tick for every
         * signal that was created before this tick.
         *
         * Add it to every pending signal.
         */

        for (
            let i = this.pendingSignals.length - 1;
            i >= 0;
            i--
        ) {

            const pending =
                this.pendingSignals[i];


            pending.futureTicks.push(
                input
            );


            pending.futureDigits.push(
                digit
            );


            /*
             * IMPORTANT:
             *
             * We do NOT decide WIN/LOSS until
             * all 3 future ticks have been collected.
             */

            if (
                pending.futureTicks.length <
                this.OUTCOME_TICKS
            ) {

                continue;

            }


            /*
             * --------------------------------------------------
             * STEP 2
             * --------------------------------------------------
             *
             * All 3 future ticks are now available.
             *
             * Check the COMPLETE 3-tick window.
             */

            const barrierFound =
                pending.futureDigits.some(
                    futureDigit =>
                        futureDigit ===
                        pending.barrierDigit
                );


            const result:
                BacktestOutcomeResult =
                    barrierFound
                        ? 'WIN'
                        : 'LOSS';


            completedOutcomes.push({

                entryTimestamp:
                    pending.entryTimestamp,

                entryIndex:
                    pending.entryIndex,

                symbol:
                    pending.symbol,

                entryDigit:
                    pending.entryDigit,

                barrierDigit:
                    pending.barrierDigit,

                futureTicks:
                    [...pending.futureTicks],

                futureDigits:
                    [...pending.futureDigits],

                barrierFound,

                result

            });


            /*
             * Remove the completed signal.
             */

            this.pendingSignals.splice(
                i,
                1
            );

        }


        /*
         * --------------------------------------------------
         * STEP 3
         * --------------------------------------------------
         *
         * Calculate a NEW prediction using history ONLY.
         *
         * The current tick has NOT been added yet.
         *
         * This prevents look-ahead bias.
         */

        const predictionHistory =
            history;


        let scores: ReturnType<
            typeof calculateDigitScores
        > = [];


        let barrier:
            ReturnType<typeof findBarrier> |
            null = null;


        let entry:
            ReturnType<typeof findEntryDigit> |
            null = null;


        let priceContext:
            ReturnType<typeof calculatePriceContext> |
            null = null;


        let regime:
            ReturnType<typeof detectRegime> |
            null = null;


        if (
            predictionHistory.length > 0
        ) {

            scores =
                calculateDigitScores(
                    predictionHistory
                );


            barrier =
                findBarrier(
                    scores
                );


            entry =
                findEntryDigit(
                    predictionHistory,
                    barrier
                );


            priceContext =
                calculatePriceContext(
                    predictionHistory
                );


            regime =
                detectRegime(
                    priceContext.volatility,
                    priceContext.trendStrength
                );

        }


        /*
         * --------------------------------------------------
         * STEP 4
         * --------------------------------------------------
         *
         * Add the current tick to historical data
         * AFTER prediction calculation.
         */

        this.processor.addTick({

            timestamp:
                input.timestamp,

            symbol:
                input.symbol,

            price:
                input.price,

            digit,

            index:
                input.index

        });


        /*
         * --------------------------------------------------
         * STEP 5
         * --------------------------------------------------
         *
         * Check whether the CURRENT digit is the
         * proposed ENTRY digit.
         *
         * If yes, create a PENDING signal.
         *
         * IMPORTANT:
         *
         * The entry tick itself is NOT one of the
         * three outcome ticks.
         *
         * The next three ticks will be:
         *
         * T+1
         * T+2
         * T+3
         */

        let pendingSignal:
            PendingMatchesSignal |
            null = null;


        if (
            entry &&
            barrier &&
            priceContext &&
            regime &&
            entry.ready &&
            entry.entryDigit >= 0 &&
            barrier.barrierDigit >= 0 &&
            digit === entry.entryDigit
        ) {

            const fibScore =
                priceContext.fibDistance <= 0
                    ? 100
                    : Math.max(
                        0,
                        Math.min(
                            100,
                            100 -
                            (
                                priceContext.fibDistance /
                                Math.max(
                                    priceContext.range,
                                    Number.EPSILON
                                )
                            ) * 100
                        )
                    );


            const digitScore =
                barrier.topScore > 0
                    ? Math.min(
                        100,
                        barrier.topScore
                    )
                    : 0;


            const trendScore =
                priceContext.trendStrength;


            const regimeScore =
                regime.confidence;


            const confluenceScore =
                (
                    fibScore +
                    digitScore +
                    entry.entryScore +
                    trendScore +
                    regimeScore
                ) / 5;


            const qualityScore =
                (
                    confluenceScore * 0.50
                    +
                    barrier.confidence * 0.25
                    +
                    entry.entryScore * 0.25
                );


            pendingSignal = {

                entryTimestamp:
                    input.timestamp,

                entryIndex:
                    input.index,

                symbol:
                    input.symbol,

                entryDigit:
                    entry.entryDigit,

                barrierDigit:
                    barrier.barrierDigit,

                barrierScore:
                    barrier.topScore,

                barrierConfidence:
                    barrier.confidence,

                entryScore:
                    entry.entryScore,

                relationshipScore:
                    entry.relationshipScore,

                fibLevel:
                    priceContext.nearestFibLevel,

                fibPrice:
                    priceContext.nearestFibPrice,

                fibDistance:
                    priceContext.fibDistance,

                trend:
                    priceContext.trend,

                regime:
                    regime.regime,

                regimeConfidence:
                    regime.confidence,

                confluenceScore,

                qualityScore,

                futureTicks: [],

                futureDigits: []

            };


            this.pendingSignals.push(
                pendingSignal
            );

        }


        return {

            tick:
                input,

            digit,

            historySize:
                history.length,

            scores,

            barrier,

            entry,

            priceContext,

            regime,

            pendingSignal,

            pendingSignals:
                this.pendingSignals.length,

            completedOutcomes

        };

    }


    getHistory() {

        return this.processor.get100();

    }


    getPendingSignals():
        PendingMatchesSignal[] {

        return this.pendingSignals.map(
            signal => ({

                ...signal,

                futureTicks:
                    [...signal.futureTicks],

                futureDigits:
                    [...signal.futureDigits]

            })
        );

    }


    getPendingCount(): number {

        return this.pendingSignals.length;

    }


    clear(): void {

        this.processor =
            new DataProcessor();


        this.pendingSignals = [];

    }

}