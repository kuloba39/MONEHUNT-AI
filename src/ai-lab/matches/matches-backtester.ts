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


export class MatchesBacktester {

    private processor =
        new DataProcessor();


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
     * The prediction context is calculated BEFORE
     * the current tick is added to the historical
     * processor.
     *
     * This prevents the current outcome tick from
     * leaking into the prediction model.
     */

    processTick(
        input: BacktestTickInput
    ) {

        const history =
            this.processor.get100();


        /*
         * If enough historical data exists,
         * calculate the prediction from history only.
         */

        let scores = [];

        let barrier = null;

        let entry = null;

        let priceContext = null;

        let regime = null;


        if (
            history.length > 0
        ) {

            scores =
                calculateDigitScores(
                    history
                );


            barrier =
                findBarrier(
                    scores
                );


            entry =
                findEntryDigit(
                    history,
                    barrier
                );


            priceContext =
                calculatePriceContext(
                    history
                );


            regime =
    detectRegime(
        priceContext.volatility,
        priceContext.trendStrength
    );

        }


        const digit =
            this.extractLastDigit(
                input.price
            );


        /*
         * Add the current tick only AFTER the
         * prediction context has been calculated.
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

            regime

        };

    }


    getHistory() {

        return this.processor.get100();

    }


    clear(): void {

        this.processor =
            new DataProcessor();

    }

}
