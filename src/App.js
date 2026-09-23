import React, { useState, useEffect } from "react";

import {
    BrowserRouter,
    Routes,
    Route,
    Link
} from "react-router-dom";

import { useMsal } from "@azure/msal-react";
import { jwtDecode } from "jwt-decode";

import { loginRequest } from "./auth/msalConfig";

import CustomLoginPage from "./pages/CustomLoginPage";
import MfaChallenge from "./components/MfaChallenge";

import {
    getPublicData,
    getSecureData,
    getMe,
    getMfaStatus,
    verifyMfa,
    callProtectedApi
} from "./apiService";

import {
    getCurrentUser,
    getCurrentSignInState,
    getCompletedAuthenticationResult,
    getNativeAccessToken
} from "./auth/nativeAuthService";

import NativeLoginTestPage from "./pages/NativeLoginTestPage";

import {
    getMfaConfiguration
} from "./services/mfaConfigurationService";

import UnifiedMfaChallenge
    from "./components/UnifiedMfaChallenge";


// ============================================================================
// MsalDemoPage
// ============================================================================

function MsalDemoPage() {

    const { instance, accounts } = useMsal();


    // =========================================================================
    // STATE
    // =========================================================================

    const [publicResult, setPublicResult] = useState("");

    const [secureResult, setSecureResult] = useState("");

    const [userInfo, setUserInfo] = useState(null);

    const [token, setToken] = useState("");

    const [tokenSource, setTokenSource] = useState("");

    const [tokenClaims, setTokenClaims] = useState(null);

    const [mfaRequired, setMfaRequired] =
        useState(false);

    const [mfaVerified, setMfaVerified] =
        useState(false);

    const [mfaMessage, setMfaMessage] =
        useState("");

    const [mfaMode, setMfaMode] =
        useState("Existing");

    const [nativeAuthenticationAvailable, setNativeAuthenticationAvailable] =
        useState(false);

    const [nativeAccount, setNativeAccount] =
        useState(null);

    const [apiTestResult, setApiTestResult] =
        useState("");

    const [loading, setLoading] =
        useState(false);


    console.log(
        "RENDER:",
        {
            mfaRequired,
            mfaVerified,
            mfaMessage,
            tokenSource,
            nativeAuthenticationAvailable
        }
    );


    // =========================================================================
    // CHECK NATIVE AUTHENTICATION STATE
    // =========================================================================

    const checkNativeAuthentication = async () => {

        try {

            const authenticationResult =
                getCompletedAuthenticationResult();

            if (!authenticationResult) {

                console.log(
                    "No completed Native Authentication result found."
                );

                setNativeAuthenticationAvailable(false);
                setNativeAccount(null);

                return null;
            }


            console.log(
                "========== NATIVE AUTHENTICATION RESULT =========="
            );

            console.log(
                authenticationResult
            );


            const account =
                authenticationResult?.account ||
                authenticationResult?.data?.account ||
                null;


            setNativeAuthenticationAvailable(true);

            setNativeAccount(account);


            console.log(
                "Native authentication is available."
            );

            console.log(
                "Native account:",
                account
            );


            return authenticationResult;

        }
        catch (error) {

            console.error(
                "Unable to read Native Authentication state:",
                error
            );

            setNativeAuthenticationAvailable(false);
            setNativeAccount(null);

            return null;
        }
    };


    // =========================================================================
    // STANDARD MSAL LOGIN
    // =========================================================================

    const login = () =>
        instance.loginRedirect({
            ...loginRequest,
            prompt: "login"
        });


    // =========================================================================
    // LOGOUT
    // =========================================================================

    const logout = () => {

        setToken("");
        setTokenClaims(null);
        setTokenSource("");
        setUserInfo(null);
        setSecureResult("");
        setApiTestResult("");
        setMfaVerified(false);
        setMfaRequired(false);
        setMfaMessage("");

        instance.logoutRedirect();
    };


    // =========================================================================
    // GET ACCESS TOKEN
    //
    // Native Authentication is now the source of the API access token.
    //
    // This function:
    //
    // 1. Gets the completed CustomAuthAccountData.
    // 2. Converts it into an Entra API access token.
    // 3. Stores diagnostic information only.
    //
    // The complete bearer token is NOT displayed.
    // =========================================================================

    const getAccessToken = async () => {

        console.log(
            "========== GET NATIVE ACCESS TOKEN =========="
        );


        const authenticationResult =
            getCompletedAuthenticationResult();


        console.log(
            "Completed Native Authentication Result:",
            authenticationResult
        );


        if (!authenticationResult) {

            throw new Error(
                "No completed Native Authentication session is available. " +
                "Please sign in again through /login and complete MFA."
            );
        }


        const accessToken =
            await getNativeAccessToken(
                authenticationResult
            );


        if (
            !accessToken ||
            typeof accessToken !== "string"
        ) {

            throw new Error(
                "Native Authentication did not return a valid access token."
            );
        }


        console.log(
            "========== NATIVE ACCESS TOKEN ACQUIRED =========="
        );

        console.log(
            "Token length:",
            accessToken.length
        );


        setToken(accessToken);

        setTokenSource(
            "Microsoft Entra External ID Native Authentication"
        );


        // ==============================================================
        // DECODE TOKEN FOR DIAGNOSTICS
        // ==============================================================

        try {

            const decoded =
                jwtDecode(accessToken);


            console.log(
                "========== ACCESS TOKEN CLAIMS =========="
            );

            console.log(
                "Audience:",
                decoded.aud
            );

            console.log(
                "Issuer:",
                decoded.iss
            );

            console.log(
                "Tenant:",
                decoded.tid
            );

            console.log(
                "Scope:",
                decoded.scp
            );

            console.log(
                "Subject:",
                decoded.sub
            );

            console.log(
                "OID:",
                decoded.oid
            );

            console.log(
                "AMR:",
                decoded.amr
            );


            setTokenClaims(decoded);

        }
        catch (error) {

            console.error(
                "Unable to decode access token:",
                error
            );

            setTokenClaims(null);
        }


        return accessToken;
    };


    // =========================================================================
    // CHECK NATIVE AUTH ON PAGE LOAD
    // =========================================================================

    useEffect(() => {

        checkNativeAuthentication();

    }, []);


    // =========================================================================
    // PAGE NAVIGATION DIAGNOSTIC
    // =========================================================================

    useEffect(() => {

        const navigation =
            performance.getEntriesByType("navigation")[0];


        console.log(
            "========== PAGE NAVIGATION TYPE =========="
        );

        console.log(
            "Navigation type:",
            navigation?.type
        );

        console.log(
            "Current URL:",
            window.location.href
        );

        console.log(
            "=========================================="
        );

    }, []);


    // =========================================================================
    // LOAD MFA CONFIGURATION
    // =========================================================================

    const loadMfaConfiguration = async () => {

        try {

            const configuration =
                await getMfaConfiguration();


            console.log(
                "========== MFA CONFIGURATION =========="
            );

            console.log(
                "Configuration:",
                configuration
            );

            console.log(
                "Mode:",
                configuration?.mode
            );


            setMfaMode(
                configuration?.mode ||
                "Existing"
            );

        }
        catch (error) {

            console.error(
                "Unable to load MFA configuration:",
                error
            );

            setMfaMode(
                "Existing"
            );
        }
    };


    useEffect(() => {

        loadMfaConfiguration();

    }, []);


    // =========================================================================
    // PUBLIC API
    // =========================================================================

    const callPublicApi = async () => {

        try {

            setLoading(true);

            setApiTestResult(
                "Calling public API..."
            );


            const data =
                await getPublicData();


            setPublicResult(
                JSON.stringify(
                    data,
                    null,
                    2
                )
            );


            setApiTestResult(
                [
                    "PUBLIC API TEST PASSED",
                    "",
                    "/api/public returned successfully."
                ].join("\n")
            );

        }
        catch (error) {

            console.error(
                "Public API error:",
                error
            );

            setPublicResult(
                `Request failed: ${
                    error?.message ||
                    "Unknown error"
                }`
            );

            setApiTestResult(
                [
                    "PUBLIC API TEST FAILED",
                    "",
                    error?.message ||
                    "Unable to call /api/public."
                ].join("\n")
            );

        }
        finally {

            setLoading(false);
        }
    };


    // =========================================================================
    // TEST NATIVE ACCESS TOKEN
    // =========================================================================

    const testNativeAccessToken = async () => {

        try {

            setLoading(true);

            setApiTestResult(
                "Acquiring Native Authentication access token..."
            );


            const authenticationResult =
                getCompletedAuthenticationResult();


            console.log(
                "========== TEST NATIVE ACCESS TOKEN =========="
            );

            console.log(
                "Completed authentication result:",
                authenticationResult
            );


            if (!authenticationResult) {

                throw new Error(
                    "No completed Native Authentication result was found. " +
                    "Complete Native Authentication and Microsoft Authenticator MFA first."
                );
            }


            const accessToken =
                await getNativeAccessToken(
                    authenticationResult
                );


            if (
                !accessToken ||
                typeof accessToken !== "string"
            ) {

                throw new Error(
                    "Native Authentication did not return a valid access token."
                );
            }


            let decoded = null;


            try {

                decoded =
                    jwtDecode(accessToken);

            }
            catch (error) {

                console.error(
                    "Token decode error:",
                    error
                );
            }


            setToken(accessToken);

            setTokenSource(
                "Microsoft Entra External ID Native Authentication"
            );

            setTokenClaims(decoded);


            setApiTestResult(
                [
                    "NATIVE ACCESS TOKEN TEST PASSED",
                    "",
                    `Token length: ${accessToken.length}`,
                    `Audience: ${decoded?.aud || "N/A"}`,
                    `Tenant: ${decoded?.tid || "N/A"}`,
                    `Scope: ${decoded?.scp || "N/A"}`,
                    `OID: ${decoded?.oid || "N/A"}`,
                    `AMR: ${
                        JSON.stringify(
                            decoded?.amr || null
                        )
                    }`
                ].join("\n")
            );


            console.log(
                "========== NATIVE TOKEN TEST PASSED =========="
            );

            console.log(
                "Token length:",
                accessToken.length
            );

            console.log(
                "Claims:",
                decoded
            );

        }
        catch (error) {

            console.error(
                "Native access token test failed:",
                error
            );


            setApiTestResult(
                [
                    "NATIVE ACCESS TOKEN TEST FAILED",
                    "",
                    error?.message ||
                    "Unable to acquire Native Authentication access token."
                ].join("\n")
            );

        }
        finally {

            setLoading(false);
        }
    };


    // =========================================================================
    // GENERIC PROTECTED API
    //
    // This is the new central test.
    //
    // The page gets the raw Entra access token.
    //
    // apiService.js then takes care of:
    //
    // Authorization: Bearer <token>
    //
    // AND:
    //
    // withCredentials: true
    //
    // which allows the MFA session cookie to be sent.
    // =========================================================================

    const callProtectedEndpoint = async (url) => {

        try {

            setLoading(true);

            setApiTestResult(
                `Calling ${url}...`
            );


            // ==============================================================
            // GET ENTRA ACCESS TOKEN
            // ==============================================================

            const accessToken =
                await getAccessToken();


            console.log(
                "========== PROTECTED API TEST =========="
            );

            console.log(
                "Endpoint:",
                url
            );

            console.log(
                "Access token acquired."
            );

            console.log(
                "Token length:",
                accessToken?.length
            );


            // ==============================================================
            // CALL API THROUGH THE COMMON API SERVICE
            // ==============================================================

            const data =
                await callProtectedApi(
                    accessToken,
                    url
                );


            console.log(
                "========== PROTECTED API SUCCESS =========="
            );

            console.log(
                "Response:",
                data
            );


            if (url === "/api/secure") {

                setSecureResult(
                    JSON.stringify(
                        data,
                        null,
                        2
                    )
                );

                setMfaVerified(true);

                setMfaRequired(false);

                setMfaMessage(
                    "MFA verification already completed."
                );

            }


            if (url === "/api/me") {

                setUserInfo(data);

            }


            setApiTestResult(
                [
                    "PROTECTED API TEST PASSED",
                    "",
                    `Endpoint: ${url}`,
                    "Entra access token accepted.",
                    "Request completed successfully."
                ].join("\n")
            );


            return data;

        }
        catch (error) {

            console.error(
                "Protected API error:",
                error
            );

            console.error(
                "Protected API response:",
                error?.response
            );

            console.error(
                "Protected API status:",
                error?.response?.status
            );


            const status =
                error?.response?.status;


            // ==============================================================
            // MFA REQUIRED
            // ==============================================================

            if (
                url === "/api/secure" &&
                (
                    status === 401 ||
                    status === 403
                )
            ) {

                console.log(
                    "========== MFA REQUIRED BY BACKEND =========="
                );


                setMfaRequired(true);

                setMfaVerified(false);

                setMfaMessage(
                    "Enter the 6-digit code from Microsoft Authenticator."
                );


                setSecureResult(
                    "Application MFA is required before /api/secure can be called."
                );


                setApiTestResult(
                    [
                        "MFA REQUIRED",
                        "",
                        "The secure API requires MFA.",
                        "Please complete Microsoft Authenticator verification."
                    ].join("\n")
                );


                return null;
            }


            setApiTestResult(
                [
                    "PROTECTED API TEST FAILED",
                    "",
                    `Endpoint: ${url}`,
                    error?.response?.data
                        ? JSON.stringify(
                            error.response.data
                        )
                        : error?.message ||
                          "Unable to call protected API."
                ].join("\n")
            );


            throw error;

        }
        finally {

            setLoading(false);

        }
    };


    // =========================================================================
    // SECURE API
    // =========================================================================

    const callSecureApi = async () => {

        try {

            await callProtectedEndpoint(
                "/api/secure"
            );

        }
        catch (error) {

            // Error already handled by callProtectedEndpoint().
            console.error(
                "Secure API test failed:",
                error
            );
        }
    };


    // =========================================================================
    // MY CLAIMS API
    // =========================================================================

    const callMeApi = async () => {

        try {

            await callProtectedEndpoint(
                "/api/me"
            );

        }
        catch (error) {

            console.error(
                "/api/me test failed:",
                error
            );
        }
    };


    // =========================================================================
    // APPLICATION MFA VERIFY
    //
    // IMPORTANT:
    //
    // This deliberately uses getAccessToken() directly because the user
    // is verifying MFA at this point.
    //
    // Once MFA succeeds, the backend establishes mfa_session.
    //
    // The subsequent /api/secure call uses callProtectedApi().
    // =========================================================================

    const handleMfaVerify =
        async (code) => {

            try {

                setLoading(true);

                setMfaMessage(
                    "Verifying MFA..."
                );


                // =============================================================
                // GET CURRENT NATIVE ENTRA TOKEN
                // =============================================================

                const accessToken =
                    await getAccessToken();


                console.log(
                    "========== VERIFYING APPLICATION MFA =========="
                );


                // =============================================================
                // VERIFY AUTHENTICATOR CODE
                // =============================================================

                const result =
                    await verifyMfa(
                        accessToken,
                        code
                    );


                console.log(
                    "MFA VERIFY RESULT:",
                    result
                );


                // =============================================================
                // MFA SUCCESS
                // =============================================================

                setMfaVerified(true);

                setMfaRequired(false);

                setMfaMessage(
                    "MFA verification successful."
                );


                // =============================================================
                // TEST SECURE API THROUGH COMMON API SERVICE
                // =============================================================

                console.log(
                    "========== TESTING SECURE API AFTER MFA =========="
                );


                const data =
                    await callProtectedApi(
                        accessToken,
                        "/api/secure"
                    );


                console.log(
                    "SECURE API AFTER MFA:",
                    data
                );


                setSecureResult(
                    JSON.stringify(
                        data,
                        null,
                        2
                    )
                );


                setApiTestResult(
                    [
                        "APPLICATION MFA TEST PASSED",
                        "",
                        "Microsoft Authenticator code accepted.",
                        "MFA session established.",
                        "/api/secure returned successfully."
                    ].join("\n")
                );

            }
            catch (error) {

                console.error(
                    "MFA verification error:",
                    error
                );


                setMfaVerified(false);


                const responseMessage =
                    error?.response?.data;


                setMfaMessage(
                    typeof responseMessage === "string"
                        ? responseMessage
                        : responseMessage
                            ? JSON.stringify(
                                responseMessage
                            )
                            : error?.message ||
                              "MFA verification failed."
                );


                setApiTestResult(
                    [
                        "APPLICATION MFA TEST FAILED",
                        "",
                        error?.message ||
                        "MFA verification failed."
                    ].join("\n")
                );

            }
            finally {

                setLoading(false);
            }
        };


    // =========================================================================
    // UNIFIED MFA METHOD
    // =========================================================================

    const handleUnifiedMfaMethod =
        async (method) => {

            console.log(
                "========== UNIFIED MFA METHOD =========="
            );

            console.log(
                "Selected method:",
                method
            );


            if (method === "totp") {

                setMfaMessage(
                    "Enter the 6-digit code from Microsoft Authenticator."
                );

                return;
            }


            if (method === "email") {

                setMfaMessage(
                    "Email verification will be implemented next."
                );

                return;
            }


            if (method === "sms") {

                setMfaMessage(
                    "SMS verification will be implemented next."
                );

                return;
            }
        };


    // =========================================================================
    // NATIVE MFA METHOD
    // =========================================================================

    const handleNativeMfaMethod =
        async (methodId) => {

            console.log(
                "Native MFA method selected:",
                methodId
            );

            setMfaMessage(
                "Native MFA method selected."
            );
        };


    // =========================================================================
    // UI
    // =========================================================================

    return (

        <div
            style={{
                padding: "20px"
            }}
        >

            <h1>
                Microsoft Entra External ID Demo
            </h1>


            <div
                style={{
                    marginBottom: "20px"
                }}
            >

                <Link to="/native-login-test">

                    <button>
                        Native Authentication Test
                    </button>

                </Link>

            </div>


            {/* ================================================================
                AUTHENTICATION STATUS
            ================================================================= */}

            <div
                style={{
                    marginBottom: "20px",
                    padding: "15px",
                    background: "#f5f5f5",
                    border: "1px solid #ddd"
                }}
            >

                <h3>
                    Authentication Status
                </h3>


                <p>
                    <strong>
                        Native Authentication:
                    </strong>

                    {" "}

                    {nativeAuthenticationAvailable
                        ? "Available"
                        : "Not available"}
                </p>


                {nativeAccount && (

                    <p>
                        <strong>
                            Native User:
                        </strong>

                        {" "}

                        {
                            nativeAccount.username ||
                            "Authenticated user"
                        }
                    </p>

                )}


                <p>
                    <strong>
                        Token Source:
                    </strong>

                    {" "}

                    {tokenSource || "None"}
                </p>


                <p>
                    <strong>
                        Application MFA:
                    </strong>

                    {" "}

                    {mfaVerified
                        ? "Verified"
                        : "Not verified"}
                </p>


                <p>
                    <strong>
                        MFA Mode:
                    </strong>

                    {" "}

                    {mfaMode}
                </p>

            </div>


            {/* ================================================================
                STANDARD MSAL LOGIN
            ================================================================= */}

            {!nativeAuthenticationAvailable && accounts.length === 0 ? (

                <button
                    onClick={login}
                    disabled={loading}
                >
                    Login
                </button>

            ) : (

                <>

                    {/* ========================================================
                        STANDARD MSAL ACCOUNT
                    ========================================================= */}

                    {accounts.length > 0 && (

                        <>

                            <h3>
                                Logged in as:
                                {" "}
                                {accounts[0].username}
                            </h3>


                            <button
                                onClick={logout}
                                disabled={loading}
                            >
                                Logout
                            </button>

                        </>

                    )}


                    <hr />


                    {/* ========================================================
                        API TESTS
                    ========================================================= */}

                    <h3>
                        API Tests
                    </h3>


                    <button
                        onClick={callPublicApi}
                        disabled={loading}
                    >
                        Call Public API
                    </button>


                    {" "}


                    <button
                        onClick={testNativeAccessToken}
                        disabled={loading}
                    >
                        Test Native Access Token
                    </button>


                    {" "}


                    <button
                        onClick={callMeApi}
                        disabled={loading}
                    >
                        Test /api/me
                    </button>


                    {" "}


                    <button
                        onClick={callSecureApi}
                        disabled={loading}
                    >
                        Test /api/secure
                    </button>


                    {loading && (

                        <span
                            style={{
                                marginLeft: "10px"
                            }}
                        >
                            Working...
                        </span>

                    )}


                    {/* ========================================================
                        MFA
                    ========================================================= */}

                    {mfaRequired && (

                        <div
                            style={{
                                marginTop: "20px"
                            }}
                        >

                            {mfaMode === "Unified" ? (

                                <UnifiedMfaChallenge
                                    totpEnabled={true}
                                    emailEnabled={true}
                                    smsEnabled={true}
                                    onSelectMethod={
                                        handleUnifiedMfaMethod
                                    }
                                    onVerify={
                                        handleMfaVerify
                                    }
                                    onCancel={() => {

                                        setMfaRequired(false);

                                        setMfaMessage("");

                                    }}
                                />

                            ) : (

                                <MfaChallenge
                                    methods={{
                                        totp: true,
                                        email: true,
                                        sms: true
                                    }}

                                    defaultMethod="totp"

                                    message={
                                        mfaMessage
                                    }

                                    onVerifyTotp={
                                        handleMfaVerify
                                    }

                                    onSelectEmail={() => {

                                        console.log(
                                            "Email MFA selected"
                                        );

                                    }}

                                    onSelectSms={() => {

                                        console.log(
                                            "SMS MFA selected"
                                        );

                                    }}

                                    onCancel={() => {

                                        setMfaRequired(false);

                                        setMfaMessage("");

                                    }}
                                />

                            )}

                        </div>

                    )}


                    {/* ========================================================
                        MFA MESSAGE
                    ========================================================= */}

                    {mfaMessage && (

                        <div
                            style={{
                                marginTop: "15px",
                                padding: "10px",
                                background: "#fff8dc",
                                border: "1px solid #e0c97f"
                            }}
                        >

                            {mfaMessage}

                        </div>

                    )}


                    {/* ========================================================
                        API TEST RESULT
                    ========================================================= */}

                    {apiTestResult && (

                        <div
                            style={{
                                marginTop: "20px",
                                padding: "15px",
                                background: "#eef6ff",
                                border: "1px solid #b8d8f5",
                                whiteSpace: "pre-wrap"
                            }}
                        >

                            <h3>
                                API Test Result
                            </h3>

                            <pre>
                                {apiTestResult}
                            </pre>

                        </div>

                    )}


                    <hr />


                    {/* ========================================================
                        PUBLIC API RESULT
                    ========================================================= */}

                    <h3>
                        Public API Result
                    </h3>


                    <pre>
                        {publicResult}
                    </pre>


                    {/* ========================================================
                        SECURE API RESULT
                    ========================================================= */}

                    <h3>
                        Secure API Result
                    </h3>


                    <pre>
                        {secureResult}
                    </pre>


                    {/* ========================================================
                        USER CLAIMS
                    ========================================================= */}

                    <h3>
                        User Claims
                    </h3>


                    <pre>
                        {
                            JSON.stringify(
                                userInfo,
                                null,
                                2
                            )
                        }
                    </pre>


                    {/* ========================================================
                        MFA CONFIGURATION
                    ========================================================= */}

                    <div
                        style={{
                            marginTop: "20px",
                            padding: "10px",
                            background: "#f5f5f5"
                        }}
                    >

                        MFA Mode:
                        {" "}
                        {mfaMode}

                    </div>


                    {/* ========================================================
                        ACCESS TOKEN INFORMATION
                    ========================================================= */}

                    <h3>
                        Access Token Information
                    </h3>


                    <p>
                        <strong>
                            Source:
                        </strong>

                        {" "}

                        {tokenSource || "None"}
                    </p>


                    <p>
                        <strong>
                            Token length:
                        </strong>

                        {" "}

                        {token
                            ? token.length
                            : 0}
                    </p>


                    <p>
                        <strong>
                            Audience:
                        </strong>

                        {" "}

                        {tokenClaims?.aud || "N/A"}
                    </p>


                    <p>
                        <strong>
                            Scope:
                        </strong>

                        {" "}

                        {tokenClaims?.scp || "N/A"}
                    </p>


                    <p>
                        <strong>
                            Tenant:
                        </strong>

                        {" "}

                        {tokenClaims?.tid || "N/A"}
                    </p>


                    <p>
                        <strong>
                            Object ID:
                        </strong>

                        {" "}

                        {tokenClaims?.oid || "N/A"}
                    </p>


                    <p>
                        <strong>
                            AMR:
                        </strong>

                        {" "}

                        {
                            JSON.stringify(
                                tokenClaims?.amr ||
                                null
                            )
                        }

                    </p>


                    <p
                        style={{
                            color: "#777"
                        }}
                    >
                        The complete bearer token is deliberately not
                        displayed in the UI.
                    </p>

                </>

            )}

        </div>
    );
}


// ============================================================================
// APP
// ============================================================================

function App() {

    console.log(
        "App document loaded:",
        performance.timeOrigin
    );


    return (

        <BrowserRouter>

            <Routes>

                <Route
                    path="/"
                    element={
                        <MsalDemoPage />
                    }
                />


                <Route
                    path="/native-login-test"
                    element={
                        <NativeLoginTestPage />
                    }
                />


                <Route
                    path="/login"
                    element={
                        <CustomLoginPage />
                    }
                />

            </Routes>

        </BrowserRouter>
    );
}


export default App;