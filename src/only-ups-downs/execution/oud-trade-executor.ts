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

    private async waitForPreviousSettlement(
        tradeEngine: any,
        isRunning: () => boolean,
    ): Promise<void> {
        const timeoutMs = 5000;
        const deadline = Date.now() + timeoutMs;

        while (Date.now() < deadline) {
            if (!isRunning()) {
                throw new Error(
                    'OUD TradeExecutor: lifecycle stopped while waiting for previous settlement.',
                );
            }

            const scope = tradeEngine.store?.getState?.()?.scope;
            const contractId = tradeEngine.contractId;

            if ((scope === 'STOP' || scope === 'BEFORE_PURCHASE') && !contractId) {
                return;
            }

            await new Promise<void>(resolve => setTimeout(resolve, 50));
        }

        const scope = tradeEngine.store?.getState?.()?.scope ?? 'UNKNOWN';
        const contractId = tradeEngine.contractId ?? '';
        throw new Error(
            `OUD TradeExecutor: previous trade did not settle within ${timeoutMs}ms. Scope: ${scope}; contractId: ${contractId || 'none'}.`,
        );
    }

    async execute(
        trade: OUDActiveTrade,
    ): Promise<OUDTradeExecutionResult> {
        const {
            tradeEngine,
            token,
            currency,
            isRunning,
        } = this.options;

        const executionStartedAt = Date.now();
        const logTiming = (stage: string) => console.info('[OUD EXECUTION TIMING]', { tradeId: trade.tradeId, stage, elapsedMs: Date.now() - executionStartedAt, at: new Date().toISOString() });
        logTiming('execute:start');

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
        // Wait for the shared engine to finish any previous contract.
        await this.waitForPreviousSettlement(tradeEngine, isRunning);
        logTiming('settlement:ready');

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
        logTiming('engine:start-ready');

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
        logTiming('before-purchase:ready');

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
            `oud-${trade.tradeId}`,
        );
        logTiming('purchase:promise-resolved');

        const contractId =
            tradeEngine.contractId;

        if (!contractId) {
            const error = new Error(
                `Purchase returned without a contract_id for ${trade.contractType}.`,
            ) as Error & { code: string };
            error.code = 'PURCHASE_OUTCOME_UNCERTAIN';
            throw error;
        }

        logTiming('purchase:contract-id-verified');
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
