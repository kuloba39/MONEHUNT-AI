jest.mock('@/components/shared', () => ({
    getSocketURL: jest.fn(),
}));

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
        getState: jest.fn(() => []),
        setState: jest.fn(),
    },
}));
jest.mock('../../tradeEngine/utils/helpers', () => ({
    doUntilDone: jest.fn(promiseFn => promiseFn()),
    socket_state: {},
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
jest.mock('../appId', () => ({
    clearDerivApiInstance: jest.fn(),
    generateDerivApiInstance: jest.fn(),
    V2GetActiveAccountId: jest.fn(),
}));
jest.mock('../chart-api', () => ({
    __esModule: true,
    default: {
        beginApiTransition: jest.fn(),
        setApiBaseInitializer: jest.fn(),
    },
}));
jest.mock('@/stores/common-store', () => jest.fn());
jest.mock('@/services/derivws-accounts.service', () => ({
    DerivWSAccountsService: jest.fn(),
}));

describe('APIBase subscription ownership', () => {
    let apiBase;
    let globalTimeoutState;

    beforeEach(() => {
        jest.resetModules();
        globalTimeoutState = [];
        jest.doMock('../../../utils/observer', () => ({
            observer: {
                emit: jest.fn(),
                getState: jest.fn(() => globalTimeoutState),
                setState: jest.fn(),
            },
        }));
        apiBase = require('../api-base.ts').api_base;
        apiBase.subscriptions = [];
    });

    test('clears only subscriptions owned by the requested owner', () => {
        const firstOwner = {};
        const secondOwner = {};
        const firstSubscription = { unsubscribe: jest.fn() };
        const secondSubscription = { unsubscribe: jest.fn() };

        apiBase.pushSubscription(firstSubscription, firstOwner);
        apiBase.pushSubscription(secondSubscription, secondOwner);
        apiBase.clearSubscriptions(firstOwner);

        expect(firstSubscription.unsubscribe).toHaveBeenCalledTimes(1);
        expect(secondSubscription.unsubscribe).not.toHaveBeenCalled();
        expect(apiBase.subscriptions).toEqual([secondSubscription]);
    });

    test('repeated owner cleanup is safe and does not repeat unsubscribe', () => {
        const owner = {};
        const subscription = { unsubscribe: jest.fn() };

        apiBase.pushSubscription(subscription, owner);
        apiBase.clearSubscriptions(owner);
        apiBase.clearSubscriptions(owner);

        expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
        expect(apiBase.subscriptions).toEqual([]);
    });

    test('ownerless cleanup clears all subscriptions and preserves global timeout behavior', () => {
        const firstSubscription = { unsubscribe: jest.fn() };
        const secondSubscription = { unsubscribe: jest.fn() };

        apiBase.pushSubscription(firstSubscription);
        apiBase.pushSubscription(secondSubscription);
        apiBase.clearSubscriptions();

        expect(firstSubscription.unsubscribe).toHaveBeenCalledTimes(1);
        expect(secondSubscription.unsubscribe).toHaveBeenCalledTimes(1);
        expect(apiBase.subscriptions).toEqual([]);
    });
});
