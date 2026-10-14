jest.mock('@/components/shared', () => ({
    getRoundedNumber: jest.fn(value => Math.round(Number(value) * 100) / 100),
}));

import OpenContract from '../OpenContract';

describe('Trading Workspace runtime-config Martingale settlement', () => {
    let engine;

    const settlement = ({
        contractId = 'CONTRACT-1',
        sellTransactionId = 'SELL-1',
        buyPrice = 1,
        sellPrice = 0.5,
    } = {}) => ({
        contract_id: contractId,
        transaction_ids: { sell: sellTransactionId },
        buy_price: buyPrice,
        sell_price: sellPrice,
        currency: 'USD',
    });

    beforeEach(() => {
        jest.clearAllMocks();

        const OpenContractEngine = OpenContract(class {});
        engine = Object.assign(new OpenContractEngine(), {
            options: {},
            monehuntMartingale: {
                startingStake: 1,
                currentStake: 1,
                multiplier: 2,
                maxStake: null,
            },
            tradeOptions: { amount: 1 },
            is_proposal_subscription_required: true,
            makeProposals: jest.fn(),
        });
    });

    it('increases the next stake after a confirmed loss', () => {
        engine.applyMonehuntMartingale(settlement());

        expect(engine.monehuntMartingale.currentStake).toBe(2);
        expect(engine.tradeOptions.amount).toBe(2);
        expect(engine.makeProposals).toHaveBeenCalledWith({
            ...engine.options,
            ...engine.tradeOptions,
        });
    });

    it('resets to the starting stake after a win', () => {
        engine.monehuntMartingale.currentStake = 4;
        engine.tradeOptions.amount = 4;

        engine.applyMonehuntMartingale(settlement({
            contractId: 'CONTRACT-WIN',
            sellTransactionId: 'SELL-WIN',
            buyPrice: 1,
            sellPrice: 2,
        }));

        expect(engine.monehuntMartingale.currentStake).toBe(1);
        expect(engine.tradeOptions.amount).toBe(1);
    });

    it('resets to the starting stake at break-even', () => {
        engine.monehuntMartingale.currentStake = 4;
        engine.tradeOptions.amount = 4;

        engine.applyMonehuntMartingale(settlement({
            contractId: 'CONTRACT-EVEN',
            sellTransactionId: 'SELL-EVEN',
            buyPrice: 1,
            sellPrice: 1,
        }));

        expect(engine.monehuntMartingale.currentStake).toBe(1);
        expect(engine.tradeOptions.amount).toBe(1);
    });

    it('resets to the starting stake when the next stake exceeds the cap', () => {
        engine.monehuntMartingale.maxStake = 1.5;

        engine.applyMonehuntMartingale(settlement());

        expect(engine.monehuntMartingale.currentStake).toBe(1);
        expect(engine.tradeOptions.amount).toBe(1);
    });

    it('ignores a duplicate settlement for the same contract', () => {
        engine.applyMonehuntMartingale(settlement());
        engine.makeProposals.mockClear();

        engine.applyMonehuntMartingale(settlement());

        expect(engine.monehuntMartingale.currentStake).toBe(2);
        expect(engine.tradeOptions.amount).toBe(2);
        expect(engine.makeProposals).not.toHaveBeenCalled();
    });

    it('does not progress Martingale for native OUD', () => {
        engine.options.nativeOudDirectPurchase = true;

        engine.applyMonehuntMartingale(settlement());

        expect(engine.monehuntMartingale.currentStake).toBe(1);
        expect(engine.tradeOptions.amount).toBe(1);
        expect(engine.makeProposals).not.toHaveBeenCalled();
    });

    it('does not progress when settlement identity is missing', () => {
        engine.applyMonehuntMartingale(settlement({
            contractId: null,
        }));

        expect(engine.monehuntMartingale.currentStake).toBe(1);
        expect(engine.tradeOptions.amount).toBe(1);
        expect(engine.makeProposals).not.toHaveBeenCalled();
    });

    it('does not refresh proposals when proposal subscriptions are not required', () => {
        engine.is_proposal_subscription_required = false;

        engine.applyMonehuntMartingale(settlement());

        expect(engine.monehuntMartingale.currentStake).toBe(2);
        expect(engine.tradeOptions.amount).toBe(2);
        expect(engine.makeProposals).not.toHaveBeenCalled();
    });
});
