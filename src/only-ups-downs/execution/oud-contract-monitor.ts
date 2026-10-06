import type {
    OUDActiveTrade,
    OUDTradeResult,
} from './oud-execution-types';

export interface OUDContractMonitorOptions {
    tradeEngine: any;
    onResult: (result: OUDTradeResult) => void;
}

/**
 * Native OUD Contract Monitor.
 *
 * The TradeEngine already owns the Deriv WebSocket subscription
 * and keeps the latest proposal_open_contract in:
 *
 *     tradeEngine.data.contract
 *
 * This monitor does NOT create another WebSocket subscription.
 *
 * Its only responsibility is:
 *
 *     ACTIVE TRADE
 *          ↓
 *     observe contract
 *          ↓
 *     detect sold
 *          ↓
 *     create OUDTradeResult
 *
 * Direction comes exclusively from OUDActiveTrade.
 */
export class OUDContractMonitor {
    private tradeEngine: any;

    setTradeEngine(tradeEngine: any): void {
        this.tradeEngine = tradeEngine;
    }
    private readonly onResult: (
        result: OUDTradeResult,
    ) => void;

    private timer:
        ReturnType<typeof setInterval> | null = null;

    private monitoringTradeId: number | null = null;
    private completedTradeId: number | null = null;

    constructor(
        options: OUDContractMonitorOptions,
    ) {
        this.tradeEngine = options.tradeEngine;
        this.onResult = options.onResult;
    }

    start(trade: OUDActiveTrade): void {
        this.stop();

        this.monitoringTradeId = trade.tradeId;
        this.completedTradeId = null;

        this.timer = setInterval(() => {
            this.check(trade);
        }, 100);
    }

    private check(trade: OUDActiveTrade): void {
        if (
            this.monitoringTradeId !==
            trade.tradeId
        ) {
            return;
        }

        if (
            this.completedTradeId ===
            trade.tradeId
        ) {
            return;
        }

        const contract =
            this.tradeEngine?.data?.contract;

        if (!contract) {
            return;
        }

        /*
         * Never accept a contract belonging to another trade.
         */
        if (
            !contract.contract_id ||
            !trade.contractId ||
            String(contract.contract_id) !==
                String(trade.contractId)
        ) {
            return;
        }

        /*
         * Contract is still active.
         */
        if (!contract.is_sold) {
            return;
        }

        this.completedTradeId =
            trade.tradeId;

        this.stop();

        const profitValue =
            Number(contract.profit);

        const result: OUDTradeResult = {
            tradeId: trade.tradeId,
            signalCycleId:
                trade.signalCycleId,
            direction:
                trade.direction,
            strategy:
                trade.strategy,
            market:
                trade.market,
            result:
                Number.isFinite(profitValue) &&
                profitValue > 0
                    ? 'WIN'
                    : 'LOSS',
            profit:
                Number.isFinite(profitValue)
                    ? profitValue
                    : null,
            contractId:
                String(contract.contract_id),
            timestamp:
                new Date().toISOString(),
        };

        this.onResult(result);
    }

    stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        this.monitoringTradeId = null;
    }

    destroy(): void {
        this.stop();
        this.completedTradeId = null;
    }

    isMonitoring(): boolean {
        return this.timer !== null;
    }
}

export default OUDContractMonitor;
