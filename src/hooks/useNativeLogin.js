
import {
    useCallback,
    useEffect,
    useRef,
    useState
} from "react";

import {
    startSignIn,
    submitPassword,
    submitVerificationCode,
    clearSignInState,
    submitMfaChallenge,
    requestMfaChallenge,
    getNativeAccessToken,
    getCurrentUser,
    clearCompletedAuthenticationResult,
    storeCompletedAuthenticationResult
} from "../auth/nativeAuthService";

import {
    registerAuthenticationMethod,
    verifyAuthenticationMethod,
    getRegistrationMethods,
    selectPreferredRegistrationMethod
} from "../auth/authRegistrationService";

import {callProtectedApi,} from "../auth/apiService";

const useNativeLogin = () => {

    // ============================================================
    // APPLICATION MFA IDENTIFIERS
    // ============================================================

    const APPLICATION_AUTHENTICATOR_ID =
        "application-authenticator";


    // ============================================================
    // AUTHENTICATION STATE
    // ============================================================

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [code, setCode] = useState("");


    // ============================================================
    // APPLICATION AUTHENTICATION STATE
    //
    // COMPLETE APPLICATION AUTHENTICATION:
    //
    // Entra password authentication
    //          +
    // Application Microsoft Authenticator TOTP
    //
    // The Entra authentication result remains stored separately.
    // It is required to obtain an API access token.
    // ============================================================

    const [
        isApplicationAuthenticated,
        setIsApplicationAuthenticated
    ] = useState(false);


    // ============================================================
    // NATIVE MFA STATE
    //
    // Retained for future Entra SMS / Email MFA support.
    // ============================================================

    const [mfaMethods, setMfaMethods] = useState([]);

    const [selectedMfaMethod, setSelectedMfaMethod] =
        useState("");

    const [activeMfaMethod, setActiveMfaMethod] =
        useState(null);


    // ============================================================
    // MFA REGISTRATION STATE
    // ============================================================

    const [registrationMethods, setRegistrationMethods] =
        useState([]);

    const [selectedRegistrationMethod, setSelectedRegistrationMethod] =
        useState("");

    const [registrationContact, setRegistrationContact] =
        useState("");

    const [registrationCode, setRegistrationCode] =
        useState("");

    const [registrationState, setRegistrationState] =
        useState(null);


    // ============================================================
    // UI STATE
    // ============================================================

    const [step, setStep] = useState("email");

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState("");

    const [success, setSuccess] = useState("");

    const [showPassword, setShowPassword] = useState(false);

    const [remember, setRemember] = useState(false);


    // ============================================================
    // COMPLETED ENTRA AUTHENTICATION RESULT
    //
    // This MUST remain the CustomAuthAccountData object returned
    // by Microsoft Entra External ID.
    //
    // It must NOT be replaced by:
    //
    //     /api/mfa/verify
    //
    // because that endpoint returns an application MFA response,
    // not an Entra authentication result.
    // ============================================================

    const nativeAuthenticationResultRef =
        useRef(null);


    // ============================================================
    // ERROR HELPER
    // ============================================================

    const getErrorMessage = (errorValue) => {

        if (!errorValue) {
            return "";
        }

        if (typeof errorValue === "string") {
            return errorValue;
        }

        return (
            errorValue.message ??
            errorValue.errorDescription ??
            errorValue.error_description ??
            "Unable to sign in."
        );
    };

    const callApi = async (url, options = {}) => {
        const authenticationResult =
            nativeAuthenticationResultRef.current;

        if (!authenticationResult) {
            throw new Error(
            "No completed authentication result is available."
            );
        }

        if (!isApplicationAuthenticated) {
            throw new Error(
            "Application MFA has not been completed."
            );
        }

        return callProtectedApi(authenticationResult,url,   options
        );
    };
    // ============================================================
    // CLEAR MESSAGES
    // ============================================================

    const clearMessages = () => {

        setError("");
        setSuccess("");

    };


    // ============================================================
    // LOAD REMEMBER-ME SETTING
    // ============================================================

    useEffect(() => {

        try {

            const remembered =
                localStorage.getItem("rememberLogin");

            setRemember(
                remembered === "true"
            );

        }
        catch (err) {

            console.error(
                "Unable to load remember-login setting:",
                err
            );

        }

    }, []);


    // ============================================================
    // CHECK CURRENT AUTHENTICATION
    // ============================================================

    useEffect(() => {

        const checkAuthentication = async () => {

            try {

                const result =
                    await getCurrentUser();

                console.log(
                    "Current authentication:",
                    result?.authenticated
                );

            }
            catch (err) {

                console.error(
                    "Unable to check current authentication:",
                    err
                );

            }

        };

        checkAuthentication();

    }, []);


    // ============================================================
    // CONFIGURE MFA REGISTRATION
    // ============================================================

    const configureRegistrationState = (state) => {

        let methods = [];

        try {

            methods =
                getRegistrationMethods(state) ?? [];

        }
        catch (err) {

            console.error(
                "Unable to get registration methods:",
                err
            );

        }


        let selected = "";

        try {

            selected =
                selectPreferredRegistrationMethod(
                    methods
                ) ?? "";

        }
        catch (err) {

            console.error(
                "Unable to select preferred registration method:",
                err
            );

            selected =
                methods[0] ?? "";

        }


        const contact =
            username.trim();


        setRegistrationMethods(
            methods
        );

        setSelectedRegistrationMethod(
            selected
        );

        setRegistrationContact(
            contact
        );

        setRegistrationState(
            state
        );

    };


    // ============================================================
    // PASSWORD AUTHENTICATION COMPLETED
    //
    // Entra password authentication
    //             ↓
    // Application Microsoft Authenticator
    //
    // The completed Entra result is retained.
    // ============================================================

   const handlePasswordAuthenticationCompleted = (
        authenticationResult
    ) => {
        console.log(
            "========== NATIVE AUTHENTICATION COMPLETED =========="
        );

        console.log(
            "Authentication Result:",
            authenticationResult
        );

        // ---------------------------------------------------------
        // Validate the Native Authentication result
        // ---------------------------------------------------------

        if (!authenticationResult) {
            console.error(
                "No authentication result was supplied."
            );

            throw new Error(
                "Native Authentication completed without an authentication result."
            );
        }

        // ---------------------------------------------------------
        // Store the completed Entra authentication result.
        // ---------------------------------------------------------

        nativeAuthenticationResultRef.current =
            authenticationResult;

        // Also store it in nativeAuthService.
        storeCompletedAuthenticationResult(
            authenticationResult
        );

        console.log(
            "Native Authentication result stored successfully."
        );

        // ---------------------------------------------------------
        // Create the application-level Microsoft Authenticator
        // method.
        //
        // IMPORTANT:
        // activeMfaMethod must contain the METHOD OBJECT,
        // not just the method ID.
        // ---------------------------------------------------------

        const authenticatorMethod = {
            id:
                APPLICATION_AUTHENTICATOR_ID,

            type:
                "application-authenticator",

            challenge_type:
                "totp",

            challenge_channel:
                "authenticator",

            displayName:
                "Microsoft Authenticator",

            label:
                "Microsoft Authenticator",

            login_hint:
                ""
        };

        // ---------------------------------------------------------
        // Configure application MFA.
        // ---------------------------------------------------------

        setMfaMethods([
            authenticatorMethod
        ]);

        // ---------------------------------------------------------
        // Select Microsoft Authenticator.
        // ---------------------------------------------------------

        setSelectedMfaMethod(
            APPLICATION_AUTHENTICATOR_ID
        );

        // ---------------------------------------------------------
        // IMPORTANT:
        //
        // Store the COMPLETE METHOD OBJECT here.
        //
        // handleMfaSubmit() checks:
        //
        // activeMfaMethod?.id
        //
        // so activeMfaMethod must be an object.
        // ---------------------------------------------------------

        setActiveMfaMethod(
            authenticatorMethod
        );

        // ---------------------------------------------------------
        // Move directly to the Authenticator code screen.
        // ---------------------------------------------------------

        setCode("");

        setStep(
            "mfaCode"
        );
    };

    // ============================================================
    // HANDLE AUTHENTICATION COMPLETED
    //
    // Used by older/native Entra flows and registration flows.
    //
    // IMPORTANT:
    // The application TOTP response must NEVER be passed here.
    // ============================================================

    const handleAuthenticationCompleted =
    async (authenticationResult) => {

        console.log(
            "========== AUTHENTICATION COMPLETED =========="
        );

        console.log(
            "Authentication result:",
            authenticationResult
        );

        console.log(
            "Authentication result constructor:",
            authenticationResult?.constructor?.name
        );

        if (!authenticationResult) {

            console.error(
                "No authentication result was supplied."
            );

            setError(
                "Authentication completed, but no authentication result was returned."
            );

            return;
        }

        // ---------------------------------------------------------
        // IMPORTANT:
        //
        // Keep the original Microsoft Entra
        // CustomAuthAccountData object.
        //
        // This object provides getAccessToken().
        // ---------------------------------------------------------

        nativeAuthenticationResultRef.current =
            authenticationResult;

        // ---------------------------------------------------------
        // Also store it in nativeAuthService.
        //
        // This allows other components, such as MsalDemoPage,
        // to retrieve the same completed authentication result.
        // ---------------------------------------------------------

        storeCompletedAuthenticationResult(
            authenticationResult
        );

        console.log(
            "Native authentication result stored."
        );

        console.log(
            "Stored authentication result:",
            nativeAuthenticationResultRef.current
        );

        console.log(
            "Authentication result constructor:",
            authenticationResult?.constructor?.name
        );

        console.log(
            "Has getAccessToken():",
            typeof authenticationResult?.getAccessToken ===
                "function"
        );

        setSuccess(
            "Authentication completed successfully."
        );

    };
    // ============================================================
    // GET ENTRA ACCESS TOKEN
    //
    // The application can call:
    //
    //     const token = await getAccessToken();
    //
    // The token is obtained on demand from CustomAuthAccountData.
    //
    // It is NOT stored in React state or localStorage.
    // ============================================================

    const getAccessToken = useCallback(
        async () => {

            const authenticationResult =
                nativeAuthenticationResultRef.current;


            if (!authenticationResult) {

                throw new Error(
                    "No completed Entra authentication result is available."
                );

            }


            if (!isApplicationAuthenticated) {

                throw new Error(
                    "Application MFA has not been completed."
                );

            }


            console.log(
                "========== GETTING ENTRA ACCESS TOKEN =========="
            );

            console.log(
                "Authentication result constructor:",
                authenticationResult?.constructor?.name
            );

            console.log(
                "Has getAccessToken:",
                typeof authenticationResult?.getAccessToken ===
                    "function"
            );


            const accessToken =
                await getNativeAccessToken(
                    authenticationResult
                );


            if (
                !accessToken ||
                typeof accessToken !== "string"
            ) {

                throw new Error(
                    "Unable to obtain the Entra access token."
                );

            }


            console.log(
                "Entra access token obtained."
            );

            console.log(
                "Access token type:",
                typeof accessToken
            );

            console.log(
                "Access token length:",
                accessToken.length
            );


            return accessToken;

        },
        [
            isApplicationAuthenticated
        ]
    );


    // ============================================================
    // EMAIL SUBMISSION
    // ============================================================

    const handleEmailSubmit = async (event) => {

        event.preventDefault();

        clearMessages();

        setLoading(true);


        try {

            const enteredUsername =
                username.trim();


            if (!enteredUsername) {

                setError(
                    "Please enter your email address."
                );

                return;
            }


            const result =
                await startSignIn(
                    enteredUsername
                );


            console.log(
                "startSignIn result:",
                result
            );


            if (!result?.success) {

                setError(
                    result?.message ||
                    "Unable to sign in."
                );

                return;
            }


            switch (result.step) {

                case "password":

                    setStep(
                        "password"
                    );

                    break;


                case "code":

                    setCode("");

                    setStep(
                        "code"
                    );

                    break;


                case "mfa": {

                    const methods =
                        buildCustomMfaMethods(
                            result.authMethods
                        );

                    setMfaMethods(
                        methods
                    );

                    setSelectedMfaMethod("");

                    setActiveMfaMethod(null);

                    setCode("");

                    setStep(
                        "mfa"
                    );

                    break;
                }


                case "authMethodRegistration":

                    configureRegistrationState(
                        result.state
                    );

                    setStep(
                        "registration"
                    );

                    break;


                case "completed":

                    await handlePasswordAuthenticationCompleted(
                        result.authenticationResult
                    );

                    break;


                default:

                    setError(
                        result?.message ||
                        "An unsupported authentication step was returned."
                    );

                    break;

            }

        }
        catch (err) {

            console.error(
                "Email sign-in error:",
                err
            );

            setError(
                getErrorMessage(err) ||
                "Unable to start sign in."
            );

        }
        finally {

            setLoading(false);

        }

    };


    // ============================================================
    // BUILD CUSTOM MFA METHODS
    //
    // Current application flow:
    //
    // Microsoft Authenticator TOTP only.
    //
    // Native Entra SMS/email remains implemented in the service
    // and can be re-enabled later.
    // ============================================================

    const buildCustomMfaMethods = () => {

        const authenticatorMethod = {

            id:
                APPLICATION_AUTHENTICATOR_ID,

            challenge_type:
                "totp",

            challenge_channel:
                "authenticator",

            login_hint:
                ""
        };


        console.log(
            "========== CUSTOM MFA METHODS =========="
        );

        console.log(
            "Application MFA method:",
            authenticatorMethod
        );


        return [
            authenticatorMethod
        ];

    };


    // ============================================================
    // PASSWORD SUBMISSION
    // ============================================================

    const handlePasswordSubmit = async (event) => {

        event.preventDefault();

        clearMessages();

        setLoading(true);


        try {

            const result =
                await submitPassword(
                    password
                );


            console.log(
                "========== SUBMIT PASSWORD =========="
            );

            console.log(
                "submitPassword result:",
                result
            );

            console.log(
                "Result step:",
                result?.step
            );

            console.log(
                "Result authMethods:",
                result?.authMethods
            );


            if (!result?.success) {

                if (
                    result?.step ===
                    "passwordExpired"
                ) {

                    setStep(
                        "passwordReset"
                    );

                    return;
                }


                setError(
                    result?.message ||
                    "Password authentication failed."
                );

                return;
            }


            switch (result.step) {

                case "mfa": {

                    const methods =
                        buildCustomMfaMethods(
                            result.authMethods
                        );


                    if (methods.length === 0) {

                        setError(
                            "No MFA authentication methods are available for this account."
                        );

                        return;
                    }


                    setMfaMethods(
                        methods
                    );

                    setSelectedMfaMethod(
                        ""
                    );

                    setActiveMfaMethod(
                        null
                    );

                    setCode("");

                    setStep(
                        "mfa"
                    );

                    break;
                }


                case "code":

                    setCode("");

                    setStep(
                        "code"
                    );

                    break;


                case "authMethodRegistration":

                    configureRegistrationState(
                        result.state
                    );

                    setStep(
                        "registration"
                    );

                    break;


                case "completed":

                    await handlePasswordAuthenticationCompleted(
                        result.authenticationResult
                    );

                    break;


                case "passwordExpired":

                    setStep(
                        "passwordReset"
                    );

                    break;


                default:

                    setError(
                        result?.message ||
                        "Unexpected authentication step."
                    );

                    break;

            }

        }
        catch (err) {

            console.error(
                "Password authentication error:",
                err
            );

            setError(
                getErrorMessage(err) ||
                "Unable to authenticate."
            );

        }
        finally {

            setLoading(false);

        }

    };


    // ============================================================
    // NATIVE MFA METHOD SELECTION
    // ============================================================

    const handleMfaMethodSubmit = async () => {

        clearMessages();

        setLoading(true);


        try {

            if (!selectedMfaMethod) {

                setError(
                    "Please select an MFA authentication method."
                );

                return;
            }


            console.log(
                "Selected MFA method ID:",
                selectedMfaMethod
            );


            const selectedMethod =
                mfaMethods.find(
                    (method) =>
                        String(method?.id) ===
                        String(selectedMfaMethod)
                );


            console.log(
                "Selected MFA method details:",
                selectedMethod
            );


            if (!selectedMethod) {

                setError(
                    "The selected MFA authentication method could not be found."
                );

                return;
            }


            // ----------------------------------------------------
            // APPLICATION AUTHENTICATOR
            // ----------------------------------------------------

            if (
                selectedMethod.id ===
                APPLICATION_AUTHENTICATOR_ID
            ) {

                console.log(
                    "========== AUTHENTICATOR SELECTION =========="
                );

                console.log(
                    "Current native authentication result:",
                    nativeAuthenticationResultRef.current
                );

                setActiveMfaMethod(
                    selectedMethod
                );

                setCode("");

                setStep(
                    "mfaCode"
                );

                return;
            }


            // ----------------------------------------------------
            // Existing Entra SMS / Email
            // ----------------------------------------------------

            setActiveMfaMethod(
                selectedMethod
            );


            console.log(
                "========== REQUESTING ENTRA MFA CHALLENGE =========="
            );


            const challengeResult =
                await requestMfaChallenge(
                    selectedMethod.id
                );


            console.log(
                "MFA challenge result:",
                challengeResult
            );


            if (!challengeResult?.success) {

                setError(
                    challengeResult?.message ||
                    "Unable to request MFA challenge."
                );

                return;
            }


            if (
                challengeResult.step ===
                "mfaCode"
            ) {

                setCode("");

                setStep(
                    "mfaCode"
                );

                return;
            }


            if (
                challengeResult.step ===
                "completed"
            ) {

                await handleAuthenticationCompleted(
                    challengeResult.authenticationResult ||
                    challengeResult
                );

                return;
            }


            if (
                challengeResult.step ===
                "mfa"
            ) {

                setStep(
                    "mfa"
                );

                return;
            }


            setError(
                challengeResult?.message ||
                "Unexpected MFA challenge response."
            );

        }
        catch (err) {

            console.error(
                "MFA method selection error:",
                err
            );

            setError(
                getErrorMessage(err) ||
                "Unable to start MFA verification."
            );

        }
        finally {

            setLoading(false);

        }

    };


    // ============================================================
    // APPLICATION MFA / MICROSOFT AUTHENTICATOR
    // ============================================================

    const verifyApplicationAuthenticator =
        async (enteredCode) => {

            console.log(
                "========== VERIFYING APPLICATION AUTHENTICATOR =========="
            );


            try {

                // ------------------------------------------------
                // Get ORIGINAL completed Entra result.
                // ------------------------------------------------

                const authenticationResult =
                    nativeAuthenticationResultRef.current;


                if (!authenticationResult) {

                    throw new Error(
                        "No completed native authentication result is available."
                    );

                }


                console.log(
                    "Using stored native authentication result."
                );

                console.log(
                    "Authentication result constructor:",
                    authenticationResult?.constructor?.name
                );

                console.log(
                    "Has getAccessToken:",
                    typeof authenticationResult?.getAccessToken ===
                        "function"
                );


                // ------------------------------------------------
                // Obtain Entra access token.
                // ------------------------------------------------

                console.log(
                    "========== REQUESTING ENTRA ACCESS TOKEN =========="
                );


                const accessToken =
                    await getNativeAccessToken(
                        authenticationResult
                    );


                if (!accessToken) {

                    throw new Error(
                        "Unable to obtain the Entra access token."
                    );

                }


                console.log(
                    "Native access token acquired."
                );

                console.log(
                    "Access token type:",
                    typeof accessToken
                );

                console.log(
                    "Access token length:",
                    typeof accessToken === "string"
                        ? accessToken.length
                        : "not-string"
                );


                // ------------------------------------------------
                // Call application MFA endpoint.
                //
                // The bearer token proves Entra authentication.
                //
                // credentials: include allows the API to establish
                // the application mfa_session cookie.
                // ------------------------------------------------

                console.log(
                    "========== CALLING APPLICATION MFA API =========="
                );

                console.log(
                    "URL:",
                    "https://localhost:7290/api/mfa/verify"
                );

                console.log(
                    "Entered code length:",
                    enteredCode?.length
                );


                const response =
                    await fetch(
                        "https://localhost:7290/api/mfa/verify",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                "Authorization":
                                    `Bearer ${accessToken}`
                            },

                            credentials: "include",

                            body: JSON.stringify({
                                code: enteredCode
                            })
                        }
                    );


                console.log(
                    "========== APPLICATION MFA API RESPONSE =========="
                );

                console.log(
                    "HTTP status:",
                    response.status
                );

                console.log(
                    "HTTP status text:",
                    response.statusText
                );

                console.log(
                    "Response OK:",
                    response.ok
                );

                console.log(
                    "Response URL:",
                    response.url
                );

                console.log(
                    "Content-Type:",
                    response.headers.get("content-type")
                );


                // ------------------------------------------------
                // Read response safely.
                // ------------------------------------------------

                let responseBody = null;

                const contentType =
                    response.headers.get(
                        "content-type"
                    );


                if (
                    contentType &&
                    contentType.includes(
                        "application/json"
                    )
                ) {

                    try {

                        responseBody =
                            await response.json();

                    }
                    catch (jsonError) {

                        console.error(
                            "Unable to parse JSON response:",
                            jsonError
                        );

                    }

                }
                else {

                    try {

                        responseBody =
                            await response.text();

                    }
                    catch (textError) {

                        console.error(
                            "Unable to read text response:",
                            textError
                        );

                    }

                }


                console.log(
                    "Application MFA response body:",
                    responseBody
                );


                // ------------------------------------------------
                // Response headers
                // ------------------------------------------------

                try {

                    const responseHeaders = {};

                    response.headers.forEach(
                        (value, key) => {

                            responseHeaders[key] =
                                value;

                        }
                    );

                    console.log(
                        "Application MFA response headers:",
                        responseHeaders
                    );

                }
                catch (headerError) {

                    console.error(
                        "Unable to inspect response headers:",
                        headerError
                    );

                }


                // ------------------------------------------------
                // Non-success response.
                // ------------------------------------------------

                if (!response.ok) {

                    let message =
                        "The Microsoft Authenticator code is invalid.";


                    if (
                        typeof responseBody ===
                        "string" &&
                        responseBody.trim()
                    ) {

                        message =
                            responseBody;

                    }
                    else if (
                        responseBody?.message
                    ) {

                        message =
                            responseBody.message;

                    }
                    else if (
                        responseBody?.error
                    ) {

                        message =
                            responseBody.error;

                    }
                    else if (
                        responseBody?.title
                    ) {

                        message =
                            responseBody.title;

                    }


                    console.error(
                        "========== APPLICATION MFA FAILED =========="
                    );

                    console.error(
                        "HTTP status:",
                        response.status
                    );

                    console.error(
                        "Response body:",
                        responseBody
                    );


                    return {
                        success: false,
                        message
                    };

                }


                // ------------------------------------------------
                // Successful TOTP verification.
                //
                // IMPORTANT:
                //
                // responseBody is ONLY the application MFA
                // response.
                //
                // It is NOT an Entra authentication result.
                //
                // nativeAuthenticationResultRef remains untouched.
                // ------------------------------------------------

                console.log(
                    "========== APPLICATION MFA SUCCESS =========="
                );

                console.log(
                    "TOTP verification succeeded."
                );

                console.log(
                    "API response:",
                    responseBody
                );


                return {

                    success:
                        true,

                    message:
                        responseBody?.message ||
                        "MFA verification successful."

                };

            }
            catch (err) {

                console.error(
                    "========== APPLICATION AUTHENTICATOR ERROR =========="
                );

                console.error(
                    "Error:",
                    err
                );

                console.error(
                    "Error message:",
                    err?.message
                );

                console.error(
                    "Error name:",
                    err?.name
                );


                return {

                    success:
                        false,

                    message:
                        getErrorMessage(err) ||
                        "Unable to verify Microsoft Authenticator code."

                };

            }

        };


    // ============================================================
    // MFA CODE SUBMISSION
    // ============================================================

    const handleMfaSubmit = async (event) => {

        if (
            event &&
            typeof event.preventDefault ===
            "function"
        ) {
            event.preventDefault();
        }

        clearMessages();

        setLoading(true);

        try {

            const enteredCode =
                code.trim();

            if (!enteredCode) {

                setError(
                    "Please enter the MFA verification code."
                );

                return;
            }

            // ====================================================
            // DETERMINE ACTIVE MFA METHOD
            // ====================================================

            const activeMfaMethodId =
                activeMfaMethod?.id ||
                selectedMfaMethod;

            console.log(
                "========== MFA CODE SUBMISSION =========="
            );

            console.log(
                "Active MFA method:",
                activeMfaMethod
            );

            console.log(
                "Active MFA method ID:",
                activeMfaMethodId
            );

            console.log(
                "Selected MFA method:",
                selectedMfaMethod
            );

            // ====================================================
            // APPLICATION AUTHENTICATOR / TOTP
            // ====================================================

            if (
                activeMfaMethodId ===
                APPLICATION_AUTHENTICATOR_ID
            ) {

                console.log(
                    "========== APPLICATION TOTP CODE =========="
                );

                console.log(
                    "Submitting Microsoft Authenticator code."
                );

                const result =
                    await verifyApplicationAuthenticator(
                        enteredCode
                    );

                console.log(
                    "Application Authenticator result:",
                    result
                );

                if (!result?.success) {

                    setError(
                        result?.message ||
                        "Microsoft Authenticator verification failed."
                    );

                    return;
                }

                // ------------------------------------------------
                // Both authentication factors are now complete:
                //
                // 1. Entra password authentication
                // 2. Application Microsoft Authenticator TOTP
                // ------------------------------------------------

                console.log(
                    "========== APPLICATION MFA SUCCESS =========="
                );

                console.log(
                    "Application authentication is now complete."
                );

                console.log(
                    "Original Entra authentication result remains stored:",
                    nativeAuthenticationResultRef.current
                );

                setCode("");

                setIsApplicationAuthenticated(
                    true
                );

                setSuccess(
                    result?.message ||
                    "MFA verification successful."
                );

                setStep(
                    "authenticated"
                );

                return;
            }

            // ====================================================
            // EXISTING ENTRA SMS / EMAIL
            // ====================================================

            console.log(
                "========== ENTRA SMS / EMAIL MFA =========="
            );

            console.log(
                "Submitting native MFA challenge code."
            );

            const result =
                await submitMfaChallenge(
                    enteredCode
                );

            console.log(
                "========== MFA SUBMIT RESULT =========="
            );

            console.log(
                "Full MFA submit result:",
                result
            );

            console.log(
                "Result step:",
                result?.step
            );

            console.log(
                "Result success:",
                result?.success
            );

            if (!result?.success) {

                if (
                    result?.step ===
                    "passwordExpired"
                ) {

                    setStep(
                        "passwordReset"
                    );

                    return;
                }

                setError(
                    result?.message ||
                    "MFA verification failed."
                );

                return;
            }

            switch (result.step) {

                case "completed":

                    await handleAuthenticationCompleted(
                        result.authenticationResult ||
                        result
                    );

                    break;

                case "mfa":

                    setCode("");

                    setStep(
                        "mfa"
                    );

                    break;

                case "mfaCode":

                    setCode("");

                    setStep(
                        "mfaCode"
                    );

                    break;

                case "passwordExpired":

                    setStep(
                        "passwordReset"
                    );

                    break;

                default:

                    setError(
                        result?.message ||
                        "Unexpected MFA response."
                    );

                    break;
            }

        }
        catch (err) {

            console.error(
                "MFA verification error:",
                err
            );

            setError(
                getErrorMessage(err) ||
                "Unable to verify MFA code."
            );

        }
        finally {

            setLoading(false);
        }
    };

    // ============================================================
    // MFA REGISTRATION
    // ============================================================

    const handleRegistrationSubmit = async (event) => {

        event.preventDefault();

        clearMessages();


        if (!selectedRegistrationMethod) {

            setError(
                "Please select an authentication method."
            );

            return;
        }


        const contact =
            registrationContact.trim();


        if (!contact) {

            setError(
                "Please enter the email address to use for verification."
            );

            return;
        }


        try {

            setLoading(true);


            const result =
                await registerAuthenticationMethod({

                    registrationState,

                    authenticationMethod:
                        selectedRegistrationMethod,

                    verificationContact:
                        contact

                });


            console.log(
                "registerAuthenticationMethod result:",
                result
            );


            if (!result?.success) {

                setError(
                    result?.message ||
                    "Unable to register the authentication method."
                );

                return;
            }


            switch (result.step) {

                case "verificationRequired":

                    setRegistrationState(
                        result.state
                    );

                    setRegistrationCode("");

                    setStep(
                        "registration-code"
                    );

                    setSuccess(
                        `A verification code has been sent to ${contact}.`
                    );

                    break;


                case "completed":

                    await handleAuthenticationCompleted(
                        result.authenticationResult ||
                        result
                    );

                    break;


                default:

                    setError(
                        result?.message ||
                        "Unexpected registration response."
                    );

                    break;

            }

        }
        catch (err) {

            console.error(
                "MFA registration error:",
                err
            );

            setError(
                getErrorMessage(err) ||
                "Unable to register the authentication method."
            );

        }
        finally {

            setLoading(false);

        }

    };


    // ============================================================
    // MFA REGISTRATION CODE
    // ============================================================

    const handleRegistrationCodeSubmit =
        async (event) => {

            event.preventDefault();

            clearMessages();


            const enteredCode =
                registrationCode.trim();


            if (!enteredCode) {

                setError(
                    "Please enter the verification code."
                );

                return;
            }


            try {

                setLoading(true);


                const result =
                    await verifyAuthenticationMethod({

                        registrationState,

                        code:
                            enteredCode

                    });


                console.log(
                    "verifyAuthenticationMethod result:",
                    result
                );


                if (!result?.success) {

                    setError(
                        result?.message ||
                        "Unable to verify the authentication method."
                    );

                    return;
                }


                switch (result.step) {

                    case "completed":

                        await handleAuthenticationCompleted(
                            result.authenticationResult ||
                            result
                        );

                        break;


                    default:

                        setError(
                            result?.message ||
                            "The verification was not completed."
                        );

                        break;

                }

            }
            catch (err) {

                console.error(
                    "MFA registration verification error:",
                    err
                );

                setError(
                    getErrorMessage(err) ||
                    "Unable to verify the authentication method."
                );

            }
            finally {

                setLoading(false);

            }

        };


    // ============================================================
    // STANDARD VERIFICATION CODE
    // ============================================================

    const handleCodeSubmit = async (event) => {

        event.preventDefault();

        clearMessages();

        setLoading(true);


        try {

            const enteredCode =
                code.trim();


            if (!enteredCode) {

                setError(
                    "Please enter the verification code."
                );

                return;
            }


            const result =
                await submitVerificationCode(
                    enteredCode
                );


            console.log(
                "submitVerificationCode result:",
                result
            );


            if (!result?.success) {

                setError(
                    result?.message ||
                    "Verification failed."
                );

                return;
            }


            switch (result.step) {

                case "completed":

                    await handleAuthenticationCompleted(
                        result.authenticationResult ||
                        result
                    );

                    break;


                case "mfa": {

                    const methods =
                        buildCustomMfaMethods(
                            result.authMethods
                        );

                    setMfaMethods(
                        methods
                    );

                    setSelectedMfaMethod("");

                    setActiveMfaMethod(null);

                    setStep(
                        "mfa"
                    );

                    break;
                }


                case "code":

                    setCode("");

                    setStep(
                        "code"
                    );

                    break;


                default:

                    setError(
                        result?.message ||
                        "Unexpected verification response."
                    );

                    break;

            }

        }
        catch (err) {

            console.error(
                "Verification error:",
                err
            );

            setError(
                getErrorMessage(err) ||
                "Unable to verify the code."
            );

        }
        finally {

            setLoading(false);

        }

    };


    // ============================================================
    // BACK BUTTON
    // ============================================================

    const handleBack = () => {

        clearMessages();


        switch (step) {

            // ----------------------------------------------------
            // Authenticated → MFA code
            // ----------------------------------------------------

            case "authenticated":

                setIsApplicationAuthenticated(
                    false
                );

                setCode("");

                setStep(
                    "mfaCode"
                );

                break;


            // ----------------------------------------------------
            // MFA code → MFA method selection
            // ----------------------------------------------------

            case "mfaCode":

                setCode("");

                setStep(
                    "mfa"
                );

                break;


            // ----------------------------------------------------
            // MFA method selection → email
            // ----------------------------------------------------

            case "mfa":

                setCode("");

                setSelectedMfaMethod("");

                setActiveMfaMethod(null);

                setMfaMethods([]);

                setIsApplicationAuthenticated(
                    false
                );

                clearSignInState();

                clearCompletedAuthenticationResult();

                nativeAuthenticationResultRef.current =
                    null;

                setStep(
                    "email"
                );

                break;


            // ----------------------------------------------------
            // Password → email
            // ----------------------------------------------------

            case "password":

                setPassword("");

                setIsApplicationAuthenticated(
                    false
                );

                clearSignInState();

                clearCompletedAuthenticationResult();

                nativeAuthenticationResultRef.current =
                    null;

                setStep(
                    "email"
                );

                break;


            // ----------------------------------------------------
            // Standard verification code → password
            // ----------------------------------------------------

            case "code":

                setCode("");

                setStep(
                    "password"
                );

                break;


            // ----------------------------------------------------
            // Registration → email
            // ----------------------------------------------------

            case "registration":

                setRegistrationState(null);

                setRegistrationMethods([]);

                setSelectedRegistrationMethod("");

                setRegistrationContact("");

                setRegistrationCode("");

                setIsApplicationAuthenticated(
                    false
                );

                clearSignInState();

                clearCompletedAuthenticationResult();

                nativeAuthenticationResultRef.current =
                    null;

                setStep(
                    "email"
                );

                break;


            // ----------------------------------------------------
            // Registration code → registration
            // ----------------------------------------------------

            case "registration-code":

                setRegistrationCode("");

                setStep(
                    "registration"
                );

                break;


            // ----------------------------------------------------
            // Default
            // ----------------------------------------------------

            default:

                break;

        }

    };


    // ============================================================
    // CLEAR APPLICATION AUTHENTICATION
    //
    // Use this from logout.
    //
    // This clears:
    //
    // 1. React authentication state
    // 2. Local Entra authentication reference
    // 3. Service-level CustomAuthAccountData
    // 4. Native sign-in state
    //
    // The API-side mfa_session cookie should also be cleared by
    // your logout/session endpoint if you have one.
    // ============================================================

    const clearApplicationAuthentication = useCallback(
        () => {

            console.log(
                "========== CLEARING APPLICATION AUTHENTICATION =========="
            );


            // ----------------------------------------------------
            // Clear local authentication reference.
            // ----------------------------------------------------

            nativeAuthenticationResultRef.current =
                null;


            // ----------------------------------------------------
            // Clear service-level authentication reference.
            // ----------------------------------------------------

            clearCompletedAuthenticationResult();


            // ----------------------------------------------------
            // Clear native sign-in state.
            // ----------------------------------------------------

            clearSignInState();


            // ----------------------------------------------------
            // Clear React authentication state.
            // ----------------------------------------------------

            setIsApplicationAuthenticated(
                false
            );

            setUsername("");

            setPassword("");

            setCode("");

            setMfaMethods([]);

            setSelectedMfaMethod("");

            setActiveMfaMethod(null);

            setSuccess("");

            setError("");


            setStep(
                "email"
            );

        },
        []
    );


    // ============================================================
    // RETURN LOGIN STATE AND HANDLERS
    // ============================================================

    return {

        // --------------------------------------------------------
        // Authentication state
        // --------------------------------------------------------
        username,
        setUsername,
        password,
        setPassword,
        code,
        setCode,
        // --------------------------------------------------------
        // APPLICATION AUTHENTICATION
        // --------------------------------------------------------
        isApplicationAuthenticated,
        getAccessToken,
        callApi,
        clearApplicationAuthentication,
        // --------------------------------------------------------
        // Native MFA state
        // --------------------------------------------------------
        mfaMethods,
        activeMfaMethod,
        selectedMfaMethod,
        setSelectedMfaMethod,
        // --------------------------------------------------------
        // Registration state
        // --------------------------------------------------------
        registrationMethods,
        selectedRegistrationMethod,
        setSelectedRegistrationMethod,
        registrationContact,
        setRegistrationContact,
        registrationCode,
        setRegistrationCode,
        // --------------------------------------------------------
        // UI state
        // --------------------------------------------------------
        step,
        loading,
        error,
        success,
        showPassword,
        setShowPassword,
        remember,
        setRemember,
        // --------------------------------------------------------
        // Authentication handlers
        // --------------------------------------------------------
        handleEmailSubmit,
        handlePasswordSubmit,
        handleMfaMethodSubmit,
        handleMfaSubmit,
        handleCodeSubmit,
        // --------------------------------------------------------
        // Registration handlers
        // --------------------------------------------------------
        handleRegistrationSubmit,
        handleRegistrationCodeSubmit,
        // --------------------------------------------------------
        // Navigation
        // --------------------------------------------------------
        handleBack
    };

};


export default useNativeLogin;

