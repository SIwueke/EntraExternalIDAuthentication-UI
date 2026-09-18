import {useEffect, useRef, useState} from "react";
import {
    startSignIn,
    submitPassword,
    submitVerificationCode,
    clearSignInState,
    submitMfaChallenge,
    requestMfaChallenge,
    getNativeAccessToken,
    getCurrentUser
} from "../auth/nativeAuthService";

import {
    registerAuthenticationMethod,
    verifyAuthenticationMethod,
    getRegistrationMethods,
    selectPreferredRegistrationMethod
} from "../auth/authRegistrationService";


const useNativeLogin = () => {

    // ============================================================
    // APPLICATION MFA IDENTIFIERS
    // ============================================================

    const APPLICATION_AUTHENTICATOR_ID =   "application-authenticator";


    // ============================================================
    // AUTHENTICATION STATE
    // ============================================================

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [code, setCode] = useState("");


    // ============================================================
    // NATIVE MFA STATE
    // ============================================================

    const [mfaMethods, setMfaMethods] = useState([]);

    const [selectedMfaMethod, setSelectedMfaMethod] =    useState("");

    const [activeMfaMethod, setActiveMfaMethod] =  useState(null);


    // ============================================================
    // MFA REGISTRATION STATE
    // ============================================================

    const [registrationMethods, setRegistrationMethods] =  useState([]);

    const [selectedRegistrationMethod, setSelectedRegistrationMethod] =  useState("");

    const [registrationContact, setRegistrationContact] =  useState("");

    const [registrationCode, setRegistrationCode] = useState("");

    const [registrationState, setRegistrationState] =  useState(null);


    // ============================================================
    // UI STATE
    // ============================================================

    const [step, setStep] = useState("email");

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState("");

    const [success, setSuccess] = useState("");

    const [showPassword, setShowPassword] =   useState(false);

    const [remember, setRemember] =     useState(false);

  const nativeAuthenticationResultRef =  useRef(null);
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
    // HANDLE AUTHENTICATION COMPLETED
    // ============================================================

    const handleAuthenticationCompleted =  async (authenticationResult) => {

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

        nativeAuthenticationResultRef.current =      authenticationResult;

        console.log(
            "Native authentication result stored."
        );

        console.log(
            "Stored authentication result:",
            nativeAuthenticationResultRef.current
        );

        setSuccess(true);
    };


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

                // ------------------------------------------------
                // Password
                // ------------------------------------------------

                case "password":

                    setStep("password");

                    break;


                // ------------------------------------------------
                // Existing verification code
                // ------------------------------------------------

                case "code":

                    setCode("");

                    setStep("code");

                    break;


                // ------------------------------------------------
                // MFA method selection
                // ------------------------------------------------

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

                    setStep("mfa");

                    break;
                }


                // ------------------------------------------------
                // Authentication method registration
                // ------------------------------------------------

                case "authMethodRegistration":

                    configureRegistrationState(
                        result.state
                    );

                    setStep("registration");

                    break;


                // ------------------------------------------------
                // Completed
                // ------------------------------------------------

                case "completed":

                    handleAuthenticationCompleted(
                        result
                    );

                    break;


                // ------------------------------------------------
                // Unexpected
                // ------------------------------------------------

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
    // ============================================================

    const buildCustomMfaMethods = (entraMethods) => {

        const methods =
            Array.isArray(entraMethods)
                ? entraMethods
                : [];


        console.log(
            "========== BUILDING CUSTOM MFA METHODS =========="
        );

        console.log(
            "Entra MFA methods:",
            methods
        );


        // --------------------------------------------------------
        // Find Entra SMS
        // --------------------------------------------------------

        const smsMethod =
            methods.find(
                (method) =>
                    method?.challenge_channel === "sms"
            );


        // --------------------------------------------------------
        // Find Entra Email
        // --------------------------------------------------------

        const emailMethod =
            methods.find(
                (method) =>
                    method?.challenge_channel === "email"
            );


        // --------------------------------------------------------
        // Application Microsoft Authenticator
        // --------------------------------------------------------

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


        // --------------------------------------------------------
        // Build the three options
        // --------------------------------------------------------

        const customMethods = [
            authenticatorMethod
        ];


        if (smsMethod) {

            customMethods.push(
                smsMethod
            );

        }


        if (emailMethod) {

            customMethods.push(
                emailMethod
            );

        }


        console.log(
            "========== CUSTOM MFA METHODS =========="
        );

        customMethods.forEach(
            (method, index) => {

                console.log(
                    `Custom MFA method ${index + 1}:`,
                    {
                        id:
                            method?.id,

                        challenge_type:
                            method?.challenge_type,

                        challenge_channel:
                            method?.challenge_channel,

                        login_hint:
                            method?.login_hint
                    }
                );

            }
        );


        return customMethods;
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

                // ------------------------------------------------
                // Password expired
                // ------------------------------------------------

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

                // ------------------------------------------------
                // MFA method selection
                // ------------------------------------------------

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

                    setCode(
                        ""
                    );

                    setStep(
                        "mfa"
                    );

                    break;
                }


                // ------------------------------------------------
                // Existing verification code
                // ------------------------------------------------

                case "code":

                    setCode("");

                    setStep("code");

                    break;


                // ------------------------------------------------
                // MFA registration
                // ------------------------------------------------

                case "authMethodRegistration":

                    configureRegistrationState(
                        result.state
                    );

                    setStep(
                        "registration"
                    );

                    break;


                // ------------------------------------------------
                // Completed
                // ------------------------------------------------

                case "completed":

                    handleAuthenticationCompleted(
                        result
                    );

                    break;


                // ------------------------------------------------
                // Password expired
                // ------------------------------------------------

                case "passwordExpired":

                    setStep(
                        "passwordReset"
                    );

                    break;


                // ------------------------------------------------
                // Unexpected
                // ------------------------------------------------

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

            // ----------------------------------------------------
            // Make sure a method was selected
            // ----------------------------------------------------

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


            // ----------------------------------------------------
            // Find selected method
            // ----------------------------------------------------

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

            if (selectedMethod.id ===  APPLICATION_AUTHENTICATOR_ID) {

               console.log(
                    "========== AUTHENTICATOR SELECTION =========="
                );

                console.log(
                    "Current native authentication result:",
                    nativeAuthenticationResultRef.current
                );

                console.log(
                    "Selected MFA method:",
                    selectedMethod
                );

                setActiveMfaMethod(selectedMethod);

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

            console.log(
                "Challenge method:",
                selectedMethod
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


            // ----------------------------------------------------
            // Challenge requires code
            // ----------------------------------------------------

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


            // ----------------------------------------------------
            // Authentication completed
            // ----------------------------------------------------

            if (
                challengeResult.step ===
                "completed"
            ) {

                handleAuthenticationCompleted(
                    challengeResult
                );

                return;
            }


            // ----------------------------------------------------
            // Still waiting for MFA
            // ----------------------------------------------------

            if (
                challengeResult.step ===
                "mfa"
            ) {

                setStep(
                    "mfa"
                );

                return;
            }


            // ----------------------------------------------------
            // Unexpected result
            // ----------------------------------------------------

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

    const verifyApplicationAuthenticator =    async (enteredCode) => {

        console.log(
            "========== VERIFYING APPLICATION AUTHENTICATOR =========="
        );

        try {

            const authenticationResult = nativeAuthenticationResultRef.current;

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

            const accessToken =  await getNativeAccessToken(authenticationResult);

            if (!accessToken) {

                throw new Error(
                    "Unable to obtain the Entra access token."
                );

            }

            console.log(
                "Native access token acquired."
            );

            // The rest of your existing fetch code follows...
            // ----------------------------------------------------
            // Call existing application MFA endpoint
            // ----------------------------------------------------

            const response = await fetch("https://localhost:7290/api/mfa/verify",
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
                "Application MFA HTTP status:",
                response.status
            );


            // ----------------------------------------------------
            // Read response safely
            // ----------------------------------------------------

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

                responseBody =
                    await response.json();

            }
            else {

                responseBody =
                    await response.text();

            }


            console.log(
                "Application MFA response:",
                responseBody
            );


            // ----------------------------------------------------
            // Invalid TOTP
            // ----------------------------------------------------

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


                return {
                    success: false,
                    message
                };
            }


            // ----------------------------------------------------
            // Successful TOTP verification
            // ----------------------------------------------------

            return {
                success: true,

                message:
                    responseBody?.message ||
                    "MFA verification successful."
            };

        }
        catch (err) {

            console.error(
                "Application Authenticator verification error:",
                err
            );

            return {
                success: false,

                message:
                    getErrorMessage(err) ||
                    "Unable to verify Microsoft Authenticator code."
            };
        }
    };
    
    // ============================================================
    // NATIVE MFA CODE SUBMISSION
    // ============================================================

    const handleMfaSubmit = async (event) => {

        if (
            event &&
            typeof event.preventDefault === "function"
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
            // APPLICATION AUTHENTICATOR / TOTP
            // ====================================================

            if (
                activeMfaMethod?.id ===     APPLICATION_AUTHENTICATOR_ID
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
                // TOTP verified
                // ------------------------------------------------

                console.log(
                    "========== APPLICATION MFA SUCCESS =========="
                );


                setCode("");


                setSuccess(
                    result?.message ||
                    "MFA verification successful."
                );


                /*
                 * The API has now:
                 *
                 * 1. Validated the TOTP
                 * 2. Updated LastUsedUtc
                 * 3. Created an application MFA session
                 * 4. Set the HttpOnly mfa_session cookie
                 *
                 * Do NOT call submitMfaChallenge() here.
                 *
                 * This Authenticator code belongs to the
                 * application's TOTP service, not the native
                 * Entra SMS/email challenge.
                 */

                await handleAuthenticationCompleted(
                    result
                );


                return;
            }


            // ====================================================
            // EXISTING ENTRA SMS / EMAIL
            // ====================================================

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
                "Result constructor:",
                result?.constructor?.name
            );

            console.log(
                "Result step:",
                result?.step
            );

            console.log(
                "Result success:",
                result?.success
            );

            console.log(
                "Result message:",
                result?.message
            );

            console.log(
                "Result error:",
                result?.error
            );

            console.log(
                "Result errorDescription:",
                result?.errorDescription
            );

            console.log(
                "Result errorCode:",
                result?.errorCode
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
                "========================================"
            );


            if (!result?.success) {

                // ------------------------------------------------
                // Password expired
                // ------------------------------------------------

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

                // ------------------------------------------------
                // Completed
                // ------------------------------------------------

                case "completed":

                    handleAuthenticationCompleted(
                        result
                    );

                    break;


                // ------------------------------------------------
                // Another MFA method selection required
                // ------------------------------------------------

                case "mfa":

                    setCode("");

                    setStep(
                        "mfa"
                    );

                    break;


                // ------------------------------------------------
                // Another MFA code required
                // ------------------------------------------------

                case "mfaCode":

                    setCode("");

                    setStep(
                        "mfaCode"
                    );

                    break;


                // ------------------------------------------------
                // Password expired
                // ------------------------------------------------

                case "passwordExpired":

                    setStep(
                        "passwordReset"
                    );

                    break;


                // ------------------------------------------------
                // Unexpected
                // ------------------------------------------------

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

                // ------------------------------------------------
                // Verification required
                // ------------------------------------------------

                case "verificationRequired":

                    setRegistrationState(
                        result.state
                    );

                    setRegistrationCode(
                        ""
                    );

                    setStep(
                        "registration-code"
                    );

                    setSuccess(
                        `A verification code has been sent to ${contact}.`
                    );

                    break;


                // ------------------------------------------------
                // Completed
                // ------------------------------------------------

                case "completed":

                    handleAuthenticationCompleted(
                        result
                    );

                    break;


                // ------------------------------------------------
                // Unexpected
                // ------------------------------------------------

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

                        handleAuthenticationCompleted(
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

                // ------------------------------------------------
                // Completed
                // ------------------------------------------------

                case "completed":

                    handleAuthenticationCompleted(
                        result
                    );

                    break;


                // ------------------------------------------------
                // MFA
                // ------------------------------------------------

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


                // ------------------------------------------------
                // Another code required
                // ------------------------------------------------

                case "code":

                    setCode("");

                    setStep(
                        "code"
                    );

                    break;


                // ------------------------------------------------
                // Unexpected
                // ------------------------------------------------

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

                clearSignInState();

                setStep(
                    "email"
                );

                break;


            // ----------------------------------------------------
            // Password → email
            // ----------------------------------------------------

            case "password":

                setPassword("");

                clearSignInState();

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

                setRegistrationState(
                    null
                );

                setRegistrationMethods(
                    []
                );

                setSelectedRegistrationMethod(
                    ""
                );

                setRegistrationContact(
                    ""
                );

                setRegistrationCode(
                    ""
                );

                clearSignInState();

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