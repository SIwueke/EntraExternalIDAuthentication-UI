import React, {
    useCallback,
    useEffect,
    useState,
} from "react";

import {
    BrowserRouter,
    Link,
    Route,
    Routes,
    useNavigate,
} from "react-router-dom";

import {
    useMsal,
} from "@azure/msal-react";

import {
    jwtDecode,
} from "jwt-decode";

import {
    loginRequest,
} from "./auth/msalConfig";

import {
    NativeAuthProvider,
    useNativeAuth,
} from "./auth/NativeAuthContext";

import CustomLoginPage from "./pages/CustomLoginPage";
import NativeLoginTestPage from "./pages/NativeLoginTestPage";

import {
    getMfaConfiguration,
} from "./services/mfaConfigurationService";


// ============================================================
// TEST BED / HOME PAGE
// ============================================================

function MsalDemoPage() {

    // --------------------------------------------------------
    // STANDARD MSAL
    // --------------------------------------------------------

    const {
        instance,
        accounts,
    } = useMsal();


    // --------------------------------------------------------
    // ROUTING
    // --------------------------------------------------------

    const navigate = useNavigate();


    // --------------------------------------------------------
    // SHARED NATIVE AUTHENTICATION
    // --------------------------------------------------------

    const {
        isApplicationAuthenticated,
        getAccessToken,
        callApi,
        clearApplicationAuthentication,
        username,
        nativeAccount,
    } = useNativeAuth();


    // --------------------------------------------------------
    // STATE
    // --------------------------------------------------------

    const [secureResult, setSecureResult] =
        useState(null);

    const [userInfo, setUserInfo] =
        useState(null);

    const [token, setToken] =
        useState(null);

    const [tokenSource, setTokenSource] =
        useState(null);

    const [tokenClaims, setTokenClaims] =
        useState(null);

    const [mfaMode, setMfaMode] =
        useState(null);

    const [mfaMessage, setMfaMessage] =
        useState(null);

    const [apiTestResult, setApiTestResult] =
        useState(null);

    const [loading, setLoading] =
        useState(false);


    // --------------------------------------------------------
    // STANDARD MSAL ACCOUNT
    // --------------------------------------------------------

    const msalAccount =
        accounts && accounts.length > 0
            ? accounts[0]
            : null;


    // --------------------------------------------------------
    // LOAD MFA CONFIGURATION
    // --------------------------------------------------------

    useEffect(() => {

        let cancelled = false;

        const loadConfiguration =
            async () => {

                try {

                    const configuration =
                        await getMfaConfiguration();

                    if (!cancelled) {

                        setMfaMode(
                            configuration?.mode ??
                            null
                        );
                    }

                } catch (error) {

                    console.error(
                        "Unable to load MFA configuration:",
                        error
                    );
                }
            };

        loadConfiguration();

        return () => {
            cancelled = true;
        };

    }, []);


    // --------------------------------------------------------
    // GET ACCESS TOKEN
    // --------------------------------------------------------

    const handleGetAccessToken =
        useCallback(
            async () => {

                setLoading(true);
                setApiTestResult(null);

                try {

                    if (
                        !isApplicationAuthenticated
                    ) {

                        throw new Error(
                            "Application MFA has not been completed. Please sign in through /login first."
                        );
                    }

                    const accessToken =
                        await getAccessToken();

                    setToken(accessToken);

                    setTokenSource(
                        "Native Authentication + Application MFA"
                    );


                    // ----------------------------------------
                    // Decode token claims for diagnostics
                    // ----------------------------------------

                    try {

                        const claims =
                            jwtDecode(
                                accessToken
                            );

                        setTokenClaims(
                            claims
                        );

                    } catch (decodeError) {

                        console.error(
                            "Unable to decode access token:",
                            decodeError
                        );

                        setTokenClaims(
                            null
                        );
                    }


                    setApiTestResult({
                        success: true,
                        message:
                            "Entra access token obtained successfully.",
                    });

                    return accessToken;

                } catch (error) {

                    console.error(
                        "Unable to obtain access token:",
                        error
                    );

                    setApiTestResult({
                        success: false,
                        message:
                            error?.message ??
                            "Unable to obtain access token.",
                    });

                    throw error;

                } finally {

                    setLoading(false);
                }
            },
            [
                getAccessToken,
                isApplicationAuthenticated,
            ]
        );


    // --------------------------------------------------------
    // GENERIC PROTECTED API
    // --------------------------------------------------------

    const callProtectedEndpoint =
        useCallback(
            async (url) => {

                setLoading(true);
                setApiTestResult(null);

                try {

                    if (
                        !isApplicationAuthenticated
                    ) {

                        throw new Error(
                            "Application MFA has not been completed. Please sign in through /login first."
                        );
                    }


                    // ----------------------------------------
                    // IMPORTANT:
                    //
                    // callApi() comes from the shared
                    // NativeAuthProvider.
                    //
                    // It obtains the access token and
                    // calls callProtectedApi().
                    // ----------------------------------------

                    const result =
                        await callApi(url);


                    setApiTestResult({
                        success: true,
                        message:
                            `${url} returned successfully.`,
                    });


                    return result;

                } catch (error) {

                    console.error(
                        `Protected API error (${url}):`,
                        error
                    );


                    const status =
                        error?.status ??
                        error?.response?.status;


                    let message =
                        error?.message ??
                        `Protected API call failed: ${url}`;


                    if (status === 401) {

                        message =
                            `${url} returned HTTP 401 Unauthorized.`;

                    } else if (status === 403) {

                        message =
                            `${url} returned HTTP 403 Forbidden.`;
                    }


                    setApiTestResult({
                        success: false,
                        status,
                        message,
                    });


                    throw error;

                } finally {

                    setLoading(false);
                }
            },
            [
                callApi,
                isApplicationAuthenticated,
            ]
        );


    // --------------------------------------------------------
    // /api/me
    // --------------------------------------------------------

    const callMeApi =
        useCallback(
            async () => {

                try {

                    const result =
                        await callProtectedEndpoint(
                            "/api/me"
                        );

                    setUserInfo(
                        result
                    );

                } catch (error) {

                    console.error(
                        "Unable to call /api/me:",
                        error
                    );
                }
            },
            [
                callProtectedEndpoint,
            ]
        );


    // --------------------------------------------------------
    // /api/secure
    // --------------------------------------------------------

    const callSecureApi =
        useCallback(
            async () => {

                try {

                    const result =
                        await callProtectedEndpoint(
                            "/api/secure"
                        );

                    setSecureResult(
                        result
                    );

                } catch (error) {

                    console.error(
                        "Unable to call /api/secure:",
                        error
                    );
                }
            },
            [
                callProtectedEndpoint,
            ]
        );


    // --------------------------------------------------------
    // CLEAR NATIVE AUTHENTICATION
    // --------------------------------------------------------

    const handleNativeLogout =
        useCallback(
            () => {

                clearApplicationAuthentication();


                // Clear test-bed state

                setToken(null);

                setTokenSource(null);

                setTokenClaims(null);

                setUserInfo(null);

                setSecureResult(null);

                setApiTestResult(null);

                setMfaMessage(null);


                navigate(
                    "/login"
                );
            },
            [
                clearApplicationAuthentication,
                navigate,
            ]
        );


    // --------------------------------------------------------
    // STANDARD MSAL LOGIN
    // --------------------------------------------------------

    const handleMsalLogin =
        async () => {

            try {

                await instance.loginRedirect(
                    loginRequest
                );

            } catch (error) {

                console.error(
                    "MSAL login failed:",
                    error
                );
            }
        };


    // --------------------------------------------------------
    // STANDARD MSAL LOGOUT
    // --------------------------------------------------------

    const handleMsalLogout =
        async () => {

            try {

                await instance.logoutRedirect();

            } catch (error) {

                console.error(
                    "MSAL logout failed:",
                    error
                );
            }
        };


    // ========================================================
    // RENDER
    // ========================================================

    return (
        <div
            style={{
                padding: "30px",
                fontFamily:
                    "Arial, sans-serif",
            }}
        >

            <h1>
                Entra External ID Demo
            </h1>

            <p>
                Native Authentication +
                Application Authenticator MFA
                test bed
            </p>


            {/* ================================================= */}
            {/* NAVIGATION */}
            {/* ================================================= */}

            <div
                style={{
                    marginBottom: "30px",
                    display: "flex",
                    gap: "15px",
                    flexWrap: "wrap",
                }}
            >

                <Link to="/">
                    Test Bed
                </Link>

                <Link to="/login">
                    Native Login
                </Link>

                <Link to="/native-login-test">
                    Native Login Test
                </Link>

            </div>


            {/* ================================================= */}
            {/* NATIVE AUTHENTICATION STATUS */}
            {/* ================================================= */}

            <section
                style={{
                    border:
                        "1px solid #ccc",
                    padding: "20px",
                    marginBottom: "20px",
                    borderRadius: "8px",
                }}
            >

                <h2>
                    Native Authentication
                </h2>


                <p>
                    <strong>
                        Application MFA:
                    </strong>{" "}

                    {isApplicationAuthenticated
                        ? "Authenticated"
                        : "Not authenticated"}
                </p>


                <p>
                    <strong>
                        Username:
                    </strong>{" "}

                    {username ||
                        "None"}
                </p>


                <p>
                    <strong>
                        Native account:
                    </strong>{" "}

                    {nativeAccount
                        ? "Available"
                        : "Not available"}
                </p>


                <p>
                    <strong>
                        MFA mode:
                    </strong>{" "}

                    {mfaMode ||
                        "Unknown"}
                </p>


                {mfaMessage && (
                    <p>
                        <strong>
                            MFA:
                        </strong>{" "}

                        {mfaMessage}
                    </p>
                )}


                {!isApplicationAuthenticated && (
                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/login"
                            )
                        }
                    >
                        Sign in with Native Authentication
                    </button>
                )}


                {isApplicationAuthenticated && (
                    <button
                        type="button"
                        onClick={
                            handleNativeLogout
                        }
                    >
                        Clear Native Authentication
                    </button>
                )}

            </section>


            {/* ================================================= */}
            {/* TOKEN */}
            {/* ================================================= */}

            {/* ================================================= */}
        {/* ENTRA ACCESS TOKEN */}
        {/* ================================================= */}

        <section
            style={{
                border: "1px solid #ccc",
                padding: "20px",
                marginBottom: "20px",
                borderRadius: "8px",
            }}
        >
            <h2>Entra Access Token</h2>

            <p>
                <strong>Source:</strong>{" "}
                {tokenSource || "None"}
            </p>

            <p>
                <strong>Status:</strong>{" "}
                {token
                    ? `Available (${token.length} characters)`
                    : "Not loaded"}
            </p>

            <button
                type="button"
                onClick={handleGetAccessToken}
                disabled={
                    loading ||
                    !isApplicationAuthenticated
                }
                style={{ marginBottom: "15px" }}
            >
                {loading
                    ? "Loading..."
                    : "Get Access Token"}
            </button>

            <div>
                <strong>JWT Access Token</strong>

                <textarea
                    readOnly
                    value={token || ""}
                    placeholder="The Entra access token will appear here after clicking 'Get Access Token'."
                    style={{
                        width: "100%",
                        height: "220px",
                        marginTop: "8px",
                        fontFamily:
                            "Consolas, monospace",
                        fontSize: "12px",
                        padding: "10px",
                        resize: "vertical",
                        wordBreak: "break-all",
                    }}
                />
            </div>
        </section>


            {/* ================================================= */}
            {/* API TESTS */}
            {/* ================================================= */}

            <section
                style={{
                    border:
                        "1px solid #ccc",
                    padding: "20px",
                    marginBottom: "20px",
                    borderRadius: "8px",
                }}
            >

                <h2>
                    Protected API Tests
                </h2>


                <div
                    style={{
                        display:
                            "flex",
                        gap: "10px",
                        flexWrap:
                            "wrap",
                        marginBottom:
                            "20px",
                    }}
                >

                    <button
                        type="button"
                        onClick={
                            callMeApi
                        }
                        disabled={
                            loading ||
                            !isApplicationAuthenticated
                        }
                    >
                        Call /api/me
                    </button>


                    <button
                        type="button"
                        onClick={
                            callSecureApi
                        }
                        disabled={
                            loading ||
                            !isApplicationAuthenticated
                        }
                    >
                        Call /api/secure
                    </button>

                </div>


                {apiTestResult && (
                    <div>

                        <h3>
                            API Test Result
                        </h3>


                        <pre
                            style={{
                                whiteSpace:
                                    "pre-wrap",
                                wordBreak:
                                    "break-word",
                            }}
                        >
                            {JSON.stringify(
                                apiTestResult,
                                null,
                                2
                            )}
                        </pre>

                    </div>
                )}

            </section>


            {/* ================================================= */}
            {/* USER RESULT */}
            {/* ================================================= */}

            {userInfo && (
                <section
                    style={{
                        border:
                            "1px solid #ccc",
                        padding: "20px",
                        marginBottom:
                            "20px",
                        borderRadius:
                            "8px",
                    }}
                >

                    <h2>
                        /api/me Result
                    </h2>


                    <pre
                        style={{
                            whiteSpace:
                                "pre-wrap",
                            wordBreak:
                                "break-word",
                        }}
                    >
                        {JSON.stringify(
                            userInfo,
                            null,
                            2
                        )}
                    </pre>

                </section>
            )}


            {/* ================================================= */}
            {/* SECURE RESULT */}
            {/* ================================================= */}

            {secureResult && (
                <section
                    style={{
                        border:
                            "1px solid #ccc",
                        padding: "20px",
                        marginBottom:
                            "20px",
                        borderRadius:
                            "8px",
                    }}
                >

                    <h2>
                        /api/secure Result
                    </h2>


                    <pre
                        style={{
                            whiteSpace:
                                "pre-wrap",
                            wordBreak:
                                "break-word",
                        }}
                    >
                        {JSON.stringify(
                            secureResult,
                            null,
                            2
                        )}
                    </pre>

                </section>
            )}


            {/* ================================================= */}
            {/* TOKEN CLAIMS */}
            {/* ================================================= */}

            {tokenClaims && (
                <section
                    style={{
                        border:
                            "1px solid #ccc",
                        padding: "20px",
                        marginBottom:
                            "20px",
                        borderRadius:
                            "8px",
                    }}
                >

                    <h2>
                        Access Token Claims
                    </h2>


                    <pre
                        style={{
                            whiteSpace:
                                "pre-wrap",
                            wordBreak:
                                "break-word",
                        }}
                    >
                        {JSON.stringify(
                            tokenClaims,
                            null,
                            2
                        )}
                    </pre>

                </section>
            )}


            {/* ================================================= */}
            {/* STANDARD MSAL - COMPARISON ONLY */}
            {/* ================================================= */}

            <section
                style={{
                    border:
                        "1px solid #ddd",
                    padding: "20px",
                    marginTop: "30px",
                    borderRadius:
                        "8px",
                }}
            >

                <h2>
                    Standard MSAL Authentication
                </h2>


                <p>
                    This section is retained
                    only for comparison with
                    the Native Authentication
                    flow.
                </p>


                <p>
                    <strong>
                        MSAL account:
                    </strong>{" "}

                    {msalAccount?.username ||
                        "Not signed in"}
                </p>


                <div
                    style={{
                        display:
                            "flex",
                        gap: "10px",
                    }}
                >

                    <button
                        type="button"
                        onClick={
                            handleMsalLogin
                        }
                    >
                        MSAL Login
                    </button>


                    <button
                        type="button"
                        onClick={
                            handleMsalLogout
                        }
                    >
                        MSAL Logout
                    </button>

                </div>

            </section>

        </div>
    );
}


// ============================================================
// APPLICATION ROOT
// ============================================================

function App() {

    return (
        <NativeAuthProvider>

            <BrowserRouter>

                <Routes>

                    <Route
                        path="/"
                        element={
                            <MsalDemoPage />
                        }
                    />

                    <Route
                        path="/login"
                        element={
                            <CustomLoginPage />
                        }
                    />

                    <Route
                        path="/native-login-test"
                        element={
                            <NativeLoginTestPage />
                        }
                    />

                </Routes>

            </BrowserRouter>

        </NativeAuthProvider>
    );
}


export default App;