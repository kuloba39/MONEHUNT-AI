const normalizeId = (value, name) => {
    if (typeof value !== 'string' || !value.trim()) {
        throw new Error("A non-empty " + name + " is required.");
    }

    return value.trim();
};

export const createPurchaseReconciliation = () => {
    const attemptsByCycle = new Map();
    const cyclesByRequest = new Map();

    const register = ({ cycleId, requestId, accountId }) => {
        const cycle = normalizeId(cycleId, 'cycle ID');
        const request = normalizeId(requestId, 'request ID');
        const account = normalizeId(accountId, 'account ID');

        if (attemptsByCycle.has(cycle)) {
            return { accepted: false, reason: 'CYCLE_ALREADY_REGISTERED' };
        }

        if (cyclesByRequest.has(request)) {
            return { accepted: false, reason: 'REQUEST_ID_ALREADY_REGISTERED' };
        }

        const attempt = {
            cycleId: cycle,
            requestId: request,
            accountId: account,
            status: 'UNCERTAIN',
            contractId: null,
            reason: 'AWAITING_CORRELATED_RESPONSE',
        };

        attemptsByCycle.set(cycle, attempt);
        cyclesByRequest.set(request, cycle);

        return { accepted: true, attempt: { ...attempt } };
    };

    const observeMessage = (message, activeAccountId) => {
        const requestId = message?.req_id;

        if (requestId === undefined || requestId === null) {
            return { accepted: false, reason: 'MISSING_REQUEST_ID' };
        }

        const cycleId = cyclesByRequest.get(String(requestId));
        if (!cycleId) {
            return { accepted: false, reason: 'UNKNOWN_REQUEST_ID' };
        }

        const attempt = attemptsByCycle.get(cycleId);

        if (activeAccountId !== attempt.accountId) {
            return { accepted: false, reason: 'ACCOUNT_MISMATCH' };
        }

        if (attempt.status === 'CONFIRMED') {
            const returnedId = message?.buy?.contract_id;
            return {
                accepted: returnedId !== undefined &&
                    String(returnedId) === attempt.contractId,
                reason: returnedId !== undefined &&
                    String(returnedId) === attempt.contractId
                    ? 'DUPLICATE_CONFIRMATION'
                    : 'CONFLICTING_OR_UNRELATED_RESPONSE',
                attempt: { ...attempt },
            };
        }

        if (attempt.status === 'REJECTED') {
            return { accepted: false, reason: 'ATTEMPT_ALREADY_REJECTED' };
        }

        if (message?.error) {
            if (message.msg_type !== 'error') {
                return { accepted: false, reason: 'UNEXPECTED_ERROR_MESSAGE_TYPE' };
            }

            // A correlated error alone is not sufficient evidence to safely
            // classify the purchase as definitively rejected.
            return {
                accepted: false,
                reason: 'CORRELATED_ERROR_OUTCOME_UNRESOLVED',
                attempt: { ...attempt },
            };
        }

        const contractId = message?.buy?.contract_id;

        if (
            message?.msg_type !== 'buy' ||
            contractId === undefined ||
            contractId === null ||
            !String(contractId).trim()
        ) {
            return { accepted: false, reason: 'NOT_A_VALID_BUY_RESPONSE' };
        }

        attempt.status = 'CONFIRMED';
        attempt.contractId = String(contractId);
        attempt.reason = null;

        return { accepted: true, attempt: { ...attempt } };
    };

    const getSnapshot = cycleId => {
        const cycle = normalizeId(cycleId, 'cycle ID');
        const attempt = attemptsByCycle.get(cycle);
        return attempt ? { ...attempt } : null;
    };

    return Object.freeze({ register, observeMessage, getSnapshot });
};

