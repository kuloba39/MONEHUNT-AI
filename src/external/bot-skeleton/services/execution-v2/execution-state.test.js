import {
    createInitialExecutionState,
    EXECUTION_EVENT as EVENT,
    EXECUTION_STATUS as STATUS,
    transitionExecutionState as transition,
} from './execution-state';

describe('Execution V2 state machine', () => {
    const send = (state, type, extra = {}) =>
        transition(state, { type, ...extra });

    const openedContract = () => {
        let state = createInitialExecutionState();
        state = send(state, EVENT.START, { sessionId: 'session-1' });
        state = send(state, EVENT.PROPOSAL_READY);
        state = send(state, EVENT.PURCHASE_REQUESTED, {
            purchaseId: 'purchase-1',
        });
        state = send(state, EVENT.PURCHASE_CONFIRMED, {
            contractId: 'contract-123',
        });
        return state;
    };

    test('starts and advances through proposal and purchase states', () => {
        let state = createInitialExecutionState();

        state = send(state, EVENT.START, { sessionId: 'session-1' });
        expect(state.status).toBe(STATUS.WAITING_FOR_PROPOSAL);

        state = send(state, EVENT.PROPOSAL_READY);
        expect(state.status).toBe(STATUS.READY_TO_BUY);

        state = send(state, EVENT.PURCHASE_REQUESTED, {
            purchaseId: 'purchase-1',
        });
        expect(state.status).toBe(STATUS.BUYING);

        state = send(state, EVENT.PURCHASE_CONFIRMED, {
            contractId: 'contract-123',
        });
        expect(state.status).toBe(STATUS.CONTRACT_OPEN);
        expect(state.contractId).toBe('contract-123');
    });

    test('rejects purchase attempts before proposal readiness', () => {
        const state = send(
            createInitialExecutionState(),
            EVENT.PURCHASE_REQUESTED
        );

        expect(state.status).toBe(STATUS.IDLE);
    });

    test('ignores purchase confirmation without a contract ID', () => {
        let state = createInitialExecutionState();
        state = send(state, EVENT.START);
        state = send(state, EVENT.PROPOSAL_READY);
        state = send(state, EVENT.PURCHASE_REQUESTED);
        const next = send(state, EVENT.PURCHASE_CONFIRMED);

        expect(next).toBe(state);
        expect(next.status).toBe(STATUS.BUYING);
    });

    test('accepts only settlement for the active contract', () => {
        const state = openedContract();

        const wrongContract = send(state, EVENT.SETTLEMENT_RECEIVED, {
            contractId: 'another-contract',
            status: 'won',
        });

        expect(wrongContract).toBe(state);

        const settled = send(state, EVENT.SETTLEMENT_RECEIVED, {
            contractId: 'contract-123',
            status: 'lost',
        });

        expect(settled.status).toBe(STATUS.SETTLING);
        expect(settled.settledContractIds).toEqual(['contract-123']);
    });

    test('does not process the same settlement twice', () => {
        const state = openedContract();
        const first = send(state, EVENT.SETTLEMENT_RECEIVED, {
            contractId: 'contract-123',
            status: 'won',
        });
        const duplicate = send(first, EVENT.SETTLEMENT_RECEIVED, {
            contractId: 'contract-123',
            status: 'lost',
        });

        expect(duplicate).toBe(first);
        expect(duplicate.settledContractIds).toHaveLength(1);
        expect(duplicate.settlement.status).toBe('won');
    });

    test('waits for settlement before stopping an open contract', () => {
        let state = openedContract();
        state = send(state, EVENT.STOP);

        expect(state.status).toBe(STATUS.CONTRACT_OPEN);
        expect(state.stopRequested).toBe(true);

        state = send(state, EVENT.SETTLEMENT_RECEIVED, {
            contractId: 'contract-123',
            status: 'won',
        });
        state = send(state, EVENT.SETTLEMENT_CONFIRMED, { contractId: 'contract-123' });

        expect(state.status).toBe(STATUS.STOPPED);
        expect(state.contractId).toBeNull();
    });

    test('allows the next cycle only after settlement is confirmed', () => {
        let state = openedContract();
        state = send(state, EVENT.SETTLEMENT_RECEIVED, {
            contractId: 'contract-123',
            status: 'lost',
        });

        expect(state.status).toBe(STATUS.SETTLING);

        const staleConfirmation = send(state, EVENT.SETTLEMENT_CONFIRMED, {
            contractId: 'wrong-contract',
        });
        expect(staleConfirmation).toBe(state);
        expect(staleConfirmation.status).toBe(STATUS.SETTLING);

        state = send(state, EVENT.SETTLEMENT_CONFIRMED, {
            contractId: 'contract-123',
        });
        expect(state.status).toBe(STATUS.WAITING_FOR_PROPOSAL);
        expect(state.contractId).toBeNull();
    });

    test('does not reset while a contract is active', () => {
        const state = openedContract();
        const next = send(state, EVENT.RESET);

        expect(next).toBe(state);
        expect(next.contractId).toBe('contract-123');
    });

    test('keeps tracking an active contract if a failure occurs', () => {
        const state = openedContract();
        const next = send(state, EVENT.FAILURE, {
            message: 'Temporary connection failure',
        });

        expect(next.status).toBe(STATUS.CONTRACT_OPEN);
        expect(next.contractId).toBe('contract-123');
        expect(next.lastError).toBe('Temporary connection failure');
    });
});

