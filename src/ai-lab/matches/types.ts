import { TickRecord } from './data-processor';
import { DigitScore } from './digit-engine';
import { BarrierResult } from './barrier-engine';
import { EntryResult } from './entry-engine';
import { PriceContext } from './price-engine';
import { RegimeResult } from './regime-engine';


export type SignalResult =
    | 'WIN'
    | 'LOSS'
    | 'NO_TRADE'
    | 'PENDING';


export interface MatchesContext {

    timestamp: number;

    symbol: string;

    price: number;

    digit: number;

    ticks: TickRecord[];

    priceContext: PriceContext;

    digitScores: DigitScore[];

    barrier: BarrierResult;

    entry: EntryResult;

    regime: RegimeResult;

}


export interface MatchesSignal {

    timestamp: number;

    symbol: string;

    price: number;

    entryDigit: number;

    barrierDigit: number;

    barrierScore: number;

    barrierConfidence: number;

    entryScore: number;

    relationshipScore: number;

    fibLevel: number;

    fibPrice: number;

    fibDistance: number;

    trend: PriceContext['trend'];

    regime: RegimeResult['regime'];

    regimeConfidence: number;

    confluenceScore: number;

    qualityScore: number;

    confidence: number;

    ready: boolean;

    result: SignalResult;

}


export interface RecordedOutcome {

    timestamp: number;

    symbol: string;

    entryDigit: number;

    barrierDigit: number;

    fibLevel: number;

    trend: PriceContext['trend'];

    regime: RegimeResult['regime'];

    qualityScore: number;

    confluenceScore: number;

    result: 'WIN' | 'LOSS';

}


export interface LearningKey {

    symbol: string;

    regime: RegimeResult['regime'];

    entryDigit: number;

    barrierDigit: number;

    fibLevel: number;

}


export interface LearningStats {

    key: LearningKey;

    trades: number;

    wins: number;

    losses: number;

    winRate: number;

    expectancy: number;

}