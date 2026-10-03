import { createContext, useContext } from 'react';

export type MonehuntAIState = {
    matches: {
        engineState: any | null;
        signal: any | null;
        stats: {
            total: number;
            wins: number;
            losses: number;
            winRate: number;
        };
        active: boolean;
    };

    over2: {
        scannerState: any | null;
        state: any | null;
        signal: any | null;
        active: boolean;
    };

    onlyUpsDowns: {
        snapshot: any | null;
        active: boolean;
    };
};

export type MonehuntAIController = {
    state: MonehuntAIState;

    publishMatches: (
        engineState: any | null,
        signal: any | null,
        stats: MonehuntAIState['matches']['stats']
    ) => void;

    publishOver2: (
        scannerState: any | null,
        state: any | null,
        signal: any | null
    ) => void;

    publishOnlyUpsDowns: (
        snapshot: any | null
    ) => void;

    resetMatches: () => void;
    resetOver2: () => void;
    resetOnlyUpsDowns: () => void;
};

export const createInitialMonehuntAIState =
    (): MonehuntAIState => ({
        matches: {
            engineState: null,
            signal: null,
            stats: {
                total: 0,
                wins: 0,
                losses: 0,
                winRate: 0,
            },
            active: false,
        },

        over2: {
            scannerState: null,
            state: null,
            signal: null,
            active: false,
        },

        onlyUpsDowns: {
            snapshot: null,
            active: false,
        },
    });

export const MonehuntAIContext =
    createContext<MonehuntAIController | null>(null);

export const useMonehuntAI = (): MonehuntAIController => {
    const context = useContext(MonehuntAIContext);

    if (!context) {
        throw new Error(
            'useMonehuntAI must be used inside MonehuntAIProvider'
        );
    }

    return context;
};
