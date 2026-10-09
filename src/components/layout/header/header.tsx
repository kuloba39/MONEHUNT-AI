import { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import { generateOAuthURL } from '@/components/shared';
import Button from '@/components/shared_ui/button';
import useActiveAccount from '@/hooks/api/account/useActiveAccount';
import { useApiBase } from '@/hooks/useApiBase';
import { api_base } from '@/external/bot-skeleton/services/api/api-base';
import { useLogout } from '@/hooks/useLogout';
import { useStore } from '@/hooks/useStore';
import { navigateToTransfer } from '@/utils/transfer-utils';
import { isDemoAccount } from '@/utils/account-helpers';
import { Localize } from '@deriv-com/translations';
import { Header, useDevice, Wrapper } from '@deriv-com/ui';
import { AppLogo } from '../app-logo';
import AccountSwitcher from './account-switcher';
import MenuItems from './menu-items';
import MobileMenu from './mobile-menu';
import './header.scss';

const AppHeader = observer(() => {
    const { isDesktop } = useDevice();

    console.log('[MONEHUNT HEADER]', {
        isDesktop,
        width: window.innerWidth,
    });
    const { isAuthorizing, activeLoginid, setIsAuthorizing, authData, accountList } = useApiBase();
    const { client, run_panel } = useStore() ?? {};
    const [authTimeout, setAuthTimeout] = useState(false);
    const is_account_regenerating = client?.is_account_regenerating || false;

    // Detect OAuth callback on mount (before App.tsx cleans up the URL).
    // When ?code=...&state=... is present the full auth flow can take 7-15 s
    // (token exchange Ã¢â€ â€™ accounts fetch Ã¢â€ â€™ OTP Ã¢â€ â€™ WebSocket auth), so we must
    // suppress the short fallback timeout and keep the spinner throughout.
    const [isOAuthPending, setIsOAuthPending] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return Boolean(params.get('code') && params.get('state'));
    });

    const { data: activeAccount } = useActiveAccount({
        allBalanceData: client?.all_accounts_balance,
        directBalance: client?.balance,
    });

    const [isMonehuntAccountMenuOpen, setIsMonehuntAccountMenuOpen] = useState(false);

    const isMonehuntAccountSwitchingDisabled =
        Boolean(run_panel?.is_running) ||
        Boolean(api_base.is_running) ||
        Boolean(client?.is_account_regenerating);

    const handleMonehuntAccountSelect = useCallback(
        (loginid: string) => {
            if (
                isMonehuntAccountSwitchingDisabled ||
                loginid === activeLoginid
            ) {
                setIsMonehuntAccountMenuOpen(false);
                return;
            }

            localStorage.setItem('active_loginid', loginid);
            client?.checkAndRegenerateWebSocket();
            setIsMonehuntAccountMenuOpen(false);
        },
        [
            activeLoginid,
            client,
            isMonehuntAccountSwitchingDisabled,
        ]
    );

    const monehuntAccountBalance = activeAccount?.balance || '--';
    const monehuntAccountType = activeAccount?.isVirtual ? 'DEMO' : 'REAL';

    const handleLogout = useLogout();

    // Clear OAuth-pending flag once the account is set (auth succeeded)
    // or after a generous timeout in case something goes wrong.
    useEffect(() => {
        if (!isOAuthPending) return;

        if (activeLoginid) {
            setIsOAuthPending(false);
            return;
        }

        // Safety net: give up after 30 s and let the normal flow decide
        const timer = setTimeout(() => setIsOAuthPending(false), 30_000);
        return () => clearTimeout(timer);
    }, [isOAuthPending, activeLoginid]);

    // Handle direct URL access with legacy token param
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const account_id = urlParams.get('account_id');
        if (account_id) {
            setIsAuthorizing(true);
        }
    }, [setIsAuthorizing]);

    // Fallback timeout: show login button if auth never resolves.
    // Suppressed during the OAuth callback flow (isOAuthPending = true).
    useEffect(() => {
        if (isOAuthPending) return;

        const timer = setTimeout(() => {
            if (isAuthorizing && !activeLoginid) {
                setAuthTimeout(true);
                setIsAuthorizing(false);
            }
        }, 5000);

        if (activeLoginid || !isAuthorizing) {
            if (authTimeout) setAuthTimeout(false);
            clearTimeout(timer);
        }

        return () => clearTimeout(timer);
    }, [isAuthorizing, activeLoginid, setIsAuthorizing, authTimeout, isOAuthPending]);

    const handleSignup = useCallback(async () => {
        try {
            setIsAuthorizing(true);
            const oauthUrl = await generateOAuthURL('registration');
            if (oauthUrl) {
                window.location.replace(oauthUrl);
            } else {
                console.error('Failed to generate OAuth URL for signup');
                setIsAuthorizing(false);
            }
        } catch (error) {
            console.error('Signup redirection failed:', error);
            setIsAuthorizing(false);
        }
    }, [setIsAuthorizing]);

    const handleLogin = useCallback(async () => {
        try {
            // Set authorizing state immediately when login is clicked
            setIsAuthorizing(true);

            // Generate OAuth URL with CSRF token and PKCE parameters
            const oauthUrl = await generateOAuthURL();

            if (oauthUrl) {
                // Redirect to OAuth URL
                window.location.replace(oauthUrl);
            } else {
                console.error('Failed to generate OAuth URL');
                setIsAuthorizing(false);
            }
        } catch (error) {
            console.error('Login redirection failed:', error);
            // Reset authorizing state if redirection fails
            setIsAuthorizing(false);
        }
    }, [setIsAuthorizing]);

    const handleTransfer = useCallback(() => {
        const transferCurrency = authData?.currency;
        if (!transferCurrency) {
            console.error('No currency available for transfer');
            return;
        }
        navigateToTransfer(transferCurrency);
    }, [authData?.currency]);

    const renderAccountSection = useCallback(
        (position: 'left' | 'right' | 'center' = 'right') => {
            // Show account switcher and logout when user is fully authenticated
            if (activeLoginid && !is_account_regenerating) {
                if (position === 'left' && !isDesktop) {
                    // For mobile left section - only account switcher
                    return (
                        <div className='auth-actions'>
                            <div className='account-info'>
                                <AccountSwitcher activeAccount={activeAccount} />
                            </div>
                        </div>
                    );
                } else if (position === 'right') {
                    // For right section - transfer button (and account switcher on desktop)
                    return (
                        <div className='auth-actions'>
                            {isDesktop && (
                                <div className='account-info'>
                                    <AccountSwitcher activeAccount={activeAccount} />
                                </div>
                            )}
                            <Button
                                primary
                                disabled={client?.is_logging_out || !authData?.currency}
                                onClick={handleTransfer}
                            >
                                <Localize i18n_default_text='Transfer' />
                            </Button>
                        </div>
                    );
                }
            }
            // Show login button only when fully settled (not during OAuth flow)
            else if (
                position === 'center' && !isOAuthPending &&
                ((!is_account_regenerating && !isAuthorizing && !activeLoginid) || authTimeout)
            ) {
                // Disable auth buttons until the OAuth app id is configured, so the
                // click handlers (which would otherwise log "Failed to generate OAuth
                // URL") never fire. The env-not-set toast explains why.
                const isAuthConfigured = Boolean(process.env.NEXT_PUBLIC_DERIV_APP_ID);
                return (
                    <div className='auth-actions'>
                        <Button tertiary disabled={!isAuthConfigured} onClick={handleLogin}>
                            <Localize i18n_default_text='Log in' />
                        </Button>
                        <Button primary_light disabled={!isAuthConfigured} onClick={handleSignup}>
                            <Localize i18n_default_text='Sign up' />
                        </Button>
                    </div>
                );
            }
            // Default: Show spinner during loading states or when authorizing
            else if (position === 'center') {
                return (
                    <div className='auth-actions auth-actions--loading'>
                        <svg
                            className='auth-actions__spinner'
                            viewBox='0 0 24 24'
                            fill='none'
                            xmlns='http://www.w3.org/2000/svg'
                        >
                            <circle
                                cx='12'
                                cy='12'
                                r='10'
                                stroke='currentColor'
                                strokeWidth='2.5'
                                strokeLinecap='round'
                                strokeDasharray='31.416'
                                strokeDashoffset='10'
                            />
                        </svg>
                    </div>
                );
            }

            return null;
        },
        [
            isAuthorizing,
            isDesktop,
            activeLoginid,
            client,
            activeAccount,
            authTimeout,
            is_account_regenerating,
            isOAuthPending,
            authData,
            handleLogin,
            handleSignup,
            handleTransfer,
        ]
    );

    if (client?.should_hide_header) return null;

    return (
        <>
            <section className='monehunt-global-account-bar'>
                <div className='monehunt-global-account-bar__brand'>
                    MONEHUNT AI
                </div>

                <div className='monehunt-global-account-bar__auth'>
                    {renderAccountSection('center')}
                </div>

                <div className='monehunt-global-account-bar__account'>
                    <button
                        type='button'
                        className='monehunt-global-account-bar__button'
                        onClick={() => {
                            if (!isMonehuntAccountSwitchingDisabled) {
                                setIsMonehuntAccountMenuOpen(prev => !prev);
                            }
                        }}
                        disabled={
                            isMonehuntAccountSwitchingDisabled ||
                            !accountList ||
                            accountList.length <= 1
                        }
                        aria-haspopup='menu'
                        aria-expanded={isMonehuntAccountMenuOpen}
                    >
                        <span className='monehunt-global-account-bar__balance'>
                            {monehuntAccountBalance}
                            {activeAccount?.currency
                                ? ' ' + activeAccount.currency
                                : ''}
                        </span>

                        <span className='monehunt-global-account-bar__type'>
                            {monehuntAccountType}
                        </span>

                        {accountList && accountList.length > 1 && (
                            <span
                                className={clsx(
                                    'monehunt-global-account-bar__chevron',
                                    isMonehuntAccountMenuOpen &&
                                        'monehunt-global-account-bar__chevron--open'
                                )}
                            >
                                â–¼
                            </span>
                        )}
                    </button>

                    {isMonehuntAccountMenuOpen &&
                        !isMonehuntAccountSwitchingDisabled &&
                        accountList &&
                        accountList.length > 1 && (
                        <div
                            className='monehunt-global-account-bar__menu'
                            role='menu'
                        >
                            {accountList.map(account => {
                                const isActive = account.loginid === activeLoginid;
                                const isDemo = isDemoAccount(account.loginid);

                                return (
                                    <button
                                        key={account.loginid}
                                        type='button'
                                        className={clsx(
                                            'monehunt-global-account-bar__option',
                                            isActive &&
                                                'monehunt-global-account-bar__option--active'
                                        )}
                                        onClick={() =>
                                            handleMonehuntAccountSelect(account.loginid)
                                        }
                                        role='menuitem'
                                    >
                                        <span>
                                            {isActive ? 'âœ“ ' : ''}
                                            {isDemo ? 'DEMO' : 'REAL'}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            <Header
                className={clsx('app-header', {
                    'app-header--desktop': isDesktop,
                    'app-header--mobile': !isDesktop,
                })}
            >
                <Wrapper variant='left'>
                    <MobileMenu onLogout={handleLogout} />
                    <AppLogo />
                    <MenuItems />
                </Wrapper>
                <Wrapper variant='right'>
                    {renderAccountSection('right')}
                </Wrapper>
            </Header>
        </>
    );
});

export default AppHeader;
