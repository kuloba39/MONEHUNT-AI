let Ticks;

jest.mock('lodash.debounce', () => callback => callback);
jest.mock('@/constants/backend-error-messages', () => ({
    getLocalizedErrorMessage: jest.fn(),
}));
jest.mock('@deriv-com/translations', () => ({
    localize: value => value,
}));
jest.mock('../../../../utils/binary-utils', () => ({
    getLast: values => values[values.length - 1],
}));
jest.mock('../../../../utils/observer', () => ({
    observer: { emit: jest.fn() },
}));
jest.mock('../../../api/api-base', () => ({
    api_base: { api: null },
}));
jest.mock('../../utils/helpers', () => ({
    getDirection: jest.fn(),
    getLastDigit: jest.fn(),
}));
jest.mock('../../utils/sanitize', () => ({
    expectPositiveInteger: jest.fn(value => value),
}));

const createEngine = monitor => {
    const Engine = class {
        constructor() {
            this.$scope = {
                ticksService: { monitor, stopMonitor: jest.fn(() => Promise.resolve()) },
            };
            this.symbol = 'R_100';
            this.store = { dispatch: jest.fn() };
        }
    };

    const TicksEngine = Ticks(Engine);
    return new TicksEngine();
};

beforeEach(() => {
    jest.resetModules();
    Ticks = require('../Ticks').default;
});

test('delay completion stops the exact monitor listener key', async () => {
    let callback;
    const monitor = jest.fn(({ callback: listener }) => {
        callback = listener;
        return Promise.resolve('delay-listener-key');
    });
    const engine = createEngine(monitor);

    const delay = engine.getDelayTickValue(2);
    callback([1]);
    callback([2]);

    await expect(delay).resolves.toEqual([[1], [2]]);
    await Promise.resolve();
    expect(engine.$scope.ticksService.stopMonitor).toHaveBeenCalledWith({
        symbol: 'R_100',
        key: 'delay-listener-key',
    });
    expect(engine.$scope.ticksService.stopMonitor).toHaveBeenCalledTimes(1);
});

test('non-positive delay resolves without creating a monitor', async () => {
    const monitor = jest.fn();
    const engine = createEngine(monitor);

    await expect(engine.getDelayTickValue(0)).resolves.toEqual([]);
    await expect(engine.getDelayTickValue(-1)).resolves.toEqual([]);
    expect(monitor).not.toHaveBeenCalled();
});

test('monitor rejection rejects the delay promise', async () => {
    const monitor = jest.fn(() => Promise.reject(new Error('monitor failed')));
    const engine = createEngine(monitor);

    await expect(engine.getDelayTickValue(2)).rejects.toThrow('monitor failed');
});

test('completion before monitor key resolves still stops the exact listener', async () => {
    let callback;
    let resolveMonitor;

    const monitor = jest.fn(({ callback: listener }) => {
        callback = listener;
        return new Promise(resolve => {
            resolveMonitor = resolve;
        });
    });

    const engine = createEngine(monitor);
    const delay = engine.getDelayTickValue(1);

    callback([7]);

    await expect(delay).resolves.toEqual([[7]]);
    expect(engine.$scope.ticksService.stopMonitor).not.toHaveBeenCalled();

    resolveMonitor('late-delay-listener-key');
    await Promise.resolve();

    expect(engine.$scope.ticksService.stopMonitor).toHaveBeenCalledWith({
        symbol: 'R_100',
        key: 'late-delay-listener-key',
    });
    expect(engine.$scope.ticksService.stopMonitor).toHaveBeenCalledTimes(1);
});

test('overlapping watchTicks requests stop the stale listener without replacing the current one', async () => {
    let resolveOldMonitor;

    const monitor = jest.fn(({ symbol }) => {
        if (symbol === 'R_10') {
            return new Promise(resolve => {
                resolveOldMonitor = resolve;
            });
        }

        return Promise.resolve('current-listener-key');
    });

    const engine = createEngine(monitor);

    const oldRequest = engine.watchTicks('R_10');
    const currentRequest = engine.watchTicks('R_25');

    await currentRequest;

    resolveOldMonitor('stale-listener-key');
    await oldRequest;

    expect(engine.$scope.ticksService.stopMonitor).toHaveBeenCalledWith({
        symbol: 'R_10',
        key: 'stale-listener-key',
    });
    expect(engine.tickListener).toEqual({
        symbol: 'R_25',
        key: 'current-listener-key',
    });
});