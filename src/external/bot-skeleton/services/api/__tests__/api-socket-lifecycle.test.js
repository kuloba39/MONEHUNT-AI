let mockCreatedApis = [];
let mockPendingSocketUrlResolver;

jest.mock('@/components/shared', () => ({
    getSocketURL: jest.fn(),
}));

jest.mock('@deriv/deriv-api/dist/DerivAPIBasic', () =>
    jest.fn().mockImplementation(({ connection }) => {
        const api = {
            connection,
            send: jest.fn(() => Promise.resolve({})),
            disconnect: jest.fn(() => connection.close()),
            onMessage: jest.fn(() => ({ subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })) })),
        };
        mockCreatedApis.push(api);
        return api;
    })
);

jest.mock('../api-middleware', () => jest.fn());

jest.mock('@/utils/account-helpers', () => ({
    getAccountId: jest.fn(() => 'VRTC123'),
    getAccountType: jest.fn(() => 'demo'),
    isDemoAccount: jest.fn(() => true),
    removeUrlParameter: jest.fn(),
}));

jest.mock('@/utils/auth-utils', () => ({ clearAuthData: jest.fn() }));
jest.mock('@/utils/error-handler', () => ({
    handleBackendError: jest.fn(),
    isBackendError: jest.fn(() => false),
}));
jest.mock('../../../../../services/active-symbols-processor.service', () => ({
    activeSymbolsProcessorService: { processActiveSymbols: jest.fn() },
}));
jest.mock('../../../utils/observer', () => ({
    observer: {
        emit: jest.fn(),
        getState: jest.fn(() => null),
        setState: jest.fn(),
    },
}));
jest.mock('../../tradeEngine/utils/helpers', () => ({
    doUntilDone: jest.fn(promiseFn => promiseFn()),
    socket_state: { 0: 'Connecting', 1: 'Open', 2: 'Closing', 3: 'Closed' },
}));
jest.mock('../observables/connection-status-stream', () => ({
    CONNECTION_STATUS: { OPENED: 'opened', CLOSED: 'closed', UNKNOWN: 'unknown' },
    setConnectionStatus: jest.fn(),
    setAccountList: jest.fn(),
    setAuthData: jest.fn(),
    setIsAuthorized: jest.fn(),
    setIsAuthorizing: jest.fn(),
}));
jest.mock('../api-helpers', () => ({
    __esModule: true,
    default: { disposeInstance: jest.fn() },
}));

class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    readyState = MockWebSocket.OPEN;
    listeners = new Map();

    constructor(url) {
        this.url = url;
        this.closeCalls = 0;
    }

    addEventListener(event, callback) {
        const callbacks = this.listeners.get(event) || new Set();
        callbacks.add(callback);
        this.listeners.set(event, callbacks);
    }

    removeEventListener(event, callback) {
        this.listeners.get(event)?.delete(callback);
    }

    close() {
        this.closeCalls += 1;
        this.readyState = MockWebSocket.CLOSED;
        this.listeners.get('close')?.forEach(callback => callback({ code: 1000 }));
    }
}

const flushMicrotasks = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

describe('shared Deriv API and chart socket lifecycle', () => {
    let apiBase;
    let chartApi;
    let appId;
    let getSocketURL;

    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
        mockCreatedApis = [];
        mockPendingSocketUrlResolver = null;
        global.WebSocket = MockWebSocket;
        localStorage.setItem('active_loginid', 'VRTC123');

        getSocketURL = require('@/components/shared').getSocketURL;
        getSocketURL.mockResolvedValue('wss://deriv.test/socket');
        appId = require('../appId');
        chartApi = require('../chart-api').default;
        apiBase = require('../api-base.ts').api_base;

        apiBase.api = null;
        apiBase.init_promise = null;
        apiBase.has_active_symbols = true;
        apiBase.subscriptions = [];
        apiBase.current_auth_subscriptions = [];
        apiBase.time_interval = null;
        chartApi.api = null;
        chartApi.time_interval = null;
    });

    afterEach(async () => {
        mockPendingSocketUrlResolver?.('wss://deriv.test/cleanup');
        await Promise.resolve();
        await Promise.resolve();
        if (chartApi?.time_interval) clearInterval(chartApi.time_interval);
        if (apiBase?.api?.connection) {
            apiBase.api.connection.removeEventListener('close', apiBase.socket_close_handler);
        }
        if (chartApi?.api?.connection) {
            chartApi.api.connection.removeEventListener('close', chartApi.socket_close_handler);
        }
        appId?.clearDerivApiInstance();
        if (apiBase) apiBase.api = null;
        if (chartApi) {
            chartApi.api = null;
            chartApi.time_interval = null;
        }
        window.removeEventListener('online', apiBase?.reconnectIfNotConnected);
        window.removeEventListener('focus', apiBase?.reconnectIfNotConnected);
        localStorage.removeItem('active_loginid');
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    test('concurrent ordinary factory calls reuse one socket and API instance', async () => {
        let resolveSocketUrl;
        getSocketURL.mockReturnValueOnce(
            new Promise(resolve => {
                resolveSocketUrl = resolve;
            })
        );
        mockPendingSocketUrlResolver = resolveSocketUrl;

        const firstPromise = appId.generateDerivApiInstance();
        const secondPromise = appId.generateDerivApiInstance();
        expect(getSocketURL).toHaveBeenCalledTimes(1);

        resolveSocketUrl('wss://deriv.test/concurrent');
        const [first, second] = await Promise.all([firstPromise, secondPromise]);

        expect(first).toBe(second);
        expect(mockCreatedApis).toHaveLength(1);
    });

    test('forced factory creation closes and replaces the current instance', async () => {
        const first = await appId.generateDerivApiInstance();
        const second = await appId.generateDerivApiInstance(true);

        expect(first).not.toBe(second);
        expect(first.connection.closeCalls).toBe(1);
        expect(second.connection.readyState).toBe(MockWebSocket.OPEN);
        expect(appId.getDerivApiGeneration(first)).not.toBe(
            appId.getDerivApiGeneration(second)
        );
    });

    test('normal APIBase and ChartAPI initialization share the same API object', async () => {
        await apiBase.init();

        expect(apiBase.api).toBe(chartApi.api);
        expect(chartApi.api.connection).toBe(apiBase.api.connection);
        expect(mockCreatedApis).toHaveLength(1);
    });

    test('forced APIBase initialization creates one replacement shared by both wrappers', async () => {
        await apiBase.init();
        const oldApi = apiBase.api;

        await apiBase.init(true);

        expect(mockCreatedApis).toHaveLength(2);
        expect(apiBase.api).toBe(chartApi.api);
        expect(apiBase.api).not.toBe(oldApi);
        expect(oldApi.connection.closeCalls).toBe(1);
    });

    test('overlapping forced reconnects share one replacement operation', async () => {
        await apiBase.init();
        const oldApi = apiBase.api;

        const first = apiBase.init(true);
        const second = apiBase.init(true);
        await Promise.all([first, second]);

        expect(mockCreatedApis).toHaveLength(2);
        expect(apiBase.api).toBe(chartApi.api);
        expect(apiBase.api).not.toBe(oldApi);
    });

    test('failed replacement clears transition state and can recover on a later reconnect', async () => {
        await apiBase.init();
        getSocketURL.mockRejectedValueOnce(new Error('replacement failed'));

        await expect(apiBase.init(true)).rejects.toThrow('replacement failed');

        expect(apiBase.api).toBeNull();
        expect(chartApi.api).toBeNull();
        expect(chartApi.is_transitioning).toBe(false);
        expect(apiBase.reconnect_promise).toBeNull();

        getSocketURL.mockResolvedValueOnce('wss://deriv.test/recovered');
        await apiBase.init(true);

        expect(apiBase.api).toBe(chartApi.api);
        expect(apiBase.api).toBeDefined();
        expect(chartApi.is_transitioning).toBe(false);
    });

    test('concurrent reconnects remain single-flight after a failed replacement', async () => {
        await apiBase.init();
        getSocketURL.mockRejectedValueOnce(new Error('replacement failed'));

        const first = apiBase.init(true);
        const second = apiBase.init(true);
        await expect(Promise.all([first, second])).rejects.toThrow(
            'replacement failed'
        );

        expect(mockCreatedApis).toHaveLength(1);
        expect(apiBase.reconnect_promise).toBeNull();
        expect(chartApi.is_transitioning).toBe(false);

        await apiBase.init(true);
        expect(mockCreatedApis).toHaveLength(2);
        expect(apiBase.api).toBe(chartApi.api);
    });

    test('chart API cannot replace the shared API without APIBase coordination', async () => {
        chartApi.setApiBaseInitializer(null);

        await expect(chartApi.init(true)).rejects.toThrow(
            'Chart API cannot reconnect without APIBase coordination'
        );
        await expect(chartApi.init()).rejects.toThrow(
            'Chart API cannot initialize without APIBase coordination'
        );
        expect(mockCreatedApis).toHaveLength(0);

        chartApi.setApiBaseInitializer(
            forceCreateConnection => apiBase.init(forceCreateConnection)
        );
    });

    test('API-change listener failures do not block later listeners or state updates', () => {
        const firstListener = jest.fn(() => {
            throw new Error('listener failed');
        });
        const secondListener = jest.fn();
        const removeFirst = chartApi.onApiChange(firstListener);
        const removeSecond = chartApi.onApiChange(secondListener);
        const api = {
            connection: {
                readyState: MockWebSocket.OPEN,
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
            },
        };

        chartApi.completeApiTransition(api);

        expect(chartApi.api).toBe(api);
        expect(chartApi.is_transitioning).toBe(false);
        expect(firstListener).toHaveBeenCalledWith(api, null);
        expect(secondListener).toHaveBeenCalledWith(api, null);

        removeFirst();
        removeSecond();
    });

    test('a throwing listener cannot strand a failed transition or block a later reconnect', async () => {
        const throwingListener = chartApi.onApiChange(() => {
            throw new Error('listener failed');
        });

        await apiBase.init();
        await apiBase.init(true);

        expect(chartApi.is_transitioning).toBe(false);
        expect(apiBase.api).toBe(chartApi.api);

        throwingListener();
    });

    test('coordinated invalidation clears both wrappers and permits fresh initialization', async () => {
        await apiBase.init();
        const oldApi = apiBase.api;
        const notifications = [];
        const removeListener = chartApi.onApiChange((nextApi, previousApi) => {
            notifications.push({ nextApi, previousApi });
        });

        await apiBase.invalidateApi();

        expect(apiBase.api).toBeNull();
        expect(chartApi.api).toBeNull();
        expect(chartApi.is_transitioning).toBe(false);
        expect(notifications.at(-1)).toEqual({
            nextApi: null,
            previousApi: oldApi,
        });

        await apiBase.init();
        expect(apiBase.api).toBe(chartApi.api);
        expect(apiBase.api).not.toBe(oldApi);

        removeListener();
    });

    test('a throwing listener does not prevent coordinated invalidation', async () => {
        await apiBase.init();
        const removeListener = chartApi.onApiChange(() => {
            throw new Error('invalidation listener failed');
        });

        await expect(apiBase.invalidateApi()).resolves.toBeUndefined();

        expect(apiBase.api).toBeNull();
        expect(chartApi.api).toBeNull();
        expect(chartApi.is_transitioning).toBe(false);
        removeListener();
    });

    test('disconnect failure still completes coordinated invalidation', async () => {
        await apiBase.init();
        apiBase.api.disconnect.mockImplementationOnce(() => {
            throw new Error('disconnect failed');
        });

        await expect(apiBase.invalidateApi()).resolves.toBeUndefined();

        expect(apiBase.api).toBeNull();
        expect(chartApi.api).toBeNull();
        expect(chartApi.is_transitioning).toBe(false);
    });

    test('invalidation during reconnect cannot publish the stale replacement', async () => {
        await apiBase.init();
        let resolveSocketUrl;
        getSocketURL.mockReturnValueOnce(
            new Promise(resolve => {
                resolveSocketUrl = resolve;
            })
        );

        const reconnect = apiBase.init(true);
        await Promise.resolve();
        const invalidation = apiBase.invalidateApi();
        resolveSocketUrl('wss://deriv.test/stale');

        await invalidation;
        await expect(reconnect).rejects.toThrow('API initialization invalidated');
        expect(apiBase.api).toBeNull();
        expect(chartApi.api).toBeNull();
        expect(chartApi.is_transitioning).toBe(false);
        expect(apiBase.reconnect_promise).toBeNull();

        await apiBase.init();
        expect(apiBase.api).toBe(chartApi.api);
    });

    test('repeated chart initialization creates only one timer', async () => {
        const setIntervalSpy = jest.spyOn(global, 'setInterval');

        await chartApi.init();
        await chartApi.init();

        expect(setIntervalSpy).toHaveBeenCalledTimes(1);
        expect(chartApi.time_interval).toBeDefined();
    });

    test('chart timer does not send through the old API while forced reconnect is pending', async () => {
        await chartApi.init();
        jest.advanceTimersByTime(100);
        const oldApi = chartApi.api;
        let resolveSocketUrl;
        getSocketURL.mockReturnValueOnce(
            new Promise(resolve => {
                resolveSocketUrl = resolve;
            })
        );

        const reconnectPromise = chartApi.init(true);
        await flushMicrotasks();
        jest.advanceTimersByTime(30000);

        expect(oldApi.connection.readyState).toBe(MockWebSocket.CLOSED);
        expect(oldApi.send).not.toHaveBeenCalled();

        resolveSocketUrl('wss://deriv.test/reconnected');
        await reconnectPromise;
    });

    test('disconnecting the chart reference disconnects the shared APIBase socket too', async () => {
        await apiBase.init();
        const sharedApi = apiBase.api;

        sharedApi.connection.removeEventListener('close', apiBase.socket_close_handler);
        sharedApi.connection.removeEventListener('close', chartApi.socket_close_handler);
        chartApi.api.disconnect();

        expect(apiBase.api).toBe(sharedApi);
        expect(apiBase.api.connection.readyState).toBe(MockWebSocket.CLOSED);
    });
});