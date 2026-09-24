import { useCallback, useRef, useState } from "react";

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

import { callProtectedApi } from "../apiService";


const API_BASE_URL = "https://localhost:7290";

const MFA_STATUS_URL = "/api/mfa/status";

const MFA_ENROL_URL =  "/api/mfa/enrol";

const MFA_ENROL_VERIFY_URL =  "/api/mfa/enrol/verify";

const MFA_VERIFY_URL =   "/api/mfa/verify";

const APPLICATION_AUTHENTICATOR_ID =    "application-authenticator";


const APPLICATION_AUTHENTICATOR_METHOD = {
    id: APPLICATION_AUTHENTICATOR_ID,
    type: "application-authenticator",
    challenge_type: "totp",
    challenge_channel: "authenticator",
    displayName: "Microsoft Authenticator",
    label: "Microsoft Authenticator",
    login_hint: ""
};


const useNativeLogin = () => {

    // ============================================================
    // LOGIN STATE
    // ============================================================

    const [username, setUsername] =
        useState("");

    const [password, setPassword] =
        useState("");

    const [code, setCode] =
        useState("");


    // ============================================================
    // APPLICATION MFA STATE
    // ============================================================

    const [
        isApplicationAuthenticated,
        setIsApplicationAuthenticated
    ] = useState(false);


    const [mfaMethods, setMfaMethods] =
        useState([]);

    const [selectedMfaMethod, setSelectedMfaMethod] =
        useState(null);

    const [activeMfaMethod, setActiveMfaMethod] =
        useState(null);


    // ============================================================
    // MFA ENROLLMENT STATE
    // ============================================================

    const [
        mfaEnrollmentStatus,
        setMfaEnrollmentStatus
    ] = useState(null);


    const [
        enrollmentData,
        setEnrollmentData
    ] = useState(null);


    const [
        enrollmentCode,
        setEnrollmentCode
    ] = useState("");


    // ============================================================
    // NATIVE AUTH REGISTRATION STATE
    // ============================================================

    const [
        registrationMethods,
        setRegistrationMethods
    ] = useState([]);

    const [
        selectedRegistrationMethod,
        setSelectedRegistrationMethod
    ] = useState(null);

    const [
        registrationContact,
        setRegistrationContact
    ] = useState("");

    const [
        registrationCode,
        setRegistrationCode
    ] = useState("");

    const [
        registrationState,
        setRegistrationState
    ] = useState(null);


    // ============================================================
    // UI STATE
    // ============================================================

    const [step, setStep] =
        useState("email");

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState("");

    const [success, setSuccess] =
        useState("");

    const [showPassword, setShowPassword] =
        useState(false);

    const [remember, setRemember] =
        useState(false);


    // ============================================================
    // ORIGINAL ENTRA AUTHENTICATION RESULT
    //
    // IMPORTANT:
    //
    // This reference must contain ONLY the original Entra
    // authentication result.
    //
    // Application MFA responses must NEVER replace it.
    // ============================================================

    const nativeAuthenticationResultRef =
        useRef(null);


    // ============================================================
    // HELPERS
    // ============================================================

    const clearMessages = useCallback(() => {

        setError("");
        setSuccess("");

    }, []);


    // ============================================================
    // GET ORIGINAL AUTHENTICATION RESULT
    // ============================================================

    const getAuthenticationResult = useCallback(() => {

        const authenticationResult =
            nativeAuthenticationResultRef.current;

        if (!authenticationResult) {

            throw new Error(
                "The Entra authentication result is not available."
            );
        }

        return authenticationResult;

    }, []);


    // ============================================================
    // GET ENTRA BEARER TOKEN
    // ============================================================

    const getBearerToken = useCallback(async () => {

        const authenticationResult =
            getAuthenticationResult();


        const token =
            await getNativeAccessToken(
                authenticationResult
            );


        if (!token) {

            throw new Error(
                "Unable to obtain the Entra access token."
            );
        }


        return token;

    }, [
        getAuthenticationResult
    ]);


    // ============================================================
    // APPLICATION MFA API HELPER
    //
    // All application MFA API calls go through the SAME
    // callProtectedApi mechanism used elsewhere in the app.
    //
    // This avoids using raw fetch() in this hook.
    //
    // IMPORTANT:
    //
    // This helper obtains the token from the ORIGINAL Entra
    // authentication result.
    // ============================================================

        const callApplicationMfaApi = useCallback(async (url, options = {}) => {

            console.log(
                "========== CALL APPLICATION MFA API =========="
            );

            console.log(
                "MFA API URL:",
                url
            );

            const accessToken =
                await getBearerToken();

            if (!accessToken) {
                throw new Error(
                    "No Entra access token is available for the application MFA API."
                );
            }

            console.log(
                "Application MFA access token length:",
                accessToken.length
            );

            return callProtectedApi(
                accessToken,
                url,
                {
                    ...options,
                    credentials: "include"
                }
            );
        },
        [getBearerToken]
    );

    // ============================================================
    // BUILD APPLICATION MFA METHODS
    //
    // This is deliberately declared BEFORE any handlers that
    // reference it.
    // ============================================================

    const buildCustomMfaMethods =
        useCallback(() => {

            return [
                {
                    ...APPLICATION_AUTHENTICATOR_METHOD
                }
            ];

        }, []);


    // ============================================================
    // START APPLICATION MFA ENROLLMENT
    //
    // Calls:
    //
    // POST /api/mfa/enrol
    //
    // Backend returns:
    //
    // {
    //     secret: "...",
    //     otpAuthUri: "otpauth://..."
    // }
    // ============================================================

    const startApplicationMfaEnrollment =
        useCallback(async () => {

            console.log(
                "========== START APPLICATION MFA ENROLLMENT =========="
            );


            const data =
                await callApplicationMfaApi(
                    MFA_ENROL_URL,
                    {
                        method: "POST"
                    }
                );


            console.log(
                "Enrollment data:",
                data
            );


            setEnrollmentData(data);

            setEnrollmentCode("");

            setMfaEnrollmentStatus({
                enrolled: false,
                enabled: false
            });

            setStep("mfaEnrollment");


            return data;

        }, [
            callApplicationMfaApi
        ]);


    // ============================================================
    // CHECK APPLICATION MFA STATUS
    //
    // This is the critical decision point after Entra password
    // authentication has completed.
    //
    // GET /api/mfa/status
    //
    // If enrolled:
    //     show Authenticator code screen.
    //
    // If not enrolled:
    //     start enrollment.
    // ============================================================

    const checkApplicationMfaStatus =
        useCallback(async () => {

            console.log(
                "========== CHECK APPLICATION MFA STATUS =========="
            );


            const status =
                await callApplicationMfaApi(
                    MFA_STATUS_URL,
                    {
                        method: "GET"
                    }
                );


            console.log(
                "MFA status:",
                status
            );


            setMfaEnrollmentStatus(status);


            const enrolled =
                status?.enrolled === true;

            const enabled =
                status?.enabled === true;


            // ====================================================
            // ALREADY ENROLLED
            // ====================================================

            if (enrolled && enabled) {

                console.log(
                    "Application MFA is already enrolled."
                );


                const authenticatorMethod = {
                    ...APPLICATION_AUTHENTICATOR_METHOD
                };


                setMfaMethods([
                    authenticatorMethod
                ]);


                setSelectedMfaMethod(
                    authenticatorMethod
                );


                setActiveMfaMethod(
                    authenticatorMethod
                );


                setCode("");

                setStep("mfaCode");


                return {
                    enrolled: true,
                    enabled: true
                };
            }


            // ====================================================
            // NOT ENROLLED
            // ====================================================

            console.log(
                "Application MFA is NOT enrolled."
            );


            setMfaMethods([]);

            setSelectedMfaMethod(null);

            setActiveMfaMethod(null);

            setEnrollmentData(null);

            setEnrollmentCode("");


            await startApplicationMfaEnrollment();


            return {
                enrolled: false,
                enabled: false
            };

        }, [
            callApplicationMfaApi,
            startApplicationMfaEnrollment
        ]);


    // ============================================================
    // VERIFY NEW MFA ENROLLMENT
    //
    // POST /api/mfa/enrol/verify
    //
    // This:
    //
    // 1. validates the TOTP code
    // 2. creates/updates UserMfas
    // 3. enables TOTP
    // 4. removes temporary enrollment
    //
    // NOTE:
    //
    // This endpoint does NOT create mfa_session.
    // That is why handleEnrollmentSubmit subsequently calls
    // /api/mfa/verify with the same code.
    // ============================================================

    const verifyApplicationMfaEnrollment =
        useCallback(async (enteredCode) => {

            console.log(
                "========== VERIFY APPLICATION MFA ENROLLMENT =========="
            );


            const result =
                await callApplicationMfaApi(
                    MFA_ENROL_VERIFY_URL,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            code: enteredCode
                        })
                    }
                );


            console.log(
                "Enrollment verification result:",
                result
            );


            return result;

        }, [
            callApplicationMfaApi
        ]);


    // ============================================================
    // VERIFY APPLICATION AUTHENTICATOR
    //
    // POST /api/mfa/verify
    //
    // This is the EXISTING endpoint which:
    //
    // 1. validates the TOTP
    // 2. creates the mfa_session cookie
    // 3. returns success
    //
    // IMPORTANT:
    //
    // The application MFA response does NOT replace the original
    // Entra authentication result.
    // ============================================================

    const verifyApplicationAuthenticator =
        useCallback(async (enteredCode) => {

            console.log(
                "========== VERIFY APPLICATION AUTHENTICATOR =========="
            );


            const result =
                await callApplicationMfaApi(
                    MFA_VERIFY_URL,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            code: enteredCode
                        })
                    }
                );


            console.log(
                "Application MFA verification result:",
                result
            );


            return {
                success:
                    result?.success === true,

                message:
                    result?.message ||
                    "MFA verification successful."
            };

        }, [
            callApplicationMfaApi
        ]);


    // ============================================================
    // PASSWORD AUTHENTICATION COMPLETED
    //
    // The Entra authentication result is retained FIRST.
    //
    // Then the application MFA database is checked.
    // ============================================================

    const handlePasswordAuthenticationCompleted =
        useCallback(async (authenticationResult) => {

            console.log(
                "========== NATIVE AUTHENTICATION COMPLETED =========="
            );


            console.log(
                "Authentication Result:",
                authenticationResult
            );


            if (!authenticationResult) {

                throw new Error(
                    "Native Authentication completed without an authentication result."
                );
            }


            // ====================================================
            // PRESERVE ORIGINAL ENTRA RESULT
            // ====================================================

            nativeAuthenticationResultRef.current =
                authenticationResult;


            /*
             * Also preserve it in nativeAuthService.
             */

            await storeCompletedAuthenticationResult(
                authenticationResult
            );


            clearMessages();

            setLoading(true);


            try {

                await checkApplicationMfaStatus();

            }
            catch (err) {

                console.error(
                    "Unable to determine application MFA status:",
                    err
                );


                setError(
                    err?.message ||
                    "Unable to determine application MFA status."
                );


                setStep("password");

            }
            finally {

                setLoading(false);
            }

        }, [
            checkApplicationMfaStatus,
            clearMessages
        ]);


    // ============================================================
    // GENERIC AUTHENTICATION COMPLETED
    // ============================================================

    const handleAuthenticationCompleted =
        useCallback(async (authenticationResult) => {

            await handlePasswordAuthenticationCompleted(
                authenticationResult
            );

        }, [
            handlePasswordAuthenticationCompleted
        ]);


    // ============================================================
    // GET ACCESS TOKEN
    //
    // Only permitted after application MFA succeeds.
    // ============================================================

    const getAccessToken =
        useCallback(async () => {

            if (!isApplicationAuthenticated) {

                throw new Error(
                    "Application MFA has not been completed."
                );
            }


            const authenticationResult =
                nativeAuthenticationResultRef.current;


            if (!authenticationResult) {

                throw new Error(
                    "The Entra authentication result is unavailable."
                );
            }


            return await getNativeAccessToken(
                authenticationResult
            );

        }, [
            isApplicationAuthenticated
        ]);


    // ============================================================
    // CALL PROTECTED API
    //
    // This remains the application's normal protected API
    // mechanism AFTER application MFA.
    // ============================================================

    const callApi = useCallback(async (url, options = {}) => {

            console.log(
                "========== CALL API FROM NATIVE AUTH =========="
            );

            console.log(
                "API URL:",
                url
            );

            console.log(
                "API options:",
                options
            );

            if (
                typeof url !== "string" ||
                !url.trim()
            ) {
                throw new Error(
                    "callApi() requires a URL string."
                );
            }

            const accessToken =
                await getAccessToken();

            if (!accessToken) {
                throw new Error(
                    "No Entra access token is available."
                );
            }

            console.log(
                "Entra access token acquired. Length:",
                accessToken.length
            );

            return callProtectedApi(
                accessToken,
                url,
                options
            );
        },
        [
            getAccessToken,
            callProtectedApi
        ]
    );

    // ============================================================
    // EMAIL SUBMIT
    // ============================================================

   const handleEmailSubmit =
    useCallback(async () => {

        console.log(
            "========== EMAIL SUBMIT =========="
        );

        console.log(
            "Username:",
            username
        );

        clearMessages();

        setLoading(true);

        try {

            const result =
                await startSignIn(username);

            console.log(
                "========== START SIGN IN RESULT =========="
            );

            console.log(
                "Full result:",
                result
            );

            console.log(
                "Result step:",
                result?.step
            );

            console.log(
                "Result authentication result:",
                result?.authenticationResult
            );


            if (!result) {

                throw new Error(
                    "startSignIn returned no result."
                );
            }


            // ====================================================
            // PASSWORD
            // ====================================================

            if (
                result?.step === "password"
            ) {

                console.log(
                    "Navigating to PASSWORD step."
                );

                setStep("password");

                return;
            }


            // ====================================================
            // VERIFICATION CODE
            // ====================================================

            if (
                result?.step === "code"
            ) {

                console.log(
                    "Navigating to CODE step."
                );

                setStep("code");

                return;
            }


            // ====================================================
            // MFA
            // ====================================================

            if (
                result?.step === "mfa"
            ) {

                console.log(
                    "Navigating to MFA step."
                );

                setMfaMethods(
                    buildCustomMfaMethods()
                );

                setStep("mfa");

                return;
            }


            // ====================================================
            // AUTHENTICATION METHOD REGISTRATION
            // ====================================================

            if (
                result?.step ===
                "authMethodRegistration"
            ) {

                console.log(
                    "Navigating to registration step."
                );

                setStep("registration");

                return;
            }


            // ====================================================
            // AUTHENTICATION COMPLETED
            // ====================================================

            if (
                result?.step === "completed"
            ) {

                console.log(
                    "Authentication completed directly."
                );

                await handleAuthenticationCompleted(
                    result.authenticationResult
                );

                return;
            }


            // ====================================================
            // UNKNOWN STEP
            // ====================================================

            console.warn(
                "Unhandled startSignIn result:",
                result
            );


            throw new Error(
                `Unexpected sign-in step: ${
                    result?.step || "undefined"
                }`
            );

        }
        catch (err) {

            console.error(
                "========== EMAIL AUTHENTICATION ERROR =========="
            );

            console.error(
                err
            );


            setError(
                err?.message ||
                "Unable to start sign-in."
            );

        }
        finally {

            setLoading(false);
        }

    }, [
        username,
        clearMessages,
        buildCustomMfaMethods,
        handleAuthenticationCompleted
    ]);
    // ============================================================
    // PASSWORD SUBMIT
    // ============================================================

    const handlePasswordSubmit = async () => {

    console.log(
        "========== PASSWORD SUBMIT =========="
    );

    console.log(
        "Password supplied:",
        password ? "YES" : "NO"
    );

    clearMessages();
    setLoading(true);

    try {

        console.log(
            "Calling submitPassword()..."
        );

        const result = await submitPassword(password);

        console.log(
            "========== SUBMIT PASSWORD RESULT =========="
        );

        console.log(
            "Full result:",
            result
        );

        console.log(
            "Result step:",
            result?.step
        );

        console.log(
            "Authentication result:",
            result?.authenticationResult
        );

        console.log(
            "Current username:",
            username
        );

        if (!result) {

            console.error(
                "submitPassword() returned no result."
            );

            setError(
                "Password authentication returned no result."
            );

            return;
        }

        // ========================================================
        // ENTRA AUTHENTICATION COMPLETED
        // ========================================================

        if (
            result.step === "completed" ||
            result.authenticationResult
        ) {

            console.log(
                "========== ENTRA PASSWORD AUTHENTICATION COMPLETED =========="
            );

            console.log(
                "Calling handlePasswordAuthenticationCompleted()..."
            );

            await handlePasswordAuthenticationCompleted(
                result.authenticationResult
            );

            console.log(
                "Returned from handlePasswordAuthenticationCompleted()."
            );

            return;
        }

        // ========================================================
        // STANDARD CODE
        // ========================================================

        if (result.step === "code") {

            console.log(
                "Password authentication requires code."
            );

            setStep("code");

            return;
        }

        // ========================================================
        // MFA
        // ========================================================

        if (result.step === "mfa") {

            console.log(
                "Password authentication returned native MFA."
            );

            const methods =
                buildCustomMfaMethods(
                    result.mfaMethods
                );

            setMfaMethods(methods);

            setSelectedMfaMethod(
                methods[0] ?? null
            );

            setStep("mfa");

            return;
        }

        // ========================================================
        // REGISTRATION
        // ========================================================

        if (
            result.step ===
            "authMethodRegistration"
        ) {

            console.log(
                "Authentication method registration required."
            );

            setStep("registration");

            return;
        }

        // ========================================================
        // UNEXPECTED RESULT
        // ========================================================

        console.error(
            "========== UNEXPECTED PASSWORD RESULT =========="
        );

        console.error(
            "Result:",
            result
        );

        console.error(
            "Result step:",
            result.step
        );

        setError(
            "Unexpected response received after password authentication."
        );

    }
    catch (error) {

        console.error(
            "========== PASSWORD SUBMIT ERROR =========="
        );

        console.error(
            error
        );

        setError(
            error?.message ||
            "Password authentication failed."
        );

    }
    finally {

        setLoading(false);

    }
};
    // ============================================================
    // MFA METHOD SELECTION
    // ============================================================

    const handleMfaMethodSubmit =
        useCallback(async (method) => {

            clearMessages();


            setSelectedMfaMethod(method);

            setActiveMfaMethod(method);


            // ====================================================
            // APPLICATION AUTHENTICATOR
            // ====================================================

            if (
                method?.type ===
                "application-authenticator"
            ) {

                setCode("");

                setStep("mfaCode");

                return;
            }


            // ====================================================
            // NATIVE ENTRA SMS / EMAIL MFA
            // ====================================================

            setLoading(true);


            try {

                const result =
                    await requestMfaChallenge(
                        method
                    );


                console.log(
                    "Native MFA challenge result:",
                    result
                );


                setStep("mfaCode");

            }
            catch (err) {

                console.error(
                    "Unable to request MFA challenge:",
                    err
                );


                setError(
                    err?.message ||
                    "Unable to request MFA challenge."
                );

            }
            finally {

                setLoading(false);
            }

        }, [
            clearMessages
        ]);


    // ============================================================
    // APPLICATION MFA CODE SUBMIT
    //
    // Used for an ALREADY ENROLLED user.
    // ============================================================

    const handleMfaSubmit =
        useCallback(async () => {

            clearMessages();


            const enteredCode =
                code.trim();


            if (!enteredCode) {

                setError(
                    "Enter the six-digit verification code."
                );

                return;
            }


            if (
                enteredCode.length !== 6 ||
                !/^\d{6}$/.test(enteredCode)
            ) {

                setError(
                    "The verification code must contain six digits."
                );

                return;
            }


            setLoading(true);


            try {

                // =================================================
                // APPLICATION AUTHENTICATOR
                // =================================================

                if (
                    activeMfaMethod?.type ===
                    "application-authenticator"
                ) {

                    const result =
                        await verifyApplicationAuthenticator(
                            enteredCode
                        );


                    if (result.success) {

                        setIsApplicationAuthenticated(
                            true
                        );


                        setSuccess(
                            result.message
                        );


                        setStep(
                            "authenticated"
                        );
                    }


                    return;
                }


                // =================================================
                // NATIVE ENTRA SMS / EMAIL
                // =================================================

                const result =
                    await submitMfaChallenge(
                        enteredCode
                    );


                if (
                    result?.step ===
                    "completed"
                ) {

                    await handleAuthenticationCompleted(
                        result.authenticationResult
                    );

                }
                else {

                    setStep(
                        result?.step ||
                        "mfa"
                    );
                }

            }
            catch (err) {

                console.error(
                    "MFA verification error:",
                    err
                );


                setError(
                    err?.message ||
                    "MFA verification failed."
                );

            }
            finally {

                setLoading(false);
            }

        }, [
            code,
            activeMfaMethod,
            clearMessages,
            verifyApplicationAuthenticator,
            handleAuthenticationCompleted
        ]);


    // ============================================================
    // NEW USER ENROLLMENT CODE SUBMIT
    //
    // Flow:
    //
    // /api/mfa/enrol/verify
    //       |
    //       v
    // UserMfas created
    //       |
    //       v
    // /api/mfa/verify
    //       |
    //       v
    // mfa_session cookie created
    // ============================================================

    const handleEnrollmentSubmit =
        useCallback(async () => {

            clearMessages();


            const enteredCode =
                enrollmentCode.trim();


            if (!enteredCode) {

                setError(
                    "Enter the six-digit Authenticator code."
                );

                return;
            }


            if (
                enteredCode.length !== 6 ||
                !/^\d{6}$/.test(enteredCode)
            ) {

                setError(
                    "The verification code must contain six digits."
                );

                return;
            }


            setLoading(true);


            try {

                console.log(
                    "========== VERIFYING NEW MFA ENROLLMENT =========="
                );


                // =================================================
                // STEP 1
                //
                // Verify and persist the new Authenticator.
                // =================================================

                await verifyApplicationMfaEnrollment(
                    enteredCode
                );


                // =================================================
                // STEP 2
                //
                // Use the same code against /api/mfa/verify.
                //
                // This creates the mfa_session cookie.
                // =================================================

                const result =
                    await verifyApplicationAuthenticator(
                        enteredCode
                    );


                if (!result.success) {

                    throw new Error(
                        "Enrollment completed but application MFA verification failed."
                    );
                }


                // =================================================
                // APPLICATION AUTHENTICATION COMPLETE
                // =================================================

                setIsApplicationAuthenticated(
                    true
                );


                setMfaEnrollmentStatus({
                    enrolled: true,
                    enabled: true
                });


                const authenticatorMethod = {
                    ...APPLICATION_AUTHENTICATOR_METHOD
                };


                setMfaMethods([
                    authenticatorMethod
                ]);


                setSelectedMfaMethod(
                    authenticatorMethod
                );


                setActiveMfaMethod(
                    authenticatorMethod
                );


                setSuccess(
                    "Microsoft Authenticator enrollment completed successfully."
                );


                setStep(
                    "authenticated"
                );

            }
            catch (err) {

                console.error(
                    "MFA enrollment error:",
                    err
                );


                setError(
                    err?.message ||
                    "Unable to complete MFA enrollment."
                );

            }
            finally {

                setLoading(false);
            }

        }, [
            enrollmentCode,
            clearMessages,
            verifyApplicationMfaEnrollment,
            verifyApplicationAuthenticator
        ]);


    // ============================================================
    // STANDARD NATIVE VERIFICATION CODE
    // ============================================================

    const handleCodeSubmit =
        useCallback(async () => {

            clearMessages();

            setLoading(true);


            try {

                const result =
                    await submitVerificationCode(
                        code
                    );


                console.log(
                    "Verification code result:",
                    result
                );


                if (
                    result?.step === "mfa"
                ) {

                    setMfaMethods(
                        buildCustomMfaMethods()
                    );

                    setStep("mfa");

                }
                else if (
                    result?.step === "completed"
                ) {

                    await handleAuthenticationCompleted(
                        result.authenticationResult
                    );

                }
                else {

                    setStep(
                        result?.step ||
                        "code"
                    );
                }

            }
            catch (err) {

                console.error(
                    "Verification code error:",
                    err
                );


                setError(
                    err?.message ||
                    "Verification failed."
                );

            }
            finally {

                setLoading(false);
            }

        }, [
            code,
            clearMessages,
            buildCustomMfaMethods,
            handleAuthenticationCompleted
        ]);


    // ============================================================
    // REGISTRATION
    // ============================================================

    const loadRegistrationMethods =
        useCallback(async () => {

            setLoading(true);


            try {

                const result =
                    await getRegistrationMethods();


                setRegistrationMethods(
                    result || []
                );


                setStep(
                    "registration"
                );

            }
            catch (err) {

                console.error(
                    "Unable to load registration methods:",
                    err
                );


                setError(
                    err?.message ||
                    "Unable to load registration methods."
                );

            }
            finally {

                setLoading(false);
            }

        }, []);


    const handleRegistrationMethodSubmit =
        useCallback(async () => {

            clearMessages();

            setLoading(true);


            try {

                const result =
                    await registerAuthenticationMethod(
                        selectedRegistrationMethod
                    );


                console.log(
                    "Registration result:",
                    result
                );


                setRegistrationState(
                    result
                );


                setStep(
                    "registration-code"
                );

            }
            catch (err) {

                console.error(
                    "Registration error:",
                    err
                );


                setError(
                    err?.message ||
                    "Unable to register authentication method."
                );

            }
            finally {

                setLoading(false);
            }

        }, [
            selectedRegistrationMethod,
            clearMessages
        ]);


    const handleRegistrationCodeSubmit =
        useCallback(async () => {

            clearMessages();

            setLoading(true);


            try {

                const result =
                    await verifyAuthenticationMethod(
                        registrationCode
                    );


                console.log(
                    "Registration verification result:",
                    result
                );


                if (
                    result?.authenticationResult
                ) {

                    await handleAuthenticationCompleted(
                        result.authenticationResult
                    );

                }
                else {

                    setRegistrationState(
                        result
                    );


                    setSuccess(
                        "Registration completed."
                    );


                    setStep(
                        "registration"
                    );
                }

            }
            catch (err) {

                console.error(
                    "Registration verification error:",
                    err
                );


                setError(
                    err?.message ||
                    "Registration verification failed."
                );

            }
            finally {

                setLoading(false);
            }

        }, [
            registrationCode,
            clearMessages,
            handleAuthenticationCompleted
        ]);


    // ============================================================
    // BACK
    // ============================================================

    const handleBack =
        useCallback(() => {

            clearMessages();


            if (
                step === "authenticated"
            ) {

                setIsApplicationAuthenticated(
                    false
                );


                setStep(
                    "mfaCode"
                );

                return;
            }


            if (
                step === "mfaEnrollment"
            ) {

                setEnrollmentData(null);

                setEnrollmentCode("");


                setStep(
                    "password"
                );

                return;
            }


            if (
                step === "mfaCode"
            ) {

                setCode("");


                setStep(
                    "mfa"
                );

                return;
            }


            if (
                step === "mfa"
            ) {

                setStep(
                    "email"
                );

                return;
            }


            if (
                step === "password"
            ) {

                setPassword("");


                setStep(
                    "email"
                );

                return;
            }


            if (
                step === "code"
            ) {

                setCode("");


                setStep(
                    "password"
                );

                return;
            }


            if (
                step === "registration"
            ) {

                setStep(
                    "email"
                );

                return;
            }


            if (
                step === "registration-code"
            ) {

                setRegistrationCode("");


                setStep(
                    "registration"
                );
            }

        }, [
            step,
            clearMessages
        ]);


    // ============================================================
    // CLEAR APPLICATION AUTHENTICATION
    // ============================================================

    const clearApplicationAuthentication =
        useCallback(() => {

            setIsApplicationAuthenticated(
                false
            );


            setUsername("");

            setPassword("");

            setCode("");


            setMfaMethods([]);

            setSelectedMfaMethod(null);

            setActiveMfaMethod(null);


            setMfaEnrollmentStatus(null);

            setEnrollmentData(null);

            setEnrollmentCode("");


            setRegistrationMethods([]);

            setSelectedRegistrationMethod(null);

            setRegistrationContact("");

            setRegistrationCode("");

            setRegistrationState(null);


            setError("");

            setSuccess("");


            nativeAuthenticationResultRef.current =
                null;


            clearCompletedAuthenticationResult();

            clearSignInState();


            setStep(
                "email"
            );

        }, []);


    // ============================================================
    // LOGOUT
    // ============================================================

    const logout =
        useCallback(() => {

            clearApplicationAuthentication();

        }, [
            clearApplicationAuthentication
        ]);


    // ============================================================
    // RETURN
    // ============================================================

    return {

        // --------------------------------------------
        // Login state
        // --------------------------------------------

        username,
        setUsername,

        password,
        setPassword,

        code,
        setCode,


        // --------------------------------------------
        // Application authentication
        // --------------------------------------------

        isApplicationAuthenticated,

        isAuthenticated:
            isApplicationAuthenticated,


        // --------------------------------------------
        // MFA
        // --------------------------------------------

        mfaMethods,

        selectedMfaMethod,
        setSelectedMfaMethod,

        activeMfaMethod,

        mfaEnrollmentStatus,

        enrollmentData,

        enrollmentCode,
        setEnrollmentCode,


        // --------------------------------------------
        // Registration
        // --------------------------------------------

        registrationMethods,

        selectedRegistrationMethod,
        setSelectedRegistrationMethod,

        registrationContact,
        setRegistrationContact,

        registrationCode,
        setRegistrationCode,

        registrationState,


        // --------------------------------------------
        // UI
        // --------------------------------------------

        step,

        loading,

        error,

        success,

        showPassword,
        setShowPassword,

        remember,
        setRemember,


        // --------------------------------------------
        // Login / MFA handlers
        // --------------------------------------------

        handleEmailSubmit,

        handlePasswordSubmit,

        handleCodeSubmit,

        handleMfaMethodSubmit,

        handleMfaSubmit,

        handleEnrollmentSubmit,

        handleBack,


        // --------------------------------------------
        // Registration handlers
        // --------------------------------------------

        handleRegistrationMethodSubmit,

        handleRegistrationSubmit:
            handleRegistrationMethodSubmit,

        handleRegistrationCodeSubmit,


        // --------------------------------------------
        // Application MFA
        // --------------------------------------------

        startApplicationMfaEnrollment,

        checkApplicationMfaStatus,

        verifyApplicationMfaEnrollment,

        verifyApplicationAuthenticator,


        // --------------------------------------------
        // Authentication
        // --------------------------------------------

        handleAuthenticationCompleted,

        handlePasswordAuthenticationCompleted,

        getAccessToken,

        callApi,

        logout,

        clearApplicationAuthentication,


        // --------------------------------------------
        // Native registration
        // --------------------------------------------

        loadRegistrationMethods,

        selectPreferredRegistrationMethod
    };
};


export default useNativeLogin;