```typescript
import { useEffect, useState } from 'react';

type Market = {
    symbol: string;
    display_name: string;
    symbol_type?: string;
    underlying_symbol?: string;
    underlying_symbol_name?: string;
    underlying_symbol_type?: string;
};

export const useActiveMarkets = () => {

    const [markets, setMarkets] = useState<Market[]>([]);

    useEffect(() => {

        let cancelled = false;

        const loadMarkets = async () => {

            try {

                const api =
                    (window as any)
                        .ApiHelpers
                        ?.instance;

                const activeSymbols =
                    api?.active_symbols;

                if (!activeSymbols) {

                    console.log(
                        'D CIRCLES ACTIVE SYMBOL SERVICE NOT READY'
                    );

                    return;
                }

                const symbols =
                    await activeSymbols
                        .retrieveActiveSymbols(true);

                console.log(
                    'D CIRCLES REAL SYMBOLS',
                    symbols
                );

                if (!Array.isArray(symbols)) {

                    console.log(
                        'D CIRCLES ACTIVE SYMBOLS INVALID',
                        symbols
                    );

                    return;
                }

                const clean: Market[] = symbols
                    .map((item: any) => {

                        /*
                         * Current Deriv API
                         */
                        const symbol =
                            item.underlying_symbol ||
                            item.symbol;

                        const displayName =
                            item.underlying_symbol_name ||
                            item.display_name ||
                            symbol;

                        const symbolType =
                            item.underlying_symbol_type ||
                            item.symbol_type;

                        return {
                            symbol,
                            display_name: displayName,
                            symbol_type: symbolType,
                            underlying_symbol:
                                item.underlying_symbol,
                            underlying_symbol_name:
                                item.underlying_symbol_name,
                            underlying_symbol_type:
                                item.underlying_symbol_type,
                        };

                    })
                    .filter(
                        (item: Market) =>
                            Boolean(item.symbol)
                    );

                /*
                 * Remove duplicate symbols.
                 */
                const unique =
                    Array.from(
                        new Map(
                            clean.map(
                                item => [
                                    item.symbol,
                                    item
                                ]
                            )
                        ).values()
                    );

                /*
                 * Sort alphabetically by
                 * display name.
                 */
                unique.sort(
                    (a, b) =>
                        a.display_name.localeCompare(
                            b.display_name
                        )
                );

                if (!cancelled) {

                    setMarkets(unique);

                    console.log(
                        'D CIRCLES MARKETS LOADED',
                        unique.length
                    );

                    console.log(
                        'D CIRCLES MARKET LIST',
                        unique
                    );

                }

            } catch (error) {

                console.log(
                    'D CIRCLES MARKET ERROR',
                    error
                );

            }

        };

        loadMarkets();

        return () => {

            cancelled = true;

        };

    }, []);

    return markets;

};
```
