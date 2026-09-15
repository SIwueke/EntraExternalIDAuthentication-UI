import {
    useEffect,
    useState
} from "react";

import {
    startSignIn,
    submitPassword,
    submitVerificationCode,
    clearSignInState,
    submitMfaChallenge,
    requestMfaChallenge,
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
    // AUTHENTICATION STATE
    // ============================================================

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [code, setCode] = useState("");
    const [mfaMethods, setMfaMethods] = useState([]);
    const [selectedMfaMethod, setSelectedMfaMethod] =  useState("");
    const [activeMfaMethod, setActiveMfaMethod] = useState(null);
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

    const handleAuthenticationCompleted = (result) => {

        console.log(
            "Authentication completed:",
            result
        );


        setSuccess(
            "Sign in successful."
        );


        // --------------------------------------------------------
        // Remember-me
        // --------------------------------------------------------

        if (remember) {

            localStorage.setItem(
                "rememberLogin",
                "true"
            );

        }
        else {

            localStorage.removeItem(
                "rememberLogin"
            );

        }


        // --------------------------------------------------------
        // Redirect intentionally disabled.
        // --------------------------------------------------------

        console.log(
            "AUTHENTICATION COMPLETED - NOT REDIRECTING YET"
        );

    };


    // ============================================================
    // EMAIL SUBMISSION
    // ============================================================

    const handleEmailSubmit = async (event) => {

        event.preventDefault();

        clearMessages();
        setLoading(true);


        try {

            const result =
                await startSignIn(
                    username.trim()
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

                    setStep("password");
                    break;


                case "code":

                    setCode("");
                    setStep("code");
                    break;


                case "mfa":

                    setCode("");
                    setStep("mfa");
                    break;


                case "authMethodRegistration":

                    configureRegistrationState(
                        result.state
                    );

                    setStep("registration");
                    break;


                case "completed":

                    handleAuthenticationCompleted(
                        result
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
                "submitPassword result:",
                result
            );


            if (!result?.success) {

                setError(
                    result?.message ||
                    "Password authentication failed."
                );

                return;
            }


            switch (result.step) {

                // ------------------------------------------------
                // MFA
                // ------------------------------------------------

                case "mfa": {
                    const methods = result.authMethods ?? [];

                    if (!methods.length) {
                        setError("No MFA authentication method is available.");
                        return;
                    }

                    console.log(
                        "========== MFA METHODS RECEIVED =========="
                    );

                    console.log(
                        "Number of MFA methods:",
                        methods.length
                    );

                    methods.forEach((method, index) => {
                        console.log(
                            `MFA method ${index + 1}:`,
                            JSON.stringify(method, null, 2)
                        );

                        console.log(
                            `MFA method ${index + 1} ID:`,
                            method?.id
                        );

                        console.log(
                            `MFA method ${index + 1} challenge type:`,
                            method?.challenge_type
                        );

                        console.log(
                            `MFA method ${index + 1} challenge channel:`,
                            method?.challenge_channel
                        );

                        console.log(
                            `MFA method ${index + 1} login hint:`,
                            method?.login_hint
                        );
                    });

                    console.log(
                        "=========================================="
                    );

                    setMfaMethods(methods);
                    setSelectedMfaMethod("");
                    setCode("");
                    setStep("mfa");

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
                // Password expired
                // ------------------------------------------------

                case "passwordExpired":

                    setStep("passwordReset");
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
// MFA METHOD SELECTION
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
            console.log("Selected MFA method:",
                selectedMfaMethod
            );
            const selectedMethod = mfaMethods.find(
                (method) => method?.id === selectedMfaMethod
            );

            console.log("Selected MFA method details:",
                selectedMethod
            );
            setActiveMfaMethod(selectedMethod);
            const challengeResult =
                await requestMfaChallenge(
                    selectedMfaMethod
                );
            console.log("MFA challenge result:", challengeResult);
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
                setStep("mfaCode");
                return;
            }
            if (
                challengeResult.step ===
                "completed"
            ) {
                handleAuthenticationCompleted(
                    challengeResult
                );
                return;
            }
            if (challengeResult.step === "mfa") 
            {
                setStep("mfa");
                return;
            }
            setError(
                challengeResult.message ||
                "Unexpected MFA response."
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

    const handleMfaSubmit = async (event) => {

        event.preventDefault();

        clearMessages();
        setLoading(true);


        try {

            const result =
                await submitMfaChallenge(
                    code
                );


            console.log(
                "submitMfaChallenge result:",
                result
            );


            if (!result?.success) {

                if (
                    result.step ===
                    "passwordExpired"
                ) {

                    setStep("passwordReset");

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

                    handleAuthenticationCompleted(
                        result
                    );

                    break;


                case "mfa":

                    setStep("mfa");
                    break;


                case "mfaCode":

                    setStep("mfa");
                    break;


                case "passwordExpired":

                    setStep("passwordReset");
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

                    handleAuthenticationCompleted(
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

            const result =
                await submitVerificationCode(
                    code
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

                    handleAuthenticationCompleted(
                        result
                    );

                    break;


                case "mfa":

                    setStep("mfa");
                    break;


                case "code":

                    setStep("code");
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
        // ============================================================
        // BACK BUTTON
        // ============================================================

        const handleBack = () => {

            clearMessages();


            switch (step) {

                case "mfaCode":

                    setCode("");
                    setSelectedMfaMethod("");
                    setStep("mfa");
                    break;


                case "mfa":

                    setCode("");
                    setSelectedMfaMethod("");
                    setMfaMethods([]);
                    clearSignInState();
                    setStep("email");
                    break;


                case "password":

                    setPassword("");
                    clearSignInState();
                    setStep("email");
                    break;


                case "code":

                    setCode("");
                    setStep("password");
                    break;


                case "registration":

                    setRegistrationState(null);
                    setRegistrationMethods([]);
                    setSelectedRegistrationMethod("");
                    setRegistrationContact("");
                    setRegistrationCode("");

                    clearSignInState();

                    setStep("email");

                    break;


                case "registration-code":

                    setRegistrationCode("");
                    setStep("registration");

                    break;


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
            // MFA state
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