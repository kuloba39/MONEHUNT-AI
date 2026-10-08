import { api_base } from '@/external/bot-skeleton/services/api/api-base';

import {
    createOnlyUpsDownsScanner,
} from '../scanner/only-ups-downs-scanner';

import type {
    OnlyUpsDownsScannerSnapshot,
} from '../scanner/only-ups-downs-scanner';

export interface OnlyUpsDownsLiveOptions {
    maxPoints?: number;
    minimumPoints?: number;
    horizon?: import("../types/only-ups-downs-types").OnlyUpsDownsAnalysisHorizon;
}

export class OnlyUpsDownsLive {
    private readonly scanner;

    private subscription:
        { unsubscribe?: () => void } | null = null;

    private readonly subscriptionIds =
        new Set<string>();

    /**
     * Subscribe requests that have been sent to Deriv but
     * whose subscription response has not arrived yet.
     *
     * The old implementation only tracked subscription IDs
     * after the response arrived. That created a race where
     * stop() could run before the ID was known, leaving the
     * old Deriv stream alive.
     */
    private readonly pendingSubscriptionRequestIds =
        new Set<number>();

    /**
     * Every start/stop cycle receives a new generation.
     *
     * Any asynchronous operation belonging to an older
     * generation is considered stale and must not become
     * the active stream.
     */
    private lifecycleGeneration = 0;

    private historyRequestId:
        number | null = null;

    private symbol: string | null = null;

    constructor(
        _adapterOrOptions?: unknown,
        options: OnlyUpsDownsLiveOptions = {},
    ) {
        const liveOptions =
            _adapterOrOptions &&
            typeof _adapterOrOptions === 'object' &&
            ('maxPoints' in (_adapterOrOptions as object) ||
             'minimumPoints' in (_adapterOrOptions as object))
                ? _adapterOrOptions as OnlyUpsDownsLiveOptions
                : options;

        this.scanner = createOnlyUpsDownsScanner({
            maxPoints: liveOptions.maxPoints,
            minimumPoints: liveOptions.minimumPoints,
            horizon: liveOptions.horizon,
        });
    }

    async start(symbol: string): Promise<void> {
        /*
         * Invalidate the previous lifecycle first.
         *
         * stop() also increments the generation, so any
         * asynchronous work from the previous start() becomes
         * stale immediately.
         */
        this.stop();

        const generation =
            this.lifecycleGeneration;

        this.symbol = symbol;

        if (!api_base?.api) {
            console.error(
                'ONLY UPS / DOWNS: API NOT READY',
            );
            return;
        }

        const api = api_base.api;

        this.subscription =
            api.onMessage().subscribe(
                ({ data }: any) => {
                    this.handleMessage(
                        data,
                        generation,
                    );
                },
            );

        const historyRequestId =
            Date.now() +
            Math.floor(
                Math.random() * 1000000,
            );

        this.historyRequestId =
            historyRequestId;

        try {
            await api.send({
                req_id:
                    historyRequestId,

                ticks_history:
                    symbol,

                count:
                    2000,

                end:
                    'latest',

                style:
                    'ticks',
            });
        } catch (error) {
            console.error(
                'ONLY UPS / DOWNS HISTORY ERROR',
                symbol,
                error,
            );
        }

        /*
         * The history request is asynchronous.
         *
         * The page may have already stopped/restarted this
         * live instance while Deriv was processing history.
         */
        if (
            generation !==
                this.lifecycleGeneration ||
            this.symbol !== symbol ||
            !api_base?.api
        ) {
            return;
        }

        const reqId =
            Date.now() +
            Math.floor(
                Math.random() * 1000000,
            );

        this.pendingSubscriptionRequestIds.add(
            reqId,
        );

        try {
            await api.send({
                req_id:
                    reqId,

                ticks:
                    symbol,

                subscribe:
                    1,
            });
        } catch (error: any) {
            /*
             * The request is no longer pending once send()
             * has completed/rejected.
             */
            this.pendingSubscriptionRequestIds.delete(
                reqId,
            );

            if (
                generation !==
                    this.lifecycleGeneration
            ) {
                return;
            }

            if (
                error?.error?.code ===
                'AlreadySubscribed'
            ) {
                console.log(
                    'ONLY UPS / DOWNS: USING EXISTING LIVE SUBSCRIPTION',
                    symbol,
                );
            } else {
                console.error(
                    'ONLY UPS / DOWNS LIVE SUBSCRIBE ERROR',
                    symbol,
                    error,
                );
            }
        }
    }

    private handleMessage(
        data: any,
        generation: number,
    ): void {
        if (!data) {
            return;
        }

        /*
         * Ignore every message delivered to an obsolete
         * listener/generation.
         *
         * This is important because onMessage() is global and
         * asynchronous.
         */
        if (
            generation !==
            this.lifecycleGeneration
        ) {
            /*
             * A stale subscription response can still arrive
             * after stop(). If it contains a subscription ID,
             * immediately forget it so the old Deriv stream
             * cannot remain alive.
             */
            if (
                data.subscription?.id &&
                data.echo_req?.ticks
            ) {
                this.forgetSubscription(
                    String(data.subscription.id),
                );
            }

            return;
        }

        if (
            data.history &&
            data.echo_req?.ticks_history
        ) {
            if (
                data.echo_req.ticks_history ===
                this.symbol
            ) {
                this.handleHistory(
                    this.symbol,
                    data,
                );
            }

            return;
        }

        /*
         * Deriv has acknowledged a tick subscription.
         *
         * Only accept the subscription if the request still
         * belongs to the active lifecycle.
         */
        if (
            data.subscription?.id &&
            data.echo_req?.ticks === this.symbol
        ) {
            const subscriptionId =
                String(data.subscription.id);

            /*
             * We no longer need to track the request ID once
             * Deriv has returned its subscription ID.
             */
            const requestId =
                Number(data.echo_req?.req_id);

            if (
                Number.isFinite(requestId)
            ) {
                this.pendingSubscriptionRequestIds.delete(
                    requestId,
                );
            }

            /*
             * If this message belongs to the active lifecycle,
             * keep the subscription.
             */
            this.subscriptionIds.add(
                subscriptionId,
            );
        }

        if (
            data?.error &&
            data?.echo_req?.ticks
        ) {
            const requestId =
                Number(data.echo_req?.req_id);

            if (
                Number.isFinite(requestId)
            ) {
                this.pendingSubscriptionRequestIds.delete(
                    requestId,
                );
            }

            console.error(
                'ONLY UPS / DOWNS DERIV LIVE ERROR',
                {
                    symbol:
                        data.echo_req.ticks,

                    code:
                        data.error.code,

                    message:
                        data.error.message,
                },
            );

            return;
        }

        if (!data.tick) {
            return;
        }

        if (
            !this.symbol ||
            data.tick.symbol !==
                this.symbol
        ) {
            return;
        }

        const price =
            Number(data.tick.quote);

        if (
            Number.isFinite(price) &&
            price > 0
        ) {
            this.scanner.addPrice(price);
        }
    }

    private handleHistory(
        symbol: string,
        response: any,
    ): void {
        if (
            !response ||
            response.error ||
            symbol !== this.symbol
        ) {
            return;
        }

        const prices =
            response?.history?.prices;

        if (!Array.isArray(prices)) {
            return;
        }

        for (
            const rawPrice of prices
        ) {
            const price =
                Number(rawPrice);

            if (
                Number.isFinite(price) &&
                price > 0
            ) {
                this.scanner.addPrice(price);
            }
        }
    }

    addPrice(price: number): void {
        if (
            Number.isFinite(price) &&
            price > 0
        ) {
            this.scanner.addPrice(price);
        }
    }

    addPrices(prices: number[]): void {
        if (!Array.isArray(prices)) {
            return;
        }

        this.scanner.addPrices(prices);
    }

    setSymbol(symbol: string): void {
        this.symbol = symbol;
    }

    /**
     * Forget one Deriv subscription safely.
     */
    private forgetSubscription(
        subscriptionId: string,
    ): void {
        if (!subscriptionId) {
            return;
        }

        if (!api_base?.api) {
            return;
        }

        try {
            void api_base.api.send({
                forget:
                    subscriptionId,
            });
        } catch {
            // Ignore cleanup errors.
        }
    }

    stop(): void {
        /*
         * Invalidate the current lifecycle FIRST.
         *
         * This must happen before unsubscribing because any
         * asynchronous Deriv response arriving afterward must
         * be treated as stale.
         */
        this.lifecycleGeneration += 1;

        if (
            this.subscription
        ) {
            this.subscription.unsubscribe?.();
            this.subscription = null;
        }

        if (api_base?.api) {
            /*
             * Forget every subscription ID already received.
             */
            for (
                const subscriptionId
                of this.subscriptionIds
            ) {
                this.forgetSubscription(
                    subscriptionId,
                );
            }

            /*
             * Clear known active IDs.
             */
            this.subscriptionIds.clear();

            /*
             * Pending request IDs cannot themselves be sent
             * through `forget`, because Deriv's `forget`
             * requires the subscription ID, not req_id.
             *
             * The lifecycle generation protects us here:
             * when the delayed subscription response arrives,
             * handleMessage() sees the stale generation and
             * immediately sends `forget` for the returned ID.
             */
            this.pendingSubscriptionRequestIds.clear();
        }

        this.historyRequestId = null;
        this.symbol = null;
    }

    reset(): void {
        this.scanner.reset();
    }

    consumeSignal(): void {
        this.scanner.consumeSignal();
    }

    getSnapshot():
        OnlyUpsDownsScannerSnapshot {
        return this.scanner.snapshot();
    }

    getSymbol(): string | null {
        return this.symbol;
    }

    isRunning(): boolean {
        return (
            this.subscription !== null
        );
    }
}