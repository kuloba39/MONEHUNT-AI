let mockApiBase;
let mockObserver;
let mockMessageHandlers;
let mockUuid = 0;
let mockServerTickSubscriptions;

jest.mock('../api-base', () => ({ api_base: mockApiBase }));

jest.mock('../../../utils/observer', () => ({ observer: mockObserver }));

jest.mock('../../tradeEngine/utils/helpers', () => ({
    doUntilDone: jest.fn(promiseFn => promiseFn()),
    getUUID: jest.fn(() => `tick-sub-${++mockUuid}`),
}));

jest.mock('../../../utils/binary-utils', () => ({
    getLast: values => values[values.length - 1],
    historyToTicks: history => history.ticks,
}));

const deferred = () => {
    let resolve;
    const promise = new Promise(res => {
        resolve = res;
    });
    return { promise, resolve };
};

const flushMicrotasks = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

const emitTick = (symbol, epoch, subscriptionId) => {
    mockServerTickSubscriptions.add(subscriptionId);
    [...mockMessageHandlers].forEach(handler =>
        handler({
            data: {
                msg_type: 'tick',
                tick: {
                    symbol,
                    epoch,
                    quote: epoch,
                },
                subscription: { id: subscriptionId },
            },
        })
    );
};

describe('TicksService subscription lifecycle', () => {
    let TicksService;

    beforeEach(() => {
        jest.resetModules();
        mockUuid = 0;
        mockMessageHandlers = new Set();
        mockServerTickSubscriptions = new Set();
        mockObserver = { emit: jest.fn() };

        const api = {
            onMessage: jest.fn(() => ({
                subscribe: jest.fn(handler => {
                    mockMessageHandlers.add(handler);
                    return {
                        unsubscribe: jest.fn(() => mockMessageHandlers.delete(handler)),
                    };
                }),
            })),
            send: jest.fn(async request => ({
                history: {
                    ticks: [{ epoch: 1, quote: 1 }],
                },
                candles: [{ epoch: 1, open: 1, high: 1, low: 1, close: 1 }],
                subscription: {
                    id: `server-${request.ticks_history}`,
                },
            })),
            forget: jest.fn(async id => {
                mockServerTickSubscriptions.delete(id);
                return {};
            }),
            forgetAll: jest.fn(async style => {
                if (style === 'ticks') mockServerTickSubscriptions.clear();
                return {};
            }),
        };

        mockApiBase = {
            api,
            pip_sizes: { R_100: 2, R_50: 2 },
            pushSubscription: jest.fn(),
            toggleRunButton: jest.fn(),
        };

        TicksService = require('../ticks_service').default;
    });

    test('a late monitor response cannot register an active listener after stop', async () => {
        const pendingHistory = deferred();
        mockApiBase.api.send.mockReturnValueOnce(pendingHistory.promise);
        const service = new TicksService();
        const onTicks = jest.fn();
        const monitorPromise = service.monitor({ symbol: 'R_100', callback: onTicks });

        await flushMicrotasks();
        expect(mockApiBase.api.send).toHaveBeenCalledWith(
            expect.objectContaining({ ticks_history: 'R_100', subscribe: 1 })
        );

        await service.unsubscribeFromTicksService();
        pendingHistory.resolve({
            history: { ticks: [{ epoch: 1, quote: 1 }] },
            subscription: { id: 'late-r100-subscription' },
        });
        const key = await monitorPromise;
        emitTick('R_100', 2, 'late-r100-subscription');

        expect(service.tickListeners.hasIn(['R_100', key])).toBe(false);
        expect(onTicks).not.toHaveBeenCalled();
        expect(mockApiBase.api.forget).toHaveBeenCalledWith('late-r100-subscription');
        expect(mockApiBase.api.forgetAll).not.toHaveBeenCalled();
    });

    test('a server subscription returned after stop is forgotten', async () => {
        const pendingHistory = deferred();
        mockApiBase.api.send.mockReturnValueOnce(pendingHistory.promise);
        const service = new TicksService();
        const monitorPromise = service.monitor({ symbol: 'R_100', callback: jest.fn() });

        await flushMicrotasks();
        await service.unsubscribeFromTicksService();

        pendingHistory.resolve({
            history: { ticks: [{ epoch: 1, quote: 1 }] },
            subscription: { id: 'late-r100-subscription' },
        });
        mockServerTickSubscriptions.add('late-r100-subscription');
        await monitorPromise;

        expect(mockServerTickSubscriptions.has('late-r100-subscription')).toBe(false);
    });

    test('stopping one symbol preserves delivery for another symbol', async () => {
        const service = new TicksService();
        const onR100 = jest.fn();
        const onR50 = jest.fn();
        const [r100Key, r50Key] = await Promise.all([
            service.monitor({ symbol: 'R_100', callback: onR100 }),
            service.monitor({ symbol: 'R_50', callback: onR50 }),
        ]);

        emitTick('R_100', 2, 'server-R_100');
        emitTick('R_50', 2, 'server-R_50');
        await service.stopMonitor({ symbol: 'R_100', key: r100Key });

        expect(service.tickListeners.hasIn(['R_100', r100Key])).toBe(false);
        emitTick('R_50', 3, 'server-R_50');
        expect(onR50).toHaveBeenCalledTimes(2);
    });

    test('stopping one symbol preserves another symbol record for later cleanup', async () => {
        const service = new TicksService();
        const r100Key = await service.monitor({ symbol: 'R_100', callback: jest.fn() });
        const r50Key = await service.monitor({ symbol: 'R_50', callback: jest.fn() });

        emitTick('R_100', 2, 'server-R_100');
        emitTick('R_50', 2, 'server-R_50');
        await service.stopMonitor({ symbol: 'R_100', key: r100Key });

        expect(service.subscriptions.getIn(['tick', 'R_50'])).toBe('server-R_50');

        await service.stopMonitor({ symbol: 'R_50', key: r50Key });
        expect(mockApiBase.api.forget).toHaveBeenCalledWith('server-R_50');
    });

    test('stopping one service preserves another instance local listeners and records', async () => {
        const firstService = new TicksService();
        const secondService = new TicksService();
        const firstListener = jest.fn();
        const secondListener = jest.fn();

        await firstService.monitor({ symbol: 'R_100', callback: firstListener });
        await secondService.monitor({ symbol: 'R_50', callback: secondListener });
        emitTick('R_100', 2, 'server-R_100');
        emitTick('R_50', 2, 'server-R_50');

        await firstService.unsubscribeFromTicksService();

        expect(secondService.tickListeners.size).toBeGreaterThan(0);
        expect(secondService.subscriptions.getIn(['tick', 'R_50'])).toBe('server-R_50');
    });

    test('stopping one service does not forget another instance server subscription', async () => {
        const firstService = new TicksService();
        const secondService = new TicksService();

        await firstService.monitor({ symbol: 'R_100', callback: jest.fn() });
        await secondService.monitor({ symbol: 'R_50', callback: jest.fn() });
        emitTick('R_100', 2, 'server-R_100');
        emitTick('R_50', 2, 'server-R_50');

        await firstService.unsubscribeFromTicksService();

        expect(mockServerTickSubscriptions.has('server-R_50')).toBe(true);
    });

    test('tick messages record the envelope subscription ID and preserve it when omitted', async () => {
        const service = new TicksService();
        await service.monitor({ symbol: 'R_100', callback: jest.fn() });

        emitTick('R_100', 2, 'envelope-tick-subscription');
        expect(service.subscriptions.getIn(['tick', 'R_100'])).toBe('envelope-tick-subscription');

        [...mockMessageHandlers].forEach(handler =>
            handler({
                data: {
                    msg_type: 'tick',
                    tick: { symbol: 'R_100', epoch: 3, quote: 3 },
                },
            })
        );

        expect(service.subscriptions.getIn(['tick', 'R_100'])).toBe('envelope-tick-subscription');
    });

    test('OHLC messages record the envelope subscription ID and preserve it when omitted', async () => {
        const service = new TicksService();
        await service.monitor({ symbol: 'R_100', granularity: 60, callback: jest.fn() });

        [...mockMessageHandlers].forEach(handler =>
            handler({
                data: {
                    msg_type: 'ohlc',
                    ohlc: {
                        symbol: 'R_100',
                        granularity: 60,
                        epoch: 1,
                        open: 1,
                        high: 1,
                        low: 1,
                        close: 1,
                    },
                    subscription: { id: 'envelope-ohlc-subscription' },
                },
            })
        );
        expect(service.subscriptions.getIn(['ohlc', 'R_100', 60])).toBe('envelope-ohlc-subscription');

        [...mockMessageHandlers].forEach(handler =>
            handler({
                data: {
                    msg_type: 'ohlc',
                    ohlc: {
                        symbol: 'R_100',
                        granularity: 60,
                        epoch: 2,
                        open: 1,
                        high: 1,
                        low: 1,
                        close: 1,
                    },
                },
            })
        );

        expect(service.subscriptions.getIn(['ohlc', 'R_100', 60])).toBe('envelope-ohlc-subscription');
    });

    test('the same service can monitor a new market after shutdown', async () => {
        const service = new TicksService();
        const onR100 = jest.fn();
        const onR50 = jest.fn();

        await service.monitor({ symbol: 'R_100', callback: onR100 });
        await service.unsubscribeFromTicksService();

        expect(service.isStopped).toBe(true);
        expect(mockMessageHandlers.size).toBe(0);

        const r50Key = await service.monitor({
            symbol: 'R_50',
            callback: onR50,
        });

        expect(service.isStopped).toBe(false);
        expect(service.tickListeners.hasIn(['R_50', r50Key])).toBe(true);
        expect(mockMessageHandlers.size).toBe(1);

        emitTick('R_50', 2, 'server-R_50');

        expect(onR50).toHaveBeenCalledTimes(1);
        expect(onR100).not.toHaveBeenCalled();
    });

    test('a late tick response cannot repopulate the tick cache after shutdown', async () => {
        const pendingHistory = deferred();
        mockApiBase.api.send.mockReturnValueOnce(pendingHistory.promise);
        const service = new TicksService();
        const monitorPromise = service.monitor({ symbol: 'R_100', callback: jest.fn() });

        await flushMicrotasks();
        await service.unsubscribeFromTicksService();
        pendingHistory.resolve({
            history: { ticks: [{ epoch: 9, quote: 9 }] },
            subscription: { id: 'late-tick-cache-subscription' },
        });

        await monitorPromise;
        expect(service.ticks.has('R_100')).toBe(false);
        expect(mockApiBase.api.forget).toHaveBeenCalledWith('late-tick-cache-subscription');
    });

    test('a late candle response cannot repopulate the candle cache after shutdown', async () => {
        const pendingHistory = deferred();
        mockApiBase.api.send.mockReturnValueOnce(pendingHistory.promise);
        const service = new TicksService();
        const monitorPromise = service.monitor({ symbol: 'R_100', granularity: 60, callback: jest.fn() });

        await flushMicrotasks();
        await service.unsubscribeFromTicksService();
        pendingHistory.resolve({
            candles: [{ epoch: 9, open: 1, high: 1, low: 1, close: 1 }],
            subscription: { id: 'late-candle-cache-subscription' },
        });

        await monitorPromise;
        expect(service.candles.hasIn(['R_100', 60])).toBe(false);
        expect(mockApiBase.api.forget).toHaveBeenCalledWith('late-candle-cache-subscription');
    });
});