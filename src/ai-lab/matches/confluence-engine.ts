export interface ConfluenceInput {
    fibScore: number;
    digitScore: number;
    entryScore: number;
    trendScore: number;
    regimeScore: number;
}

export function calculateConfluence(
    input: ConfluenceInput
) {
    return (
        input.fibScore +
        input.digitScore +
        input.entryScore +
        input.trendScore +
        input.regimeScore
    ) / 5;
}