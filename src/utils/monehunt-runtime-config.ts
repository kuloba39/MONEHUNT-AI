export type MonehuntRuntimeConfig = {
    symbol?: string;
    contractType?: string;
    prediction?: number;
    duration?: number;
    durationUnit?: string;
    stake?: number;
    martingale?: number;
    takeProfit?: number;
    stopLoss?: number;
};

let runtimeConfig: MonehuntRuntimeConfig | null = null;

export const setMonehuntRuntimeConfig = (
    config: MonehuntRuntimeConfig | null
): void => {
    runtimeConfig = config
        ? {
              ...config,
          }
        : null;

    console.log('[MONEHUNT RUNTIME BRIDGE] CONFIG SET:', runtimeConfig);
};

export const getMonehuntRuntimeConfig = (): MonehuntRuntimeConfig | null => {
    return runtimeConfig
        ? {
              ...runtimeConfig,
          }
        : null;
};

export const clearMonehuntRuntimeConfig = (): void => {
    runtimeConfig = null;
    console.log('[MONEHUNT RUNTIME BRIDGE] CONFIG CLEARED');
};
