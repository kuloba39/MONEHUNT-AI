/* eslint-disable no-confusing-arrow */
import { Map } from 'immutable';
import { getLast, historyToTicks } from '../../utils/binary-utils';
import { observer as globalObserver } from '../../utils/observer';
import { doUntilDone, getUUID } from '../tradeEngine/utils/helpers';
import { api_base } from './api-base';

const parseTick = tick => ({
    epoch: +tick.epoch,
    quote: +tick.quote,
});

const parseOhlc = ohlc => ({
    open: +ohlc.open,
    high: +ohlc.high,
    low: +ohlc.low,
    close: +ohlc.close,
    epoch: +(ohlc.open_time || ohlc.epoch),
});

const parseCandles = candles => candles.map(t => parseOhlc(t));

const updateTicks = (ticks, newTick) => (getLast(ticks).epoch >= newTick.epoch ? ticks : [...ticks.slice(1), newTick]);

const updateCandles = (candles, ohlc) => {
    const lastCandle = getLast(candles);
    if (
        (lastCandle.open === ohlc.open &&
            lastCandle.high === ohlc.high &&
            lastCandle.low === ohlc.low &&
            lastCandle.close === ohlc.close &&
            lastCandle.epoch === ohlc.epoch) ||
        lastCandle.epoch > ohlc.epoch
    ) {
        return candles;
    }
    const prevCandles = lastCandle.epoch === ohlc.epoch ? candles.slice(0, -1) : candles.slice(1);
    return [...prevCandles, ohlc];
};

const getType = isCandle => (isCandle ? 'candles' : 'ticks');

const collectSubscriptionIds = value => {
    if (typeof value === 'string') {
        return [value];
    }

    if (!value || typeof value.forEach !== 'function') {
        return [];
    }

    const ids = [];
    value.forEach(child => {
        ids.push(...collectSubscriptionIds(child));
    });
    return ids;
};

export default class TicksService {
    constructor() {
        this.ticks = new Map();
        this.candles = new Map();
        this.tickListeners = new Map();
        this.ohlcListeners = new Map();
        this.subscriptions = new Map();
        this.ticks_history_promise = null;
        this.active_symbols_promise = null;
        this.candles_promise = null;
        this.lifecycleGeneration = 0;
        this.isStopped = false;
        this.observerSubscription = null;

        this.observe();
    }

    requestPipSizes() {
        if (this.pipSizes) {
            return Promise.resolve(this.pipSizes);
        }

        if (!this.active_symbols_promise) {
            this.active_symbols_promise = new Promise(resolve => {
                this.pipSizes = api_base.pip_sizes;
                resolve(this.pipSizes);
            });
        }
        return this.active_symbols_promise;
    }

    async request(options, generation = this.lifecycleGeneration) {
        return new Promise((resolve, reject) => {
            const { symbol, granularity } = options;

            const style = getType(granularity);

            if (style === 'ticks' && this.ticks.has(symbol)) {
                resolve(this.ticks.get(symbol));
            }

            if (style === 'candles' && this.candles.hasIn([symbol, Number(granularity)])) {
                resolve(this.candles.getIn([symbol, Number(granularity)]));
            }
            this.requestStream({ ...options, style }, generation)
                .then(res => {
                    resolve(res);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    monitor(options) {
        if (this.isStopped) {
            this.isStopped = false;
        }

        if (!this.observerSubscription) {
            this.observe();
        }
        return new Promise((resolve, reject) => {
            const { symbol, granularity, callback } = options;

            const type = getType(granularity);

            const key = getUUID();
            const generation = this.lifecycleGeneration;
            this.request(options, generation)
                .then(() => {
                    if (generation !== this.lifecycleGeneration || this.isStopped) {
                        resolve(key);
                        return;
                    }

                    if (type === 'ticks') {
                        this.tickListeners = this.tickListeners.setIn([symbol, key], callback);
                        globalObserver.emit('bot.bot_ready');
                        api_base.toggleRunButton(false);
                    } else {
                        this.ohlcListeners = this.ohlcListeners.setIn([symbol, Number(granularity), key], callback);
                    }
                    resolve(key);
                })
                .catch(e => {
                    globalObserver.emit('Error', e);
                    this.ticks_history_promise = null;
                    api_base.toggleRunButton(false);
                    reject(e);
                });
        });
    }

    async stopMonitor(options) {
        const { symbol, granularity, key } = options;
        const type = getType(granularity);

        if (type === 'ticks' && this.tickListeners.hasIn([symbol, key])) {
            this.tickListeners = this.tickListeners.deleteIn([symbol, key]);
        }

        if (type === 'candles' && this.ohlcListeners.hasIn([symbol, Number(granularity), key])) {
            this.ohlcListeners = this.ohlcListeners.deleteIn([symbol, Number(granularity), key]);
        }

        await this.unsubscribeIfEmptyListeners(options);
    }

    async unsubscribeIfEmptyListeners(options) {
        const { symbol, granularity } = options;
        const type = getType(granularity);

        if (type === 'ticks') {
            const listeners = this.tickListeners.get(symbol);
            if (listeners && !listeners.size) {
                this.tickListeners = this.tickListeners.delete(symbol);
                this.ticks = this.ticks.delete(symbol);
                await this.unsubscribeSubscription('tick', symbol);
            }
            return;
        }

        const candleGranularity = Number(granularity);
        const listeners = this.ohlcListeners.getIn([symbol, candleGranularity]);
        if (listeners && !listeners.size) {
            this.ohlcListeners = this.ohlcListeners.deleteIn([symbol, candleGranularity]);
            this.candles = this.candles.deleteIn([symbol, candleGranularity]);
            await this.unsubscribeSubscription('ohlc', symbol, candleGranularity);
        }
    }

    async unsubscribeSubscription(type, symbol, granularity) {
        const address = granularity === undefined
            ? [type, symbol]
            : [type, symbol, Number(granularity)];
        const subscriptionId = this.subscriptions.getIn(address);

        if (!subscriptionId) {
            return;
        }

        this.subscriptions = this.subscriptions.deleteIn(address);
        await this.forgetSubscriptionIds([subscriptionId]);
    }

    async forgetSubscriptionIds(subscriptionIds) {
        if (!api_base.api) {
            return;
        }

        await Promise.all(
            subscriptionIds.map(id =>
                doUntilDone(() => api_base.api.forget(id))
            )
        );
    }

    updateTicksAndCallListeners(symbol, ticks) {
        if (this.ticks.get(symbol) === ticks) {
            return;
        }
        this.ticks = this.ticks.set(symbol, ticks);

        const listeners = this.tickListeners.get(symbol);

        if (listeners) {
            listeners.forEach(callback => callback(this.ticks.get(symbol)));
        }
    }

    updateCandlesAndCallListeners(address, candles) {
        if (this.ticks.getIn(address) === candles) {
            return;
        }
        this.candles = this.candles.setIn(address, candles);

        const listeners = this.ohlcListeners.getIn(address);

        if (listeners) {
            listeners.forEach(callback => callback(this.candles.getIn(address)));
        }
    }

    observe() {
        if (api_base.api && !this.observerSubscription) {
            const subscription = api_base.api.onMessage().subscribe(({ data }) => {
                if (data.msg_type === 'tick') {
    const { tick } = data;

    if (!tick || !tick.symbol) {
        return;
    }

    const { symbol } = tick;
    const subscriptionId = data.subscription?.id;

    if (this.ticks.has(symbol)) {
        if (subscriptionId) {
            this.subscriptions = this.subscriptions.setIn(['tick', symbol], subscriptionId);
        }
        this.updateTicksAndCallListeners(
            symbol,
            updateTicks(
                this.ticks.get(symbol),
                parseTick(tick)
            )
        );
    }
}

                if (data.msg_type === 'ohlc') {
                    const { ohlc } = data;
                    const { symbol, granularity } = ohlc;
                    const subscriptionId = data.subscription?.id;
                    if (this.candles.hasIn([symbol, Number(granularity)])) {
                        if (subscriptionId) {
                            this.subscriptions = this.subscriptions.setIn(['ohlc', symbol, Number(granularity)], subscriptionId);
                        }
                        const address = [symbol, Number(granularity)];
                        this.updateCandlesAndCallListeners(
                            address,
                            updateCandles(this.candles.getIn(address), parseOhlc(ohlc))
                        );
                    }
                }
            });
            this.observerSubscription = subscription;
        }
    }

    requestStream(options, generation = this.lifecycleGeneration) {
        const { style } = options;
        const stringified_options = JSON.stringify(options);

        if (style === 'ticks') {
            // Check if we already have a promise for these exact options
            if (!this.ticks_history_promise || this.ticks_history_promise.stringified_options !== stringified_options) {
                this.ticks_history_promise = {
                    promise: this.requestPipSizes().then(() => this.requestTicks(options, generation)),
                    stringified_options,
                };
            }

            return this.ticks_history_promise.promise;
        }

        if (style === 'candles') {
            // Check if we already have a promise for these exact options
            if (!this.candles_promise || this.candles_promise.stringified_options !== stringified_options) {
                this.candles_promise = {
                    promise: this.requestPipSizes().then(() => this.requestTicks(options, generation)),
                    stringified_options,
                };
            }

            return this.candles_promise.promise;
        }

        return [];
    }

    requestTicks(options, generation = this.lifecycleGeneration) {
        const { symbol, granularity, style } = options;
        const request_object = {
            ticks_history: symbol === 'na' ? 'R_100' : symbol,
            subscribe: 1,
            end: 'latest',
            count: 1000,
            granularity: granularity ? Number(granularity) : undefined,
            style,
        };
        return new Promise((resolve, reject) => {
            if (!api_base.api) resolve([]);
            doUntilDone(() => api_base.api.send(request_object), ['AlreadySubscribed'], api_base)
                .then(async r => {
                    const subscriptionId = r.subscription?.id;
                    const isCurrent = generation === this.lifecycleGeneration && !this.isStopped;

                    if (!isCurrent) {
                        if (subscriptionId) {
                            await this.forgetSubscriptionIds([subscriptionId]);
                        }
                        resolve([]);
                        return;
                    }

                    if (subscriptionId) {
                        if (style === 'ticks') {
                            this.subscriptions = this.subscriptions.setIn(['tick', symbol], subscriptionId);
                        } else {
                            this.subscriptions = this.subscriptions.setIn(['ohlc', symbol, Number(granularity)], subscriptionId);
                        }
                    }

                    if (style === 'ticks') {
                        const ticks = historyToTicks(r.history);

                        this.updateTicksAndCallListeners(symbol, ticks);
                        resolve(ticks);
                    } else {
                        const candles = parseCandles(r.candles);

                        this.updateCandlesAndCallListeners([symbol, Number(granularity)], candles);

                        resolve(candles);
                    }
                })
                .catch(error => {
                    // Handle AlreadySubscribed errors gracefully - they're not fatal
                    if (error?.error?.code === 'AlreadySubscribed') {
                        // For AlreadySubscribed errors, we can still resolve with existing data
                        if (style === 'ticks' && this.ticks.has(symbol)) {
                            resolve(this.ticks.get(symbol));
                        } else if (style === 'candles' && this.candles.hasIn([symbol, Number(granularity)])) {
                            resolve(this.candles.getIn([symbol, Number(granularity)]));
                        } else {
                            resolve([]);
                        }
                        return;
                    }
                    // Don't clear auth data for InvalidSymbol errors as it causes unwanted logouts
                    // InvalidSymbol errors can occur for various reasons and don't necessarily mean the user is unauthorized
                    reject(error);
                });
        });
    }

    async unsubscribeFromTicksService() {
        this.lifecycleGeneration += 1;
        this.isStopped = true;
        this.tickListeners = new Map();
        this.ohlcListeners = new Map();
        this.ticks = new Map();
        this.candles = new Map();
        this.ticks_history_promise = null;
        this.candles_promise = null;

        if (this.observerSubscription?.unsubscribe) {
            this.observerSubscription.unsubscribe();
            this.observerSubscription = null;
        }

        const subscriptionIds = collectSubscriptionIds(this.subscriptions);
        this.subscriptions = new Map();
        await this.forgetSubscriptionIds(subscriptionIds);
    }
}
