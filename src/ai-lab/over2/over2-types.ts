export interface Over2Tick {
    digit: number;
    quote: string;
    epoch: number;
    market: string;
}

export interface Over2DigitStats {
    digit: number;
    count: number;
    percentage: number;
}

export interface Over2Signal {
    strategy: 'OVER_2';
    ready: boolean;
    leastDigit: number | null;

    counts: Record<number, number>;
    percentages: Record<number, number>;

    qualifying: boolean;

    generatedAt: number;
}

export interface Over2EngineState {
    digitStats: Over2DigitStats[];
    signal: Over2Signal | null;
    latestDigit: number | null;
    tickCount: number;
}