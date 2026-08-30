interface DerivAccount {
    account_id?: string;
    loginid?: string;
    currency?: string;
    account_type?: string;
    balance?: number;
    status?: string;
}

interface DerivAccountsResponse {
    data?: {
        accounts?: DerivAccount[];
    };
    accounts?: DerivAccount[];
    errors?: Array<{
        code?: string;
        message?: string;
        status?: number;
    }>;
}

interface DerivOtpResponse {
    data?: {
        url?: string;
        otp?: string;
    };
    errors?: Array<{
        code?: string;
        message?: string;
        status?: number;
    }>;
}

class FollowerVerificationService {

    private readonly baseURL =
        "https://api.derivws.com";

    private readonly appId =
        process.env.NEXT_PUBLIC_DERIV_APP_ID || "";

    async verify(token: string) {

        try {

            const cleanToken =
                token.trim();

            if (!cleanToken) {

                console.error(
                    "FOLLOWER VERIFICATION: EMPTY TOKEN"
                );

                return null;
            }

            if (!this.appId) {

                console.error(
                    "FOLLOWER VERIFICATION: MISSING DERIV APP ID"
                );

                return null;
            }

            console.log(
                "FOLLOWER VERIFICATION: STARTING"
            );

            /*
             * STEP 1
             *
             * Ask Deriv for the Options accounts
             * belonging to this authorization token.
             *
             * Current Deriv API:
             * GET /trading/v1/options/accounts
             */

            const accountsResponse =
                await fetch(
                    `${this.baseURL}/trading/v1/options/accounts`,
                    {
                        method: "GET",

                        headers: {
                            "Authorization":
                                `Bearer ${cleanToken}`,

                            "Deriv-App-ID":
                                this.appId,

                            "Content-Type":
                                "application/json",
                        },
                    }
                );

            const accountsResult =
                (await accountsResponse.json()) as DerivAccountsResponse;

            console.log(
                "DERIV ACCOUNTS RESPONSE",
                {
                    status:
                        accountsResponse.status,

                    ok:
                        accountsResponse.ok,

                    result:
                        accountsResult,
                }
            );

            if (!accountsResponse.ok) {

                const errorMessage =
                    accountsResult.errors?.[0]?.message ||
                    "Unable to retrieve Deriv accounts.";

                console.error(
                    "DERIV ACCOUNT LOOKUP FAILED",
                    errorMessage
                );

                return null;
            }

            const accounts =
                accountsResult.data?.accounts ||
                accountsResult.accounts ||
                [];

            if (!accounts.length) {

                console.error(
                    "NO DERIV OPTIONS ACCOUNTS FOUND"
                );

                return null;
            }

            /*
             * Use the first returned account.
             *
             * Later the premium UI can allow the
             * customer to choose between accounts.
             */

            const account =
                accounts[0];

            const accountId =
                account.account_id ||
                account.loginid;

            if (!accountId) {

                console.error(
                    "DERIV ACCOUNT ID MISSING",
                    account
                );

                return null;
            }

            /*
             * STEP 2
             *
             * Request the short-lived authenticated
             * WebSocket URL.
             *
             * Deriv's OTP endpoint returns a ready-to-use
             * WebSocket URL.
             */

            const otpResponse =
                await fetch(
                    `${this.baseURL}/trading/v1/options/accounts/${encodeURIComponent(accountId)}/otp`,
                    {
                        method: "POST",

                        headers: {
                            "Authorization":
                                `Bearer ${cleanToken}`,

                            "Deriv-App-ID":
                                this.appId,

                            "Content-Type":
                                "application/json",
                        },
                    }
                );

            const otpResult =
                (await otpResponse.json()) as DerivOtpResponse;

            console.log(
                "DERIV OTP RESPONSE",
                {
                    status:
                        otpResponse.status,

                    ok:
                        otpResponse.ok,

                    result:
                        otpResult,
                }
            );

            if (!otpResponse.ok) {

                const errorMessage =
                    otpResult.errors?.[0]?.message ||
                    "Unable to authenticate the Deriv trading connection.";

                console.error(
                    "DERIV OTP REQUEST FAILED",
                    errorMessage
                );

                return null;
            }

            const websocketURL =
                otpResult.data?.url;

            if (!websocketURL) {

                console.error(
                    "DERIV OTP DID NOT RETURN WEBSOCKET URL",
                    otpResult
                );

                return null;
            }

            /*
             * STEP 3
             *
             * Verify that the authenticated WebSocket
             * can actually be opened.
             */

            const connectionResult =
                await this.testWebSocket(
                    websocketURL
                );

            if (!connectionResult) {

                console.error(
                    "DERIV AUTHENTICATED WEBSOCKET CONNECTION FAILED"
                );

                return null;
            }

            const loginId =
                String(accountId);

            const accountType =
                String(
                    account.account_type || ""
                ).toLowerCase() === "demo" ||
                loginId.startsWith("VRT")
                    ? "Demo"
                    : "Real";

            console.log(
                "FOLLOWER DERIV ACCOUNT VERIFIED",
                {
                    account_id:
                        loginId,

                    account_type:
                        accountType,

                    currency:
                        account.currency,

                    balance:
                        account.balance,
                }
            );

            return {

                verified: true,

                account_id:
                    loginId,

                balance:
                    Number(
                        account.balance || 0
                    ),

                currency:
                    account.currency || "",

                account_type:
                    accountType,

                websocket_url:
                    websocketURL,

            };

        } catch (error) {

            console.error(
                "FOLLOWER VERIFICATION ERROR",
                error
            );

            return null;
        }
    }


    private testWebSocket(
        websocketURL: string
    ): Promise<boolean> {

        return new Promise(
            resolve => {

                let settled = false;

                let timeout:
                    number | undefined;

                const finish =
                    (result: boolean) => {

                        if (settled) {
                            return;
                        }

                        settled = true;

                        if (
                            timeout !== undefined
                        ) {
                            window.clearTimeout(
                                timeout
                            );
                        }

                        resolve(result);
                    };

                try {

                    const socket =
                        new WebSocket(
                            websocketURL
                        );

                    timeout =
                        window.setTimeout(
                            () => {

                                console.error(
                                    "FOLLOWER WEBSOCKET TIMEOUT"
                                );

                                try {
                                    socket.close();
                                } catch {}

                                finish(false);

                            },
                            10000
                        );

                    socket.onopen =
                        () => {

                            console.log(
                                "FOLLOWER DERIV WEBSOCKET CONNECTED"
                            );

                            try {
                                socket.close();
                            } catch {}

                            finish(true);
                        };

                    socket.onerror =
                        error => {

                            console.error(
                                "FOLLOWER DERIV WEBSOCKET ERROR",
                                error
                            );

                            try {
                                socket.close();
                            } catch {}

                            finish(false);
                        };

                    socket.onclose =
                        () => {

                            if (!settled) {
                                console.log(
                                    "FOLLOWER DERIV WEBSOCKET CLOSED"
                                );
                            }
                        };

                } catch (error) {

                    console.error(
                        "FOLLOWER WEBSOCKET CREATION ERROR",
                        error
                    );

                    finish(false);
                }
            }
        );
    }
}


export const followerVerificationService =
    new FollowerVerificationService();
