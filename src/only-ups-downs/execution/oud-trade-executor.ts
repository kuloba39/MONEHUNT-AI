import type { OUDActiveTrade } from './oud-execution-types';

export interface OUDTradeExecutorOptions {
    tradeEngine: any;
    token: string;
    currency: string;
    isRunning: () => boolean;
}

export interface OUDTradeExecutionResult {
    contractId: string;
    trade: OUDActiveTrade;
}

/**
 * Native OUD Trade Executor.
 *
 * This is the ONLY execution-layer component responsible for
 * converting an accepted OUDActiveTrade into a real Deriv purchase.
 *
 * It does not:
 * - read scanner signals
 * - choose direction
 * - change direction
 * - consume scanner signals
 * - calculate strategy
 * - monitor the completed contract
 *
 * The ActiveTrade already contains the locked direction and
 * contract type.
 */
export class OUDTradeExecutor {
    constructor(
        private readonly options: OUDTradeExecutorOptions,
    ) {}

    async execute(
        trade: OUDActiveTrade,
    ): Promise<OUDTradeExecutionResult> {
        const {
            tradeEngine,
            token,
            currency,
            isRunning,
        } = this.options;

        if (!tradeEngine) {
            throw new Error(
                'OUD TradeExecutor: TradeEngine is unavailable.',
            );
        }

        if (!token) {
            throw new Error(
                'OUD TradeExecutor: Deriv token is unavailable.',
            );
        }

        if (!isRunning()) {
            throw new Error(
                'OUD TradeExecutor: execution lifecycle is not RUNNING.',
            );
        }

        /*
         * Reuse MONEHUNT's existing TradeEngine.
         * No second API/WebSocket connection is created.
         */
        tradeEngine.init(token, {
            symbol: trade.market,
            contractTypes: [
                'RUNHIGH',
                'RUNLOW',
            ],
            candleInterval: 60,
            shouldRestartOnError: true,
            nativeOudDirectPurchase: true,
            timeMachineEnabled: false,
        });

        if (tradeEngine.startPromise) {
            await tradeEngine.startPromise;
        }

        if (!isRunning()) {
            throw new Error(
                'OUD TradeExecutor: lifecycle stopped before TradeEngine.start().',
            );
        }

        /*
         * Native OUD uses direct purchase.
         *
         * The contract type has already been locked inside
         * OUDActiveTrade:
         *
         *   UP   -> RUNHIGH
         *   DOWN -> RUNLOW
         */
        tradeEngine.start({
            amount: trade.stake,
            currency,
            duration: trade.duration,
            duration_unit: 't',
            basis: 'stake',
        });

        await tradeEngine.watch('before');

        const beforeState =
            tradeEngine.store?.getState?.();

        if (
            beforeState &&
            beforeState.scope !== 'BEFORE_PURCHASE'
        ) {
            throw new Error(
                `OUD TradeEngine did not reach BEFORE_PURCHASE. Scope: ${beforeState.scope}`,
            );
        }

        const beforeContractId =
            tradeEngine.contractId;

        if (beforeContractId) {
            throw new Error(
                `TradeEngine already has active contract ${beforeContractId}.`,
            );
        }

        /*
         * Final lifecycle gate immediately before purchase.
         */
        if (!isRunning()) {
            throw new Error(
                'OUD TradeExecutor: lifecycle stopped before purchase.',
            );
        }

        /*
         * Direction is NOT recalculated here.
         *
         * The executor purchases the contract type that was
         * already locked into OUDActiveTrade.
         */
        await tradeEngine.purchase(
            trade.contractType,
        );

        const contractId =
            tradeEngine.contractId;

        if (!contractId) {
            throw new Error(
                `Purchase returned without a contract_id for ${trade.contractType}.`,
            );
        }

        return {
            contractId: String(contractId),
            trade: {
                ...trade,
                contractId: String(contractId),
            },
        };
    }
}

export default OUDTradeExecutor;
