import { createExecutionApiAdapter } from './execution-api-adapter';

describe('execution API adapter', () => {
    let listener;
    let unsubscribe;
    let api;
    let accountId;
    let adapter;

    beforeEach(() => {
        listener = null;
        unsubscribe = jest.fn();
        accountId = 'CR12345';

        api = {
            onMessage: jest.fn(() => ({
                subscribe: jest.fn(callback => {
                    listener = callback;
                    return { unsubscribe };
                }),
            })),
            send: jest.fn(async request => {
                const response = {
                    req_id: request.req_id,
                    msg_type: 'buy',
                    buy: { contract_id: 777 },
                };

                listener?.({ data: response });
                return response;
            }),
        };

        adapter = createExecutionApiAdapter({
            getApi: () => api,
            getAccountId: () => accountId,
        });

        adapter.startListening();
    });

    afterEach(() => {
        adapter.dispose();
    });

    test('subscribes once and reuses the shared API', () => {
        expect(adapter.startListening()).toBe(false);
        expect(api.onMessage).toHaveBeenCalledTimes(1);
        expect(api.send).not.toHaveBeenCalled();
    });

    test('rebinds the listener when the shared API instance changes', async () => {
        const oldListener = listener;
        const replacementUnsubscribe = jest.fn();
        let replacementListener;

        const replacementApi = {
            onMessage: jest.fn(() => ({
                subscribe: jest.fn(callback => {
                    replacementListener = callback;
                    return { unsubscribe: replacementUnsubscribe };
                }),
            })),
            send: jest.fn(async request => {
                const response = {
                    req_id: request.req_id,
                    msg_type: 'buy',
                    buy: { contract_id: 888 },
                };

                replacementListener?.({ data: response });
                return response;
            }),
        };

        api = replacementApi;

        expect(adapter.startListening()).toBe(true);
        expect(unsubscribe).toHaveBeenCalledTimes(1);
        expect(replacementApi.onMessage).toHaveBeenCalledTimes(1);

        const result = await adapter.sendBuyOnce({
            cycleId: 'reconnected-cycle',
            request: { buy: 'proposal-reconnected', price: 10 },
        });

        expect(replacementApi.send).toHaveBeenCalledTimes(1);
        expect(result.contractId).toBe('888');
        expect(adapter.getAttempt('reconnected-cycle').status).toBe('CONFIRMED');

        oldListener?.({
            data: {
                req_id: result.requestId,
                msg_type: 'buy',
                buy: { contract_id: 999 },
            },
        });

        expect(adapter.getAttempt('reconnected-cycle').contractId).toBe('888');
    });

    test('confirms a correlated buy without sending twice', async () => {
        const result = await adapter.sendBuyOnce({
            cycleId: 'cycle-1',
            request: { buy: 'proposal-123', price: 10 },
        });

        expect(api.send).toHaveBeenCalledTimes(1);
        expect(result.contractId).toBe('777');
        expect(result.cycleId).toBe('cycle-1');
        expect(adapter.getAttempt('cycle-1').status).toBe('CONFIRMED');
    });

    test('generates distinct increasing request IDs for separate cycles', async () => {
        await adapter.sendBuyOnce({
            cycleId: 'cycle-request-id-a',
            request: { buy: 'proposal-a', price: 10 },
        });

        await adapter.sendBuyOnce({
            cycleId: 'cycle-request-id-b',
            request: { buy: 'proposal-b', price: 10 },
        });

        const firstRequestId = api.send.mock.calls[0][0].req_id;
        const secondRequestId = api.send.mock.calls[1][0].req_id;

        expect(firstRequestId).toEqual(expect.any(Number));
        expect(secondRequestId).toEqual(expect.any(Number));
        expect(secondRequestId).toBeGreaterThan(firstRequestId);
        expect(secondRequestId).not.toBe(firstRequestId);
        expect(api.send).toHaveBeenCalledTimes(2);
    });
    test('blocks a second buy for the same cycle', async () => {
        await adapter.sendBuyOnce({
            cycleId: 'cycle-duplicate',
            request: { buy: 'proposal-123', price: 10 },
        });

        await expect(adapter.sendBuyOnce({
            cycleId: 'cycle-duplicate',
            request: { buy: 'proposal-456', price: 10 },
        })).rejects.toThrow('CYCLE_ALREADY_REGISTERED');

        expect(api.send).toHaveBeenCalledTimes(1);
    });

    test('does not retry when send rejects and waits for correlated confirmation', async () => {
        api.send.mockRejectedValueOnce(new Error('Connection interrupted'));

        const purchasePromise = adapter.sendBuyOnce({
            cycleId: 'cycle-uncertain',
            request: { buy: 'proposal-123', price: 10 },
        });

        await Promise.resolve();
        await Promise.resolve();

        expect(api.send).toHaveBeenCalledTimes(1);
        expect(adapter.getAttempt('cycle-uncertain').status).toBe('UNCERTAIN');

        const requestId = api.send.mock.calls[0][0].req_id;

        listener?.({
            data: {
                req_id: requestId,
                msg_type: 'buy',
                buy: { contract_id: 1002 },
            },
        });

        const result = await purchasePromise;

        expect(result.contractId).toBe('1002');
        expect(result.cycleId).toBe('cycle-uncertain');
        expect(adapter.getAttempt('cycle-uncertain').status).toBe('CONFIRMED');
        expect(api.send).toHaveBeenCalledTimes(1);
    });

    test('resolves from a correlated confirmation while the send promise is pending', async () => {
        api.send.mockImplementationOnce(() => new Promise(() => {}));

        const purchasePromise = adapter.sendBuyOnce({
            cycleId: 'cycle-pending-send',
            request: { buy: 'proposal-pending', price: 10 },
        });

        await Promise.resolve();

        const requestId = api.send.mock.calls[0][0].req_id;

        listener?.({
            data: {
                req_id: requestId,
                msg_type: 'buy',
                buy: { contract_id: 1001 },
            },
        });

        const outcome = await Promise.race([
            purchasePromise.then(
                result => ({ state: 'resolved', result }),
                error => ({ state: 'rejected', error })
            ),
            new Promise(resolve =>
                setTimeout(() => resolve({ state: 'still-pending' }), 50)
            ),
        ]);

        expect(outcome.state).toBe('resolved');
        expect(outcome.result.contractId).toBe('1001');
        expect(api.send).toHaveBeenCalledTimes(1);
    });
    test('resolves the original purchase from a late correlated buy', async () => {
        api.send.mockRejectedValueOnce(new Error('Connection interrupted'));

        const purchasePromise = adapter.sendBuyOnce({
            cycleId: 'cycle-late-confirmation',
            request: { buy: 'proposal-late', price: 10 },
        });

        await Promise.resolve();
        await Promise.resolve();

        const requestId = api.send.mock.calls[0][0].req_id;

        const earlyOutcome = await Promise.race([
            purchasePromise.then(
                result => ({ state: 'resolved', result }),
                error => ({ state: 'rejected', error })
            ),
            new Promise(resolve =>
                setTimeout(() => resolve({ state: 'still-pending' }), 30)
            ),
        ]);

        expect(earlyOutcome.state).toBe('still-pending');

        listener?.({
            data: {
                req_id: requestId,
                msg_type: 'buy',
                buy: { contract_id: 999 },
            },
        });

        const result = await purchasePromise;

        expect(result.contractId).toBe('999');
        expect(result.response.buy.contract_id).toBe(999);
        expect(adapter.getAttempt('cycle-late-confirmation')).toMatchObject({
            status: 'CONFIRMED',
            contractId: '999',
            accountId: 'CR12345',
        });
        expect(api.send).toHaveBeenCalledTimes(1);
    });
    test('times out uncertain purchases without retrying', async () => {
        const timeoutAdapter = createExecutionApiAdapter({
            getApi: () => api,
            getAccountId: () => accountId,
            confirmationTimeoutMs: 40,
        });
        timeoutAdapter.startListening();

        api.send.mockImplementationOnce(() => new Promise(() => {}));

        try {
            await expect(timeoutAdapter.sendBuyOnce({
                cycleId: 'cycle-timeout',
                request: { buy: 'proposal-timeout', price: 10 },
            })).rejects.toMatchObject({
                code: 'PURCHASE_OUTCOME_UNCERTAIN',
                cycleId: 'cycle-timeout',
            });

            expect(api.send).toHaveBeenCalledTimes(1);
            expect(timeoutAdapter.getAttempt('cycle-timeout').status).toBe('UNCERTAIN');

            await expect(timeoutAdapter.sendBuyOnce({
                cycleId: 'cycle-timeout',
                request: { buy: 'proposal-timeout', price: 10 },
            })).rejects.toThrow();

            expect(api.send).toHaveBeenCalledTimes(1);
        } finally {
            timeoutAdapter.dispose();
        }
    });

    test('recognizes a late confirmation after timeout without another send', async () => {
        const timeoutAdapter = createExecutionApiAdapter({
            getApi: () => api,
            getAccountId: () => accountId,
            confirmationTimeoutMs: 40,
        });
        timeoutAdapter.startListening();

        api.send.mockImplementationOnce(() => new Promise(() => {}));

        try {
            await expect(timeoutAdapter.sendBuyOnce({
                cycleId: 'cycle-late-after-timeout',
                request: { buy: 'proposal-late-timeout', price: 10 },
            })).rejects.toMatchObject({
                code: 'PURCHASE_OUTCOME_UNCERTAIN',
            });

            const requestId = api.send.mock.calls[0][0].req_id;

            expect(timeoutAdapter.getAttempt('cycle-late-after-timeout').status)
                .toBe('UNCERTAIN');

            listener?.({
                data: {
                    req_id: requestId,
                    msg_type: 'buy',
                    buy: { contract_id: 123456 },
                },
            });

            expect(timeoutAdapter.getAttempt('cycle-late-after-timeout')).toMatchObject({
                status: 'CONFIRMED',
                contractId: '123456',
                accountId: 'CR12345',
            });
            expect(api.send).toHaveBeenCalledTimes(1);
        } finally {
            timeoutAdapter.dispose();
        }
    });
    test('does not confirm a response from another account', async () => {
        api.send.mockImplementationOnce(async request => {
            accountId = 'CR99999';

            const response = {
                req_id: request.req_id,
                msg_type: 'buy',
                buy: { contract_id: 888 },
            };

            listener?.({ data: response });
            return response;
        });

        await expect(adapter.sendBuyOnce({
            cycleId: 'cycle-account-mismatch',
            request: { buy: 'proposal-123', price: 10 },
        })).rejects.toMatchObject({
            code: 'PURCHASE_OUTCOME_UNCERTAIN',
        });

        expect(api.send).toHaveBeenCalledTimes(1);
        expect(adapter.getAttempt('cycle-account-mismatch').status).toBe('UNCERTAIN');
    });

    test('unsubscribes its own listener and refuses later purchases', async () => {
        expect(adapter.dispose()).toBe(true);
        expect(adapter.dispose()).toBe(false);
        expect(unsubscribe).toHaveBeenCalledTimes(1);

        await expect(adapter.sendBuyOnce({
            cycleId: 'cycle-disposed',
            request: { buy: 'proposal-123', price: 10 },
        })).rejects.toThrow('disposed');

        expect(api.send).not.toHaveBeenCalled();
    });

    test('requires listening before purchasing', async () => {
        adapter.dispose();

        const unstartedAdapter = createExecutionApiAdapter({
            getApi: () => api,
            getAccountId: () => accountId,
        });

        await expect(unstartedAdapter.sendBuyOnce({
            cycleId: 'cycle-not-listening',
            request: { buy: 'proposal-123', price: 10 },
        })).rejects.toThrow('Start the adapter listener');

        expect(api.send).not.toHaveBeenCalled();
        unstartedAdapter.dispose();
    });
});

