export interface VolatilityMarketSymbol {
    symbol: string;
    name: string;
    market: string;
    submarket: string;
    subgroup: string;
    pipSize?: number;
    isTradingSuspended?: boolean;
    exchangeIsOpen?: boolean;
}

export function isVolatilityMarket(
    symbol: Partial<VolatilityMarketSymbol>,
): boolean {
    return (
        symbol.market === 'synthetic_index' &&
        symbol.submarket === 'random_index' &&
        symbol.subgroup === 'synthetics' &&
        Boolean(symbol.symbol)
    );
}

export function extractVolatilityMarkets(
    activeSymbols: any[],
): VolatilityMarketSymbol[] {
    if (!Array.isArray(activeSymbols)) {
        return [];
    }

    const markets: VolatilityMarketSymbol[] = activeSymbols
        .filter((item: any) => {
            if (!item) {
                return false;
            }

            return isVolatilityMarket({
                symbol:
                    item.underlying_symbol ||
                    item.symbol,
                name:
                    item.underlying_symbol_name ||
                    item.display_name ||
                    item.symbol,
                market: item.market,
                submarket: item.submarket,
                subgroup: item.subgroup,
            });
        })
        .filter((item: any) => {
            return (
                item.exchange_is_open !== 0 &&
                item.is_trading_suspended !== 1
            );
        })
        .map((item: any) => ({
            symbol:
                item.underlying_symbol ||
                item.symbol,

            name:
                item.underlying_symbol_name ||
                item.display_name ||
                item.symbol,

            market: item.market || '',

            submarket:
                item.submarket || '',

            subgroup:
                item.subgroup || '',

            pipSize:
                typeof item.pip_size === 'number'
                    ? item.pip_size
                    : typeof item.pip === 'number'
                      ? item.pip
                      : undefined,

            isTradingSuspended:
                item.is_trading_suspended === 1,

            exchangeIsOpen:
                item.exchange_is_open !== 0,
        }))
        .sort((a, b) =>
            a.name.localeCompare(b.name),
        );

    const uniqueMarkets = new Map<
        string,
        VolatilityMarketSymbol
    >();

    for (const market of markets) {
        if (!uniqueMarkets.has(market.symbol)) {
            uniqueMarkets.set(
                market.symbol,
                market,
            );
        }
    }

    return Array.from(
        uniqueMarkets.values(),
    );
}