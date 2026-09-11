import type {
    OnlyUpsDownsDirection,
} from "../types/only-ups-downs-types";

export interface OnlyUpsDownsPressureWindow {
    windowSize: number;
    upPressure: number;
    downPressure: number;
    balance: number;
    dominance: OnlyUpsDownsDirection | "neutral";
    strength: number;
    persistence: number;
}

export interface OnlyUpsDownsMomentumTransfer {
    from: OnlyUpsDownsDirection | null;
    to: OnlyUpsDownsDirection | null;
    magnitude: number;
    acceleration: number;
    quality: number;
}

export interface OnlyUpsDownsPressure {
    short: OnlyUpsDownsPressureWindow;
    medium: OnlyUpsDownsPressureWindow;
    long: OnlyUpsDownsPressureWindow;

    dominantDirection: OnlyUpsDownsDirection | "neutral";
    overallStrength: number;
    pressureQuality: number;
    acceleration: number;

    transfer: OnlyUpsDownsMomentumTransfer;

    oppositePressure: number;
}

export interface PressureEngineOptions {
    shortWindow?: number;
    mediumWindow?: number;
    longWindow?: number;
    minimumSamples?: number;
}

interface WindowPressure {
    up: number;
    down: number;
    balance: number;
    dominance: OnlyUpsDownsDirection | "neutral";
    strength: number;
    persistence: number;
}

const clamp = (value: number, min = 0, max = 100): number =>
    Math.max(min, Math.min(max, value));

const average = (values: number[]): number => {
    if (!values.length) {
        return 0;
    }

    return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const calculateTickDirections = (
    prices: number[],
): number[] => {
    const moves: number[] = [];

    for (let i = 1; i < prices.length; i += 1) {
        const current = prices[i];
        const previous = prices[i - 1];

        if (!Number.isFinite(current) || !Number.isFinite(previous)) {
            moves.push(0);
            continue;
        }

        if (current > previous) {
            moves.push(1);
        } else if (current < previous) {
            moves.push(-1);
        } else {
            moves.push(0);
        }
    }

    return moves;
};

const calculateWindowPressure = (
    moves: number[],
    windowSize: number,
): WindowPressure => {
    if (!moves.length) {
        return {
            up: 0,
            down: 0,
            balance: 0,
            dominance: "neutral",
            strength: 0,
            persistence: 0,
        };
    }

    const size = Math.max(1, Math.min(windowSize, moves.length));
    const window = moves.slice(-size);

    let upWeight = 0;
    let downWeight = 0;
    let upTicks = 0;
    let downTicks = 0;
    let activeTicks = 0;

    for (let i = 0; i < window.length; i += 1) {
        const move = window[i];

        // Give slightly more weight to newer ticks.
        const weight = 1 + i / Math.max(1, window.length - 1);

        if (move > 0) {
            upWeight += weight;
            upTicks += 1;
            activeTicks += 1;
        } else if (move < 0) {
            downWeight += weight;
            downTicks += 1;
            activeTicks += 1;
        }
    }

    const totalWeight = upWeight + downWeight;

    if (totalWeight <= 0) {
        return {
            up: 0,
            down: 0,
            balance: 0,
            dominance: "neutral",
            strength: 0,
            persistence: 0,
        };
    }

    const up = (upWeight / totalWeight) * 100;
    const down = (downWeight / totalWeight) * 100;
    const balance = up - down;

    const dominance: OnlyUpsDownsDirection | "neutral" =
        balance > 5
            ? "ups"
            : balance < -5
                ? "downs"
                : "neutral";

    const strength = clamp(Math.abs(balance));

    const dominantTicks =
        balance >= 0
            ? upTicks
            : downTicks;

    const persistence =
        activeTicks > 0
            ? clamp((dominantTicks / activeTicks) * 100)
            : 0;

    return {
        up,
        down,
        balance,
        dominance,
        strength,
        persistence,
    };
};

const calculatePressureAcceleration = (
    balances: number[],
): number => {
    if (balances.length < 2) {
        return 0;
    }

    const recent = balances[balances.length - 1];
    const previous = balances[balances.length - 2];

    return recent - previous;
};

const calculateTransfer = (
    short: WindowPressure,
    medium: WindowPressure,
    long: WindowPressure,
): OnlyUpsDownsMomentumTransfer => {
    const previousControl =
        (long.balance * 0.5) +
        (medium.balance * 0.3) +
        (short.balance * 0.2);

    const currentControl =
        (short.balance * 0.5) +
        (medium.balance * 0.3) +
        (long.balance * 0.2);

    const transfer = currentControl - previousControl;

    let from: OnlyUpsDownsDirection | null = null;
    let to: OnlyUpsDownsDirection | null = null;

    if (transfer > 8) {
        from = "downs";
        to = "ups";
    } else if (transfer < -8) {
        from = "ups";
        to = "downs";
    }

    const magnitude = clamp(Math.abs(transfer));

    const acceleration =
        Math.abs(short.balance - medium.balance);

    const quality = clamp(
        (magnitude * 0.55) +
        (acceleration * 0.25) +
        (short.strength * 0.20),
    );

    return {
        from,
        to,
        magnitude,
        acceleration,
        quality,
    };
};

const calculatePressureQuality = (
    short: WindowPressure,
    medium: WindowPressure,
    long: WindowPressure,
): number => {
    const agreement =
        (
            Math.abs(short.balance - medium.balance) +
            Math.abs(medium.balance - long.balance)
        ) / 2;

    const persistence =
        (
            short.persistence +
            medium.persistence +
            long.persistence
        ) / 3;

    const strength =
        (
            short.strength +
            medium.strength +
            long.strength
        ) / 3;

    // Strong pressure is good, but excessive disagreement between
    // windows means the market may be transitioning or noisy.
    const coherence = clamp(100 - agreement);

    return clamp(
        (strength * 0.40) +
        (persistence * 0.35) +
        (coherence * 0.25),
    );
};

const buildWindow = (
    window: WindowPressure,
    windowSize: number,
): OnlyUpsDownsPressureWindow => ({
    windowSize,
    upPressure: window.up,
    downPressure: window.down,
    balance: window.balance,
    dominance: window.dominance,
    strength: window.strength,
    persistence: window.persistence,
});

export const calculateOnlyUpsDownsPressure = (
    prices: number[],
    options: PressureEngineOptions = {},
): OnlyUpsDownsPressure => {
    const shortWindow = options.shortWindow ?? 5;
    const mediumWindow = options.mediumWindow ?? 12;
    const longWindow = options.longWindow ?? 25;
    const minimumSamples = options.minimumSamples ?? 8;

    const cleanPrices = prices.filter(
        (price) => Number.isFinite(price),
    );

    if (cleanPrices.length < minimumSamples) {
        return {
            short: buildWindow(
                calculateWindowPressure([], shortWindow),
                shortWindow,
            ),
            medium: buildWindow(
                calculateWindowPressure([], mediumWindow),
                mediumWindow,
            ),
            long: buildWindow(
                calculateWindowPressure([], longWindow),
                longWindow,
            ),
            dominantDirection: "neutral",
            overallStrength: 0,
            pressureQuality: 0,
            acceleration: 0,
            transfer: {
                from: null,
                to: null,
                magnitude: 0,
                acceleration: 0,
                quality: 0,
            },
            oppositePressure: 0,
        };
    }

    const moves = calculateTickDirections(cleanPrices);

    const short = calculateWindowPressure(
        moves,
        shortWindow,
    );

    const medium = calculateWindowPressure(
        moves,
        mediumWindow,
    );

    const long = calculateWindowPressure(
        moves,
        longWindow,
    );

    const balances = [
        long.balance,
        medium.balance,
        short.balance,
    ];

    const acceleration =
        calculatePressureAcceleration(balances);

    const transfer = calculateTransfer(
        short,
        medium,
        long,
    );

    const pressureQuality =
        calculatePressureQuality(
            short,
            medium,
            long,
        );

    const weightedBalance =
        (short.balance * 0.50) +
        (medium.balance * 0.30) +
        (long.balance * 0.20);

    const dominantDirection: OnlyUpsDownsDirection | "neutral" =
        weightedBalance > 5
            ? "ups"
            : weightedBalance < -5
                ? "downs"
                : "neutral";

    const overallStrength =
        clamp(Math.abs(weightedBalance));

    const oppositePressure =
        dominantDirection === "ups"
            ? clamp(50 - short.up + 50)
            : dominantDirection === "downs"
                ? clamp(50 - short.down + 50)
                : 0;

    return {
        short: buildWindow(short, shortWindow),
        medium: buildWindow(medium, mediumWindow),
        long: buildWindow(long, longWindow),
        dominantDirection,
        overallStrength,
        pressureQuality,
        acceleration,
        transfer,
        oppositePressure,
    };
};

export const getOnlyUpsDownsPressure =
    calculateOnlyUpsDownsPressure;

