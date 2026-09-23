
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
    verifyMfa
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
    //
    // The Native Authentication flow stores the completed
    // CustomAuthAccountData in nativeAuthService.js.
    //
    // This allows this page to use the same authentication result that was
    // created by NativeLoginTestPage.
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
    // LOGIN - STANDARD MSAL DEMO
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

        instance.logoutRedirect();
    };


    // =========================================================================
    // GET ACCESS TOKEN
    //
    // IMPORTANT:
    //
    // 1. First try the Native Authentication result.
    //
    // 2. If no Native Authentication result exists, fall back to standard
    //    MSAL authentication.
    //
    // This means your existing application is not broken while we migrate
    // the API calls to the Native Authentication flow.
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

            const data =
                await getPublicData();


            setPublicResult(
                JSON.stringify(
                    data,
                    null,
                    2
                )
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

        }
        finally {

            setLoading(false);
        }
    };


    // =========================================================================
    // TEST NATIVE ACCESS TOKEN
    //
    // This is the first test we should run.
    // It proves that the CustomAuthAccountData returned by Native
    // Authentication can be converted into an API access token.
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

        // Continue with your existing token decoding...

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
    // SECURE API
    //
    // IMPORTANT:
    //
    // The token comes from Native Authentication.
    //
    // The API receives:
    //
    // Authorization: Bearer <Entra access token>
    //
    // The browser also sends:
    //
    // mfa_session=<Redis-backed MFA session>
    //
    // because apiService.js uses credentials: "include".
    // =========================================================================

    const callSecureApi = async () => {

    try {

        setLoading(true);

        setApiTestResult(
            "Acquiring Native Authentication access token..."
        );

        // =============================================================
        // GET ENTRA ACCESS TOKEN
        // =============================================================

        const accessToken =
            await getAccessToken();

        console.log(
            "========== SECURE API TEST =========="
        );

        console.log(
            "Secure API access token acquired."
        );

        console.log(
            "Token length:",
            accessToken?.length
        );

        // =============================================================
        // CALL THE PROTECTED API DIRECTLY
        //
        // The backend is authoritative for MFA state.
        //
        // If mfa_session exists, /api/secure should succeed.
        //
        // If MFA is genuinely required, the API will reject the
        // request and we can then display the MFA challenge.
        // =============================================================

        console.log(
            "========== CALLING /api/secure =========="
        );

        const data =
            await getSecureData(
                accessToken
            );

        console.log(
            "========== SECURE API SUCCESS =========="
        );

        console.log(
            "Secure API response:",
            data
        );

        // =============================================================
        // SUCCESS
        //
        // If we reached here, the backend accepted both:
        //
        // 1. Entra bearer token
        // 2. MFA session
        //
        // Therefore MFA is already satisfied.
        // =============================================================

        setMfaVerified(true);

        setMfaRequired(false);

        setMfaMessage(
            "MFA verification already completed."
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
                "SECURE API TEST PASSED",
                "",
                "Entra access token accepted.",
                "Existing MFA session accepted.",
                "/api/secure returned successfully."
            ].join("\n")
        );

    }
    catch (error) {

        console.error(
            "Secure API error:",
            error
        );

        console.error(
            "Secure API error response:",
            error?.response
        );

        console.error(
            "Secure API status:",
            error?.response?.status
        );

        // =============================================================
        // MFA REQUIRED
        //
        // Your backend should return 401/403 when the MFA session
        // is missing or invalid.
        // =============================================================

        const status =
            error?.response?.status;

        if (
            status === 401 ||
            status === 403
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

            return;
        }

        // =============================================================
        // OTHER API ERROR
        // =============================================================

        setSecureResult(
            `Request failed: ${
                error?.message ||
                "Unknown error"
            }`
        );

        setApiTestResult(
            [
                "SECURE API TEST FAILED",
                "",
                error?.message ||
                "Unable to call /api/secure."
            ].join("\n")
        );

    }
    finally {

        setLoading(false);

    }
};


    // =========================================================================
    // MFA METHOD - UNIFIED
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

            /*
             * This remains here because your existing native SMS/email
             * functionality is still required for future use.
             */

            console.log(
                "Native MFA method selected:",
                methodId
            );

            setMfaMessage(
                "Native MFA method selected."
            );
        };


    // =========================================================================
    // APPLICATION MFA VERIFY
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
                //
                // verifyMfa() should:
                //
                // 1. Send Bearer token
                // 2. Send TOTP code
                // 3. Allow backend to establish Redis-backed mfa_session
                // 4. Return success
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
                // IMPORTANT:
                //
                // Now immediately test the protected endpoint.
                //
                // The browser should automatically send the newly-created
                // mfa_session cookie because apiService.js uses:
                //
                // credentials: "include"
                // =============================================================

                console.log(
                    "========== TESTING SECURE API AFTER MFA =========="
                );


                const data =
                    await getSecureData(
                        accessToken
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
                        "Redis-backed MFA session should now exist.",
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


                setMfaMessage(
                    error?.response?.data ||
                    error?.message ||
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
    // MY CLAIMS API
    //
    // This is the important test for the Entra access token.
    //
    // It does NOT require the custom MFA session if your backend /api/me
    // only requires [Authorize] + [RequiredScope].
    // =========================================================================

    const callMeApi = async () => {

        try {

            setLoading(true);


            console.log(
                "========== CALLING /api/me =========="
            );


            const accessToken =
                await getAccessToken();


            const data =
                await getMe(
                    accessToken
                );


            console.log(
                "========== /api/me RESULT =========="
            );

            console.log(
                data
            );


            setUserInfo(data);


            setApiTestResult(
                [
                    "/api/me TEST PASSED",
                    "",
                    "Entra access token was accepted by the API."
                ].join("\n")
            );


        }
        catch (error) {

            console.error(
                "/api/me error:",
                error
            );


            setApiTestResult(
                [
                    "/api/me TEST FAILED",
                    "",
                    error?.message ||
                    "Unable to call /api/me."
                ].join("\n")
            );

        }
        finally {

            setLoading(false);
        }
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
                        PUBLIC API
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


                    {/* ========================================================
                        NATIVE TOKEN TEST
                    ========================================================= */}

                    <button
                        onClick={testNativeAccessToken}
                        disabled={loading}
                    >
                        Test Native Access Token
                    </button>


                    {" "}


                    {/* ========================================================
                        /api/me
                    ========================================================= */}

                    <button
                        onClick={callMeApi}
                        disabled={loading}
                    >
                        Test /api/me
                    </button>


                    {" "}


                    {/* ========================================================
                        /api/secure
                    ========================================================= */}

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



// import React, { useState, useEffect } from "react";

// import {
//     BrowserRouter,
//     Routes,
//     Route,
//     Link
// } from "react-router-dom";

// import { useMsal } from "@azure/msal-react";
// import { jwtDecode } from "jwt-decode";
// import { loginRequest } from "./auth/msalConfig";
// import CustomLoginPage from "./pages/CustomLoginPage";
// import MfaChallenge from "./components/MfaChallenge";
// import {
//     getPublicData,
//     getSecureData,
//     getMe,
//     getMfaStatus,
//     verifyMfa
// } from "./apiService";

// import {
//     startSignIn,
//     submitPassword,
//     submitVerificationCode,
//     clearSignInState,
//     submitMfaChallenge,
//     requestMfaChallenge,
//     getCurrentUser,
//     getCurrentSignInState
// } from "./auth/nativeAuthService";

// import NativeLoginTestPage from "./pages/NativeLoginTestPage";
// import {
//     getMfaConfiguration
// } from "./services/mfaConfigurationService";

// import UnifiedMfaChallenge
//     from "./components/UnifiedMfaChallenge";

// function MsalDemoPage() {

//     const { instance, accounts } = useMsal();

//     const [publicResult, setPublicResult] = useState("");
//     const [secureResult, setSecureResult] = useState("");
//     const [userInfo, setUserInfo] = useState(null);
//     const [token, setToken] = useState("");
//     const [mfaRequired, setMfaRequired] = useState(false);
//     const [mfaVerified, setMfaVerified] = useState(false);
//     const [mfaMessage, setMfaMessage] = useState("");
//     const [mfaMode, setMfaMode] =  useState("Existing");

//     console.log(
//         "RENDER:",
//         {
//             mfaRequired,
//             mfaVerified,
//             mfaMessage
//         }
//     );
//     // ============================================================
//     // LOGIN
//     // ============================================================

//     const login = () =>
//         instance.loginRedirect({
//             ...loginRequest,
//             prompt: "login"
//         });


//     // ============================================================
//     // LOGOUT
//     // ============================================================

//     const logout = () => {
//         instance.logoutRedirect();
//     };


//     // ============================================================
//     // GET ACCESS TOKEN + DIAGNOSTIC CLAIMS
//     // ============================================================

//     const getAccessToken = async () => {

//         const account =
//             instance.getActiveAccount() ||
//             accounts[0];

//         if (!account) {

//             console.error(
//                 "No active MSAL account found."
//             );

//             throw new Error(
//                 "No active account found. Please log in again."
//             );
//         }


//         console.log(
//             "========== ACCOUNT =========="
//         );

//         console.log(account);


//         // ========================================================
//         // ID TOKEN CLAIMS
//         // ========================================================

//         console.log(
//             "========== ID TOKEN CLAIMS =========="
//         );

//         console.log(
//             account.idTokenClaims
//         );


//         // ========================================================
//         // AMR - AUTHENTICATION METHODS REFERENCES
//         // ========================================================

//         console.log(
//             "========== AMR =========="
//         );

//         console.log(
//             "AMR VALUE:",
//             JSON.stringify(
//                 account.idTokenClaims?.amr
//             )
//         );


//         // ========================================================
//         // ACQUIRE ACCESS TOKEN
//         // ========================================================

//         const result =
//             await instance.acquireTokenSilent({
//                 ...loginRequest,
//                 account
//             });


//         // Do NOT print the complete access token.
//         // It is a bearer credential.

//         setToken(
//             result.accessToken
//         );


//         // ========================================================
//         // DECODE ACCESS TOKEN
//         // ========================================================

//         const decoded =
//             jwtDecode(result.accessToken);


//         console.log(
//             "========== ACCESS TOKEN CLAIMS =========="
//         );

//         console.log(
//             "Audience:",
//             decoded.aud
//         );

//         console.log(
//             "Issuer:",
//             decoded.iss
//         );

//         console.log(
//             "Tenant:",
//             decoded.tid
//         );

//         console.log(
//             "Scope:",
//             decoded.scp
//         );

//         console.log(
//             "Subject:",
//             decoded.sub
//         );

//         console.log(
//             "OID:",
//             decoded.oid
//         );


//         // ========================================================
//         // ACCESS TOKEN AMR - IF PRESENT
//         // ========================================================

//         console.log(
//             "Access Token AMR:",
//             JSON.stringify(
//                 decoded.amr
//             )
//         );


//         return result.accessToken;
//     };


//     // ============================================================
//     // PUBLIC API
//     // ============================================================

//     const callPublicApi = async () => {

//         const data =
//             await getPublicData();

//         setPublicResult(
//             JSON.stringify(
//                 data,
//                 null,
//                 2
//             )
//         );
//     };

//     const loadMfaConfiguration = async () => {
//     try {
//         const configuration =
//             await getMfaConfiguration();

//         console.log(
//             "========== MFA CONFIGURATION =========="
//         );

//         console.log(
//             "Configuration:",
//             configuration
//         );

//         console.log(
//             "Mode:",
//             configuration?.mode
//         );

//         setMfaMode(
//             configuration?.mode || "Existing"
//         );
//     }
//     catch (error) {
//         console.error(
//             "Unable to load MFA configuration:",
//             error
//         );

//         setMfaMode("Existing");
//     }
// };

// useEffect(() => {
//     loadMfaConfiguration();
// }, []);

//     // ============================================================
//     // SECURE API
//     // ============================================================

//     const callSecureApi = async () => {

//         try {

//             const token =
//                 await getAccessToken();

//             // ====================================================
//             // CHECK APPLICATION MFA STATUS
//             // ====================================================

//             const mfaStatus =
//                 await getMfaStatus(token);

//             console.log(
//                 "MFA STATUS:",
//                 mfaStatus
//             );

//             // ====================================================
//             // MFA IS REQUIRED BUT NOT YET VERIFIED
//             // ====================================================

//             if (
//                 mfaStatus.enrolled &&
//                 mfaStatus.enabled &&
//                 !mfaVerified
//             ) {

//                 console.log(
//                     "========== MFA REQUIRED =========="
//                 );

//                 console.log(
//                     "mfaStatus.enrolled:",
//                     mfaStatus.enrolled
//                 );

//                 console.log(
//                     "mfaStatus.enabled:",
//                     mfaStatus.enabled
//                 );

//                 console.log(
//                     "mfaVerified:",
//                     mfaVerified
//                 );

//                 setMfaRequired(true);

//                 setMfaMessage(
//                     "Enter the 6-digit code from Microsoft Authenticator."
//                 );

//                 return;
//             }

//             // ====================================================
//             // MFA COMPLETE - CALL SECURE API
//             // ====================================================

//             const data =
//                 await getSecureData(token);

//             setSecureResult(
//                 JSON.stringify(
//                     data,
//                     null,
//                     2
//                 )
//             );

//         }
//         catch (error) {

//             console.error(
//                 "Secure API error:",
//                 error
//             );

//             setSecureResult(
//                 `Request failed: ${
//                     error.response?.status ||
//                     error.message
//                 }`
//             );
//         }
//     };
//     const handleUnifiedMfaMethod = async (method) => {

//         console.log(
//             "========== UNIFIED MFA METHOD =========="
//         );

//         console.log(
//             "Selected method:",
//             method
//         );

//         if (method === "totp") {

//             setMfaMessage(
//                 "Enter the 6-digit code from Microsoft Authenticator."
//             );

//             return;
//         }

//         if (method === "email") {

//             setMfaMessage(
//                 "Email verification will be implemented next."
//             );

//             return;
//         }

//         if (method === "sms") {

//             setMfaMessage(
//                 "SMS verification will be implemented next."
//             );

//             return;
//         }
//     };
//     const handleNativeMfaMethod = async (methodId) => {
//     try {
//         setMfaMessage("Sending verification code...");

//         const result =
//             await requestMfaChallenge(methodId);

//         console.log(
//             "NATIVE MFA METHOD RESULT:",
//             result
//         );

//         if (!result.success) {
//             setMfaMessage(
//                 result.message ||
//                 "Unable to start MFA verification."
//             );

//             return;
//         }

//         if (result.step === "mfaCode") {
//             setMfaMessage(
//                 result.message ||
//                 "A verification code has been sent."
//             );
//         }
//     }
//     catch (error) {
//         console.error(
//             "Native MFA method error:",
//             error
//         );

//         setMfaMessage(
//             error?.message ||
//             "Unable to start MFA verification."
//         );
//     }
// };

//     const handleMfaVerify = async (code) => {
//         try {
//             const token = await getAccessToken();

//             setMfaMessage("Verifying MFA...");

//             const result = await verifyMfa(
//                 token,
//                 code
//             );

//             console.log(
//                 "MFA VERIFY RESULT:",
//                 result
//             );

//             setMfaVerified(true);
//             setMfaRequired(false);
//             setMfaMessage(
//                 "MFA verification successful."
//             );

//             const data =
//                 await getSecureData(token);

//             setSecureResult(
//                 JSON.stringify(
//                     data,
//                     null,
//                     2
//                 )
//             );
//         }
//         catch (error) {
//             console.error(
//                 "MFA verification error:",
//                 error
//             );

//             setMfaVerified(false);

//             setMfaMessage(
//                 error.response?.data ||
//                 "MFA verification failed."
//             );
//         }
//     };
//     // ============================================================
//     // MY CLAIMS API
//     // ============================================================

//     const callMeApi = async () => {

//         const token =
//             await getAccessToken();

//         const data =
//             await getMe(token);

//         setUserInfo(data);
//     };


//     // ============================================================
//     // UI
//     // ============================================================

//     return (

//         <div
//             style={{
//                 padding: "20px"
//             }}
//         >

//             <h1>
//                 Microsoft Entra External ID Demo
//             </h1>


//             <div
//                 style={{
//                     marginBottom: "20px"
//                 }}
//             >

//                 <Link to="/native-login-test">

//                     <button>
//                         Native Authentication Test
//                     </button>

//                 </Link>

//             </div>


//             {accounts.length === 0 ? (

//                 <button onClick={login}>
//                     Login
//                 </button>

//             ) : (

//                 <>

//                     <h3>
//                         Logged in as:
//                         {" "}
//                         {accounts[0].username}
//                     </h3>


//                     <button onClick={logout}>
//                         Logout
//                     </button>


//                     <hr />


//                     <button
//                         onClick={callPublicApi}
//                     >
//                         Call Public API
//                     </button>


//                     <button
//                         onClick={callSecureApi}
//                     >
//                         Call Secure API
//                     </button>
//                     <div
//                         style={{
//                             marginTop: "20px",
//                             padding: "10px",
//                             background: "#eee"
//                         }}
//                     >
//                     </div>
//                     {mfaRequired && (
//                         mfaMode === "Unified" ? (

//                             <UnifiedMfaChallenge
//                                 totpEnabled={true}
//                                 emailEnabled={true}
//                                 smsEnabled={true}
//                                 onSelectMethod={handleUnifiedMfaMethod}
//                                 onVerify={handleMfaVerify}
//                                 onCancel={() => {
//                                     setMfaRequired(false);
//                                     setMfaMessage("");
//                                 }}
//                             />

//                         ) : (

//                             <MfaChallenge
//                                 methods={{
//                                     totp: true,
//                                     email: true,
//                                     sms: true
//                                 }}
//                                 defaultMethod="totp"
//                                 message={mfaMessage}
//                                 onVerifyTotp={handleMfaVerify}
//                                 onSelectEmail={() => {
//                                     console.log(
//                                         "Email MFA selected"
//                                     );
//                                 }}
//                                 onSelectSms={() => {
//                                     console.log(
//                                         "SMS MFA selected"
//                                     );
//                                 }}
//                                 onCancel={() => {
//                                     setMfaRequired(false);
//                                     setMfaMessage("");
//                                 }}
//                             />

//                         )
//                     )}

//                     <button
//                         onClick={callMeApi}
//                     >
//                         Get My Claims
//                     </button>


//                     <hr />


//                     <h3>
//                         Public API Result
//                     </h3>

//                     <pre>
//                         {publicResult}
//                     </pre>


//                     <h3>
//                         Secure API Result
//                     </h3>

//                     <pre>
//                         {secureResult}
//                     </pre>


//                     <h3>
//                         User Claims
//                     </h3>

//                     <pre>
//                         {
//                             JSON.stringify(
//                                 userInfo,
//                                 null,
//                                 2
//                             )
//                         }
//                     </pre>

//                     <div
//                         style={{
//                             marginTop: "20px",
//                             padding: "10px",
//                             background: "#f5f5f5"
//                         }}
//                     >
//                         MFA Mode: {mfaMode}
//                     </div>
//                     <h3>
//                         Access Token
//                     </h3>

//                     <textarea
//                         rows={12}
//                         cols={120}
//                         value={token}
//                         readOnly
//                     />

//                 </>

//             )}

//         </div>
//     );
// }


// // ================================================================
// // APP
// // ================================================================

// function App() {

//     return (

//         <BrowserRouter>

//             <Routes>

//                 <Route
//                     path="/"
//                     element={<MsalDemoPage />}
//                 />

//                 <Route
//                     path="/native-login-test"
//                     element={<NativeLoginTestPage />}
//                 />

//                 <Route
//                     path="/login"
//                     element={<CustomLoginPage />}
//                 />

//             </Routes>

//         </BrowserRouter>
//     );
// }


// export default App;
