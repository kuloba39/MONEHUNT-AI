import {
    createPurchaseAttemptGuard,
    VALID_STATUSES,
} from './purchase-attempt-guard';

describe('purchase-attempt-guard', () => {
    test('allows one purchase attempt per cycle', () => {
        const guard = createPurchaseAttemptGuard();

        const first = guard.begin('cycle-1');
        const second = guard.begin('cycle-1');

        expect(first.allowed).toBe(true);
        expect(first.attempt.attemptCount).toBe(1);
        expect(second.allowed).toBe(false);
        expect(second.reason).toBe('CYCLE_ALREADY_ATTEMPTED');
    });

    test('does not allow another attempt when the result is uncertain', () => {
        const guard = createPurchaseAttemptGuard();

        guard.begin('cycle-2');

        expect(guard.markUncertain('cycle-2').accepted).toBe(true);
        expect(guard.getSnapshot('cycle-2').status).toBe(
            VALID_STATUSES.UNCERTAIN
        );
        expect(guard.begin('cycle-2').allowed).toBe(false);
        expect(guard.rejectDefinitively('cycle-2').accepted).toBe(false);
    });

    test('can confirm a contract after an uncertain response', () => {
        const guard = createPurchaseAttemptGuard();

        guard.begin('cycle-3');
        guard.markUncertain('cycle-3');

        const result = guard.confirm('cycle-3', 'contract-123');

        expect(result.accepted).toBe(true);
        expect(result.attempt.status).toBe(VALID_STATUSES.CONFIRMED);
        expect(result.attempt.contractId).toBe('contract-123');
    });

    test('accepts duplicate confirmation only for the same contract', () => {
        const guard = createPurchaseAttemptGuard();

        guard.begin('cycle-4');
        guard.confirm('cycle-4', 'contract-456');

        const duplicate = guard.confirm('cycle-4', 'contract-456');
        const conflict = guard.confirm('cycle-4', 'contract-789');

        expect(duplicate.accepted).toBe(true);
        expect(duplicate.reason).toBe('DUPLICATE_CONFIRMATION');
        expect(conflict.accepted).toBe(false);
        expect(conflict.reason).toBe('CONFLICTING_CONTRACT_ID');
    });

    test('rejects a definitive failure and blocks another attempt in that cycle', () => {
        const guard = createPurchaseAttemptGuard();

        guard.begin('cycle-5');

        expect(guard.rejectDefinitively('cycle-5').accepted).toBe(true);
        expect(guard.getSnapshot('cycle-5').status).toBe(
            VALID_STATUSES.REJECTED
        );
        expect(guard.begin('cycle-5').allowed).toBe(false);
    });

    test('rejects missing contract IDs and unknown cycles', () => {
        const guard = createPurchaseAttemptGuard();

        expect(guard.confirm('missing-cycle', 'contract-1').accepted).toBe(false);

        guard.begin('cycle-6');

        expect(guard.confirm('cycle-6', ' ').reason).toBe(
            'MISSING_CONTRACT_ID'
        );
    });

    test('requires a non-empty cycle ID', () => {
        const guard = createPurchaseAttemptGuard();

        expect(() => guard.begin(' ')).toThrow('A non-empty cycle ID is required.');
        expect(() => guard.getSnapshot('')).toThrow(
            'A non-empty cycle ID is required.'
        );
    });

    test('returns snapshots without exposing mutable internal state', () => {
        const guard = createPurchaseAttemptGuard();

        guard.begin('cycle-7');

        const snapshot = guard.getSnapshot('cycle-7');
        snapshot.status = 'CORRUPTED';
        snapshot.contractId = 'fake-contract';

        expect(guard.getSnapshot('cycle-7').status).toBe(
            VALID_STATUSES.REQUESTED
        );
        expect(guard.getSnapshot('cycle-7').contractId).toBeNull();
    });
});
