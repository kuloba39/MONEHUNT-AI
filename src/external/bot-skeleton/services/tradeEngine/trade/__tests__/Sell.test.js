jest.mock('@/constants/backend-error-messages', () => ({
    getLocalizedErrorMessage: jest.fn(code => code),
}));

jest.mock('../../../../utils/observer', () => ({
    observer: {
        emit: jest.fn(),
    },
}));

jest.mock('@/external/bot-skeleton/services/api/api-base', () => ({
    api_base: {
        api: {
            send: jest.fn(),
        },
        is_running: true,
    },
}));

jest.mock('@/external/bot-skeleton/services/tradeEngine/utils/broadcast', () => ({
    contractStatus: jest.fn(),
    log: jest.fn(),
}));

jest.mock('@/external/bot-skeleton/services/tradeEngine/utils/helpers', () => ({
    doUntilDone: jest.fn(async operation => {
        try {
            return await operation();
        } catch (error) {
            const errorCode = error?.error?.code ?? error?.name;
            const defaultErrorsToRetry = [
                'CallError',
                'WrongResponse',
                'GetProposalFailure',
                'RateLimit',
                'DisconnectError',
                'MarketIsClosed',
            ];

            if (defaultErrorsToRetry.includes(errorCode)) {
                return operation();
            }
            throw error;
        }
    }),
    recoverFromError: jest.fn(),
}));

import Sell from '../Sell';
import { api_base } from '@/external/bot-skeleton/services/api/api-base';
import { DURING_PURCHASE } from '../state/constants';

describe('Sell.sellAtMarket', () => {
    let engine;

    beforeEach(() => {
        jest.clearAllMocks();

        engine = {
            store: {
                getState: () => ({ scope: DURING_PURCHASE }),
            },
            contractId: 'TEST-CONTRACT-1',
            isSold: false,
            isSellAvailable: true,
            isExpired: false,
            options: {
                timeMachineEnabled: false,
            },
            waitForAfter: jest.fn(),
        };

        const send = api_base.api.send;
        send.mockImplementation(request => {
            if (request.sell) {
                if (send.mock.calls.filter(([call]) => call.sell).length === 1) {
                    return Promise.reject({
                        error: { code: 'WrongResponse' },
                        msg_type: 'sell',
                    });
                }

                return Promise.resolve({
                    sell: { sold_for: 1 },
                });
            }

            if (request.proposal_open_contract) {
                return Promise.resolve({
                    proposal_open_contract: {
                        contract_id: 'TEST-CONTRACT-1',
                        is_sold: false,
                        sell_price: 1,
                    },
                });
            }

            return Promise.reject(new Error('Unexpected API request'));
        });
    });

    it('does not blindly repeat a sell request after a WrongResponse rejection', async () => {
        const SellEngine = Sell(class {});
        const instance = Object.assign(new SellEngine(), engine);

        await expect(instance.sellAtMarket()).rejects.toMatchObject({
            error: expect.objectContaining({
                code: 'SellOutcomeUnknown',
            }),
        });

        const sellCalls = api_base.api.send.mock.calls.filter(
            ([request]) => request.sell === 'TEST-CONTRACT-1'
        );

        expect(sellCalls).toHaveLength(1);
    });

    it('treats the contract as sold when status confirms the sale after a sell error', async () => {
        api_base.api.send.mockImplementation(request => {
            if (request.sell) {
                return Promise.reject({
                    error: { code: 'WrongResponse' },
                    msg_type: 'sell',
                });
            }

            if (request.proposal_open_contract) {
                return Promise.resolve({
                    proposal_open_contract: {
                        contract_id: 'TEST-CONTRACT-1',
                        is_sold: true,
                        sell_price: 1.25,
                    },
                });
            }

            return Promise.reject(new Error('Unexpected API request'));
        });

        const SellEngine = Sell(class {});
        const instance = Object.assign(new SellEngine(), engine);

        await expect(instance.sellAtMarket()).resolves.toBeUndefined();

        const sellCalls = api_base.api.send.mock.calls.filter(
            ([request]) => request.sell === 'TEST-CONTRACT-1'
        );

        expect(sellCalls).toHaveLength(1);
        expect(api_base.api.send).toHaveBeenCalledWith({
            proposal_open_contract: 1,
            contract_id: 'TEST-CONTRACT-1',
        });
        expect(instance.waitForAfter).toHaveBeenCalledTimes(1);
    });
    it('checks contract status after a RateLimit sell error without repeating the sell', async () => {
        api_base.api.send.mockImplementation(request => {
            if (request.sell) {
                return Promise.reject({
                    error: { code: 'RateLimit' },
                    msg_type: 'sell',
                });
            }

            if (request.proposal_open_contract) {
                return Promise.resolve({
                    proposal_open_contract: {
                        contract_id: 'TEST-CONTRACT-1',
                        is_sold: false,
                        sell_price: 0,
                    },
                });
            }

            return Promise.reject(new Error('Unexpected API request'));
        });

        const SellEngine = Sell(class {});
        const instance = Object.assign(new SellEngine(), engine);

        await expect(instance.sellAtMarket()).rejects.toMatchObject({
            error: expect.objectContaining({
                code: 'SellOutcomeUnknown',
                original_code: 'RateLimit',
            }),
        });

        expect(
            api_base.api.send.mock.calls.filter(
                ([request]) => request.sell === 'TEST-CONTRACT-1'
            )
        ).toHaveLength(1);

        expect(api_base.api.send).toHaveBeenCalledWith({
            proposal_open_contract: 1,
            contract_id: 'TEST-CONTRACT-1',
        });
    });

    it('does not report a successful sale when contract status lookup fails', async () => {
        api_base.api.send.mockImplementation(request => {
            if (request.sell) {
                return Promise.reject({
                    error: { code: 'WrongResponse' },
                    msg_type: 'sell',
                });
            }

            if (request.proposal_open_contract) {
                return Promise.reject({
                    error: { code: 'InvalidContractId' },
                    msg_type: 'proposal_open_contract',
                });
            }

            return Promise.reject(new Error('Unexpected API request'));
        });

        const SellEngine = Sell(class {});
        const instance = Object.assign(new SellEngine(), engine);

        await expect(instance.sellAtMarket()).rejects.toMatchObject({
            error: { code: 'InvalidContractId' },
        });

        expect(
            api_base.api.send.mock.calls.filter(
                ([request]) => request.sell === 'TEST-CONTRACT-1'
            )
        ).toHaveLength(1);

        expect(instance.waitForAfter).not.toHaveBeenCalled();
    });

});



