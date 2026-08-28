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
import {
    getPublicData,
    getSecureData,
    getMe
} from "./apiService";

import NativeLoginTestPage from "./pages/NativeLoginTestPage";


function MsalDemoPage() {

    const { instance, accounts } = useMsal();

    const [publicResult, setPublicResult] = useState("");
    const [secureResult, setSecureResult] = useState("");
    const [userInfo, setUserInfo] = useState(null);
    const [token, setToken] = useState("");


    const login = () => {
        instance.loginRedirect(loginRequest);
    };


    const logout = () => {
        instance.logoutRedirect();
    };


    const getAccessToken = async () => {

        const account = accounts[0];

        const result = await instance.acquireTokenSilent({
            ...loginRequest,
            account
        });

        console.log("Access Token:");
        console.log(result.accessToken);

        console.log("Decoded Claims:");
        console.log(result.idTokenClaims);

        setToken(result.accessToken);

        const accessToken = result.accessToken;

        const decoded = jwtDecode(accessToken);

        console.log("Decoded Token:");
        console.log(decoded);

        console.log("Audience:", decoded.aud);
        console.log("Issuer:", decoded.iss);
        console.log("Tenant:", decoded.tid);
        console.log("Scope:", decoded.scp);
        console.log("Subject:", decoded.sub);
        console.log("OID:", decoded.oid);

        return result.accessToken;
    };


    const callPublicApi = async () => {

        const data = await getPublicData();

        setPublicResult(
            JSON.stringify(data, null, 2)
        );
    };


    const callSecureApi = async () => {

        const token = await getAccessToken();

        const data = await getSecureData(token);

        setSecureResult(
            JSON.stringify(data, null, 2)
        );
    };


    const callMeApi = async () => {

        const token = await getAccessToken();

        const data = await getMe(token);

        setUserInfo(data);
    };


    return (
        <div style={{ padding: "20px" }}>

            <h1>
                Microsoft Entra External ID Demo
            </h1>

            <div style={{ marginBottom: "20px" }}>

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