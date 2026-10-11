import { createPurchaseReconciliation } from './purchase-reconciliation';

let requestSequence = Date.now() * 100;

const createRequestId = () => {
    if (
        !Number.isSafeInteger(requestSequence) ||
        requestSequence >= Number.MAX_SAFE_INTEGER
    ) {
        throw new Error('A safe unique request ID cannot be generated.');
    }

    requestSequence += 1;
    return requestSequence;
};

export const createExecutionApiAdapter = ({
    getApi,
    getAccountId,
    reconciliation = createPurchaseReconciliation(),
    confirmationTimeoutMs = 15000,
}) => {
    if (typeof getApi !== 'function') {
        throw new Error('getApi must be a function.');
    }

    if (typeof getAccountId !== 'function') {
        throw new Error('getAccountId must be a function.');
    }

    if (!Number.isFinite(confirmationTimeoutMs) || confirmationTimeoutMs <= 0) {
        throw new Error('confirmationTimeoutMs must be a positive finite number.');
    }

    let messageSubscription = null;
    let listeningApi = null;
    let disposed = false;
    const confirmationWaiters = new Map();

    const observe = message => {
        if (disposed || !message || typeof message !== 'object') {
            return { accepted: false, reason: 'ADAPTER_INACTIVE_OR_INVALID_MESSAGE' };
        }

        const result = reconciliation.observeMessage(
            message,
            String(getAccountId() || '')
        );

        if (result.accepted && result.attempt?.status === 'CONFIRMED') {
            const waiter = confirmationWaiters.get(result.attempt.cycleId);
            waiter?.logTiming?.('confirmation:received');
            waiter?.resolve({ message, attempt: result.attempt });

            // Keep timed-out attempts observable until a late confirmation arrives.
            if (
                waiter?.timedOut &&
                confirmationWaiters.get(result.attempt.cycleId) === waiter
            ) {
                confirmationWaiters.delete(result.attempt.cycleId);
            }
        }

        return result;
    };

    const startListening = () => {
        if (disposed) {
            throw new Error('Execution API adapter has been disposed.');
        }

        const api = getApi();

        if (!api || typeof api.onMessage !== 'function') {
            throw new Error('Shared API message stream is unavailable.');
        }

        if (messageSubscription && listeningApi === api) {
            return false;
        }

        const stream = api.onMessage();

        if (!stream || typeof stream.subscribe !== 'function') {
            throw new Error('Shared API message subscription is unavailable.');
        }

        const nextSubscription = stream.subscribe(envelope => {
            if (!disposed && listeningApi === api) {
                observe(envelope?.data);
            }
        });

        const previousSubscription = messageSubscription;

        messageSubscription = nextSubscription;
        listeningApi = api;

        if (
            previousSubscription &&
            typeof previousSubscription.unsubscribe === 'function'
        ) {
            previousSubscription.unsubscribe();
        }

        return true;
    };

    const sendBuyOnce = async ({ cycleId, request }) => {
        if (disposed) {
            throw new Error('Execution API adapter has been disposed.');
        }

        if (!messageSubscription) {
            throw new Error('Start the adapter listener before purchasing.');
        }

        if (listeningApi !== getApi()) {
            startListening();
        }

        if (!messageSubscription || listeningApi !== getApi()) {
            throw new Error('Start the adapter listener on the current API before purchasing.');
        }

        if (!request || typeof request !== 'object' || !request.buy) {
            throw new Error('A valid buy request is required.');
        }

        if (request.req_id !== undefined) {
            throw new Error('The adapter owns the purchase request ID.');
        }

        const api = getApi();
        const accountId = String(getAccountId() || '');

        if (!api || typeof api.send !== 'function') {
            throw new Error('Shared API send method is unavailable.');
        }

        if (!accountId) {
            throw new Error('An authorized account ID is required.');
        }

        const requestId = createRequestId();

        const registration = reconciliation.register({
            cycleId: String(cycleId),
            requestId: String(requestId),
            accountId,
        });

        if (!registration.accepted) {
            throw new Error(
                'Purchase blocked: ' + registration.reason
            );
        }

        // Install the confirmation waiter before sending so an immediate
        // correlated response cannot be missed.
        let resolveConfirmation;
        const confirmationPromise = new Promise(resolve => {
            resolveConfirmation = resolve;
        });
        const cycle = String(cycleId);
        const timingStartedAt = Date.now();
        const logTiming = stage => console.info('[EXECUTION API TIMING]', {
            stage,
            cycleId: cycle,
            requestId,
            elapsedMs: Date.now() - timingStartedAt,
            at: new Date().toISOString(),
        });
        const waiter = {
            resolve: resolveConfirmation,
            logTiming,
            timedOut: false,
        };
        confirmationWaiters.set(cycle, waiter);
        let timeoutHandle;

        // Exactly one send call. A rejected or unresolved promise does not
        // prove the purchase failed, so this adapter never retries it.
        try {
            if (String(getAccountId() || '') !== accountId) {
                throw new Error(
                    'Active account changed before purchase; purchase blocked.'
                );
            }

            const confirmationResult = confirmationPromise.then(
                ({ message, attempt }) => ({
                    response: message,
                    cycleId: cycle,
                    requestId,
                    contractId: attempt.contractId,
                })
            );

            const sendPromise = Promise.resolve()
                .then(() => {
                    logTiming('send:started');
                    return api.send({
                        ...request,
                        req_id: requestId,
                    });
                })
                .then(
                    response => {
                        logTiming('send:resolved');
                        const message = response?.data ?? response;

                        if (message?.req_id !== undefined) {
                            observe(message);
                        }

                        const attempt = reconciliation.getSnapshot(cycle);

                        if (attempt?.status !== 'CONFIRMED' || !attempt.contractId) {
                            const error = new Error(
                                'Purchase outcome is not confirmed; automatic retry is blocked.'
                            );
                            error.code = 'PURCHASE_OUTCOME_UNCERTAIN';
                            error.cycleId = cycle;
                            throw error;
                        }

                        return {
                            response,
                            cycleId: cycle,
                            requestId,
                            contractId: attempt.contractId,
                        };
                    },
                    error => {
                        logTiming('send:rejected');
                        // Only a rejected send waits for later confirmation.
                        // Response validation errors must still propagate.
                        console.warn(
                            '[EXECUTION API] Buy send rejected; awaiting correlated confirmation.',
                            error
                        );
                        return confirmationResult;
                    }
                );

            const timeoutPromise = new Promise((_, reject) => {
                timeoutHandle = setTimeout(() => {
                    waiter.timedOut = true;
                    logTiming('confirmation:timeout');

                    const error = new Error(
                        `Purchase confirmation was not received within ${confirmationTimeoutMs}ms; outcome is uncertain and automatic retry is blocked.`
                    );
                    error.code = 'PURCHASE_OUTCOME_UNCERTAIN';
                    error.cycleId = cycle;
                    error.requestId = requestId;
                    reject(error);
                }, confirmationTimeoutMs);
            });

            return await Promise.race([
                sendPromise,
                confirmationResult,
                timeoutPromise,
            ]);
        } catch (error) {
            // Preserve the registered attempt for later reconciliation.
            // Never issue another buy because the promise rejected.
            throw error;
        } finally {
            clearTimeout(timeoutHandle);

            // Keep the waiter after timeout so a late confirmation can clean it up.
            if (
                !waiter.timedOut &&
                confirmationWaiters.get(cycle) === waiter
            ) {
                confirmationWaiters.delete(cycle);
            }
        }
    };

    const getAttempt = cycleId =>
        reconciliation.getSnapshot(String(cycleId));

    const dispose = () => {
        if (disposed) return false;

        disposed = true;

        const subscription = messageSubscription;
        messageSubscription = null;
        listeningApi = null;

        if (subscription && typeof subscription.unsubscribe === 'function') {
            subscription.unsubscribe();
        }

        return true;
    };

    return Object.freeze({
        startListening,
        sendBuyOnce,
        getAttempt,
        dispose,
    });
};


