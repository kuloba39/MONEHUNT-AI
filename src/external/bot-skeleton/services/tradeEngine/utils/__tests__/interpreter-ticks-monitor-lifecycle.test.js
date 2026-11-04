let mockApiBase;
let mockMessageHandlers;
let mockApiSubscriptions;
let mockPendingHistory;
let mockScopes;

jest.mock('@deriv/js-interpreter', () => jest.fn());

jest.mock('@/components/shared', () => ({
    isMultiplierContract: jest.fn(() => false),
}));

jest.mock('../../../api/api-base', () => ({ api_base: mockApiBase }));

jest.mock('../../Interface', () =>
    jest.fn(scope => {
        mockScopes.push(scope);
        const tradeEngine = {
            watchTicks: symbol =>
                scope.ticksService.monitor({ symbol, callback: jest.fn() }),
        };
        return {
            tradeEngine,
            getInterface: () => ({ getTicksInterface: {} }),
        };
    })
);

const flushMicrotasks = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

describe('Interpreter scope tick monitor lifecycle', () => {
    let Interpreter;

    beforeEach(() => {
        jest.resetModules();
        mockMessageHandlers = new Set();
        mockApiSubscriptions = [];
        mockPendingHistory = null;
        mockScopes = [];

        mockApiBase = {
            api: {
                onMessage: () => ({
                    subscribe: callback => {
                        mockMessageHandlers.add(callback);
                        return { unsubscribe: () => mockMessageHandlers.delete(callback) };
                    },
                }),
                send: request => {
                    if (request.ticks_history === 'R_100' && mockPendingHistory) {
                        return mockPendingHistory;
                    }
                    return Promise.resolve({
                        history: { prices: [1], times: [1] },
                    });
                },
                forgetAll: () => Promise.resolve({}),
            },
            pip_sizes: { R_100: 2, R_50: 2 },
            is_stopping: false,
            toggleRunButton: jest.fn(),
            clearSubscriptions: owner => {
                const subscriptions = mockApiSubscriptions.filter(subscription => subscription.owner === owner);
                mockApiSubscriptions = mockApiSubscriptions.filter(subscription => subscription.owner !== owner);
                subscriptions.forEach(subscription => subscription.unsubscribe());
            },
            pushSubscription: (subscription, owner) => mockApiSubscriptions.push({ ...subscription, owner }),
        };

        Interpreter = require('../interpreter').default;
    });

    test('late monitor completion from a stopped scope cannot become an active listener after restart', async () => {
        let resolveOldHistory;
        mockPendingHistory = new Promise(resolve => {
            resolveOldHistory = resolve;
        });

        const oldRuntime = Interpreter();
        const oldScope = oldRuntime.bot.tradeEngine;
        const oldTicksService = mockScopes[0].ticksService;
        const oldMonitor = oldScope.watchTicks('R_100');
        await flushMicrotasks();
        expect(mockApiSubscriptions).toHaveLength(0);

        await oldRuntime.terminateSession();
        expect(mockApiSubscriptions).toHaveLength(0);

        mockPendingHistory = null;
        const newRuntime = Interpreter();
        const newTicksService = mockScopes[1].ticksService;
        const newMonitor = newRuntime.bot.tradeEngine.watchTicks('R_50');
        await newMonitor;
        expect(newTicksService.tickListeners.size).toBe(1);

        resolveOldHistory({ history: { prices: [1], times: [1] } });
        await oldMonitor;

        expect(oldTicksService.tickListeners.size).toBe(0);
        expect(newTicksService.tickListeners.size).toBe(1);
        expect(mockApiSubscriptions).toHaveLength(0);
    });

    test('terminating one engine does not unsubscribe another engine subscriptions', async () => {
        const firstRuntime = Interpreter();
        const secondRuntime = Interpreter();
        const firstSubscription = { unsubscribe: jest.fn() };
        const secondSubscription = { unsubscribe: jest.fn() };

        mockApiBase.pushSubscription(firstSubscription, firstRuntime.bot.tradeEngine);
        mockApiBase.pushSubscription(secondSubscription, secondRuntime.bot.tradeEngine);

        await firstRuntime.terminateSession();

        expect(firstSubscription.unsubscribe).toHaveBeenCalledTimes(1);
        expect(secondSubscription.unsubscribe).not.toHaveBeenCalled();
        expect(mockApiSubscriptions).toHaveLength(1);
    });
});