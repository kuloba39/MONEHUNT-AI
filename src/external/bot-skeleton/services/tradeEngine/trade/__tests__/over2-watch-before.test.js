import TradeEngine from '../index';
import * as constants from '../state/constants';

const OVER2_STRATEGY_ID = 'over2-signal-v2';

const createStore = (initialState, onSubscribe) => {
    let state = { ...initialState };
    const listeners = new Set();

    return {
        getState: jest.fn(() => state),
        subscribe: jest.fn(listener => {
            listeners.add(listener);
            onSubscribe?.(nextState => {
                state = { ...state, ...nextState };
                [...listeners].forEach(currentListener => currentListener());
            });
            return () => listeners.delete(listener);
        }),
        dispatch(nextState) {
            state = { ...state, ...nextState };
            [...listeners].forEach(listener => listener());
        },
        listenerCount: () => listeners.size,
    };
};

const createEngine = (store, strategyId = OVER2_STRATEGY_ID, signal) => {
    const engine = Object.create(TradeEngine.prototype);
    engine.store = store;
    engine.options = { strategyId };
    engine.$scope = { executionSignal: signal };
    engine.prevTick = store.getState().newTick;
    return engine;
};

const initialBeforeState = {
    scope: constants.BEFORE_PURCHASE,
    proposalsReady: true,
    newTick: 100,
};

describe('Over 2 before-purchase tick watcher', () => {
    test('releases only after a distinct epoch and unsubscribes', async () => {
        const store = createStore(initialBeforeState);
        const engine = createEngine(store);
        const waiting = engine.watch('before');
        let settled = false;
        waiting.then(() => {
            settled = true;
        });

        store.dispatch({ newTick: 100 });
        await Promise.resolve();
        expect(settled).toBe(false);

        store.dispatch({ newTick: 101 });
        await expect(waiting).resolves.toBe(true);
        expect(store.listenerCount()).toBe(0);
    });

    test('detects an epoch that arrives during subscription setup', async () => {
        const store = createStore(initialBeforeState, dispatch => {
            dispatch({ newTick: 101 });
        });
        const engine = createEngine(store);

        await expect(engine.watch('before')).resolves.toBe(true);
        expect(store.listenerCount()).toBe(0);
    });

    test.each([constants.STOP, constants.DURING_PURCHASE])(
        'cancels the waiter when scope changes to %s',
        async scope => {
            const store = createStore(initialBeforeState);
            const engine = createEngine(store);
            const waiting = engine.watch('before');

            store.dispatch({ scope });

            await expect(waiting).resolves.toBe(false);
            expect(store.listenerCount()).toBe(0);
        }
    );

    test('cancels and unsubscribes when the run signal aborts', async () => {
        const controller = new AbortController();
        const store = createStore(initialBeforeState);
        const engine = createEngine(store, OVER2_STRATEGY_ID, controller.signal);
        const waiting = engine.watch('before');

        controller.abort();

        await expect(waiting).resolves.toBe(false);
        expect(store.listenerCount()).toBe(0);
    });

    test('cleans up when reading state fails after subscription', async () => {
        const store = createStore(initialBeforeState);
        store.getState
            .mockImplementationOnce(() => initialBeforeState)
            .mockImplementationOnce(() => initialBeforeState)
            .mockImplementationOnce(() => initialBeforeState)
            .mockImplementationOnce(() => {
                throw new Error('test state failure');
            });
        const engine = createEngine(store);

        await expect(engine.watch('before')).rejects.toThrow('test state failure');
        expect(store.listenerCount()).toBe(0);
    });

    test('preserves the immediate ready fast path for other strategies', async () => {
        const store = createStore(initialBeforeState);
        const engine = createEngine(store, 'another-strategy');

        await expect(engine.watch('before')).resolves.toBe(true);
        expect(store.subscribe).not.toHaveBeenCalled();
    });
});