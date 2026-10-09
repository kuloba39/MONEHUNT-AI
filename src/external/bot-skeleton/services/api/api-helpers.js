import AccountLimits from './account-limits';
import ActiveSymbols from './active-symbols';
import ContractsFor from './contracts-for';
import TradingTimes from './trading-times';

class ApiHelpers {
    static singleton = null;

    constructor(api_helpers_store) {
        this.api_helpers_store = api_helpers_store;
        this.trading_times = new TradingTimes(api_helpers_store);
        this.contracts_for = new ContractsFor(api_helpers_store);
        this.active_symbols = new ActiveSymbols(this.trading_times);
        this.account_limits = new AccountLimits(api_helpers_store);
    }

    static disposeInstance() {
        this.singleton = null;
    }

    static setInstance(api_helpers_store) {
        if (!api_helpers_store) {
            return this.instance;
        }

        const currentWs = this.singleton?.api_helpers_store?.ws;
        const nextWs = api_helpers_store.ws;

        if (!this.singleton || currentWs !== nextWs) {
            this.singleton = new ApiHelpers(api_helpers_store);
        }

        return this.instance;
    }

    static get instance() {
        return this.singleton;
    }
}

export default ApiHelpers;
