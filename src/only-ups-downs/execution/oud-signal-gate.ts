import type {
    OUDDirection,
    OUDDirectionMode,
    OUDSignal,
    OUDStrategyMode,
} from './oud-execution-types';

export interface OUDSignalGateInput {
    direction: OUDDirection;
    strategy: Exclude<OUDStrategyMode, 'BOTH'>;
    market: string;
    confidence?: number | null;
    signalCycleId: number;
}

export interface OUDSignalGateResult {
    allowed: boolean;
    reason:
        | 'READY'
        | 'DIRECTION_BLOCKED'
        | 'STRATEGY_BLOCKED'
        | 'INVALID_CYCLE'
        | 'DUPLICATE_CYCLE'
        | 'INVALID_MARKET';
    signal: OUDSignal | null;
}

/**
 * Signal Gate
 *
 * Responsibilities:
 * - validate the scanner signal
 * - enforce user's direction preference
 * - enforce user's strategy preference
 * - guarantee one execution reservation per signal cycle
 *
 * It does NOT:
 * - purchase contracts
 * - talk to Deriv
 * - monitor contracts
 * - change scanner state
 */
export class OUDSignalGate {
    private consumedCycleIds = new Set<number>();

    constructor(
        private directionMode: OUDDirectionMode = 'BOTH',
        private strategyMode: OUDStrategyMode = 'BOTH',
    ) {}

    setDirectionMode(mode: OUDDirectionMode): void {
        this.directionMode = mode;
    }

    setStrategyMode(mode: OUDStrategyMode): void {
        this.strategyMode = mode;
    }

    evaluate(input: OUDSignalGateInput): OUDSignalGateResult {
        const cycleId = Number(input.signalCycleId);

        if (!Number.isFinite(cycleId) || cycleId <= 0) {
            return {
                allowed: false,
                reason: 'INVALID_CYCLE',
                signal: null,
            };
        }

        if (!input.market) {
            return {
                allowed: false,
                reason: 'INVALID_MARKET',
                signal: null,
            };
        }

        if (
            this.directionMode !== 'BOTH' &&
            this.directionMode !== input.direction
        ) {
            return {
                allowed: false,
                reason: 'DIRECTION_BLOCKED',
                signal: null,
            };
        }

        if (
            this.strategyMode !== 'BOTH' &&
            this.strategyMode !== input.strategy
        ) {
            return {
                allowed: false,
                reason: 'STRATEGY_BLOCKED',
                signal: null,
            };
        }

        if (this.consumedCycleIds.has(cycleId)) {
            return {
                allowed: false,
                reason: 'DUPLICATE_CYCLE',
                signal: null,
            };
        }

        /*
         * Reserve the cycle BEFORE execution starts.
         *
         * This is critical:
         * even if purchase/result handling takes time,
         * the same scanner cycle cannot enter execution again.
         */
        this.consumedCycleIds.add(cycleId);

        const signal: OUDSignal = {
            signalCycleId: cycleId,
            direction: input.direction,
            strategy: input.strategy,
            market: input.market,
            confidence:
                input.confidence == null
                    ? null
                    : Number(input.confidence),
            timestamp: Date.now(),
        };

        return {
            allowed: true,
            reason: 'READY',
            signal,
        };
    }

    releaseCycle(cycleId: number): void {
        this.consumedCycleIds.delete(Number(cycleId));
    }

    clear(): void {
        this.consumedCycleIds.clear();
    }

    hasConsumedCycle(cycleId: number): boolean {
        return this.consumedCycleIds.has(Number(cycleId));
    }
}

export default OUDSignalGate;
