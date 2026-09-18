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
        this.stop();

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
                    this.handleMessage(data);
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

        if (
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
    ): void {
        if (!data) {
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

        if (
            data.subscription?.id &&
            data.echo_req?.ticks === this.symbol
        ) {
            this.subscriptionIds.add(
                data.subscription.id,
            );
        }

        if (
            data?.error &&
            data?.echo_req?.ticks
        ) {
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

    stop(): void {
        if (
            this.subscription
        ) {
            this.subscription.unsubscribe?.();
            this.subscription = null;
        }

        if (api_base?.api) {
            for (
                const subscriptionId
                of this.subscriptionIds
            ) {
                try {
                    api_base.api.send({
                        forget:
                            subscriptionId,
                    });
                } catch {
                    // Ignore cleanup errors.
                }
            }
        }

        this.subscriptionIds.clear();
        this.historyRequestId = null;
        this.symbol = null;
    }

    reset(): void {
        this.scanner.reset();
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
