import TradeEngine from '../index';
import {
    clearMonehuntRuntimeConfig,
    getMonehuntRuntimeConfig,
    setMonehuntRuntimeConfig,
} from '@/utils/monehunt-runtime-config';

describe('TradeEngine runtime config lifecycle', () => {
    let engine;

    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
        clearMonehuntRuntimeConfig();

        engine = Object.create(TradeEngine.prototype);
        engine.options = { symbol: 'R_100' };
        engine.store = { dispatch: jest.fn() };
        engine.validateTradeOptions = jest.fn(options => options);
        engine.checkLimits = jest.fn();
        engine.makeDirectPurchaseDecision = jest.fn();
    });

    afterEach(() => {
        clearMonehuntRuntimeConfig();
        jest.restoreAllMocks();
    });

    it('clears shared config before validation can throw', () => {
        setMonehuntRuntimeConfig({
            symbol: 'R_100',
            stake: 2,
            duration: 3,
            durationUnit: 't',
        });

        engine.validateTradeOptions.mockImplementation(() => {
            expect(getMonehuntRuntimeConfig()).toBeNull();
            throw new Error('intentional validation failure');
        });

        expect(() => engine.start({ amount: 1 })).toThrow(
            'intentional validation failure'
        );

        expect(getMonehuntRuntimeConfig()).toBeNull();
        expect(engine.store.dispatch).not.toHaveBeenCalled();
        expect(engine.makeDirectPurchaseDecision).not.toHaveBeenCalled();
    });

    it('passes configured trade settings into validation for this run', () => {
        setMonehuntRuntimeConfig({
            symbol: 'R_100',
            stake: 2.5,
            duration: 3,
            durationUnit: 't',
            takeProfit: 5,
            stopLoss: 10,
        });

        engine.start({
            amount: 1,
            duration: 1,
            duration_unit: 's',
            limit_order: {},
        });

        expect(engine.validateTradeOptions).toHaveBeenCalledWith(
            expect.objectContaining({
                amount: 2.5,
                duration: 3,
                duration_unit: 't',
                take_profit: 5,
                stop_loss: 10,
                limit_order: expect.objectContaining({
                    take_profit: 5,
                    stop_loss: 10,
                }),
            })
        );

        expect(engine.tradeOptions).toEqual(
            expect.objectContaining({
                amount: 2.5,
                duration: 3,
                duration_unit: 't',
                take_profit: 5,
                stop_loss: 10,
                symbol: 'R_100',
            })
        );

        expect(getMonehuntRuntimeConfig()).toBeNull();
        expect(engine.store.dispatch).toHaveBeenCalledTimes(1);
        expect(engine.checkLimits).toHaveBeenCalledTimes(1);
        expect(engine.makeDirectPurchaseDecision).toHaveBeenCalledTimes(1);
    });
    it('stores Martingale settings on the configured engine run', () => {
        setMonehuntRuntimeConfig({
            symbol: 'R_100',
            stake: 2.5,
            martingale: 1.6,
            maxStake: 10,
        });

        engine.start({ amount: 1 });

        expect(engine.monehuntMartingale).toEqual({
            startingStake: 2.5,
            currentStake: 2.5,
            multiplier: 1.6,
            maxStake: 10,
        });
        expect(engine.tradeOptions.amount).toBe(2.5);
        expect(getMonehuntRuntimeConfig()).toBeNull();
    });

    it('does not preserve Martingale state for native OUD execution', () => {
        engine.options = {
            symbol: 'R_100',
            nativeOudDirectPurchase: true,
        };
        engine.monehuntMartingale = {
            startingStake: 2.5,
            currentStake: 5,
            multiplier: 2,
            maxStake: 10,
        };

        engine.start(
            { amount: 5 },
            { preserveMonehuntMartingale: true }
        );

        expect(engine.monehuntMartingale).toBeNull();
        expect(engine.tradeOptions.amount).toBe(5);
    });
    it('preserves progressed Martingale state during interpreter recovery', () => {
        engine.monehuntMartingale = {
            startingStake: 2.5,
            currentStake: 5,
            multiplier: 2,
            maxStake: 10,
        };

        engine.start(
            { amount: 5 },
            { preserveMonehuntMartingale: true }
        );

        expect(engine.monehuntMartingale).toEqual({
            startingStake: 2.5,
            currentStake: 5,
            multiplier: 2,
            maxStake: 10,
        });
        expect(engine.tradeOptions.amount).toBe(5);
        expect(getMonehuntRuntimeConfig()).toBeNull();
    });
    it('leaves Martingale disabled when the multiplier is zero', () => {
        setMonehuntRuntimeConfig({
            symbol: 'R_100',
            stake: 2.5,
            martingale: 0,
            maxStake: 10,
        });

        engine.start({ amount: 1 });

        expect(engine.monehuntMartingale).toBeNull();
        expect(engine.tradeOptions.amount).toBe(2.5);
    });
});
