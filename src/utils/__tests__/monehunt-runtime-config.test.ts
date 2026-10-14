import {
    clearMonehuntRuntimeConfig,
    getMonehuntRuntimeConfig,
    setMonehuntRuntimeConfig,
} from '../monehunt-runtime-config';

describe('MONEHUNT runtime config bridge', () => {
    beforeEach(() => {
        clearMonehuntRuntimeConfig();
        jest.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    afterEach(() => {
        clearMonehuntRuntimeConfig();
        jest.restoreAllMocks();
    });

    it('returns null when no config has been set', () => {
        expect(getMonehuntRuntimeConfig()).toBeNull();
    });

    it('stores config and returns its values', () => {
        setMonehuntRuntimeConfig({
            symbol: 'R_100',
            stake: 2,
            duration: 3,
            durationUnit: 't',
        });

        expect(getMonehuntRuntimeConfig()).toEqual({
            symbol: 'R_100',
            stake: 2,
            duration: 3,
            durationUnit: 't',
        });
    });

    it('does not expose the stored object for direct mutation', () => {
        setMonehuntRuntimeConfig({ symbol: 'R_100', stake: 2 });

        const retrieved = getMonehuntRuntimeConfig();
        if (!retrieved) {
            throw new Error('Expected runtime config to exist');
        }

        retrieved.stake = 999;

        expect(getMonehuntRuntimeConfig()?.stake).toBe(2);
    });

    it('clears the config so a later run cannot read stale settings', () => {
        setMonehuntRuntimeConfig({ symbol: 'R_100', stake: 2 });

        clearMonehuntRuntimeConfig();

        expect(getMonehuntRuntimeConfig()).toBeNull();
    });

    it('accepts null to reset the config', () => {
        setMonehuntRuntimeConfig({ symbol: 'R_100' });

        setMonehuntRuntimeConfig(null);

        expect(getMonehuntRuntimeConfig()).toBeNull();
    });
});
