// @ts-nocheck â€” vendored bot code with known upstream type gaps; see AGENTS.md
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import RootStore from '@/stores/root-store';
import { api_base, ApiHelpers } from '@/external/bot-skeleton';
import { TWebSocket } from '@/Types';
import Bot from '../external/bot-skeleton/scratch/dbot';

const StoreContext = createContext<null | RootStore>(null);

type TStoreProvider = {
    children: React.ReactNode;
    mockStore?: RootStore;
};

const StoreProvider: React.FC<TStoreProvider> = ({ children, mockStore }) => {
    const [store, setStore] = useState<RootStore | null>(null);
    const initializingStore = useRef(false);

    useEffect(() => {
        const initializeStore = async () => {
            const rootStore = new RootStore(Bot);

            // Wire the existing DBot engine stores before API initialization.
            rootStore.app.setDBotEngineStores();

            // ApiHelpers must exist before api_base.init() so chart_api /
            // SmartCharts can access active_symbols and trading_times safely.
            if (!ApiHelpers.instance) {
                console.log('[StoreProvider API PROBE] Installing ApiHelpers before API init');
                ApiHelpers.setInstance(rootStore.app.api_helpers_store);
            }

            console.log(
                '[StoreProvider API PROBE] ApiHelpers ready:',
                !!ApiHelpers.instance,
                'ActiveSymbols:',
                !!ApiHelpers.instance?.active_symbols
            );

            try {
                console.log('[StoreProvider API PROBE] Initializing shared API...');
                await api_base.init();

                console.log(
                    '[StoreProvider API PROBE] Shared API ready:',
                    !!api_base.api,
                    'readyState:',
                    api_base.api?.connection?.readyState ?? null
                );
            } catch (error) {
                console.error(
                    '[StoreProvider API PROBE] Shared API initialization failed:',
                    error
                );
            } finally {
                setStore(rootStore);
            }
        };

        if (!store && !initializingStore.current) {
            initializingStore.current = true;
            // If the store is mocked for testing purposes, then return the mocked value.
            if (mockStore) {
                setStore(mockStore);
            } else {
                initializeStore();
            }
        }
    }, [store, mockStore]);

    if (!store) return null;

    return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
};

const useStore = () => {
    const store = useContext(StoreContext);

    return store as RootStore;
};

export { StoreProvider, useStore };

export const mockStore = (ws: TWebSocket) => new RootStore(Bot, ws);










