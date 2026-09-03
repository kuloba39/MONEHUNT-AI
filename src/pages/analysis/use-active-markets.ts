import { useEffect, useState } from 'react';

export type Market = {
    symbol: string;
    display_name: string;
    symbol_type?: string;
    underlying_symbol?: string;
    underlying_symbol_name?: string;
    underlying_symbol_type?: string;
};

export const useActiveMarkets = () => {
    const [markets, setMarkets] = useState<Market[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadMarkets = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch(
                    'https://api.deriv.com/api-explorer/get_active_symbols'
                );

                if (!response.ok) {
                    throw new Error(
                        `Failed to load markets (${response.status})`
                    );
                }

                const data = await response.json();

                const activeMarkets: Market[] =
                    data?.active_symbols?.map((market: any) => ({
                        symbol: market.symbol,
                        display_name:
                            market.display_name ||
                            market.market_display_name ||
                            market.symbol,
                        symbol_type: market.symbol_type,
                        underlying_symbol: market.underlying_symbol,
                        underlying_symbol_name:
                            market.underlying_symbol_name,
                        underlying_symbol_type:
                            market.underlying_symbol_type,
                    })) ?? [];

                if (!cancelled) {
                    setMarkets(activeMarkets);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : 'Failed to load markets'
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadMarkets();

        return () => {
            cancelled = true;
        };
    }, []);

    return {
        markets,
        loading,
        error,
    };
};