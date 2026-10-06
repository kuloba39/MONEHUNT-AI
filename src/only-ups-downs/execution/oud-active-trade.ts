import type {
    OUDActiveTrade,
    OUDSignal,
} from './oud-execution-types';

export interface OUDTradeCreationParams {
    stake: number;
    duration: number;
}

/**
 * Creates the immutable trade snapshot from one accepted signal.
 *
 * After this object is created:
 * - direction belongs to the trade
 * - strategy belongs to the trade
 * - market belongs to the trade
 * - contract type belongs to the trade
 *
 * Later scanner changes must not modify this object.
 */
export function createOUDActiveTrade(
    signal: OUDSignal,
    params: OUDTradeCreationParams,
): OUDActiveTrade {
    const tradeId =
        Date.now() * 1000 +
        Math.floor(Math.random() * 1000);

    const contractType =
        signal.direction === 'UP'
            ? 'RUNHIGH'
            : 'RUNLOW';

    return {
        tradeId,
        signalCycleId: signal.signalCycleId,
        direction: signal.direction,
        strategy: signal.strategy,
        market: signal.market,
        stake: params.stake,
        duration: params.duration,
        contractType,
        contractId: null,
    };
}


/**
 * Creates an active trade directly from a manual UP/DOWN request.
 *
 * Manual trades do not belong to a scanner signal cycle.
 * signalCycleId = 0 explicitly identifies that fact.
 */
export function createOUDManualTrade(
    direction: OUDActiveTrade['direction'],
    market: string,
    params: OUDTradeCreationParams,
): OUDActiveTrade {
    const tradeId =
        Date.now() * 1000 +
        Math.floor(Math.random() * 1000);

    const contractType =
        direction === 'UP'
            ? 'RUNHIGH'
            : 'RUNLOW';

    return {
        tradeId,
        signalCycleId: 0,
        direction,
        strategy: 'MANUAL',
        market,
        stake: params.stake,
        duration: params.duration,
        contractType,
        contractId: null,
    };
}
export default createOUDActiveTrade;
