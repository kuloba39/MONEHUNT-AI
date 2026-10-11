export type OUDPurchaseLockRecord = {
    version: 1;
    accountId: string;
    cycleId: string | null;
    createdAt: string;
    contractId: string | null;
    reason: string;
};

export type OUDPurchaseLockSnapshot = {
    locked: boolean;
    record: OUDPurchaseLockRecord | null;
    error: string | null;
};

type LockStorage = Pick<Storage, 'getItem' | 'setItem'>;

const STORAGE_PREFIX = 'monehunt:oud:purchase-outcome-uncertain:v1:';

export const createOUDPurchaseLock = (
    accountId: string | null | undefined,
    suppliedStorage?: LockStorage,
) => {
    const normalizedAccountId =
        typeof accountId === 'string' ? accountId.trim() : '';

    const storageKey = normalizedAccountId
        ? `${STORAGE_PREFIX}${encodeURIComponent(normalizedAccountId)}`
        : null;

    const getStorage = (): LockStorage => {
        if (suppliedStorage) return suppliedStorage;

        if (typeof window === 'undefined' || !window.localStorage) {
            throw new Error('Browser storage is unavailable.');
        }

        return window.localStorage;
    };

    const getSnapshot = (): OUDPurchaseLockSnapshot => {
        if (!normalizedAccountId || !storageKey) {
            return {
                locked: true,
                record: null,
                error: 'Active Deriv account ID is unavailable. Trading is blocked.',
            };
        }

        try {
            const raw = getStorage().getItem(storageKey);

            if (raw === null) {
                return { locked: false, record: null, error: null };
            }

            const parsed: unknown = JSON.parse(raw);

            if (
                !parsed ||
                typeof parsed !== 'object' ||
                !('version' in parsed) ||
                parsed.version !== 1 ||
                !('accountId' in parsed) ||
                parsed.accountId !== normalizedAccountId ||
                !('createdAt' in parsed) ||
                typeof parsed.createdAt !== 'string' ||
                !('reason' in parsed) ||
                typeof parsed.reason !== 'string'
            ) {
                return {
                    locked: true,
                    record: null,
                    error: 'Purchase lock record is invalid. Trading remains blocked.',
                };
            }

            const candidate = parsed as OUDPurchaseLockRecord;

            if (
                !(candidate.cycleId === null || typeof candidate.cycleId === 'string') ||
                !(candidate.contractId === null || typeof candidate.contractId === 'string')
            ) {
                return {
                    locked: true,
                    record: null,
                    error: 'Purchase lock record is incomplete. Trading remains blocked.',
                };
            }

            return { locked: true, record: candidate, error: null };
        } catch {
            return {
                locked: true,
                record: null,
                error: 'Purchase lock storage could not be read. Trading remains blocked.',
            };
        }
    };

    const lock = (details: {
        cycleId?: string | null;
        contractId?: string | null;
        reason: string;
    }): OUDPurchaseLockRecord => {
        if (!normalizedAccountId || !storageKey) {
            throw new Error('Cannot persist purchase lock without an active Deriv account ID.');
        }

        if (!details.reason.trim()) {
            throw new Error('A reason is required to persist the purchase lock.');
        }

        const record: OUDPurchaseLockRecord = {
            version: 1,
            accountId: normalizedAccountId,
            cycleId: details.cycleId ?? null,
            createdAt: new Date().toISOString(),
            contractId: details.contractId ?? null,
            reason: details.reason,
        };

        const storage = getStorage();
        const serialized = JSON.stringify(record);

        storage.setItem(storageKey, serialized);

        // Verify persistence before treating the lock as established.
        if (storage.getItem(storageKey) !== serialized) {
            throw new Error('Purchase lock persistence could not be verified.');
        }

        const snapshot = getSnapshot();

        if (
            !snapshot.locked ||
            !snapshot.record ||
            snapshot.record.accountId !== normalizedAccountId ||
            snapshot.record.createdAt !== record.createdAt
        ) {
            throw new Error(
                snapshot.error ?? 'Purchase lock persistence could not be verified.',
            );
        }

        return record;
    };

    return { getSnapshot, lock };
};
