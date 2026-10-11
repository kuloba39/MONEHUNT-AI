import { createOUDPurchaseLock } from '../execution/oud-purchase-lock';

const createMemoryStorage = () => {
    const values = new Map<string, string>();

    return {
        getItem: jest.fn((key: string) => values.get(key) ?? null),
        setItem: jest.fn((key: string, value: string) => {
            values.set(key, value);
        }),
    };
};

describe('OUD persistent purchase lock', () => {
    test('starts unlocked when storage is readable and no lock exists', () => {
        const storage = createMemoryStorage();
        const lock = createOUDPurchaseLock('CR12345', storage);

        expect(lock.getSnapshot()).toEqual({
            locked: false,
            record: null,
            error: null,
        });
    });

    test('persists an uncertain purchase lock', () => {
        const storage = createMemoryStorage();
        const lock = createOUDPurchaseLock('CR12345', storage);

        const record = lock.lock({
            cycleId: 'oud-cycle-1',
            contractId: null,
            reason: 'Purchase outcome could not be confirmed.',
        });

        expect(record.accountId).toBe('CR12345');
        expect(record.cycleId).toBe('oud-cycle-1');
        expect(lock.getSnapshot().locked).toBe(true);
        expect(lock.getSnapshot().record?.reason).toBe(
            'Purchase outcome could not be confirmed.',
        );
    });

    test('keeps the lock after a new helper instance is created', () => {
        const storage = createMemoryStorage();

        createOUDPurchaseLock('CR12345', storage).lock({
            cycleId: 'oud-cycle-2',
            reason: 'Uncertain purchase',
        });

        const recreated = createOUDPurchaseLock('CR12345', storage);

        expect(recreated.getSnapshot().locked).toBe(true);
        expect(recreated.getSnapshot().record?.cycleId).toBe('oud-cycle-2');
    });

    test('isolates locks by Deriv account', () => {
        const storage = createMemoryStorage();

        createOUDPurchaseLock('CR12345', storage).lock({
            cycleId: 'cycle-a',
            reason: 'Uncertain purchase',
        });

        expect(createOUDPurchaseLock('CR99999', storage).getSnapshot().locked)
            .toBe(false);
    });

    test('fails closed when the account ID is missing', () => {
        const lock = createOUDPurchaseLock(null, createMemoryStorage());

        expect(lock.getSnapshot().locked).toBe(true);
        expect(() => lock.lock({ reason: 'Uncertain purchase' })).toThrow(
            /account ID/i,
        );
    });

    test('fails closed when storage cannot be read', () => {
        const storage = {
            getItem: jest.fn(() => {
                throw new Error('storage denied');
            }),
            setItem: jest.fn(),
        };

        const lock = createOUDPurchaseLock('CR12345', storage);

        expect(lock.getSnapshot().locked).toBe(true);
        expect(lock.getSnapshot().error).toMatch(/blocked/i);
    });

    test('fails closed if writing the lock fails', () => {
        const storage = {
            getItem: jest.fn(() => null),
            setItem: jest.fn(() => {
                throw new Error('storage full');
            }),
        };

        const lock = createOUDPurchaseLock('CR12345', storage);

        expect(() =>
            lock.lock({ reason: 'Uncertain purchase' }),
        ).toThrow(/storage full/i);
    });

    test('fails closed on a corrupted existing record', () => {
        const storage = createMemoryStorage();

        storage.setItem(
            'monehunt:oud:purchase-outcome-uncertain:v1:CR12345',
            '{not-json',
        );

        const lock = createOUDPurchaseLock('CR12345', storage);

        expect(lock.getSnapshot().locked).toBe(true);
        expect(lock.getSnapshot().error).toMatch(/blocked/i);
    });
});
