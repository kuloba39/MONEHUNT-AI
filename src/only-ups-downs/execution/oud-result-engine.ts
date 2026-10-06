import type {
    OUDTradeResult,
} from './oud-execution-types';

export interface OUDResultEngineConfig {
    martingaleEnabled: boolean;
    martingaleMultiplier: number;
    maxMartingaleLevel: number;
    baseStake: number;
    currentRecoveryLevel: number;
    previousTotalTrades: number;
    previousWins: number;
    previousLosses: number;
    previousTotalProfit: number;
}

export interface OUDResultEngineOutput {
    recoveryLevel: number;
    nextStake: number;
    totalTrades: number;
    wins: number;
    losses: number;
    totalProfit: number;
    winRate: number;
}

/**
 * Pure OUD Result Engine.
 *
 * It does not:
 * - access the scanner
 * - access TradeEngine
 * - choose direction
 * - purchase contracts
 * - modify controller state
 *
 * It only converts one completed OUDTradeResult into
 * the next statistics/recovery state.
 */
export function processOUDTradeResult(
    result: OUDTradeResult,
    config: OUDResultEngineConfig,
): OUDResultEngineOutput {
    const isWin =
        result.result === 'WIN';

    const nextRecoveryLevel =
        isWin || !config.martingaleEnabled
            ? 0
            : Math.min(
                  Math.max(
                      0,
                      Math.floor(
                          config.currentRecoveryLevel,
                      ),
                  ) + 1,
                  Math.max(
                      0,
                      Math.floor(
                          config.maxMartingaleLevel,
                      ),
                  ),
              );

    const totalTrades =
        config.previousTotalTrades + 1;

    const wins =
        config.previousWins +
        (isWin ? 1 : 0);

    const losses =
        config.previousLosses +
        (isWin ? 0 : 1);

    const profit =
        Number(result.profit);

    const safeProfit =
        Number.isFinite(profit)
            ? profit
            : 0;

    const totalProfit =
        Number(
            (
                config.previousTotalProfit +
                safeProfit
            ).toFixed(8),
        );

    const winRate =
        totalTrades > 0
            ? Number(
                  (
                      (wins / totalTrades) *
                      100
                  ).toFixed(2),
              )
            : 0;

    const normalizedBaseStake =
        Number(config.baseStake);

    const safeBaseStake =
        Number.isFinite(
            normalizedBaseStake,
        ) &&
        normalizedBaseStake > 0
            ? normalizedBaseStake
            : 0;

    const multiplier =
        Number(config.martingaleMultiplier);

    const safeMultiplier =
        Number.isFinite(multiplier) &&
        multiplier >= 1
            ? multiplier
            : 1;

    const nextStake =
        config.martingaleEnabled
            ? Number(
                  (
                      safeBaseStake *
                      Math.pow(
                          safeMultiplier,
                          nextRecoveryLevel,
                      )
                  ).toFixed(8),
              )
            : safeBaseStake;

    return {
        recoveryLevel:
            nextRecoveryLevel,
        nextStake,
        totalTrades,
        wins,
        losses,
        totalProfit,
        winRate,
    };
}

export default processOUDTradeResult;
