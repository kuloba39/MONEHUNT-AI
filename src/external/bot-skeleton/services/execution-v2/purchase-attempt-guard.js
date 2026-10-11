const VALID_STATUSES = Object.freeze({
    REQUESTED: 'REQUESTED',
    UNCERTAIN: 'UNCERTAIN',
    CONFIRMED: 'CONFIRMED',
    REJECTED: 'REJECTED',
});

export const createPurchaseAttemptGuard = () => {
    const attempts = new Map();

    const normalizeCycleId = cycleId => {
        if (typeof cycleId !== 'string' || !cycleId.trim()) {
            throw new Error('A non-empty cycle ID is required.');
        }

        return cycleId.trim();
    };

    const snapshot = cycleId => {
        const id = normalizeCycleId(cycleId);
        const attempt = attempts.get(id);

        return attempt ? { ...attempt } : null;
    };

    const begin = cycleId => {
        const id = normalizeCycleId(cycleId);

        if (attempts.has(id)) {
            return {
                allowed: false,
                reason: 'CYCLE_ALREADY_ATTEMPTED',
                attempt: snapshot(id),
            };
        }

        const attempt = {
            cycleId: id,
            attemptCount: 1,
            status: VALID_STATUSES.REQUESTED,
            contractId: null,
            reason: null,
        };

        attempts.set(id, attempt);

        return {
            allowed: true,
            reason: null,
            attempt: { ...attempt },
        };
    };

    const markUncertain = (cycleId, reason = 'OUTCOME_UNKNOWN') => {
        const id = normalizeCycleId(cycleId);
        const attempt = attempts.get(id);

        if (!attempt || attempt.status !== VALID_STATUSES.REQUESTED) {
            return { accepted: false, attempt: snapshot(id) };
        }

        attempt.status = VALID_STATUSES.UNCERTAIN;
        attempt.reason = reason;

        return { accepted: true, attempt: { ...attempt } };
    };

    const confirm = (cycleId, contractId) => {
        const id = normalizeCycleId(cycleId);

        if (typeof contractId !== 'string' || !contractId.trim()) {
            return {
                accepted: false,
                reason: 'MISSING_CONTRACT_ID',
                attempt: snapshot(id),
            };
        }

        const attempt = attempts.get(id);

        if (!attempt) {
            return {
                accepted: false,
                reason: 'UNKNOWN_CYCLE',
                attempt: null,
            };
        }

        if (attempt.status === VALID_STATUSES.CONFIRMED) {
            return {
                accepted: attempt.contractId === contractId.trim(),
                reason: attempt.contractId === contractId.trim()
                    ? 'DUPLICATE_CONFIRMATION'
                    : 'CONFLICTING_CONTRACT_ID',
                attempt: { ...attempt },
            };
        }

        if (
            attempt.status !== VALID_STATUSES.REQUESTED &&
            attempt.status !== VALID_STATUSES.UNCERTAIN
        ) {
            return {
                accepted: false,
                reason: 'ATTEMPT_NOT_CONFIRMABLE',
                attempt: { ...attempt },
            };
        }

        attempt.status = VALID_STATUSES.CONFIRMED;
        attempt.contractId = contractId.trim();
        attempt.reason = null;

        return { accepted: true, attempt: { ...attempt } };
    };

    const rejectDefinitively = (cycleId, reason = 'DEFINITIVE_REJECTION') => {
        const id = normalizeCycleId(cycleId);
        const attempt = attempts.get(id);

        // An uncertain result must be reconciled before it can be rejected.
        if (!attempt || attempt.status !== VALID_STATUSES.REQUESTED) {
            return { accepted: false, attempt: snapshot(id) };
        }

        attempt.status = VALID_STATUSES.REJECTED;
        attempt.reason = reason;

        return { accepted: true, attempt: { ...attempt } };
    };

    return Object.freeze({
        begin,
        markUncertain,
        confirm,
        rejectDefinitively,
        getSnapshot: snapshot,
    });
};

export { VALID_STATUSES };
