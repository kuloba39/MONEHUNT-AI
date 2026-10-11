import reducer from '../index';
import * as constants from '../../constants';
import {
    start,
    proposalsReady,
    purchaseSuccessful,
    sell,
    readyForNextPurchase,
} from '../../actions';

const createTestStore = () => {
    let state = reducer(undefined, { type: '@@INIT' });

    const getState = () => state;

    const dispatch = action => {
        if (typeof action === 'function') {
            return action(dispatch, getState);
        }

        state = reducer(state, action);
        return action;
    };

    return { dispatch, getState };
};

describe('TradeEngine purchase re-arm lifecycle', () => {
    test('settlement followed by re-arm returns to BEFORE_PURCHASE', () => {
        const store = createTestStore();

        expect(store.getState().scope).toBe(constants.STOP);

        store.dispatch(start());
        store.dispatch(proposalsReady());
        store.dispatch(purchaseSuccessful());

        expect(store.getState().scope).toBe(constants.DURING_PURCHASE);

        store.dispatch(sell());

        expect(store.getState().scope).toBe(constants.STOP);

        store.dispatch(readyForNextPurchase());

        expect(store.getState().scope).toBe(constants.BEFORE_PURCHASE);
        expect(store.getState().proposalsReady).toBe(true);
    });

    test('re-arm is ignored while a contract is still active', () => {
        const store = createTestStore();

        store.dispatch(start());
        store.dispatch(proposalsReady());
        store.dispatch(purchaseSuccessful());

        expect(store.getState().scope).toBe(constants.DURING_PURCHASE);

        store.dispatch(readyForNextPurchase());

        expect(store.getState().scope).toBe(constants.DURING_PURCHASE);
    });
});
