jest.mock('@/constants/backend-error-messages', () => ({
    getLocalizedErrorMessage: jest.fn(() => 'test error'),
}));

jest.mock('@/external/bot-skeleton/services/api/api-base', () => ({
    api_base: { api: { send: jest.fn() } },
}));

jest.mock('@/external/bot-skeleton/services/tradeEngine/utils/helpers', () => ({
    doUntilDone: jest.fn(),
    tradeOptionToProposal: jest.fn(() => []),
}));

jest.mock('../state/actions', () => ({
    clearProposals: jest.fn(),
    proposalsReady: jest.fn(),
}));

import Proposal from '../Proposal';

describe('Proposal contract-type switching', () => {
    const ProposalEngine = Proposal(class {});

    const baseOptions = {
        amount: 1,
        basis: 'stake',
        duration: 1,
        duration_unit: 't',
        prediction: 2,
        underlying_symbol: 'R_100',
    };

    const makeEngine = contractTypes =>
        Object.assign(new ProposalEngine(), {
            trade_option: {
                ...baseOptions,
                contractTypes,
            },
        });

    it('detects switching from DIGITOVER to DIGITUNDER', () => {
        const engine = makeEngine(['DIGITOVER']);

        expect(
            engine.isNewTradeOption({
                ...baseOptions,
                contractTypes: ['DIGITUNDER'],
            })
        ).toBe(true);
    });

    it('detects switching from DIGITUNDER to DIGITOVER', () => {
        const engine = makeEngine(['DIGITUNDER']);

        expect(
            engine.isNewTradeOption({
                ...baseOptions,
                contractTypes: ['DIGITOVER'],
            })
        ).toBe(true);
    });

    it('does not refresh for an unchanged contract configuration', () => {
        const engine = makeEngine(['DIGITOVER']);

        expect(
            engine.isNewTradeOption({
                ...baseOptions,
                contractTypes: ['DIGITOVER'],
            })
        ).toBe(false);
    });
});