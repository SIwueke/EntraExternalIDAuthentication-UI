
import { useCallback, useRef, useState } from "react";

import {
    startSignIn,
    submitPassword,
    submitVerificationCode,
    submitPasswordResetCode,
    submitNewPassword,
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

const MFA_ENROL_URL = "/api/mfa/enrol";

const MFA_ENROL_VERIFY_URL = "/api/mfa/enrol/verify";

const MFA_VERIFY_URL = "/api/mfa/verify";

const APPLICATION_AUTHENTICATOR_ID =
    "application-authenticator";


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

    const [newPassword, setNewPassword] =
        useState("");

    const [confirmPassword, setConfirmPassword] =
        useState("");

    const [remember, setRemember] =
        useState(false);

    const [passwordResetCode, setPasswordResetCode] =
        useState("");


    // ============================================================
    // ORIGINAL ENTRA AUTHENTICATION RESULT
    //
    // IMPORTANT:
    //
    // This reference contains ONLY the original Entra
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

    const getAuthenticationResult =
        useCallback(() => {

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

    const getBearerToken =
        useCallback(async () => {

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
    // ============================================================

    const callApplicationMfaApi =
        useCallback(
            async (url, options = {}) => {

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
            [
                getBearerToken
            ]
        );


    // ============================================================
    // BUILD APPLICATION MFA METHODS
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

            setStep(
                "mfaEnrollment"
            );

            return data;

        }, [
            callApplicationMfaApi
        ]);


    // ============================================================
    // CHECK APPLICATION MFA STATUS
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

            setMfaEnrollmentStatus(
                status
            );

            const enrolled =
                status?.enrolled === true;

            const enabled =
                status?.enabled === true;


            // ====================================================
            // ALREADY ENROLLED
            // ====================================================

            if (
                enrolled &&
                enabled
            ) {

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

                setStep(
                    "mfaCode"
                );

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
    // Then application MFA is checked.
    // ============================================================

    const handlePasswordAuthenticationCompleted =
        useCallback(
            async (authenticationResult) => {

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

                    setStep(
                        "password"
                    );

                }
                finally {

                    setLoading(false);
                }

            },
            [
                checkApplicationMfaStatus,
                clearMessages
            ]
        );


    // ============================================================
    // GENERIC AUTHENTICATION COMPLETED
    // ============================================================

    const handleAuthenticationCompleted =
        useCallback(
            async (authenticationResult) => {

                await handlePasswordAuthenticationCompleted(
                    authenticationResult
                );

            },
            [
                handlePasswordAuthenticationCompleted
            ]
        );


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
    // ============================================================

    const callApi =
        useCallback(
            async (url, options = {}) => {

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
                getAccessToken
            ]
        );


    // ============================================================
    // EMAIL SUBMIT
    // ============================================================

    const handleEmailSubmit = async () => {

        console.log(
            "=================================================="
        );

        console.log(
            "========== HANDLE EMAIL SUBMIT ==================="
        );

        console.log(
            "Username:",
            username
        );

        try {

            setError("");
            setSuccess("");
            setLoading(true);


            const result =
                await startSignIn(username);


            console.log(
                "=================================================="
            );

            console.log(
                "========== START SIGN-IN RETURNED ==============="
            );

            console.log(
                "Result:",
                result
            );

            console.log(
                "Result success:",
                result?.success
            );

            console.log(
                "Result step:",
                result?.step
            );

            console.log(
                "Result message:",
                result?.message
            );

            console.log(
                "Result state:",
                result?.state
            );

            console.log(
                "Result state constructor:",
                result?.state?.constructor?.name
            );

            console.log(
                "=================================================="
            );


            if (!result) {

                console.error(
                    "startSignIn returned null/undefined."
                );

                setError(
                    "Sign-in returned no result."
                );

                return;

            }


            if (!result.success) {

                console.error(
                    "Initial sign-in failed:",
                    result
                );

                setError(
                    result.message ||
                    "Unable to start sign-in."
                );

                return;

            }


            // --------------------------------------------------
            // PASSWORD
            // --------------------------------------------------

            if (
                result.step === "password"
            ) {

                console.log(
                    "========== MOVING TO PASSWORD STEP =========="
                );

                setStep("password");

                return;

            }


            // --------------------------------------------------
            // CODE
            // --------------------------------------------------

            if (
                result.step === "code"
            ) {

                console.log(
                    "========== MOVING TO CODE STEP =========="
                );

                setStep("code");

                return;

            }


            // --------------------------------------------------
            // MFA
            // --------------------------------------------------

            if (
                result.step === "mfa"
            ) {

                console.log(
                    "========== MOVING TO MFA STEP =========="
                );

                setStep("mfa");

                return;

            }


            // --------------------------------------------------
            // MFA CODE
            // --------------------------------------------------

            if (
                result.step === "mfaCode"
            ) {

                console.log(
                    "========== MOVING TO MFA CODE STEP =========="
                );

                setStep("mfaCode");

                return;

            }


            // --------------------------------------------------
            // AUTHENTICATION METHOD REGISTRATION
            // --------------------------------------------------

            if (
                result.step === "authMethodRegistration"
            ) {

                console.log(
                    "========== AUTH METHOD REGISTRATION =========="
                );

                setStep(
                    "authMethodRegistration"
                );

                return;

            }


            // --------------------------------------------------
            // COMPLETED
            // --------------------------------------------------

            if (
                result.step === "completed"
            ) {

                console.log(
                    "========== SIGN-IN COMPLETED =========="
                );

                setStep("completed");

                return;

            }


            // --------------------------------------------------
            // PASSWORD RESET CODE
            // --------------------------------------------------

            if (
                result.step === "passwordResetCode"
            ) {

                console.log(
                    "========== PASSWORD RESET CODE =========="
                );

                setStep("passwordResetCode");

                return;

            }


            // --------------------------------------------------
            // PASSWORD CHANGE
            // --------------------------------------------------

            if (
                result.step === "passwordChange"
            ) {

                console.log(
                    "========== PASSWORD CHANGE =========="
                );

                setStep("passwordChange");

                return;

            }


            // --------------------------------------------------
            // UNKNOWN
            // --------------------------------------------------

            console.error(
                "=================================================="
            );

            console.error(
                "========== UNEXPECTED SIGN-IN STEP =============="
            );

            console.error(
                "Step:",
                result.step
            );

            console.error(
                "Full result:",
                result
            );

            console.error(
                "=================================================="
            );


            setError(
                `Unexpected sign-in step: ${result.step}`
            );

        }
        catch (error) {

            console.error(
                "=================================================="
            );

            console.error(
                "========== HANDLE EMAIL SUBMIT ERROR ============="
            );

            console.error(
                "Error:",
                error
            );

            console.error(
                "Message:",
                error?.message
            );

            console.error(
                "Stack:",
                error?.stack
            );

            console.error(
                "=================================================="
            );


            setError(
                error?.message ||
                "Unable to start sign-in."
            );

        }
        finally {

            setLoading(false);

        }

    };
    // ============================================================
    // PASSWORD SUBMIT
    // ============================================================

    const handlePasswordSubmit =
        useCallback(async () => {

            console.log(
                "========== PASSWORD SUBMIT =========="
            );

            console.log(
                "Password supplied:",
                password ? "YES" : "NO"
            );

            console.log(
                "Current username:",
                username
            );

            clearMessages();

            setLoading(true);

            try {

                console.log(
                    "Calling submitPassword()..."
                );

                const result =
                    await submitPassword(
                        password
                    );

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
                    result?.step === "completed" &&
                    result?.authenticationResult
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

                if (
                    result.step === "code"
                ) {

                    console.log(
                        "Password authentication requires code."
                    );

                    setStep(
                        "code"
                    );

                    return;
                }


                // ========================================================
                // MFA
                // ========================================================

                if (
                    result.step === "mfa"
                ) {

                    console.log(
                        "Password authentication returned native MFA."
                    );

                    const methods =
                        buildCustomMfaMethods(
                            result.mfaMethods
                        );

                    setMfaMethods(
                        methods
                    );

                    setSelectedMfaMethod(
                        methods[0] ?? null
                    );

                    setStep(
                        "mfa"
                    );

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

                    setStep(
                        "registration"
                    );

                    return;
                }


                // ========================================================
                // PASSWORD RESET CODE REQUIRED
                // ========================================================

                if (
                    result?.step ===
                    "passwordResetCode"
                ) {

                    console.log(
                        "========== PASSWORD RESET CODE REQUIRED =========="
                    );

                    console.log(
                        "Entra has started the password reset flow."
                    );

                    console.log(
                        "A verification code has been sent."
                    );

                    setPasswordResetCode(
                        ""
                    );

                    setStep(
                        "passwordResetCode"
                    );

                    return;
                }


                // ========================================================
                // NEW PASSWORD REQUIRED
                // ========================================================

                if (
                    result?.step ===
                    "passwordChange"
                ) {

                    console.log(
                        "========== NEW PASSWORD REQUIRED =========="
                    );

                    console.log(
                        "The password reset flow is ready for a new password."
                    );

                    setNewPassword(
                        ""
                    );

                    setConfirmPassword(
                        ""
                    );

                    setStep(
                        "passwordChange"
                    );

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
                    result?.step
                );

                console.error(
                    "Unexpected password authentication result:",
                    result
                );

                setError(
                    result?.message ??
                    `Unexpected response received after password authentication. Step: ${
                        result?.step ?? "unknown"
                    }`
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

        }, [
            password,
            username,
            clearMessages,
            buildCustomMfaMethods,
            handlePasswordAuthenticationCompleted
        ]);


    // ============================================================
    // PASSWORD RESET CODE SUBMIT
    //
    // Flow:
    //
    // password reset started
    //      |
    //      v
    // passwordResetCode
    //      |
    //      v
    // submitPasswordResetCode()
    //      |
    //      v
    // passwordChange
    // ============================================================

    const handlePasswordResetCodeSubmit =
        useCallback(async () => {

            console.log(
                "========== PASSWORD RESET CODE SUBMIT =========="
            );

            clearMessages();

            const enteredCode =
                passwordResetCode.trim();

            if (!enteredCode) {

                setError(
                    "Enter the password reset verification code."
                );

                return;
            }

            setLoading(true);

            try {

                console.log(
                    "Submitting password reset code..."
                );

                const result =
                    await submitPasswordResetCode(
                        enteredCode
                    );

                console.log(
                    "========== PASSWORD RESET CODE RESULT =========="
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
                    "Result state:",
                    result?.state
                );


                if (!result) {

                    throw new Error(
                        "Password reset returned no result."
                    );
                }


                // ====================================================
                // NEW PASSWORD REQUIRED
                // ====================================================

                if (
                    result.step ===
                    "passwordChange"
                ) {

                    console.log(
                        "Password reset code accepted."
                    );

                    console.log(
                        "Navigating to new-password step."
                    );

                    setNewPassword(
                        ""
                    );

                    setConfirmPassword(
                        ""
                    );

                    setStep(
                        "passwordChange"
                    );

                    return;
                }


                // ====================================================
                // PASSWORD RESET COMPLETED
                //
                // This branch is retained for compatibility.
                // The normal password reset completion is handled
                // by handleNewPasswordSubmit().
                // ====================================================

                if (
                    result.step ===
                    "passwordChanged"
                ) {

                    console.log(
                        "Password reset completed."
                    );

                    setPasswordResetCode(
                        ""
                    );

                    setNewPassword(
                        ""
                    );

                    setConfirmPassword(
                        ""
                    );

                    setSuccess(
                        "Your password has been changed successfully."
                    );

                    setStep(
                        "password"
                    );

                    return;
                }


                // ====================================================
                // ERROR
                // ====================================================

                if (
                    result.success === false
                ) {

                    setError(
                        result.message ||
                        "Unable to verify the password reset code."
                    );

                    return;
                }


                console.warn(
                    "Unhandled password reset code result:",
                    result
                );

                setError(
                    result.message ||
                    "Unexpected response received while verifying the password reset code."
                );

            }
            catch (error) {

                console.error(
                    "========== PASSWORD RESET CODE ERROR =========="
                );

                console.error(
                    error
                );

                setError(
                    error?.message ||
                    "Unable to verify the password reset code."
                );

            }
            finally {

                setLoading(false);
            }

        }, [
            passwordResetCode,
            clearMessages
        ]);


    // ============================================================
    // SUBMIT NEW PASSWORD
    //
    // Flow:
    //
    // passwordResetCode
    //      |
    //      v
    // passwordChange
    //      |
    //      v
    // submitNewPassword()
    //      |
    //      v
    // passwordChanged
    //      |
    //      v
    // clear old authentication state
    //      |
    //      v
    // startSignIn(username)
    //      |
    //      v
    // NEW authentication transaction
    // ============================================================

    const handleNewPasswordSubmit =
        useCallback(async () => {

            console.log(
                "========== NEW PASSWORD SUBMIT =========="
            );

            clearMessages();

            const cleanNewPassword =
                String(
                    newPassword ?? ""
                );

            const cleanConfirmPassword =
                String(
                    confirmPassword ?? ""
                );


            // ====================================================
            // VALIDATION
            // ====================================================

            if (!cleanNewPassword) {

                setError(
                    "Please enter your new password."
                );

                return;
            }


            if (!cleanConfirmPassword) {

                setError(
                    "Please confirm your new password."
                );

                return;
            }


            if (
                cleanNewPassword !==
                cleanConfirmPassword
            ) {

                setError(
                    "The new passwords do not match."
                );

                return;
            }


            setLoading(true);


            try {

                // =================================================
                // CHANGE PASSWORD
                // =================================================

                console.log(
                    "Submitting new password..."
                );

                const result =
                    await submitNewPassword(
                        cleanNewPassword
                    );

                console.log(
                    "========== NEW PASSWORD RESULT =========="
                );

                console.log(
                    "Full result:",
                    result
                );

                console.log(
                    "Result step:",
                    result?.step
                );


                if (!result) {

                    throw new Error(
                        "Password change returned no result."
                    );
                }


                // =================================================
                // PASSWORD CHANGED
                //
                // IMPORTANT:
                //
                // The password-reset transaction is now finished.
                //
                // We MUST NOT call submitPassword() until a NEW
                // startSignIn() transaction has been created.
                // =================================================

                if (
                    result.step ===
                    "passwordChanged"
                ) {

                    console.log(
                        "========== PASSWORD CHANGE COMPLETED =========="
                    );

                    console.log(
                        "The password-reset transaction is finished."
                    );


                    // =================================================
                    // CLEAR OLD RESET TRANSACTION
                    // =================================================

                    clearSignInState();


                    // =================================================
                    // CLEAR OLD PASSWORD/RESET UI STATE
                    // =================================================

                    setPassword("");

                    setPasswordResetCode("");

                    setNewPassword("");

                    setConfirmPassword("");


                    // =================================================
                    // IMPORTANT:
                    //
                    // Start a BRAND-NEW sign-in transaction.
                    //
                    // Without this, submitPassword() produces:
                    //
                    // "No authentication state is active."
                    // =================================================

                    console.log(
                        "========== STARTING NEW SIGN-IN AFTER PASSWORD CHANGE =========="
                    );

                    console.log(
                        "Username for new sign-in:",
                        username
                    );


                    const signInResult =
                        await startSignIn(
                            username
                        );


                    console.log(
                        "========== NEW SIGN-IN RESULT =========="
                    );

                    console.log(
                        "Full result:",
                        signInResult
                    );

                    console.log(
                        "New sign-in step:",
                        signInResult?.step
                    );


                    if (!signInResult) {

                        throw new Error(
                            "Unable to start a new sign-in after changing the password."
                        );
                    }


                    // =================================================
                    // NEW SIGN-IN PASSWORD
                    // =================================================

                    if (
                        signInResult?.step ===
                        "password"
                    ) {

                        console.log(
                            "New sign-in requires password."
                        );

                        setSuccess(
                            "Your password has been changed successfully. Please enter your new password."
                        );

                        setStep(
                            "password"
                        );

                        return;
                    }


                    // =================================================
                    // NEW SIGN-IN CODE
                    // =================================================

                    if (
                        signInResult?.step ===
                        "code"
                    ) {

                        console.log(
                            "New sign-in requires verification code."
                        );

                        setSuccess(
                            "Your password has been changed successfully. A verification code is required."
                        );

                        setStep(
                            "code"
                        );

                        return;
                    }


                    // =================================================
                    // NEW SIGN-IN MFA
                    // =================================================

                    if (
                        signInResult?.step ===
                        "mfa"
                    ) {

                        console.log(
                            "New sign-in requires MFA."
                        );

                        const methods =
                            buildCustomMfaMethods(
                                signInResult?.mfaMethods
                            );

                        setMfaMethods(
                            methods
                        );

                        setSelectedMfaMethod(
                            methods[0] ?? null
                        );

                        setSuccess(
                            "Your password has been changed successfully. MFA is required."
                        );

                        setStep(
                            "mfa"
                        );

                        return;
                    }


                    // =================================================
                    // NEW SIGN-IN REGISTRATION
                    // =================================================

                    if (
                        signInResult?.step ===
                        "authMethodRegistration"
                    ) {

                        console.log(
                            "New sign-in requires authentication method registration."
                        );

                        setSuccess(
                            "Your password has been changed successfully. Authentication method registration is required."
                        );

                        setStep(
                            "registration"
                        );

                        return;
                    }


                    // =================================================
                    // NEW SIGN-IN COMPLETED DIRECTLY
                    // =================================================

                    if (
                        signInResult?.step ===
                        "completed"
                    ) {

                        console.log(
                            "New sign-in completed directly."
                        );

                        await handleAuthenticationCompleted(
                            signInResult.authenticationResult
                        );

                        return;
                    }


                    // =================================================
                    // UNEXPECTED NEW SIGN-IN STEP
                    // =================================================

                    console.error(
                        "Unexpected result after starting new sign-in:",
                        signInResult
                    );

                    setError(
                        signInResult?.message ||
                        `Unable to continue sign-in after password change. Step: ${
                            signInResult?.step ||
                            "unknown"
                        }`
                    );

                    return;
                }


                // =================================================
                // PASSWORD STILL REQUIRED
                // =================================================

                if (
                    result.step ===
                    "passwordChange"
                ) {

                    setStep(
                        "passwordChange"
                    );

                    if (result.message) {

                        setError(
                            result.message
                        );
                    }

                    return;
                }


                // =================================================
                // PASSWORD RESET CODE AGAIN
                // =================================================

                if (
                    result.step ===
                    "passwordResetCode"
                ) {

                    setStep(
                        "passwordResetCode"
                    );

                    return;
                }


                // =================================================
                // FAILURE
                // =================================================

                if (
                    result.success === false
                ) {

                    setError(
                        result.message ||
                        "Unable to change the password."
                    );

                    return;
                }


                // =================================================
                // UNHANDLED RESULT
                // =================================================

                console.warn(
                    "Unhandled new-password result:",
                    result
                );

                setError(
                    result.message ||
                    "Unexpected response received while changing the password."
                );

            }
            catch (error) {

                console.error(
                    "========== NEW PASSWORD ERROR =========="
                );

                console.error(
                    error
                );

                setError(
                    error?.message ||
                    "Unable to change the password."
                );

            }
            finally {

                setLoading(false);
            }

        }, [
            newPassword,
            confirmPassword,
            username,
            clearMessages,
            buildCustomMfaMethods,
            handleAuthenticationCompleted
        ]);


    // ============================================================
    // MFA METHOD SELECTION
    // ============================================================

    const handleMfaMethodSubmit =
        useCallback(async (method) => {

            clearMessages();

            setSelectedMfaMethod(
                method
            );

            setActiveMfaMethod(
                method
            );


            // ====================================================
            // APPLICATION AUTHENTICATOR
            // ====================================================

            if (
                method?.type ===
                "application-authenticator"
            ) {

                setCode("");

                setStep(
                    "mfaCode"
                );

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

                setStep(
                    "mfaCode"
                );

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
                // Create mfa_session cookie.
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

                    setStep(
                        "mfa"
                    );

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

                setEnrollmentData(
                    null
                );

                setEnrollmentCode(
                    ""
                );

                setStep(
                    "password"
                );

                return;
            }


            if (
                step === "mfaCode"
            ) {

                setCode(
                    ""
                );

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
                step === "passwordResetCode"
            ) {

                setPasswordResetCode(
                    ""
                );

                setStep(
                    "password"
                );

                return;
            }


            if (
                step === "passwordChange"
            ) {

                setNewPassword(
                    ""
                );

                setConfirmPassword(
                    ""
                );

                setStep(
                    "passwordResetCode"
                );

                return;
            }


            if (
                step === "password"
            ) {

                setPassword(
                    ""
                );

                setStep(
                    "email"
                );

                return;
            }


            if (
                step === "code"
            ) {

                setCode(
                    ""
                );

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

                setRegistrationCode(
                    ""
                );

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

            setPasswordResetCode("");

            setNewPassword("");

            setConfirmPassword("");

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

        handlePasswordResetCodeSubmit,

        handleNewPasswordSubmit,

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

        selectPreferredRegistrationMethod,


        // --------------------------------------------
        // Password reset
        // --------------------------------------------

        passwordResetCode,

        setPasswordResetCode,

        newPassword,

        setNewPassword,

        confirmPassword,

        setConfirmPassword

    };
};


export default useNativeLogin;

