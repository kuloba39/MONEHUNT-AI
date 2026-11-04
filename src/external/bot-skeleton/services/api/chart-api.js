class ChartAPI {
    api;
    chart_active_symbols = null;
    is_transitioning = false;
    api_change_listeners = new Set();
    api_base_initializer = null;

    // Prevent overlapping normal chart API initialization calls.
    init_promise = null;

    // Keep a stable listener reference so removeEventListener() works.
    socket_close_handler = () => this.onsocketclose();

    onsocketclose() {
        this.reconnectIfNotConnected();
    }

    onApiChange = listener => {
        this.api_change_listeners.add(listener);
        return () => this.api_change_listeners.delete(listener);
    };

    setApi = nextApi => {
        const previousApi = this.api;
        if (previousApi === nextApi) return;

        this.api = nextApi;

        this.api_change_listeners.forEach(listener => {
            try {
                listener(nextApi, previousApi);
            } catch (error) {
                console.error('[Chart API] API-change listener failed:', error);
            }
        });
    };

    beginApiTransition = () => {
        this.is_transitioning = true;
        this.setApi(null);
    };

    completeApiTransition = nextApi => {
        this.setApi(nextApi);
        this.is_transitioning = false;
    };

    setApiBaseInitializer = initializer => {
        this.api_base_initializer = initializer;
    };

    init = async (force_create_connection = false) => {
        if (force_create_connection) {
            if (this.api_base_initializer) {
                return this.api_base_initializer(true);
            }

            throw new Error('Chart API cannot reconnect without APIBase coordination');
        }

        // Normal chart initialization is single-flight.
        if (!force_create_connection && this.init_promise) {
            console.log('[CHART API INIT LOCK] Reusing in-flight initialization');
            return this.init_promise;
        }

        const initialize = async () => {
            if (this.is_transitioning) {
                throw new Error('Chart API is transitioning');
            }

            if (!this.api) {
                if (this.api_base_initializer) {
                    await this.api_base_initializer(false);
                } else {
                    throw new Error('Chart API cannot initialize without APIBase coordination');
                }
            }

            if (!this.api) {
                throw new Error('Chart API is not initialized by APIBase');
            }

            this.getTime();
        };

        if (force_create_connection) {
            return initialize();
        }

        const promise = initialize();

        this.init_promise = promise;

        try {
            await promise;
        } finally {
            if (this.init_promise === promise) {
                this.init_promise = null;
            }
        }
    };

    getTime() {
        if (!this.time_interval) {
            this.time_interval = setInterval(() => {
                if (!this.api || this.is_transitioning) return;
                this.api.send({ time: 1 });
            }, 30000);
        }
    }

    reconnectIfNotConnected = () => {
        if (this.api?.connection?.readyState && this.api.connection.readyState > 1) {
            void this.init(true);
        }
    };
}

const chart_api = new ChartAPI();

export default chart_api;
