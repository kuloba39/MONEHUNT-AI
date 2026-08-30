import { useState } from 'react';
import { observer } from 'mobx-react-lite';

import './copy-trading.scss';

import {
copyTradingStore,
Follower,
} from '@/stores/copy-trading-store';

const CopyTrading = observer(() => {
const [showConnect, setShowConnect] = useState(false);
const [token, setToken] = useState('');
const [name, setName] = useState('');
const [showToken, setShowToken] = useState(false);
const [loading, setLoading] = useState(false);
const [message, setMessage] = useState('');
const [messageType, setMessageType] =
    useState<'success' | 'error'>('success');

const followers =
    copyTradingStore.followers || [];

const activeFollowers =
    followers.filter(
        follower =>
            follower.status === 'active'
    );

const connectedFollowers =
    followers.filter(
        follower =>
            follower.verified
    );

const connectFollower = async () => {

    setMessage('');

    if (!token.trim()) {

        setMessageType('error');

        setMessage(
            'Paste your Deriv Personal Access Token first.'
        );

        return;
    }

    if (token.trim().length < 20) {

        setMessageType('error');

        setMessage(
            'That token looks too short. Paste the complete Deriv PAT.'
        );

        return;
    }

    setLoading(true);

    try {

        const follower: Follower = {

            id: Date.now(),

            user_id: Date.now(),

            master_id: 0,

            account_id: '',

            deriv_token:
                token.trim(),

            verified: false,

            profile: {

                name:
                    name.trim() ||
                    'Deriv Account',

                account_type:
                    '',

                currency:
                    '',

            },

            settings: {

                copy_mode:
                    'same_as_master',

                copy_percentage:
                    100,

                fixed_amount:
                    0,

                multiplier:
                    1,

                max_stake:
                    0,

                daily_loss_limit:
                    0,

                stop_loss:
                    0,

                take_profit:
                    0,

            },

            status:
                'pending',

            statistics: {

                copied_trades:
                    0,

                total_profit:
                    0,

                total_loss:
                    0,

            },

            created_at:
                Date.now(),

        };

        const result =
            await copyTradingStore.addFollower(
                follower
            );

        if (!result) {

            setMessageType('error');

            setMessage(
                'We could not verify this Deriv account. Check that the PAT is valid and has the required trading permission.'
            );

            return;

        }

        setToken('');

        setName('');

        setShowConnect(false);

        setShowToken(false);

        setMessageType('success');

        setMessage(
            'Deriv account verified and connected successfully.'
        );

    } catch (error) {

        console.error(
            'COPY TRADING CONNECTION ERROR',
            error
        );

        setMessageType('error');

        setMessage(
            'Connection failed. Please check your Deriv token and try again.'
        );

    } finally {

        setLoading(false);

    }

};

const activateFollower = (
    followerId: number
) => {

    copyTradingStore.activateFollower(
        followerId
    );

};

const pauseFollower = (
    followerId: number
) => {

    copyTradingStore.pauseFollower(
        followerId
    );

};

const resumeFollower = (
    followerId: number
) => {

    copyTradingStore.resumeFollower(
        followerId
    );

};

return (

    <div className="copy-trading-premium">

        <div className="copy-trading-hero">

            <div>

                <div className="copy-trading-eyebrow">
                    DOLARHUNTER COPY TRADING
                </div>

                <h1>
                    Copy trades.
                    <span>
                        Stay in control.
                    </span>
                </h1>

                <p>
                    Connect your Deriv account,
                    choose how much to copy,
                    and let your strategy run
                    automatically.
                </p>

            </div>

            <button
                className="premium-connect-button"
                onClick={() => {
                    setShowConnect(true);
                    setMessage('');
                }}
            >
                <span>+</span>
                Connect Deriv Account
            </button>

        </div>


        {message && (

            <div
                className={
                    `copy-trading-message ${messageType}`
                }
            >

                <span>
                    {messageType === 'success'
                        ? '✓'
                        : '!'}
                </span>

                {message}

            </div>

        )}


        <div className="copy-trading-stats">

            <div className="copy-stat-card">

                <span className="copy-stat-label">
                    Connected Accounts
                </span>

                <strong>
                    {connectedFollowers.length}
                </strong>

                <small>
                    Deriv accounts
                </small>

            </div>


            <div className="copy-stat-card">

                <span className="copy-stat-label">
                    Active Accounts
                </span>

                <strong>
                    {activeFollowers.length}
                </strong>

                <small>
                    Currently copying
                </small>

            </div>


            <div className="copy-stat-card">

                <span className="copy-stat-label">
                    Copy Mode
                </span>

                <strong>
                    100%
                </strong>

                <small>
                    Same as master
                </small>

            </div>


            <div className="copy-stat-card">

                <span className="copy-stat-label">
                    Protection
                </span>

                <strong>
                    ON
                </strong>

                <small>
                    Risk controls available
                </small>

            </div>

        </div>


        {showConnect && (

            <div
                className="copy-connect-overlay"
                onMouseDown={event => {

                    if (
                        event.target ===
                        event.currentTarget
                    ) {

                        setShowConnect(false);

                    }

                }}
            >

                <div className="copy-connect-modal">

                    <div className="modal-header">

                        <div>

                            <div className="modal-icon">
                                D
                            </div>

                            <div>

                                <div className="modal-eyebrow">
                                    SECURE CONNECTION
                                </div>

                                <h2>
                                    Connect Deriv Account
                                </h2>

                            </div>

                        </div>

                        <button
                            className="modal-close"
                            onClick={() =>
                                setShowConnect(false)
                            }
                        >
                            ×
                        </button>

                    </div>


                    <div className="token-security-banner">

                        <div className="security-icon">
                            ✓
                        </div>

                        <div>

                            <strong>
                                Your token stays in your account
                                connection.
                            </strong>

                            <p>
                                Never share your Deriv password.
                                Use a Personal Access Token with
                                the trading permission required
                                for copy trading.
                            </p>

                        </div>

                    </div>


                    <label className="premium-field">

                        <span>
                            Account Name
                        </span>

                        <input
                            type="text"
                            value={name}
                            onChange={event =>
                                setName(
                                    event.target.value
                                )
                            }
                            placeholder="e.g. Main Deriv Account"
                            disabled={loading}
                        />

                    </label>


                    <label className="premium-field">

                        <span>
                            Deriv Personal Access Token
                        </span>

                        <div className="token-input-wrapper">

                            <input
                                type={
                                    showToken
                                        ? 'text'
                                        : 'password'
                                }
                                value={token}
                                onChange={event =>
                                    setToken(
                                        event.target.value
                                    )
                                }
                                onKeyDown={event => {

                                    if (
                                        event.key ===
                                        'Enter'
                                    ) {

                                        connectFollower();

                                    }

                                }}
                                placeholder="Paste your Deriv PAT here"
                                autoComplete="off"
                                spellCheck={false}
                                disabled={loading}
                            />

                            <button
                                type="button"
                                className="token-visibility"
                                onClick={() =>
                                    setShowToken(
                                        value => !value
                                    )
                                }
                                disabled={loading}
                            >
                                {showToken
                                    ? 'Hide'
                                    : 'Show'}
                            </button>

                        </div>

                        <small>
                            Paste the Personal Access Token
                            generated for your Deriv PAT app.
                        </small>

                    </label>


                    <div className="token-steps">

                        <div className="token-step">

                            <span>1</span>

                            <div>
                                <strong>
                                    Create a PAT
                                </strong>

                                <p>
                                    Create a Personal Access
                                    Token in your Deriv developer
                                    dashboard.
                                </p>
                            </div>

                        </div>


                        <div className="token-step">

                            <span>2</span>

                            <div>
                                <strong>
                                    Enable trading access
                                </strong>

                                <p>
                                    Make sure the token has the
                                    required trading scope.
                                </p>
                            </div>

                        </div>


                        <div className="token-step">

                            <span>3</span>

                            <div>
                                <strong>
                                    Paste it here
                                </strong>

                                <p>
                                    We verify the account before
                                    adding it to copy trading.
                                </p>
                            </div>

                        </div>

                    </div>


                    <button
                        className="verify-token-button"
                        onClick={connectFollower}
                        disabled={
                            loading ||
                            !token.trim()
                        }
                    >

                        {loading ? (

                            <>
                                <span className="button-spinner" />
                                Verifying Deriv account...
                            </>

                        ) : (

                            <>
                                Verify & Connect
                                <span>→</span>
                            </>

                        )}

                    </button>


                    <p className="modal-disclaimer">
                        Only connect accounts you own or are
                        authorized to operate. Start with a demo
                        account while testing your copy-trading
                        setup.
                    </p>

                </div>

            </div>

        )}


        <section className="connected-accounts">

            <div className="section-heading">

                <div>

                    <div className="section-eyebrow">
                        ACCOUNTS
                    </div>

                    <h2>
                        Connected Deriv Accounts
                    </h2>

                </div>

                <button
                    className="secondary-connect-button"
                    onClick={() =>
                        setShowConnect(true)
                    }
                >
                    + Add account
                </button>

            </div>


            {followers.length === 0 ? (

                <div className="empty-copy-state">

                    <div className="empty-icon">
                        D
                    </div>

                    <h3>
                        No Deriv accounts connected
                    </h3>

                    <p>
                        Connect your Deriv account to start
                        configuring copy trading.
                    </p>

                    <button
                        onClick={() =>
                            setShowConnect(true)
                        }
                    >
                        Connect Deriv Account
                    </button>

                </div>

            ) : (

                <div className="follower-grid">

                    {followers.map(
                        follower => (

                            <div
                                className="follower-card"
                                key={follower.id}
                            >

                                <div className="follower-card-top">

                                    <div className="account-avatar">
                                        {(
                                            follower.profile?.name ||
                                            'D'
                                        )
                                            .charAt(0)
                                            .toUpperCase()}
                                    </div>

                                    <div>

                                        <h3>
                                            {
                                                follower.profile?.name ||
                                                'Deriv Account'
                                            }
                                        </h3>

                                        <span>
                                            {
                                                follower.account_id ||
                                                'Pending verification'
                                            }
                                        </span>

                                    </div>

                                    <div
                                        className={
                                            `account-status ${
                                                follower.verified
                                                    ? 'verified'
                                                    : 'pending'
                                            }`
                                        }
                                    >
                                        {follower.verified
                                            ? 'Verified'
                                            : 'Pending'}
                                    </div>

                                </div>


                                <div className="account-details">

                                    <div>
                                        <span>
                                            Type
                                        </span>

                                        <strong>
                                            {
                                                follower.profile?.account_type ||
                                                '—'
                                            }
                                        </strong>
                                    </div>


                                    <div>
                                        <span>
                                            Currency
                                        </span>

                                        <strong>
                                            {
                                                follower.profile?.currency ||
                                                '—'
                                            }
                                        </strong>
                                    </div>


                                    <div>
                                        <span>
                                            Copy
                                        </span>

                                        <strong>
                                            {
                                                follower.settings?.copy_percentage ??
                                                100
                                            }%
                                        </strong>
                                    </div>

                                </div>


                                <div className="follower-actions">

                                    {follower.status ===
                                        'active' ? (

                                        <button
                                            className="pause-button"
                                            onClick={() =>
                                                pauseFollower(
                                                    follower.id
                                                )
                                            }
                                        >
                                            Pause
                                        </button>

                                    ) : (

                                        <button
                                            className="activate-button"
                                            onClick={() =>
                                                follower.verified &&
                                                activateFollower(
                                                    follower.id
                                                )
                                            }
                                            disabled={
                                                !follower.verified
                                            }
                                        >
                                            Activate
                                        </button>

                                    )}


                                    {follower.status ===
                                        'paused' && (

                                        <button
                                            className="resume-button"
                                            onClick={() =>
                                                resumeFollower(
                                                    follower.id
                                                )
                                            }
                                        >
                                            Resume
                                        </button>

                                    )}

                                </div>

                            </div>

                        )
                    )}

                </div>

            )}

        </section>

    </div>

);
});

export default CopyTrading;

