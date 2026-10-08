import chart_api from '@/external/bot-skeleton/services/api/chart-api';
import type { TTransport } from './types';

const logger = {
    log: () => {},
    warn: console.warn.bind(console, '[SmartCharts Transport]'),
    error: console.error.bind(console, '[SmartCharts Transport]'),
};

type TransportSubscription = {
    request: any;
    callback: (response: any) => void;
    messageSubscription?: {
        unsubscribe: () => void;
    };
    realSubscriptionId: string | null;
    apiInstance: any;
};

export function createTransport(): TTransport {
    const subscriptions = new Map<string, TransportSubscription>();

    return {
        async send(request: any): Promise<any> {
            console.log('[SmartCharts Transport] REQUEST', {
                ticks_history: request?.ticks_history,
                style: request?.style,
                count: request?.count,
                start: request?.start,
                end: request?.end,
                granularity: request?.granularity,
            });

            if (!chart_api.api) {
                console.warn(
                    '[SmartCharts Transport] API missing - initializing'
                );

                await chart_api.init();
            }

            if (!chart_api.api) {
                throw new Error(
                    '[SmartCharts Transport] Chart API failed to initialize'
                );
            }

            try {
                const response = await chart_api.api.send(request);

                console.log('[SmartCharts Transport] RESPONSE', {
                    msg_type: response?.msg_type,
                    error: response?.error
                        ? {
                              code: response.error.code,
                              message: response.error.message,
                          }
                        : null,
                    historyPrices: Array.isArray(response?.history?.prices)
                        ? response.history.prices.length
                        : null,
                    historyTimes: Array.isArray(response?.history?.times)
                        ? response.history.times.length
                        : null,
                    firstPrice: response?.history?.prices?.[0],
                    lastPrice: Array.isArray(response?.history?.prices)
                        ? response.history.prices[
                              response.history.prices.length - 1
                          ]
                        : undefined,
                });

                return response;
            } catch (error) {
                console.error(
                    '[SmartCharts Transport] SEND ERROR',
                    error
                );

                throw error;
            }
        },

        subscribe(
            request: any,
            callback: (response: any) => void
        ): string {
            if (!chart_api.api) {
                throw new Error('Chart API not initialized');
            }

            /*
             * Capture the exact API instance that owns this subscription.
             *
             * This is important because chart_api.api can later be replaced
             * during reconnect. Cleanup must never attempt to forget a
             * subscription through a different socket.
             */
            const apiInstance = chart_api.api;

            const tempId = `temp-${Date.now()}-${Math.random()}`;

            const subscribeRequest = {
                ...request,
                subscribe: 1,
            };

            const storedSubscription: TransportSubscription = {
                request: subscribeRequest,
                callback,
                messageSubscription: undefined,
                realSubscriptionId: null,
                apiInstance,
            };

            /*
             * Store the subscription BEFORE attaching the message listener.
             * This prevents a very fast response from arriving before the
             * subscription exists in our map.
             */
            subscriptions.set(tempId, storedSubscription);

            const messageSubscription = apiInstance
                .onMessage()
                ?.subscribe(({ data }: { data: any }) => {
                    const currentSubscription = subscriptions.get(tempId);

                    if (!currentSubscription) {
                        return;
                    }

                    const subscriptionId = data?.subscription?.id;

                    if (!subscriptionId) {
                        return;
                    }

                    if (!currentSubscription.realSubscriptionId) {
                        currentSubscription.realSubscriptionId =
                            subscriptionId;

                        subscriptions.set(
                            tempId,
                            currentSubscription
                        );
                    }

                    if (
                        subscriptionId ===
                        currentSubscription.realSubscriptionId
                    ) {
                        callback(data);
                    }
                });

            storedSubscription.messageSubscription =
                messageSubscription;

            subscriptions.set(tempId, storedSubscription);

            apiInstance
                .send(subscribeRequest)
                .then((response: any) => {
                    const subscriptionId =
                        response?.subscription?.id;

                    const currentSubscription =
                        subscriptions.get(tempId);

                    /*
                     * The subscription may already have been explicitly
                     * unsubscribed while the request was in flight.
                     */
                    if (!currentSubscription) {
                        if (subscriptionId) {
                            try {
                                apiInstance.forget(subscriptionId);
                            } catch (error) {
                                logger.warn(
                                    'Failed to clean up late subscription:',
                                    error
                                );
                            }
                        }

                        return;
                    }

                    if (subscriptionId) {
                        currentSubscription.realSubscriptionId =
                            subscriptionId;

                        subscriptions.set(
                            tempId,
                            currentSubscription
                        );

                        callback(response);
                    } else {
                        logger.error(
                            'No subscription ID in response:',
                            response
                        );

                        currentSubscription.messageSubscription?.unsubscribe();

                        subscriptions.delete(tempId);
                    }
                })
                .catch((error: any) => {
                    logger.error(
                        'Subscription failed:',
                        error
                    );

                    const currentSubscription =
                        subscriptions.get(tempId);

                    currentSubscription?.messageSubscription?.unsubscribe();

                    subscriptions.delete(tempId);
                });

            return tempId;
        },

        unsubscribe(subscriptionId: string): void {
            const subscription =
                subscriptions.get(subscriptionId);

            if (!subscription) {
                logger.warn(
                    'No subscription found for ID:',
                    subscriptionId
                );

                return;
            }

            /*
             * Always remove the local message listener first.
             */
            subscription.messageSubscription?.unsubscribe();

            /*
             * Use the API instance that actually created the subscription.
             * Do NOT use chart_api.api here because it may now refer to a
             * replacement WebSocket.
             */
            if (
                subscription.apiInstance &&
                subscription.realSubscriptionId
            ) {
                try {
                    subscription.apiInstance.forget(
                        subscription.realSubscriptionId
                    );
                } catch (error) {
                    logger.warn(
                        'Failed to forget subscription:',
                        error
                    );
                }
            }

            subscriptions.delete(subscriptionId);
        },

        unsubscribeAll(msgType?: string): void {
            /*
             * Snapshot first, then clear the map.
             *
             * Every RxJS message listener is explicitly unsubscribed.
             * This prevents old listeners from surviving after SmartChart
             * has been destroyed.
             */
            const activeSubscriptions = Array.from(
                subscriptions.entries()
            );

            subscriptions.clear();

            activeSubscriptions.forEach(
                ([subscriptionId, subscription]) => {
                    subscription.messageSubscription?.unsubscribe();

                    if (
                        subscription.apiInstance &&
                        subscription.realSubscriptionId
                    ) {
                        try {
                            subscription.apiInstance.forget(
                                subscription.realSubscriptionId
                            );
                        } catch (error) {
                            logger.warn(
                                `Failed to forget subscription ${subscriptionId}:`,
                                error
                            );
                        }
                    }
                }
            );

            /*
             * Keep the server-side safety cleanup as well.
             *
             * Use the currently active API only for the broad msg_type
             * cleanup. Individual subscriptions above are cleaned through
             * their owning API instance.
             */
            if (chart_api.api) {
                try {
                    if (msgType) {
                        chart_api.api.forgetAll(msgType);
                    } else {
                        chart_api.api.forgetAll('ticks');
                    }
                } catch (error) {
                    logger.warn(
                        'Failed to forget all subscriptions:',
                        error
                    );
                }
            }
        },
    };
}