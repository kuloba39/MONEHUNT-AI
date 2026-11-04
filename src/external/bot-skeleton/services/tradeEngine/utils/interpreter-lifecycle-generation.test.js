let mockScopes = [];
let mockBots = [];
let mockInterpreters = [];
let mockWatchImplementation = () => Promise.resolve(true);

jest.mock('@/components/shared', () => ({
    isMultiplierContract: jest.fn(() => false),
}));

jest.mock('@/utils/clone', () => jest.fn(value => value));

jest.mock('@deriv/js-interpreter', () =>
    jest.fn().mockImplementation((code, initFunc) => {
        const instance = {
            code,
            global: {},
            paused_: false,
            value: undefined,
            run: jest.fn(() => true),
            pseudoToNative: jest.fn(value => value),
            nativeToPseudo: jest.fn(value => value),
            createAsyncFunction: jest.fn(func => func),
            setProperty: jest.fn((object, name, value) => {
                object[name] = value;
            }),
            takeStateSnapshot: jest.fn(() => ({ snapshot: true })),
            restoredSnapshots: [],
            restoreStateSnapshot(snapshot) {
                this.restoredSnapshots.push(snapshot);
            },
        };

        initFunc(instance, instance.global);
        mockInterpreters.push(instance);
        return instance;
    })
);

jest.mock('../../../utils/observer', () => ({
    observer: {
        emit: jest.fn(),
        getState: jest.fn(() => []),
        register: jest.fn(),
    },
}));

jest.mock('../../api/api-base', () => ({
    api_base: {
        clearSubscriptions: jest.fn(),
        is_stopping: false,
    },
}));

jest.mock('../Interface', () =>
    jest.fn(scope => {
        const tradeEngine = {
            options: { shouldRestartOnError: true, timeMachineEnabled: false },
            tradeOptions: { amount: 1 },
            initArgs: ['test-token', { symbol: 'R_100' }],
            contractId: null,
            isSold: true,
            init: jest.fn(),
            start: jest.fn(),
        };
        const botInterface = {
            getTicksInterface: {
                getLastTick: jest.fn(() => Promise.resolve({ epoch: 1, quote: 1 })),
            },
            start: jest.fn(() => Promise.resolve()),
            purchase: jest.fn(() => Promise.resolve()),
            sellAtMarket: jest.fn(() => Promise.resolve()),
            getPurchaseReference: jest.fn(),
            watch: (...args) => mockWatchImplementation(scope, ...args),
            console: { log: jest.fn() },
        };
        const bot = {
            tradeEngine,
            getInterface: () => botInterface,
        };

        mockBots.push(bot);
        return bot;
    })
);

jest.mock('./cliTools', () => ({
    createScope: jest.fn(() => {
        const handlers = {};
        const scope = {
            stopped: false,
            ticksService: {
                unsubscribeFromTicksService: jest.fn(() => Promise.resolve()),
            },
            observer: {
                register: jest.fn((event, callback) => {
                    handlers[event] = callback;
                }),
                emit: jest.fn((event, payload) => handlers[event]?.(payload)),
            },
        };

        mockScopes.push(scope);
        return scope;
    }),
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
};

describe('Interpreter execution generation lifecycle', () => {
    let Interpreter;

    beforeEach(() => {
        jest.clearAllMocks();
        mockScopes = [];
        mockBots = [];
        mockInterpreters = [];
        mockWatchImplementation = () => Promise.resolve(true);
        Interpreter = require('./interpreter').default;
    });

    test('stop invalidates a pending async callback before it can resume', async () => {
        const pendingWatch = deferred();
        mockWatchImplementation = () => pendingWatch.promise;

        const runtime = Interpreter();
        runtime.run('test program');

        const oldInterpreter = mockInterpreters[0];
        const callback = jest.fn();
        oldInterpreter.global.watch('before', callback);

        await runtime.stop();
        pendingWatch.resolve(true);
        await flushMicrotasks();

        expect(callback).not.toHaveBeenCalled();
        expect(oldInterpreter.run).toHaveBeenCalledTimes(1);
        expect(mockScopes[0].ticksService.unsubscribeFromTicksService).toHaveBeenCalledTimes(1);
    });

    test('terminal errors abort pending waits before rejecting the run', async () => {
        const pendingWatch = deferred();
        mockWatchImplementation = () => pendingWatch.promise;

        const runtime = Interpreter();
        const runPromise = runtime.run('test program');
        const oldInterpreter = mockInterpreters[0];
        const callback = jest.fn();
        oldInterpreter.global.watch('before', callback);
        mockBots[0].tradeEngine.options.shouldRestartOnError = false;

        mockScopes[0].observer.emit(
            'Error',
            Object.assign(new Error('terminal test error'), { code: 'TestTerminalError' })
        );

        await expect(runPromise).rejects.toMatchObject({ code: 'TestTerminalError' });
        expect(mockScopes[0].executionSignal.aborted).toBe(true);

        pendingWatch.resolve(true);
        await flushMicrotasks();

        expect(callback).not.toHaveBeenCalled();
        expect(oldInterpreter.run).toHaveBeenCalledTimes(1);
    });

    test('restart invalidates the old wait and the replacement interpreter runs normally', async () => {
        const oldPendingWatch = deferred();
        mockWatchImplementation = jest
            .fn()
            .mockReturnValueOnce(oldPendingWatch.promise)
            .mockReturnValue(Promise.resolve(true));

        const runtime = Interpreter();
        runtime.run('test program');

        const oldInterpreter = mockInterpreters[0];
        const oldCallback = jest.fn();
        oldInterpreter.global.watch('before', oldCallback);
        const savedSnapshot = { saved: 'blockly state' };
        const oldScope = mockScopes[mockScopes.length - 1];
        oldScope.startState = savedSnapshot;
        expect(oldScope.startState).toBe(savedSnapshot);
        const oldRunCount = oldInterpreter.run.mock.calls.length;

        oldScope.observer.emit(
            'Error',
            Object.assign(new Error('recoverable test error'), { code: 'TestRecoverableError' })
        );
        await flushMicrotasks();

        expect(mockInterpreters).toHaveLength(2);
        const replacementInterpreter = mockInterpreters[1];
        expect(mockBots[1].tradeEngine.init).toHaveBeenCalledWith(
            'test-token',
            { symbol: 'R_100' }
        );
        expect(mockBots[1].tradeEngine.start).toHaveBeenCalledWith(
            { amount: 1 },
            { preserveMonehuntMartingale: true }
        );
        expect(replacementInterpreter.restoredSnapshots).toEqual([
            { saved: 'blockly state' },
        ]);
        expect(replacementInterpreter.run).toHaveBeenCalledTimes(1);

        oldPendingWatch.resolve(true);
        await flushMicrotasks();

        expect(oldCallback).not.toHaveBeenCalled();
        expect(oldInterpreter.run).toHaveBeenCalledTimes(oldRunCount);
        expect(replacementInterpreter.run).toHaveBeenCalledTimes(1);

        const newCallback = jest.fn();
        replacementInterpreter.global.watch('before', newCallback);
        await flushMicrotasks();

        expect(newCallback).toHaveBeenCalledWith(true);
        expect(replacementInterpreter.run).toHaveBeenCalledTimes(2);
    });
});