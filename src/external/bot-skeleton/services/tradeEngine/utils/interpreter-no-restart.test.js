let mockScope;
let mockError;
let mockBot;

jest.mock('@/components/shared', () => ({
    isMultiplierContract: jest.fn(() => false),
}));

jest.mock('@/utils/clone', () => jest.fn(value => value));

jest.mock('@deriv/js-interpreter', () =>
    jest.fn().mockImplementation(() => ({
        run: jest.fn(() => {
            mockScope.observer.emit('Error', mockError);
            return true;
        }),
        pseudoToNative: jest.fn(value => value),
        value: undefined,
    }))
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

jest.mock('../Interface', () => jest.fn(() => mockBot));

jest.mock('./cliTools', () => ({
    createScope: jest.fn(() => {
        const handlers = {};
        mockScope = {
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
        return mockScope;
    }),
}));

describe('Interpreter protected execution errors', () => {
    let Interpreter;
    let apiBase;

    beforeEach(() => {
        jest.clearAllMocks();

        mockError = undefined;
        mockBot = {
            tradeEngine: {
                options: { shouldRestartOnError: true },
                tradeOptions: { test: true },
                initArgs: [],
                init: jest.fn(),
                start: jest.fn(),
            },
        };

        Interpreter = require('./interpreter').default;
        apiBase = require('../../api/api-base').api_base;
    });

    test.each([
        'PURCHASE_OUTCOME_UNCERTAIN',
        'OUD_EXECUTION_CYCLE_REQUIRED',
    ])('%s rejects without restarting the trade engine', async errorCode => {
        mockError = Object.assign(new Error(`Test error: ${errorCode}`), {
            code: errorCode,
        });

        const interpreter = Interpreter();

        await expect(interpreter.run('')).rejects.toMatchObject({
            code: errorCode,
        });

        expect(mockBot.tradeEngine.init).not.toHaveBeenCalled();
        expect(mockBot.tradeEngine.start).not.toHaveBeenCalled();
        expect(apiBase.clearSubscriptions).not.toHaveBeenCalled();
        expect(mockScope.ticksService.unsubscribeFromTicksService).not.toHaveBeenCalled();
    });
});
