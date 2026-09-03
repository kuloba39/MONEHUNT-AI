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
import {
    MatchesSignal
} from './types';
import {
    OutcomeRecorder
} from './outcome-recorder';
import {
    AdaptiveLearning
} from './adaptive-learning';


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

    signal: MatchesSignal;

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


    private completedOutcomes:
        CompletedMatchesOutcome[] = [];


    private outcomeRecorder =
        new OutcomeRecorder();


    private adaptiveLearning =
        new AdaptiveLearning();


    private readonly OUTCOME_TICKS = 3;


    private extractLastDigit(
        price: number
    ): number {

        const priceString =
            price.toString();


        const digitsOnly =
            priceString.replace(/\D/g, '');


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


    processTick(
        input: BacktestTickInput
    ) {

        /*
         * ---------------------------------------------------------
         * STEP 1
         *
         * The current tick becomes a FUTURE tick for signals
         * that were created on previous ticks.
         *
         * This is intentionally done BEFORE creating a new
         * signal from the current tick.
         *
         * Therefore the entry tick can NEVER count as T+1.
         * ---------------------------------------------------------
         */


        const digit =
            this.extractLastDigit(
                input.price
            );


        const completedOutcomes:
            CompletedMatchesOutcome[] = [];


        for (
            let i =
                this.pendingSignals.length - 1;

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
             * Wait until ALL THREE future ticks
             * have been collected.
             *
             * We intentionally do NOT settle the
             * signal early if the barrier appears
             * on T+1 or T+2.
             */

            if (
                pending.futureTicks.length <
                this.OUTCOME_TICKS
            ) {

                continue;

            }


            /*
             * -----------------------------------------------------
             * FINAL OUTCOME CHECK
             *
             * WIN:
             * barrier appears at least once in T+1/T+2/T+3
             *
             * LOSS:
             * barrier never appears in all three ticks
             * -----------------------------------------------------
             */

            const barrierFound =
                pending.futureDigits.some(
                    futureDigit =>
                        futureDigit ===
                        pending.signal.barrierDigit
                );


            const result:
                BacktestOutcomeResult =
                    barrierFound
                        ? 'WIN'
                        : 'LOSS';


            const completedOutcome:
                CompletedMatchesOutcome = {

                entryTimestamp:
                    pending.signal.timestamp,

                entryIndex:
                    input.index -
                    (
                        pending.futureTicks.length - 1
                    ),

                symbol:
                    pending.signal.symbol,

                entryDigit:
                    pending.signal.entryDigit,

                barrierDigit:
                    pending.signal.barrierDigit,

                futureTicks:
                    [
                        ...pending.futureTicks
                    ],

                futureDigits:
                    [
                        ...pending.futureDigits
                    ],

                barrierFound,

                result

            };


            completedOutcomes.push(
                completedOutcome
            );


            this.completedOutcomes.push(
                completedOutcome
            );


            /*
             * -----------------------------------------------------
             * RECORD THE FINAL OUTCOME
             * -----------------------------------------------------
             */

            const recordedOutcome =
                this.outcomeRecorder.record(
                    pending.signal,
                    result
                );


            /*
             * -----------------------------------------------------
             * FEED THE RESULT INTO ADAPTIVE LEARNING
             * -----------------------------------------------------
             */

            this.adaptiveLearning.addOutcome(
                recordedOutcome
            );


            /*
             * Remove the pending signal only AFTER
             * its complete three-tick outcome has been
             * recorded.
             */

            this.pendingSignals.splice(
                i,
                1
            );

        }


        /*
         * ---------------------------------------------------------
         * STEP 2
         *
         * Prediction uses ONLY the history that existed BEFORE
         * the current tick.
         *
         * This prevents look-ahead bias during backtesting.
         * ---------------------------------------------------------
         */


        const history =
            this.processor.get100();


        const predictionHistory =
            history;


        let scores:
            ReturnType<
                typeof calculateDigitScores
            > = [];


        let barrier:
            ReturnType<
                typeof findBarrier
            > | null = null;


        let entry:
            ReturnType<
                typeof findEntryDigit
            > | null = null;


        let priceContext:
            ReturnType<
                typeof calculatePriceContext
            > | null = null;


        let regime:
            ReturnType<
                typeof detectRegime
            > | null = null;


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
         * ---------------------------------------------------------
         * STEP 3
         *
         * Add the current tick to history AFTER prediction.
         *
         * This preserves proper chronological backtesting.
         * ---------------------------------------------------------
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
         * ---------------------------------------------------------
         * STEP 4
         *
         * If the current digit is the predicted entry digit,
         * create a PENDING MatchesSignal.
         *
         * IMPORTANT:
         *
         * The signal is NOT immediately WIN or LOSS.
         *
         * It remains PENDING until three future ticks
         * have been collected.
         * ---------------------------------------------------------
         */


        let pendingSignal:
            PendingMatchesSignal | null =
                null;


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

            /*
             * -----------------------------------------------------
             * FIBONACCI CONFLUENCE SCORE
             * -----------------------------------------------------
             */

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


            /*
             * -----------------------------------------------------
             * DIGIT BARRIER SCORE
             * -----------------------------------------------------
             */

            const digitScore =
                barrier.topScore > 0

                    ? Math.min(
                        100,
                        barrier.topScore
                    )

                    : 0;


            /*
             * -----------------------------------------------------
             * TREND SCORE
             * -----------------------------------------------------
             */

            const trendScore =
                priceContext.trendStrength;


            /*
             * -----------------------------------------------------
             * REGIME SCORE
             * -----------------------------------------------------
             */

            const regimeScore =
                regime.confidence;


            /*
             * -----------------------------------------------------
             * CONFLUENCE
             * -----------------------------------------------------
             */

            const confluenceScore =
                (
                    fibScore +
                    digitScore +
                    entry.entryScore +
                    trendScore +
                    regimeScore
                ) / 5;


            /*
             * -----------------------------------------------------
             * QUALITY SCORE
             * -----------------------------------------------------
             */

            const qualityScore =
                (
                    confluenceScore * 0.50
                    +
                    barrier.confidence * 0.25
                    +
                    entry.entryScore * 0.25
                );


            /*
             * -----------------------------------------------------
             * CREATE THE ACTUAL MATCHES SIGNAL
             *
             * It starts as PENDING.
             *
             * OutcomeRecorder will receive this same signal
             * when T+3 completes.
             * -----------------------------------------------------
             */

            const signal:
                MatchesSignal = {

                timestamp:
                    input.timestamp,

                symbol:
                    input.symbol,

                price:
                    input.price,

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

                confidence:
                    qualityScore,

                ready:
                    entry.ready,

                result:
                    'PENDING'

            };


            pendingSignal = {

                signal,

                futureTicks: [],

                futureDigits: []

            };


            this.pendingSignals.push(
                pendingSignal
            );

        }


        /*
         * ---------------------------------------------------------
         * RETURN BACKTEST STATE
         * ---------------------------------------------------------
         */

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


    /*
     * -------------------------------------------------------------
     * HISTORY
     * -------------------------------------------------------------
     */

    getHistory() {

        return this.processor.get100();

    }


    /*
     * -------------------------------------------------------------
     * PENDING SIGNALS
     * -------------------------------------------------------------
     *
     * Returns defensive copies so callers cannot accidentally
     * modify the internal pending state.
     * -------------------------------------------------------------
     */

    getPendingSignals():
        PendingMatchesSignal[] {

        return this.pendingSignals.map(
            pending => ({

                signal: {
                    ...pending.signal
                },

                futureTicks: [
                    ...pending.futureTicks
                ],

                futureDigits: [
                    ...pending.futureDigits
                ]

            })
        );

    }


    getPendingCount():
        number {

        return this.pendingSignals.length;

    }


    /*
     * -------------------------------------------------------------
     * COMPLETED OUTCOMES
     * -------------------------------------------------------------
     */

    getCompletedOutcomes():
        CompletedMatchesOutcome[] {

        return [
            ...this.completedOutcomes
        ];

    }


    getTotalCompletedOutcomes():
        number {

        return this.completedOutcomes.length;

    }


    /*
     * -------------------------------------------------------------
     * OUTCOME RECORDER ACCESS
     * -------------------------------------------------------------
     */

    getOutcomes() {

        return this.outcomeRecorder.getAll();

    }


    getWins() {

        return this.outcomeRecorder.getWins();

    }


    getLosses() {

        return this.outcomeRecorder.getLosses();

    }


    getTotalOutcomes():
        number {

        return this.outcomeRecorder.getTotal();

    }


    getWinRate():
        number {

        return this.outcomeRecorder.getWinRate();

    }


    /*
     * -------------------------------------------------------------
     * ADAPTIVE LEARNING ACCESS
     * -------------------------------------------------------------
     */

    getLearningStats() {

        return this.adaptiveLearning.analyze();

    }


    getBestCombinations(
        minimumTrades = 10
    ) {

        return this.adaptiveLearning
            .getBestCombinations(
                minimumTrades
            );

    }


    getReliableCombinations(
        minimumTrades = 30,
        minimumWinRate = 55
    ) {

        return this.adaptiveLearning
            .getReliableCombinations(
                minimumTrades,
                minimumWinRate
            );

    }


    getTotalLearningOutcomes():
        number {

        return this.adaptiveLearning
            .getTotalOutcomes();

    }


    /*
     * -------------------------------------------------------------
     * CLEAR EVERYTHING
     * -------------------------------------------------------------
     *
     * Clears:
     *
     * - tick history
     * - pending signals
     * - completed outcomes
     * - recorded outcomes
     * - adaptive learning data
     * -------------------------------------------------------------
     */

    clear(): void {

        this.processor =
            new DataProcessor();


        this.pendingSignals = [];


        this.completedOutcomes = [];


        this.outcomeRecorder.clear();


        this.adaptiveLearning.clear();

    }

}