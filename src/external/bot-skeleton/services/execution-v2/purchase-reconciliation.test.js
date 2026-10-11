import { createPurchaseReconciliation } from './purchase-reconciliation';

describe('purchase reconciliation', () => {
    const registerAttempt = (reconciliation, overrides = {}) =>
        reconciliation.register({
            cycleId: 'cycle-1',
            requestId: '101',
            accountId: 'CR12345',
            ...overrides,
        });

    test('registers a purchase as uncertain before its response arrives', () => {
        const reconciliation = createPurchaseReconciliation();

        const result = registerAttempt(reconciliation);

        expect(result.accepted).toBe(true);
        expect(result.attempt.status).toBe('UNCERTAIN');
        expect(result.attempt.contractId).toBeNull();
    });

    test('blocks duplicate cycle and request registrations', () => {
        const reconciliation = createPurchaseReconciliation();

        expect(registerAttempt(reconciliation).accepted).toBe(true);

        expect(registerAttempt(reconciliation).reason)
            .toBe('CYCLE_ALREADY_REGISTERED');

        expect(registerAttempt(reconciliation, {
            cycleId: 'cycle-2',
        }).reason).toBe('REQUEST_ID_ALREADY_REGISTERED');
    });

    test('ignores missing and unknown request IDs', () => {
        const reconciliation = createPurchaseReconciliation();
        registerAttempt(reconciliation);

        expect(reconciliation.observeMessage({}, 'CR12345').reason)
            .toBe('MISSING_REQUEST_ID');

        expect(reconciliation.observeMessage({
            req_id: 999,
            msg_type: 'buy',
            buy: { contract_id: 77 },
        }, 'CR12345').reason).toBe('UNKNOWN_REQUEST_ID');
    });

    test('rejects a response observed under a different active account', () => {
        const reconciliation = createPurchaseReconciliation();
        registerAttempt(reconciliation);

        const result = reconciliation.observeMessage({
            req_id: 101,
            msg_type: 'buy',
            buy: { contract_id: 777 },
        }, 'CR99999');

        expect(result.accepted).toBe(false);
        expect(result.reason).toBe('ACCOUNT_MISMATCH');
        expect(reconciliation.getSnapshot('cycle-1').status).toBe('UNCERTAIN');
    });

    test('does not confirm a purchase from a non-buy response', () => {
        const reconciliation = createPurchaseReconciliation();
        registerAttempt(reconciliation);

        const result = reconciliation.observeMessage({
            req_id: 101,
            msg_type: 'proposal',
            proposal: { id: 'proposal-1' },
        }, 'CR12345');

        expect(result.accepted).toBe(false);
        expect(result.reason).toBe('NOT_A_VALID_BUY_RESPONSE');
        expect(reconciliation.getSnapshot('cycle-1').status).toBe('UNCERTAIN');
    });

    test('confirms the matching buy and recognizes a duplicate confirmation', () => {
        const reconciliation = createPurchaseReconciliation();
        registerAttempt(reconciliation);

        const message = {
            req_id: 101,
            msg_type: 'buy',
            buy: { contract_id: 777 },
        };

        const first = reconciliation.observeMessage(message, 'CR12345');
        expect(first.accepted).toBe(true);
        expect(first.attempt.status).toBe('CONFIRMED');
        expect(first.attempt.contractId).toBe('777');

        const duplicate = reconciliation.observeMessage(message, 'CR12345');
        expect(duplicate.accepted).toBe(true);
        expect(duplicate.reason).toBe('DUPLICATE_CONFIRMATION');

        const conflict = reconciliation.observeMessage({
            ...message,
            buy: { contract_id: 888 },
        }, 'CR12345');

        expect(conflict.accepted).toBe(false);
        expect(conflict.reason).toBe('CONFLICTING_OR_UNRELATED_RESPONSE');
    });

    test('does not reject a purchase for an error-shaped non-error message', () => {
        const reconciliation = createPurchaseReconciliation();
        registerAttempt(reconciliation);

        const result = reconciliation.observeMessage({
            req_id: 101,
            msg_type: 'proposal',
            error: { code: 'UnrelatedError', message: 'Not a buy response' },
        }, 'CR12345');

        expect(result.accepted).toBe(false);
        expect(result.reason).toBe('UNEXPECTED_ERROR_MESSAGE_TYPE');
        expect(reconciliation.getSnapshot('cycle-1').status).toBe('UNCERTAIN');
    });
    test('keeps a correlated API error unresolved and accepts a later matching buy', () => {
        const reconciliation = createPurchaseReconciliation();
        registerAttempt(reconciliation);

        const result = reconciliation.observeMessage({
            req_id: 101,
            msg_type: 'error',
            error: { code: 'InvalidContract', message: 'Buy rejected' },
        }, 'CR12345');

        expect(result.accepted).toBe(false);
        expect(result.reason).toBe('CORRELATED_ERROR_OUTCOME_UNRESOLVED');
        expect(reconciliation.getSnapshot('cycle-1').status).toBe('UNCERTAIN');

        const laterBuy = reconciliation.observeMessage({
            req_id: 101,
            msg_type: 'buy',
            buy: { contract_id: 777 },
        }, 'CR12345');

        expect(laterBuy.accepted).toBe(true);
        expect(laterBuy.attempt.status).toBe('CONFIRMED');
        expect(laterBuy.attempt.contractId).toBe('777');
    });

    test('returns a snapshot copy instead of exposing internal state', () => {
        const reconciliation = createPurchaseReconciliation();
        registerAttempt(reconciliation);

        const snapshot = reconciliation.getSnapshot('cycle-1');
        snapshot.status = 'CONFIRMED';
        snapshot.contractId = 'fake-contract';

        expect(reconciliation.getSnapshot('cycle-1').status).toBe('UNCERTAIN');
        expect(reconciliation.getSnapshot('cycle-1').contractId).toBeNull();
        expect(reconciliation.getSnapshot('missing-cycle')).toBeNull();
    });
});

