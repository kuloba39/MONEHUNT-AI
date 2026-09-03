import { TickRecord } from './data-processor';


export type PriceTrend =
    | 'UP'
    | 'DOWN'
    | 'SIDEWAYS';


export interface FibonacciLevels {

    level0: number;
    level236: number;
    level382: number;
    level500: number;
    level618: number;
    level786: number;
    level100: number;
    extension1272: number;
    extension1618: number;

}


export interface PriceContext {

    trend: PriceTrend;

    trendStrength: number;

    currentPrice: number;

    swingHigh: number;

    swingLow: number;

    range: number;

    volatility: number;

    support: number;

    resistance: number;

    fibonacci: FibonacciLevels;

    nearestFibLevel: number;

    nearestFibPrice: number;

    fibDistance: number;

}


function calculateVolatility(
    ticks: TickRecord[]
): number {

    if (
        ticks.length < 2
    ) {

        return 0;

    }

    const changes: number[] = [];

    for (
        let i = 1;
        i < ticks.length;
        i++
    ) {

        const previous =
            ticks[i - 1].price;

        const current =
            ticks[i].price;

        changes.push(
            Math.abs(
                current -
                previous
            )
        );

    }

    if (
        changes.length === 0
    ) {

        return 0;

    }

    return (
        changes.reduce(
            (sum, value) =>
                sum + value,
            0
        ) /
        changes.length
    );

}


function determineTrend(
    ticks: TickRecord[]
): PriceTrend {

    if (
        ticks.length < 2
    ) {

        return 'SIDEWAYS';

    }


    const firstPrice =
        ticks[0].price;


    const lastPrice =
        ticks[
            ticks.length - 1
        ].price;


    const difference =
        lastPrice -
        firstPrice;


    const range =
        Math.max(
            ...ticks.map(
                t => t.price
            )
        ) -
        Math.min(
            ...ticks.map(
                t => t.price
            )
        );


    if (
        range === 0
    ) {

        return 'SIDEWAYS';

    }


    const threshold =
        range * 0.10;


    if (
        difference >
        threshold
    ) {

        return 'UP';

    }


    if (
        difference <
        -threshold
    ) {

        return 'DOWN';

    }


    return 'SIDEWAYS';

}


function calculateTrendStrength(
    ticks: TickRecord[]
): number {

    if (
        ticks.length < 2
    ) {

        return 0;

    }


    const firstPrice =
        ticks[0].price;


    const lastPrice =
        ticks[
            ticks.length - 1
        ].price;


    const difference =
        Math.abs(
            lastPrice -
            firstPrice
        );


    const prices =
        ticks.map(
            tick => tick.price
        );


    const high =
        Math.max(
            ...prices
        );


    const low =
        Math.min(
            ...prices
        );


    const range =
        high - low;


    if (
        range <= 0
    ) {

        return 0;

    }


    return Math.max(
        0,
        Math.min(
            100,
            (
                difference /
                range
            ) * 100
        )
    );

}


function calculateFibonacci(
    swingLow: number,
    swingHigh: number
): FibonacciLevels {

    const range =
        swingHigh -
        swingLow;


    return {

        level0:
            swingLow,

        level236:
            swingHigh -
            range * 0.236,

        level382:
            swingHigh -
            range * 0.382,

        level500:
            swingHigh -
            range * 0.500,

        level618:
            swingHigh -
            range * 0.618,

        level786:
            swingHigh -
            range * 0.786,

        level100:
            swingHigh,

        extension1272:
            swingHigh +
            range * 0.272,

        extension1618:
            swingHigh +
            range * 0.618

    };

}


function findNearestFib(
    price: number,
    fibonacci: FibonacciLevels
): {
    level: number;
    price: number;
    distance: number;
} {

    const levels = [

        {
            level: 0,
            price:
                fibonacci.level0
        },

        {
            level: 23.6,
            price:
                fibonacci.level236
        },

        {
            level: 38.2,
            price:
                fibonacci.level382
        },

        {
            level: 50,
            price:
                fibonacci.level500
        },

        {
            level: 61.8,
            price:
                fibonacci.level618
        },

        {
            level: 78.6,
            price:
                fibonacci.level786
        },

        {
            level: 100,
            price:
                fibonacci.level100
        },

        {
            level: 127.2,
            price:
                fibonacci.extension1272
        },

        {
            level: 161.8,
            price:
                fibonacci.extension1618
        }

    ];


    let nearest =
        levels[0];


    let distance =
        Math.abs(
            price -
            nearest.price
        );


    for (
        let i = 1;
        i < levels.length;
        i++
    ) {

        const currentDistance =
            Math.abs(
                price -
                levels[i].price
            );


        if (
            currentDistance <
            distance
        ) {

            nearest =
                levels[i];

            distance =
                currentDistance;

        }

    }


    return {

        level:
            nearest.level,

        price:
            nearest.price,

        distance

    };

}


export function calculatePriceContext(
    ticks: TickRecord[]
): PriceContext {

    if (
        ticks.length === 0
    ) {

        return {

            trend:
                'SIDEWAYS',

            trendStrength:
                0,

            currentPrice:
                0,

            swingHigh:
                0,

            swingLow:
                0,

            range:
                0,

            volatility:
                0,

            support:
                0,

            resistance:
                0,

            fibonacci: {

                level0:
                    0,

                level236:
                    0,

                level382:
                    0,

                level500:
                    0,

                level618:
                    0,

                level786:
                    0,

                level100:
                    0,

                extension1272:
                    0,

                extension1618:
                    0

            },

            nearestFibLevel:
                0,

            nearestFibPrice:
                0,

            fibDistance:
                0

        };

    }


    const prices =
        ticks.map(
            tick => tick.price
        );


    const swingHigh =
        Math.max(
            ...prices
        );


    const swingLow =
        Math.min(
            ...prices
        );


    const currentPrice =
        ticks[
            ticks.length - 1
        ].price;


    const range =
        swingHigh -
        swingLow;


    const trend =
        determineTrend(
            ticks
        );


    const trendStrength =
        calculateTrendStrength(
            ticks
        );


    const volatility =
        calculateVolatility(
            ticks
        );


    const fibonacci =
        calculateFibonacci(
            swingLow,
            swingHigh
        );


    const nearestFib =
        findNearestFib(
            currentPrice,
            fibonacci
        );


    return {

        trend,

        trendStrength,

        currentPrice,

        swingHigh,

        swingLow,

        range,

        volatility,

        support:
            swingLow,

        resistance:
            swingHigh,

        fibonacci,

        nearestFibLevel:
            nearestFib.level,

        nearestFibPrice:
            nearestFib.price,

        fibDistance:
            nearestFib.distance

    };

}