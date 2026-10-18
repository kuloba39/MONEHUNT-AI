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

    it('uses the configured market for engine options and tick subscription', () => {
        engine.loginAndGetBalance = jest.fn(() => Promise.resolve());
        engine.watchTicks = jest.fn();

        setMonehuntRuntimeConfig({
            symbol: 'R_100',
            contractType: 'DIGITOVER',
        });

        engine.init('test-token', {
            symbol: '1HZ25V',
            contractTypes: ['DIGITUNDER'],
        });

        expect(engine.options.symbol).toBe('R_100');
        expect(engine.options.contractTypes).toEqual(['DIGITOVER']);
        expect(engine.initArgs[1].symbol).toBe('R_100');
        expect(engine.watchTicks).toHaveBeenCalledWith('R_100');
        expect(engine.loginAndGetBalance).toHaveBeenCalledWith('test-token');
    });
    it.each([
        ['restricts Rise/Fall contracts to CALL', 'rise', ['CALL', 'PUT'], undefined, ['CALL']],
        ['restricts Rise/Fall contracts to PUT', 'fall', ['CALL', 'PUT'], undefined, ['PUT']],
        ['keeps both Rise/Fall directions available', 'both', ['CALL', 'PUT'], undefined, ['CALL', 'PUT']],
        ['preserves both directions with Bot Default', undefined, ['CALL', 'PUT'], undefined, ['CALL', 'PUT']],
        ['preserves DIGITOVER under Rise preference', 'rise', ['DIGITOVER'], undefined, ['DIGITOVER']],
        ['preserves DIGITUNDER under Fall preference', 'fall', ['DIGITUNDER'], undefined, ['DIGITUNDER']],
        ['preserves RUNHIGH under Rise preference', 'rise', ['RUNHIGH'], undefined, ['RUNHIGH']],
        ['preserves RUNLOW under Fall preference', 'fall', ['RUNLOW'], undefined, ['RUNLOW']],
        ['preserves UPORDOWN under Both preference', 'both', ['UPORDOWN'], undefined, ['UPORDOWN']],
        ['preserves mixed CALL and digit contract types', 'rise', ['CALL', 'DIGITOVER'], undefined, ['CALL', 'DIGITOVER']],
        ['keeps an explicit digit contract selection authoritative', 'rise', ['CALL', 'PUT'], 'DIGITOVER', ['DIGITOVER']],
    ])('%s', (_caseName, direction, contractTypes, contractType, expectedTypes) => {
        engine.loginAndGetBalance = jest.fn(() => Promise.resolve());
        engine.watchTicks = jest.fn();

        setMonehuntRuntimeConfig({
            symbol: 'R_100',
            ...(direction ? { direction } : {}),
            ...(contractType ? { contractType } : {}),
        });

        engine.init('test-token', {
            symbol: 'R_100',
            contractTypes,
        });

        expect(engine.options.contractTypes).toEqual(expectedTypes);
    });
    it.each([
        ['Even Only', 'EVENODD', 'even', ['DIGITEVEN', 'DIGITODD'], ['DIGITEVEN']],
        ['Odd Only', 'EVENODD', 'odd', ['DIGITEVEN', 'DIGITODD'], ['DIGITODD']],
        ['Both Even and Odd', 'EVENODD', 'both', ['DIGITEVEN', 'DIGITODD'], ['DIGITEVEN', 'DIGITODD']],
        ['Over Only', 'OVERUNDER', 'over', ['DIGITOVER', 'DIGITUNDER'], ['DIGITOVER']],
        ['Under Only', 'OVERUNDER', 'under', ['DIGITOVER', 'DIGITUNDER'], ['DIGITUNDER']],
        ['Both Over and Under', 'OVERUNDER', 'both', ['DIGITOVER', 'DIGITUNDER'], ['DIGITOVER', 'DIGITUNDER']],
        ['Rise Only', 'CALLPUT', 'rise', ['CALL', 'PUT'], ['CALL']],
        ['Fall Only', 'CALLPUT', 'fall', ['CALL', 'PUT'], ['PUT']],
        ['Both Rise and Fall', 'CALLPUT', 'both', ['CALL', 'PUT'], ['CALL', 'PUT']],
        ['rejects Rise preference for Even/Odd family', 'EVENODD', 'rise', ['DIGITEVEN', 'DIGITODD'], ['DIGITEVEN', 'DIGITODD']],
        ['preserves RUNHIGH for an unrelated family', 'CALLPUT', 'rise', ['RUNHIGH'], ['RUNHIGH']],
        ['preserves mixed contract types', 'CALLPUT', 'rise', ['CALL', 'DIGITOVER'], ['CALL', 'DIGITOVER']],
    ])('applies compatible contract preference: %s', (_name, tradeFamily, contractPreference, contractTypes, expectedTypes) => {
        engine.loginAndGetBalance = jest.fn(() => Promise.resolve());
        engine.watchTicks = jest.fn();

        setMonehuntRuntimeConfig({
            symbol: 'R_100',
            tradeFamily,
            contractPreference,
        });

        engine.init('test-token', {
            symbol: 'R_100',
            contractTypes,
        });

        expect(engine.options.contractTypes).toEqual(expectedTypes);
    });
    it('preserves the selected contract preference during engine reinitialization', () => {
        engine.loginAndGetBalance = jest.fn(() => Promise.resolve());
        engine.watchTicks = jest.fn();

        setMonehuntRuntimeConfig({
            symbol: 'R_100',
            tradeFamily: 'EVENODD',
            contractPreference: 'even',
        });

        engine.init('test-token', {
            symbol: 'R_100',
            contractTypes: ['DIGITEVEN', 'DIGITODD'],
        });

        const savedInitArgs = [...engine.initArgs];

        expect(savedInitArgs[1].contractTypes).toEqual(['DIGITEVEN']);

        clearMonehuntRuntimeConfig();
        engine.init(...savedInitArgs);

        expect(engine.options.contractTypes).toEqual(['DIGITEVEN']);
        expect(engine.initArgs[1].contractTypes).toEqual(['DIGITEVEN']);
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
    it('uses the saved Martingale stake instead of the bot XML default during continuation', () => {
        engine.monehuntMartingale = {
            startingStake: 10,
            currentStake: 20,
            multiplier: 2,
            maxStake: null,
        };

        engine.start(
            { amount: 1 },
            { preserveMonehuntMartingale: true }
        );

        expect(engine.monehuntMartingale.currentStake).toBe(20);
        expect(engine.tradeOptions.amount).toBe(20);
        expect(getMonehuntRuntimeConfig()).toBeNull();
    });
    it('keeps the Workspace base stake across Blockly starts when Martingale is disabled', () => {
        setMonehuntRuntimeConfig({
            symbol: 'R_100',
            stake: 10,
            martingale: 0,
        });

        engine.start({ amount: 0.35 });
        expect(engine.tradeOptions.amount).toBe(10);
        expect(engine.monehuntMartingale).toBeNull();

        engine.start({ amount: 0.35 });
        expect(engine.tradeOptions.amount).toBe(10);
        expect(engine.monehuntMartingale).toBeNull();
    });

    it('uses the Workspace base stake and then the progressed Martingale stake', () => {
        setMonehuntRuntimeConfig({
            symbol: 'R_100',
            stake: 10,
            martingale: 2,
        });

        engine.start({ amount: 0.35 });
        expect(engine.tradeOptions.amount).toBe(10);
        expect(engine.monehuntMartingale.currentStake).toBe(10);

        // Simulate a loss settlement updating the engine's recovery stake.
        engine.monehuntMartingale.currentStake = 20;

        engine.start({ amount: 0.35 });
        expect(engine.tradeOptions.amount).toBe(20);
        expect(engine.monehuntMartingale.currentStake).toBe(20);
    });

    it('keeps the Blockly amount when no Workspace stake was configured', () => {
        engine.start({ amount: 0.35 });

        expect(engine.tradeOptions.amount).toBe(0.35);
        expect(engine.monehuntWorkspaceStake ?? null).toBeNull();
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

    it('preserves the Blockly prediction by default', () => {
        setMonehuntRuntimeConfig({
            symbol: 'R_100',
            stake: 1,
        });

        engine.start({
            amount: 1,
            prediction: 4,
        });

        expect(engine.tradeOptions.prediction).toBe(4);
        expect(getMonehuntRuntimeConfig()).toBeNull();
    });

    it('applies an explicitly configured user prediction', () => {
        setMonehuntRuntimeConfig({
            symbol: 'R_100',
            stake: 1,
            prediction: 7,
        });

        engine.start({
            amount: 1,
            prediction: 4,
        });

        expect(engine.tradeOptions.prediction).toBe(7);
        expect(getMonehuntRuntimeConfig()).toBeNull();
    });
});
