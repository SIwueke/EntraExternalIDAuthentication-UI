
import React, { useState } from "react";

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
    startSignIn,
    submitPassword,
    submitVerificationCode,
    clearSignInState,
    submitMfaChallenge,
    requestMfaChallenge,
    getCurrentUser,
    getCurrentSignInState
} from "./auth/nativeAuthService";

import NativeLoginTestPage from "./pages/NativeLoginTestPage";


function MsalDemoPage() {

    const { instance, accounts } = useMsal();

    const [publicResult, setPublicResult] = useState("");
    const [secureResult, setSecureResult] = useState("");
    const [userInfo, setUserInfo] = useState(null);
    const [token, setToken] = useState("");
    const [mfaRequired, setMfaRequired] = useState(false);
    const [mfaVerified, setMfaVerified] = useState(false);
    const [mfaMessage, setMfaMessage] = useState("");

    console.log(
        "RENDER:",
        {
            mfaRequired,
            mfaVerified,
            mfaMessage
        }
    );

    // ============================================================
    // LOGIN
    // ============================================================

    const login = () =>
        instance.loginRedirect({
            ...loginRequest,
            prompt: "login"
        });


    // ============================================================
    // LOGOUT
    // ============================================================

    const logout = () => {
        instance.logoutRedirect();
    };


    // ============================================================
    // GET ACCESS TOKEN + DIAGNOSTIC CLAIMS
    // ============================================================

    const getAccessToken = async () => {

        const account =
            instance.getActiveAccount() ||
            accounts[0];

        if (!account) {

            console.error(
                "No active MSAL account found."
            );

            throw new Error(
                "No active account found. Please log in again."
            );
        }


        console.log(
            "========== ACCOUNT =========="
        );

        console.log(account);


        // ========================================================
        // ID TOKEN CLAIMS
        // ========================================================

        console.log(
            "========== ID TOKEN CLAIMS =========="
        );

        console.log(
            account.idTokenClaims
        );


        // ========================================================
        // AMR - AUTHENTICATION METHODS REFERENCES
        // ========================================================

        console.log(
            "========== AMR =========="
        );

        console.log(
            "AMR VALUE:",
            JSON.stringify(
                account.idTokenClaims?.amr
            )
        );


        // ========================================================
        // ACQUIRE ACCESS TOKEN
        // ========================================================

        const result =
            await instance.acquireTokenSilent({
                ...loginRequest,
                account
            });


        // Do NOT print the complete access token.
        // It is a bearer credential.

        setToken(
            result.accessToken
        );


        // ========================================================
        // DECODE ACCESS TOKEN
        // ========================================================

        const decoded =
            jwtDecode(result.accessToken);


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


        // ========================================================
        // ACCESS TOKEN AMR - IF PRESENT
        // ========================================================

        console.log(
            "Access Token AMR:",
            JSON.stringify(
                decoded.amr
            )
        );


        return result.accessToken;
    };


    // ============================================================
    // PUBLIC API
    // ============================================================

    const callPublicApi = async () => {

        const data =
            await getPublicData();

        setPublicResult(
            JSON.stringify(
                data,
                null,
                2
            )
        );
    };


    // ============================================================
    // SECURE API
    // ============================================================

    const callSecureApi = async () => {

        try {

            const token =
                await getAccessToken();

            // ====================================================
            // CHECK APPLICATION MFA STATUS
            // ====================================================

            const mfaStatus =
                await getMfaStatus(token);

            console.log(
                "MFA STATUS:",
                mfaStatus
            );

            // ====================================================
            // MFA IS REQUIRED BUT NOT YET VERIFIED
            // ====================================================

            if (
                mfaStatus.enrolled &&
                mfaStatus.enabled &&
                !mfaVerified
            ) {

                console.log(
                    "========== MFA REQUIRED =========="
                );

                console.log(
                    "mfaStatus.enrolled:",
                    mfaStatus.enrolled
                );

                console.log(
                    "mfaStatus.enabled:",
                    mfaStatus.enabled
                );

                console.log(
                    "mfaVerified:",
                    mfaVerified
                );

                setMfaRequired(true);

                setMfaMessage(
                    "Enter the 6-digit code from Microsoft Authenticator."
                );

                return;
            }

            // ====================================================
            // MFA COMPLETE - CALL SECURE API
            // ====================================================

            const data =
                await getSecureData(token);

            setSecureResult(
                JSON.stringify(
                    data,
                    null,
                    2
                )
            );

        }
        catch (error) {

            console.error(
                "Secure API error:",
                error
            );

            setSecureResult(
                `Request failed: ${
                    error.response?.status ||
                    error.message
                }`
            );
        }
    };
    
    const handleNativeMfaMethod = async (methodId) => {
    try {
        setMfaMessage("Sending verification code...");

        const result =
            await requestMfaChallenge(methodId);

        console.log(
            "NATIVE MFA METHOD RESULT:",
            result
        );

        if (!result.success) {
            setMfaMessage(
                result.message ||
                "Unable to start MFA verification."
            );

            return;
        }

        if (result.step === "mfaCode") {
            setMfaMessage(
                result.message ||
                "A verification code has been sent."
            );
        }
    }
    catch (error) {
        console.error(
            "Native MFA method error:",
            error
        );

        setMfaMessage(
            error?.message ||
            "Unable to start MFA verification."
        );
    }
};

    const handleMfaVerify = async (code) => {
        try {
            const token = await getAccessToken();

            setMfaMessage("Verifying MFA...");

            const result = await verifyMfa(
                token,
                code
            );

            console.log(
                "MFA VERIFY RESULT:",
                result
            );

            setMfaVerified(true);
            setMfaRequired(false);
            setMfaMessage(
                "MFA verification successful."
            );

            const data =
                await getSecureData(token);

            setSecureResult(
                JSON.stringify(
                    data,
                    null,
                    2
                )
            );
        }
        catch (error) {
            console.error(
                "MFA verification error:",
                error
            );

            setMfaVerified(false);

            setMfaMessage(
                error.response?.data ||
                "MFA verification failed."
            );
        }
    };
    // ============================================================
    // MY CLAIMS API
    // ============================================================

    const callMeApi = async () => {

        const token =
            await getAccessToken();

        const data =
            await getMe(token);

        setUserInfo(data);
    };


    // ============================================================
    // UI
    // ============================================================

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


            {accounts.length === 0 ? (

                <button onClick={login}>
                    Login
                </button>

            ) : (

                <>

                    <h3>
                        Logged in as:
                        {" "}
                        {accounts[0].username}
                    </h3>


                    <button onClick={logout}>
                        Logout
                    </button>


                    <hr />


                    <button
                        onClick={callPublicApi}
                    >
                        Call Public API
                    </button>


                    <button
                        onClick={callSecureApi}
                    >
                        Call Secure API
                    </button>
                    <div
                        style={{
                            marginTop: "20px",
                            padding: "10px",
                            background: "#eee"
                        }}
                    >
                    </div>
                    {mfaRequired && (
                        <MfaChallenge
                            methods={{
                                totp: true,
                                email: true,
                                sms: true
                            }}
                            defaultMethod="totp"
                            message={mfaMessage}
                            onVerifyTotp={handleMfaVerify}
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

                    <button
                        onClick={callMeApi}
                    >
                        Get My Claims
                    </button>


                    <hr />


                    <h3>
                        Public API Result
                    </h3>

                    <pre>
                        {publicResult}
                    </pre>


                    <h3>
                        Secure API Result
                    </h3>

                    <pre>
                        {secureResult}
                    </pre>


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


                    <h3>
                        Access Token
                    </h3>

                    <textarea
                        rows={12}
                        cols={120}
                        value={token}
                        readOnly
                    />

                </>

            )}

        </div>
    );
}


// ================================================================
// APP
// ================================================================

function App() {

    return (

        <BrowserRouter>

            <Routes>

                <Route
                    path="/"
                    element={<MsalDemoPage />}
                />

                <Route
                    path="/native-login-test"
                    element={<NativeLoginTestPage />}
                />

                <Route
                    path="/login"
                    element={<CustomLoginPage />}
                />

            </Routes>

        </BrowserRouter>
    );
}


export default App;
