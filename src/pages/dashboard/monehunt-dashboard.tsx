import { observer } from 'mobx-react-lite';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useStore } from '../../hooks/useStore';
import { useMonehuntAI } from '@/monehunt-ai-core';


import './dashboard-ui.scss';

const DEFAULT_MARKET = 'R_100';

const formatMoney = (value: number | string, currency = 'USD') => {
    const amount = Number(value) || 0;

    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch {
        return `${currency} ${amount.toFixed(2)}`;
    }
};

const formatSignedMoney = (value: number | string, currency = 'USD') => {
    const amount = Number(value) || 0;
    const formatted = formatMoney(Math.abs(amount), currency);

    if (amount > 0) return `+${formatted}`;
    if (amount < 0) return `-${formatted}`;

    return formatted;
};

const getContractName = (contract: any) => {
    if (!contract) return 'Trading Contract';

    return (
        contract.contract_type ||
        contract.contract_category ||
        contract.trade_type ||
        'Trading Contract'
    );
};

const getSelectedMarket = () => {
    try {
        const stored =
            localStorage.getItem('only_ups_downs_selected_market') ||
            localStorage.getItem('ai_lab_market');

        if (stored && stored !== 'GLOBAL') {
            return stored;
        }
    } catch {
        // Ignore storage errors.
    }

    return DEFAULT_MARKET;
};

const getLastDigit = (quote: string | number | null) => {
    if (quote === null || quote === undefined || quote === '') {
        return null;
    }

    const value = String(quote);
    const digits = value.replace(/\D/g, '');

    if (!digits) {
        return null;
    }

    return Number(digits.slice(-1));
};

const Dashboard = observer(() => {
    const store = useStore();
    const { state: aiState } = useMonehuntAI();

    const {
        client,
        common,
        transactions,
        run_panel,
        summary_card,
    } = store;

    const currency = client.currency || 'USD';

    /*
     * ---------------------------------------------------------
     * LIVE MARKET
     * ---------------------------------------------------------
     */

    const [selectedMarket] = useState<string>(getSelectedMarket);

    /*
     * ---------------------------------------------------------
     * CENTRALIZED AI STATE
     * Dashboard is read-only.
     * MonehuntAIProvider owns the engines.
     * ---------------------------------------------------------
     */

    const matchesState =
        aiState.matches.engineState;

    const matchesStats =
        aiState.matches.stats;

    const over2State =
        aiState.over2.state;

    const oudSnapshot =
        aiState.onlyUpsDowns.snapshot;
    /*
     * ---------------------------------------------------------
     * ACCOUNT / PERFORMANCE
     * ---------------------------------------------------------
     */

    const statistics =
        transactions.statistics;

    const completedContracts =
        statistics.number_of_runs || 0;

    const wins =
        statistics.won_contracts || 0;

    const losses =
        statistics.lost_contracts || 0;

    const totalProfit =
        Number(statistics.total_profit) || 0;

    const winRate =
        completedContracts > 0
            ? (wins / completedContracts) * 100
            : 0;

    const socketOpen =
        common.is_socket_opened;

    /*
     * ---------------------------------------------------------
     * BOT CONTROL
     * ---------------------------------------------------------
     */

    const botRunning =
        run_panel.is_running ||
        run_panel.has_open_contract;

    const executionStage =
        run_panel.contract_stage ||
        'IDLE';

    const currentContract =
        summary_card.contract_info;

    const currentProfit =
        Number(summary_card.profit) || 0;

    /*
     * ---------------------------------------------------------
     * RECENT ACTIVITY
     * ---------------------------------------------------------
     */

    const recentTransactions =
        useMemo(() => {
            return transactions.transactions
                .filter(
                    transaction =>
                        transaction.type === 'contract' &&
                        typeof transaction.data === 'object' &&
                        transaction.data
                )
                .slice(0, 5);
        }, [transactions.transactions]);

    /*
     * ---------------------------------------------------------
     * CENTRAL AI DISPLAY STATE
     * ---------------------------------------------------------
     */

    const matchesSignal =
        aiState.matches.signal;

    const matchesReady =
        Boolean(matchesSignal?.ready);

    const matchesEntryDigit =
        matchesSignal?.entryDigit ??
        matchesState?.entry?.entryDigit ??
        '--';

    const matchesBarrierDigit =
        matchesSignal?.barrierDigit ??
        matchesState?.barrier?.barrierDigit ??
        '--';

    const matchesConfidence =
        Number(matchesSignal?.confidence) || 0;

    const matchesStatus =
        matchesReady
            ? 'READY'
            : aiState.matches.active
                ? 'WAIT'
                : 'BUILDING';

    const over2Signal =
        aiState.over2.signal;

    const over2TickCount =
        over2State?.tickCount ?? 0;

    const over2ReadyMarkets =
        over2Signal?.ready ? 1 : 0;

    const over2QualifyingMarkets =
        over2Signal?.qualifying ? 1 : 0;

    const over2TotalMarkets =
        aiState.over2.scannerState?.totalMarkets ?? 0;

    const oudSignal =
        oudSnapshot?.signal;

    const oudDirection =
        oudSignal?.botDirection
            ? oudSignal.botDirection.toUpperCase()
            : 'WAIT';

    const oudStatus =
        oudSignal?.status ||
        (oudSnapshot?.ready
            ? 'WATCH'
            : 'BUILDING');

    const oudConfidence =
        Number(oudSignal?.confidence) || 0;

    const oudEntryQuality =
        oudSignal?.entryQuality ||
        'NONE';
    return (
        <main className='monehunt-dashboard'>

            <section className='monehunt-dashboard__hero'>

                <div>
                    <div className='monehunt-dashboard__eyebrow'>
                        <span
                            className={
                                `monehunt-dashboard__live-dot ${
                                    socketOpen
                                        ? ''
                                        : 'monehunt-dashboard__live-dot--offline'
                                }`
                            }
                        />

                        MONEHUNT AI COMMAND CENTER
                    </div>

                    <h1>
                        Trading Intelligence
                    </h1>

                    <p>
                        Live market intelligence,
                        AI signal engines and bot
                        execution monitoring in one
                        command center.
                    </p>
                </div>

                <div className='monehunt-dashboard__connection'>

                    <span
                        className={
                            `monehunt-dashboard__status-dot ${
                                socketOpen
                                    ? ''
                                    : 'monehunt-dashboard__status-dot--offline'
                            }`
                        }
                    />

                    <div>
                        <strong>
                            {socketOpen
                                ? 'SYSTEM ONLINE'
                                : 'CONNECTION OFFLINE'}
                        </strong>

                        <span>
                            {socketOpen
                                ? 'Deriv live connection active'
                                : 'Waiting for Deriv connection'}
                        </span>
                    </div>

                </div>

            </section>


            <section className='monehunt-dashboard__stats'>

                <div className='monehunt-stat-card monehunt-stat-card--balance'>
                    <span className='monehunt-stat-card__label'>
                        ACCOUNT BALANCE
                    </span>

                    <strong>
                        {formatMoney(
                            client.balance,
                            currency
                        )}
                    </strong>

                    <small>
                        {client.loginid || 'Account not selected'}
                    </small>
                </div>


                <div className='monehunt-stat-card'>
                    <span className='monehunt-stat-card__label'>
                        SESSION P/L
                    </span>

                    <strong
                        className={
                            totalProfit > 0
                                ? 'positive'
                                : totalProfit < 0
                                    ? 'negative'
                                    : ''
                        }
                    >
                        {formatSignedMoney(
                            totalProfit,
                            currency
                        )}
                    </strong>

                    <small>
                        Completed trading contracts
                    </small>
                </div>


                <div className='monehunt-stat-card'>
                    <span className='monehunt-stat-card__label'>
                        WIN RATE
                    </span>

                    <strong>
                        {winRate.toFixed(1)}%
                    </strong>

                    <small>
                        {wins} wins / {losses} losses
                    </small>
                </div>


                <div className='monehunt-stat-card'>
                    <span className='monehunt-stat-card__label'>
                        COMPLETED
                    </span>

                    <strong>
                        {completedContracts}
                    </strong>

                    <small>
                        Contracts in current session
                    </small>
                </div>

            </section>


            <section className='monehunt-dashboard__grid'>

                <div className='monehunt-panel'>

                    <div className='monehunt-panel__header'>
                        <div>
                            <span className='monehunt-panel__eyebrow'>
                                LIVE MARKET
                            </span>

                            <h2>
                                Market Monitor
                            </h2>
                        </div>

                        <span
                            className={
                                `monehunt-badge ${
                                    socketOpen
                                        ? 'monehunt-badge--live'
                                        : 'monehunt-badge--stopped'
                                }`
                            }
                        >
                            {socketOpen
                                ? 'LIVE'
                                : 'OFFLINE'}
                        </span>
                    </div>


                    <div className='monehunt-market'>

                        <div>
                            <span className='monehunt-market__symbol'>
                                {selectedMarket}
                            </span>

                            <strong>
                                {matchesState?.quote ?? '--'}
                            </strong>

                            {matchesState?.digit !== undefined && matchesState?.digit !== null && (
                                <span className='monehunt-market__change'>
                                    DIGIT {matchesState.digit}
                                </span>
                            )}
                        </div>


                                                <div className='monehunt-chart monehunt-chart--live'>
                            <span className='monehunt-chart__bar monehunt-chart__bar--up' />
                            <span className='monehunt-chart__bar monehunt-chart__bar--up' />
                            <span className='monehunt-chart__bar monehunt-chart__bar--down' />
                            <span className='monehunt-chart__bar monehunt-chart__bar--up' />
                            <span className='monehunt-chart__bar monehunt-chart__bar--down' />
                            <span className='monehunt-chart__bar monehunt-chart__bar--up' />
                        </div>


                        <div className='monehunt-market__footer'>
                            <span>
                                TICKS
                            </span>

                            <strong>
                                {aiState.matches.engineState?.tickCount ?? 0}
                            </strong>

                            <span>
                                STREAM
                            </span>

                            <strong>
                                {socketOpen
                                    ? 'ACTIVE'
                                    : 'WAITING'}
                            </strong>
                        </div>

                    </div>

                </div>


                <div className='monehunt-panel'>

                    <div className='monehunt-panel__header'>
                        <div>
                            <span className='monehunt-panel__eyebrow'>
                                AI COMMAND CENTER
                            </span>

                            <h2>
                                Engine Status
                            </h2>
                        </div>

                        <span className='monehunt-ai-count'>
                            LIVE ENGINES
                        </span>
                    </div>


                    <div className='monehunt-ai-list'>

                        <div className='monehunt-ai-row'>

                            <div className='monehunt-ai-icon'>
                                M
                            </div>

                            <div>
                                <strong>
                                    Matches AI
                                </strong>

                                <span>
                                    Entry + barrier intelligence
                                </span>
                            </div>

                            <span
                                className={
                                    `monehunt-engine-status ${
                                        matchesReady
                                            ? 'positive'
                                            : ''
                                    }`
                                }
                            >
                                {matchesStatus}
                            </span>

                        </div>


                        <div className='monehunt-ai-row'>

                            <div className='monehunt-ai-icon'>
                                O2
                            </div>

                            <div>
                                <strong>
                                    Over 2 AI
                                </strong>

                                <span>
                                    Multi-market digit scanner
                                </span>
                            </div>

                            <span className='monehunt-engine-status'>
                                {over2QualifyingMarkets > 0
                                    ? 'READY'
                                    : over2TotalMarkets > 0
                                        ? 'SCANNING'
                                        : 'BUILDING'}
                            </span>

                        </div>


                        <div className='monehunt-ai-row'>

                            <div className='monehunt-ai-icon'>
                                U/D
                            </div>

                            <div>
                                <strong>
                                    Only Ups / Downs
                                </strong>

                                <span>
                                    Direction + reversal intelligence
                                </span>
                            </div>

                            <span
                                className={
                                    `monehunt-engine-status ${
                                        oudStatus === 'READY'
                                            ? 'positive'
                                            : ''
                                    }`
                                }
                            >
                                {oudStatus}
                            </span>

                        </div>

                    </div>

                </div>

            </section>


            <section className='monehunt-panel'>

                <div className='monehunt-panel__header'>
                    <div>
                        <span className='monehunt-panel__eyebrow'>
                            LIVE ENGINE TELEMETRY
                        </span>

                        <h2>
                            AI Intelligence
                        </h2>
                    </div>
                </div>


                <div className='monehunt-ai-telemetry'>

                    <div className='monehunt-engine-card'>

                        <div className='monehunt-engine-card__top'>
                            <strong>
                                MATCHES
                            </strong>

                            <span>
                                {matchesStatus}
                            </span>
                        </div>

                        <div className='monehunt-engine-card__value'>
                            {matchesEntryDigit}
                        </div>

                        <div className='monehunt-engine-card__label'>
                            ENTRY DIGIT
                        </div>

                        <div className='monehunt-engine-card__row'>
                            <span>
                                Barrier
                            </span>

                            <strong>
                                {matchesBarrierDigit}
                            </strong>
                        </div>

                        <div className='monehunt-engine-card__row'>
                            <span>
                                Confidence
                            </span>

                            <strong>
                                {matchesConfidence > 0
                                    ? `${matchesConfidence.toFixed(1)}%`
                                    : '--'}
                            </strong>
                        </div>

                        <div className='monehunt-engine-card__row'>
                            <span>
                                Outcomes
                            </span>

                            <strong>
                                {matchesStats.total}
                            </strong>
                        </div>

                    </div>


                    <div className='monehunt-engine-card'>

                        <div className='monehunt-engine-card__top'>
                            <strong>
                                OVER 2
                            </strong>

                            <span>
                                {over2QualifyingMarkets > 0
                                    ? 'READY'
                                    : 'SCANNING'}
                            </span>
                        </div>

                        <div className='monehunt-engine-card__value'>
                            {over2QualifyingMarkets}
                        </div>

                        <div className='monehunt-engine-card__label'>
                            QUALIFYING MARKETS
                        </div>

                        <div className='monehunt-engine-card__row'>
                            <span>
                                Markets
                            </span>

                            <strong>
                                {over2TotalMarkets}
                            </strong>
                        </div>

                        <div className='monehunt-engine-card__row'>
                            <span>
                                Ready
                            </span>

                            <strong>
                                {over2ReadyMarkets}
                            </strong>
                        </div>

                        <div className='monehunt-engine-card__row'>
                            <span>
                                Scanner
                            </span>

                            <strong>
                                {over2State ? 'ACTIVE' : 'STARTING'}
                            </strong>
                        </div>

                    </div>


                    <div className='monehunt-engine-card'>

                        <div className='monehunt-engine-card__top'>
                            <strong>
                                ONLY UPS / DOWNS
                            </strong>

                            <span>
                                {oudStatus}
                            </span>
                        </div>

                        <div className='monehunt-engine-card__value'>
                            {oudDirection}
                        </div>

                        <div className='monehunt-engine-card__label'>
                            DIRECTION
                        </div>

                        <div className='monehunt-engine-card__row'>
                            <span>
                                Confidence
                            </span>

                            <strong>
                                {oudConfidence > 0
                                    ? `${oudConfidence.toFixed(1)}%`
                                    : '--'}
                            </strong>
                        </div>

                        <div className='monehunt-engine-card__row'>
                            <span>
                                Entry Quality
                            </span>

                            <strong>
                                {oudEntryQuality}
                            </strong>
                        </div>

                        <div className='monehunt-engine-card__row'>
                            <span>
                                Points
                            </span>

                            <strong>
                                {oudSnapshot?.pointCount ?? 0}
                            </strong>
                        </div>

                    </div>

                </div>

            </section>


            <section className='monehunt-panel monehunt-panel--bot'>

                <div className='monehunt-panel__header'>
                    <div>
                        <span className='monehunt-panel__eyebrow'>
                            BOT EXECUTION
                        </span>

                        <h2>
                            Bot Control
                        </h2>
                    </div>

                    <span
                        className={
                            `monehunt-badge ${
                                botRunning
                                    ? 'monehunt-badge--running'
                                    : 'monehunt-badge--stopped'
                            }`
                        }
                    >
                        {botRunning
                            ? 'RUNNING'
                            : 'STOPPED'}
                    </span>
                </div>


                <div className='monehunt-bot-grid'>

                    <div>
                        <span>
                            STATUS
                        </span>

                        <strong>
                            {botRunning
                                ? 'ACTIVE'
                                : 'IDLE'}
                        </strong>
                    </div>

                    <div>
                        <span>
                            EXECUTION STAGE
                        </span>

                        <strong>
                            {executionStage}
                        </strong>
                    </div>

                    <div>
                        <span>
                            CONTRACT
                        </span>

                        <strong>
                            {getContractName(
                                currentContract
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>
                            CURRENT P/L
                        </span>

                        <strong
                            className={
                                currentProfit > 0
                                    ? 'positive'
                                    : currentProfit < 0
                                        ? 'negative'
                                        : ''
                            }
                        >
                            {formatSignedMoney(
                                currentProfit,
                                currency
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>
                            ACCOUNT
                        </span>

                        <strong>
                            {client.is_logged_in
                                ? 'AUTHORIZED'
                                : 'NOT LOGGED IN'}
                        </strong>
                    </div>

                </div>

            </section>


            <section className='monehunt-dashboard__bottom'>

                <div className='monehunt-panel'>

                    <div className='monehunt-panel__header'>
                        <div>
                            <span className='monehunt-panel__eyebrow'>
                                SESSION
                            </span>

                            <h2>
                                Recent Activity
                            </h2>
                        </div>
                    </div>


                    <div className='monehunt-activity'>

                        {recentTransactions.length > 0 ? (
                            recentTransactions.map(
                                (transaction: any, index: number) => {
                                    const data =
                                        transaction.data || {};

                                    const profit =
                                        Number(
                                            data.profit ??
                                                ((data.sell_price ?? 0) -
                                                    (data.buy_price ?? 0))
                                        ) || 0;

                                    const won =
                                        profit > 0;

                                    return (
                                        <div
                                            key={
                                                transaction.id ||
                                                transaction.contract_id ||
                                                index
                                            }
                                        >
                                            <div
                                                className={
                                                    `monehunt-activity__icon ${
                                                        won
                                                            ? 'monehunt-activity__icon--win'
                                                            : 'monehunt-activity__icon--loss'
                                                    }`
                                                }
                                            >
                                                {won
                                                    ? '+'
                                                    : '−'}
                                            </div>

                                            <div>
                                                <strong>
                                                    {getContractName(
                                                        data
                                                    )}
                                                </strong>

                                                <span>
                                                    {data.symbol ||
                                                        selectedMarket}
                                                </span>
                                            </div>

                                            <b
                                                className={
                                                    won
                                                        ? 'positive'
                                                        : 'negative'
                                                }
                                            >
                                                {formatSignedMoney(
                                                    profit,
                                                    currency
                                                )}
                                            </b>
                                        </div>
                                    );
                                }
                            )
                        ) : (
                            <div className='monehunt-activity__empty'>
                                <strong>
                                    No completed contracts yet
                                </strong>

                                <span>
                                    Trading activity will appear here.
                                </span>
                            </div>
                        )}

                    </div>

                </div>


                <div className='monehunt-panel'>

                    <div className='monehunt-panel__header'>
                        <div>
                            <span className='monehunt-panel__eyebrow'>
                                NAVIGATION
                            </span>

                            <h2>
                                Quick Actions
                            </h2>
                        </div>
                    </div>


                    <div className='monehunt-quick-actions'>

                        <Link to='/bot-builder'>
                            <span>
                                BOT
                            </span>

                            <strong>
                                Bot Builder
                            </strong>
                        </Link>


                        <Link to='/only-ups-downs'>
                            <span>
                                AI
                            </span>

                            <strong>
                                Only Ups / Downs
                            </strong>
                        </Link>


                        <Link to='/preview'>
                            <span>
                                WORKSPACE
                            </span>

                            <strong>
                                Trading Workspace
                            </strong>
                        </Link>


                        <Link to='/copy-trading'>
                            <span>
                                COPY
                            </span>

                            <strong>
                                Copy Trading
                            </strong>
                        </Link>

                    </div>

                </div>

            </section>


            <footer className='monehunt-dashboard__footer'>

                <span>
                    MONEHUNT AI
                </span>

                <span>
                    {client.is_logged_in
                        ? `Connected • ${client.loginid || 'Account'}`
                        : 'Connect a Deriv account to begin'}
                </span>

            </footer>

        </main>
    );
});

export default Dashboard;









