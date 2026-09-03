export interface ConfluenceInput {
    fibScore: number;
    digitScore: number;
    entryScore: number;
    trendScore: number;
    regimeScore: number;
}

const WEIGHTS = {
    entry: 0.25,
    digit: 0.25,
    fib: 0.20,
    trend: 0.15,
    regime: 0.15
};

function clamp(
    value: number,
    minimum: number,
    maximum: number
): number {
    return Math.max(
        minimum,
        Math.min(
            maximum,
            value
        )
    );
}

export function calculateConfluence(
    input: ConfluenceInput
): number {

    const fibScore =
        clamp(input.fibScore, 0, 100);

    const digitScore =
        clamp(input.digitScore, 0, 100);

    const entryScore =
        clamp(input.entryScore, 0, 100);

    const trendScore =
        clamp(input.trendScore, 0, 100);

    const regimeScore =
        clamp(input.regimeScore, 0, 100);

    return (
        entryScore * WEIGHTS.entry +
        digitScore * WEIGHTS.digit +
        fibScore * WEIGHTS.fib +
        trendScore * WEIGHTS.trend +
        regimeScore * WEIGHTS.regime
    );
}
