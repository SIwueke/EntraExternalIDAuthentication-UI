
import {
    useState,
    useEffect
} from "react";

import {
    Alert,
    Box,
    Button,
    Card,
    Checkbox,
    CircularProgress,
    FormControlLabel,
    IconButton,
    Link,
    TextField,
    Typography
} from "@mui/material";

import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

import {
    AuthMethodRegistrationRequiredState,
    AuthMethodVerificationRequiredState
}
from "@azure/msal-browser/custom-auth";

import {
    startSignIn,
    submitPassword,
    submitVerificationCode,
    clearSignInState,
    submitMfaChallenge,
    requestMfaChallenge,
    getCurrentUser,
    getCurrentSignInState
} from "../auth/nativeAuthService";


const CustomLoginPage = () => {

    //--------------------------------------------------
    // Authentication state
    //--------------------------------------------------

    const [username, setUsername] =
        useState("");

    const [password, setPassword] =
        useState("");

    const [code, setCode] =
        useState("");

    //--------------------------------------------------
    // Registration state
    //--------------------------------------------------

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

    //--------------------------------------------------
    // UI state
    //--------------------------------------------------

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


    //--------------------------------------------------
    // Check current authentication
    //--------------------------------------------------

    useEffect(() => {

        const checkAuthentication = async () => {

            const result =
                await getCurrentUser();

            console.log(
                "========== CURRENT USER =========="
            );

            console.log(
                "Authenticated:",
                result.authenticated
            );

            console.log(
                "User data:",
                result.data
            );

            console.log(
                "=================================="
            );

        };

        checkAuthentication();

    }, []);


    //--------------------------------------------------
    // Error helper
    //--------------------------------------------------

    const getErrorMessage = (error) => {

        if (!error) {
            return "";
        }

        if (typeof error === "string") {
            return error;
        }

        return (
            error.message ??
            error.errorDescription ??
            "Unable to sign in."
        );

    };


    //--------------------------------------------------
    // Configure registration state
    //--------------------------------------------------

    const configureRegistrationState = (state) => {

        console.log(
            "========== MFA REGISTRATION REQUIRED =========="
        );

        console.log(
            "Registration state:",
            state
        );

        console.log(
            "Registration state constructor:",
            state?.constructor?.name
        );

        let methods = [];

        try {

            if (
                state &&
                typeof state.getAuthMethods === "function"
            ) {

                methods =
                    state.getAuthMethods() ?? [];

            }

        }
        catch (error) {

            console.error(
                "Unable to get registration methods:",
                error
            );

        }

        console.log(
            "Available registration methods:",
            methods
        );

        setRegistrationMethods(methods);

        //--------------------------------------------------
        // Prefer email OTP
        //--------------------------------------------------

        const emailMethod =
            methods.find(
                method => {

                    const value =
                        typeof method === "string"
                            ? method
                            : (
                                method?.type ??
                                method?.authMethodType ??
                                method?.name ??
                                ""
                            );

                    return value
                        .toLowerCase()
                        .includes("email");

                }
            );

        const selected =
            emailMethod ??
            methods[0] ??
            "";

        setSelectedRegistrationMethod(
            selected
        );

        //--------------------------------------------------
        // The user's login email is the default
        // verification contact.
        //--------------------------------------------------

        setRegistrationContact(
            username.trim()
        );

        setRegistrationState(
            state
        );

        console.log(
            "Selected registration method:",
            selected
        );

        console.log(
            "Registration contact:",
            username.trim()
        );

        console.log(
            "==============================================="
        );

    };

    //--------------------------------------------------
    // Submit MFA Email OTP
    //--------------------------------------------------

    const handleMfaSubmit =
        async (event) => {

            event.preventDefault();

            setError("");
            setSuccess("");

            const enteredCode =
                code.trim();


            if (!enteredCode) {

                setError(
                    "Please enter the verification code."
                );

                return;

            }


            try {

                setLoading(true);


                console.log(
                    "========== SUBMIT MFA OTP =========="
                );

                console.log(
                    "Entered code length:",
                    enteredCode.length
                );


                const result =
                    await submitMfaChallenge(
                        enteredCode
                    );


                console.log(
                    "MFA submit result:",
                    result
                );


                //--------------------------------------------------
                // Authentication completed
                //--------------------------------------------------

                if (
                    result.step ===
                    "completed"
                ) {

                    handleAuthenticationCompleted(
                        result
                    );

                    return;

                }


                //--------------------------------------------------
                // MFA failed
                //--------------------------------------------------

                if (
                    !result.success
                ) {

                    setError(
                        result.message ||
                        "Unable to verify the MFA code."
                    );

                    return;

                }


                //--------------------------------------------------
                // Unexpected successful state
                //--------------------------------------------------

                setError(
                    "MFA verification did not complete the sign-in."
                );

            }
            catch (err) {

                console.error(
                    "MFA submission error:",
                    err
                );

                setError(
                    getErrorMessage(err)
                );

            }
            finally {

                setLoading(false);

            }

        };
        //--------------------------------------------------
        // Email submission
        //--------------------------------------------------

        const handleEmailSubmit = async (event) => {

            event.preventDefault();

            setError("");
            setSuccess("");

            const email =
                username.trim();

            if (!email) {

                setError(
                    "Please enter your email address."
                );

                return;
            }

            try {

                setLoading(true);

                const result =
                    await startSignIn(email);

                console.log(
                    "========== NATIVE AUTH RESULT =========="
                );

                console.log(
                    "Full result:",
                    result
                );

                console.log(
                    "JSON:",
                    JSON.stringify(
                        result,
                        null,
                        2
                    )
                );

                console.log(
                    "success:",
                    result?.success
                );

                console.log(
                    "step:",
                    result?.step
                );

                console.log(
                    "message:",
                    result?.message
                );

                console.log(
                    "state:",
                    result?.state
                );

                console.log(
                    "state constructor:",
                    result?.state?.constructor?.name
                );

                console.log(
                    "========================================"
                );


                if (!result?.success) {

                    setError(
                        result?.message ||
                        "Unable to start sign-in."
                    );

                    return;
                }


                //--------------------------------------------------
                // Password
                //--------------------------------------------------

                if (result.step === "password") {

                    setStep("password");

                    return;
                }


                //--------------------------------------------------
                // Verification code
                //--------------------------------------------------

                if (result.step === "code") {

                    setStep("code");

                    setSuccess(
                        "A verification code has been sent to your email."
                    );

                    return;
                }


                //--------------------------------------------------
                // MFA registration
                //--------------------------------------------------
      
                if (result.step === "authMethodRegistration" ){

                    configureRegistrationState(
                        result.state ??
                        getCurrentSignInState()
                    );

                    setStep(
                        "registration"
                    );

                    setSuccess(
                        "You need to register an authentication method before you can complete sign in."
                    );

                    return;
                }


                //--------------------------------------------------
                // Completed
                //--------------------------------------------------

                if (result.step === "completed") {

                    handleAuthenticationCompleted(
                        result
                    );

                    return;
                }


                //--------------------------------------------------
                // Unknown
                //--------------------------------------------------

                console.error(
                    "UNKNOWN AUTHENTICATION STEP:",
                    result.step
                );

                setError(
                    `Unable to determine the next authentication step. Received: ${String(result.step)}`
                );

            }
            catch (err) {

                console.error(err);

                setError(
                    getErrorMessage(err)
                );

            }
            finally {

                setLoading(false);

            }

        };


    //--------------------------------------------------
    // Password submission
    //--------------------------------------------------

    const handlePasswordSubmit =   async (event) => {

            event.preventDefault();

            setError("");
            setSuccess("");

            if (!password) {

                setError(
                    "Please enter your password."
                );

                return;
            }

            try {

                setLoading(true);

                const result =
                    await submitPassword(
                        password
                    );

                console.log(
                    "submitPassword result:",
                    result
                );


                //--------------------------------------------------
                // Authentication completed
                //--------------------------------------------------

                if (
                    result.step ===
                    "completed"
                ) {

                    handleAuthenticationCompleted(
                        result
                    );

                    return;
                }


                //--------------------------------------------------
                // Existing sign-in OTP
                //--------------------------------------------------

                if (
                    result.step ===
                    "code"
                ) {

                    setStep("code");

                    setSuccess(
                        "A verification code has been sent to your email."
                    );

                    return;
                }


                //--------------------------------------------------
                // MFA registration required
                //--------------------------------------------------

                if (
                    result.step ===
                    "authMethodRegistration"
                ){

                    const state =
                        result.state ??
                        getCurrentSignInState();

                    configureRegistrationState(
                        state
                    );

                    setStep(
                        "registration"
                    );

                    setSuccess(
                        "Please register an authentication method."
                    );

                    return;
                }


                //--------------------------------------------------
        // MFA method selection / awaiting state
        //--------------------------------------------------
        if (result.step === "mfa") {

            console.log(
                "========== MFA REQUIRED =========="
            );

            console.log(
                "MFA result:",
                result
            );

            console.log(
                "MFA state:",
                result.state
            );

            console.log(
                "MFA state constructor:",
                result.state?.constructor?.name
            );

            console.log(
                "Available MFA methods:",
                result.authMethods
            );

            //--------------------------------------------------
            // We currently have one registered method:
            //
            // challenge_type:  oob
            // challenge_channel: email
            //
            // Therefore automatically select the first
            // available authentication method.
            //--------------------------------------------------

            const authenticationMethod =
                result.authMethods?.[0];

            if (!authenticationMethod?.id) {

                setError(
                    "MFA is required, but no authentication method is available."
                );

                return;
            }

            console.log(
                "Selected MFA authentication method:",
                authenticationMethod
            );

            //--------------------------------------------------
            // Request the actual MFA challenge.
            //
            // This is what causes Entra to send the
            // verification email.
            //--------------------------------------------------

            const challengeResult =
                await requestMfaChallenge(
                    authenticationMethod.id
                );

            console.log(
                "========== MFA REQUEST RESULT =========="
            );

            console.log(
                "Challenge result:",
                challengeResult
            );

            console.log(
                "Challenge step:",
                challengeResult?.step
            );

            console.log(
                "Challenge message:",
                challengeResult?.message
            );

            console.log(
                "Challenge state:",
                challengeResult?.state
            );

            console.log(
                "Challenge state constructor:",
                challengeResult?.state?.constructor?.name
            );

            console.log(
                "========================================"
            );

            //--------------------------------------------------
            // MFA OTP is now required
            //--------------------------------------------------

            if (
                challengeResult?.success &&
                challengeResult?.step === "mfaCode"
            ) {

                setCode("");

                setStep("mfa");

                setSuccess(
                    challengeResult.message ||
                    "A verification code has been sent to your email."
                );

                return;
            }

            //--------------------------------------------------
            // MFA completed immediately
            //--------------------------------------------------

            if (
                challengeResult?.success &&
                challengeResult?.step === "completed"
            ) {

                handleAuthenticationCompleted(
                    challengeResult
                );

                return;
            }

            //--------------------------------------------------
            // MFA challenge failed
            //--------------------------------------------------

            setError(
                challengeResult?.message ||
                "Unable to start the MFA verification challenge."
            );

            return;
        }
                //--------------------------------------------------
                // Unknown
                //--------------------------------------------------

                setError(
                    `Unable to determine the next authentication step. Received: ${String(result.step)}`
                );

            }
            catch (err) {

                console.error(err);

                setError(
                    getErrorMessage(err)
                );

            }
            finally {

                setLoading(false);

            }

        };


    //--------------------------------------------------
    // Register MFA authentication method
    //--------------------------------------------------

    const handleRegistrationSubmit =
        async (event) => {

            event.preventDefault();

            setError("");
            setSuccess("");

            if (
                !selectedRegistrationMethod
            ) {

                setError(
                    "Please select an authentication method."
                );

                return;
            }

            if (
                !registrationContact.trim()
            ) {

                setError(
                    "Please enter the email address to use for verification."
                );

                return;
            }

            try {

                setLoading(true);

                const state =
                    registrationState ??
                    getCurrentSignInState();

                console.log(
                    "========== SUBMIT MFA REGISTRATION =========="
                );

                console.log(
                    "State:",
                    state
                );

                console.log(
                    "State constructor:",
                    state?.constructor?.name
                );

                console.log(
                    "Selected method:",
                    selectedRegistrationMethod
                );

                console.log(
                    "Verification contact:",
                    registrationContact
                );

                console.log(
                    "=============================================="
                );


                if (
                    !(
                        state instanceof
                        AuthMethodRegistrationRequiredState
                    )
                ) {

                    setError(
                        "The authentication method registration state is no longer active."
                    );

                    return;
                }


                //--------------------------------------------------
                // Ask Entra to challenge/register the method
                //--------------------------------------------------

                const result =
                    await state.challengeAuthMethod({

                        authMethodType:
                            selectedRegistrationMethod,

                        verificationContact:
                            registrationContact.trim()

                    });


                console.log(
                    "MFA registration result:",
                    result
                );


                //--------------------------------------------------
                // Failed
                //--------------------------------------------------

                if (
                    result.isFailed()
                ) {

                    const errorObject =
                        result.error;

                    if (
                        errorObject?.isInvalidInput?.()
                    ) {

                        setError(
                            "The verification email address is invalid."
                        );

                    }
                    else if (
                        errorObject?.isVerificationContactBlocked?.()
                    ) {

                        setError(
                            "This verification email address is blocked. Please use another email address."
                        );

                    }
                    else {

                        setError(
                            getErrorMessage(
                                errorObject
                            )
                        );

                    }

                    return;
                }


                //--------------------------------------------------
                // Verification required
                //--------------------------------------------------

                if (
                    typeof result.isVerificationRequired ===
                    "function" &&
                    result.isVerificationRequired()
                ) {

                    console.log(
                        "Email OTP registration challenge sent."
                    );

                    setRegistrationState(
                        result.state
                    );

                    setStep(
                        "registration-code"
                    );

                    setSuccess(
                        `A verification code has been sent to ${registrationContact.trim()}.`
                    );

                    return;
                }


                //--------------------------------------------------
                // Completed
                //--------------------------------------------------

                if (
                    result.isCompleted()
                ) {

                    handleAuthenticationCompleted({

                        success: true,

                        step: "completed",

                        account:
                            result.data?.account ??
                            null,

                        authenticationResult:
                            result.data ??
                            null

                    });

                    return;
                }


                setError(
                    "The authentication method registration returned an unexpected state."
                );

            }
            catch (err) {

                console.error(
                    "MFA registration error:",
                    err
                );

                setError(
                    getErrorMessage(err)
                );

            }
            finally {

                setLoading(false);

            }

        };


    //--------------------------------------------------
    // Submit MFA registration OTP
    //--------------------------------------------------

    const handleRegistrationCodeSubmit =
        async (event) => {

            event.preventDefault();

            setError("");
            setSuccess("");

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

                const state =
                    registrationState ??
                    getCurrentSignInState();

                console.log(
                    "========== VERIFY MFA REGISTRATION =========="
                );

                console.log(
                    "State:",
                    state
                );

                console.log(
                    "State constructor:",
                    state?.constructor?.name
                );

                console.log(
                    "=============================================="
                );


                if (
                    !(
                        state instanceof
                        AuthMethodVerificationRequiredState
                    )
                ) {

                    setError(
                        "The authentication method verification state is no longer active."
                    );

                    return;
                }


                //--------------------------------------------------
                // Submit the OTP
                //--------------------------------------------------

                const result =
                    await state.submitChallenge(
                        enteredCode
                    );


                console.log(
                    "MFA registration verification result:",
                    result
                );


                //--------------------------------------------------
                // Failed
                //--------------------------------------------------

                if (
                    result.isFailed()
                ) {

                    if (
                        result.error?.isIncorrectChallenge?.()
                    ) {

                        setError(
                            "The verification code is incorrect."
                        );

                    }
                    else {

                        setError(
                            getErrorMessage(
                                result.error
                            )
                        );

                    }

                    return;
                }


                //--------------------------------------------------
                // Completed
                //--------------------------------------------------

                if (
                    result.isCompleted()
                ) {

                    console.log(
                        "========== MFA REGISTRATION COMPLETED =========="
                    );

                    console.log(
                        "Result:",
                        result
                    );

                    console.log(
                        "================================================="
                    );

                    handleAuthenticationCompleted({

                        success: true,

                        step: "completed",

                        account:
                            result.data?.account ??
                            null,

                        authenticationResult:
                            result.data ??
                            null

                    });

                    return;
                }


                setError(
                    "The verification was not completed."
                );

            }
            catch (err) {

                console.error(
                    "MFA registration verification error:",
                    err
                );

                setError(
                    getErrorMessage(err)
                );

            }
            finally {

                setLoading(false);

            }

        };


    //--------------------------------------------------
    // Verification code submission
    //--------------------------------------------------

    const handleCodeSubmit =
        async (event) => {

            event.preventDefault();

            setError("");
            setSuccess("");

            if (!code.trim()) {

                setError(
                    "Please enter the verification code."
                );

                return;
            }

            try {

                setLoading(true);

                const result =
                    await submitVerificationCode(
                        code.trim()
                    );

                console.log(
                    "submitCode result:",
                    result
                );


                if (
                    result.step ===
                    "completed" ||
                    result.success
                ) {

                    handleAuthenticationCompleted(
                        result
                    );

                    return;
                }


                if (
                    result.step ===
                    "registration"
                ) {

                    configureRegistrationState(
                        result.state ??
                        getCurrentSignInState()
                    );

                    setStep(
                        "registration"
                    );

                    return;
                }


                setError(
                    getErrorMessage(
                        result.error ??
                        result.message
                    )
                );

            }
            catch (err) {

                console.error(err);

                setError(
                    getErrorMessage(err)
                );

            }
            finally {

                setLoading(false);

            }

        };


    //--------------------------------------------------
    // Authentication completed
    //--------------------------------------------------

    const handleAuthenticationCompleted =
        (result) => {

            console.log(
                "========== AUTHENTICATION COMPLETED =========="
            );

            console.log(
                "Complete result:",
                result
            );

            console.log(
                "Account:",
                result?.account
            );

            console.log(
                "Authentication result:",
                result?.authenticationResult
            );

            console.log(
                "=============================================="
            );

            setSuccess(
                "Sign in successful."
            );


            //--------------------------------------------------
            // Remember-me handling
            //--------------------------------------------------

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


            //--------------------------------------------------
            // Redirect
            //--------------------------------------------------

            console.log(
                "AUTHENTICATION COMPLETED - NOT REDIRECTING YET"
            );

        };


    //--------------------------------------------------
    // Go back
    //--------------------------------------------------

    const handleBack = () => {

        setError("");

        setSuccess("");
        if (step === "mfa") {

            setCode("");

            clearSignInState();

            setStep(
                "email"
            );

            return;
        }
        if (
            step === "password"
        ) {

            setPassword("");

            clearSignInState();

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

            setRegistrationState(null);

            setRegistrationMethods([]);

            setSelectedRegistrationMethod("");

            setRegistrationContact("");

            setRegistrationCode("");

            clearSignInState();

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

            return;
        }

    };


    //--------------------------------------------------
    // Render Email
    //--------------------------------------------------

    const renderEmailStep = () => {

        return (

            <Box
                component="form"
                onSubmit={handleEmailSubmit}
            >

                <Typography
                    sx={{
                        fontSize: 13,
                        fontWeight: 600,
                        mb: 0.5
                    }}
                >
                    Email
                </Typography>

                <TextField
                    fullWidth
                    autoFocus
                    placeholder="Enter your Email"
                    value={username}
                    onChange={(e) =>
                        setUsername(
                            e.target.value
                        )
                    }
                    autoComplete="username"
                    sx={{
                        mb: 3
                    }}
                />

                <Button
                    type="submit"
                    fullWidth
                    disabled={loading}
                    sx={{
                        py: 1.75,
                        borderRadius: "18px",
                        fontWeight: 600,
                        fontSize: 16,
                        color: "#fff",
                        background:
                            "linear-gradient(90deg, #544070, #2e3258)",
                        textTransform: "none"
                    }}
                >

                    {loading
                        ?
                        <CircularProgress
                            size={22}
                            color="inherit"
                        />
                        :
                        "Continue"
                    }

                </Button>

            </Box>

        );

    };


    //--------------------------------------------------
    // Render Password
    //--------------------------------------------------

    const renderPasswordStep = () => {

        return (

            <Box
                component="form"
                onSubmit={handlePasswordSubmit}
            >

                <Typography
                    sx={{
                        fontSize: 13,
                        fontWeight: 600,
                        mb: 0.5
                    }}
                >
                    Email
                </Typography>

                <TextField
                    fullWidth
                    value={username}
                    disabled
                    sx={{
                        mb: 2
                    }}
                />

                <Typography
                    sx={{
                        fontSize: 13,
                        fontWeight: 600,
                        mb: 0.5
                    }}
                >
                    Password
                </Typography>

                <TextField
                    fullWidth
                    autoFocus
                    type={
                        showPassword
                            ? "text"
                            : "password"
                    }
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) =>
                        setPassword(
                            e.target.value
                        )
                    }
                    autoComplete="current-password"
                    InputProps={{
                        endAdornment: (

                            <IconButton
                                type="button"
                                onClick={() =>
                                    setShowPassword(
                                        !showPassword
                                    )
                                }
                            >

                                {
                                    showPassword
                                        ?
                                        <VisibilityOff />
                                        :
                                        <Visibility />
                                }

                            </IconButton>

                        )
                    }}
                    sx={{
                        mb: 1
                    }}
                />

                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 2
                    }}
                >

                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={remember}
                                onChange={(e) =>
                                    setRemember(
                                        e.target.checked
                                    )
                                }
                            />
                        }
                        label={
                            <Typography
                                sx={{
                                    fontSize: 13
                                }}
                            >
                                Remember me
                            </Typography>
                        }
                    />

                    <Link
                        component="button"
                        type="button"
                        sx={{
                            fontSize: 13
                        }}
                        onClick={() => {

                            console.log(
                                "Forgot password:",
                                username
                            );

                        }}
                    >
                        Forgot password?
                    </Link>

                </Box>

                <Button
                    type="submit"
                    fullWidth
                    disabled={loading}
                    sx={{
                        py: 1.75,
                        borderRadius: "18px",
                        fontWeight: 600,
                        fontSize: 16,
                        color: "#fff",
                        background:
                            "linear-gradient(90deg, #544070, #2e3258)",
                        textTransform: "none",
                        mb: 2
                    }}
                >

                    {loading
                        ?
                        <CircularProgress
                            size={22}
                            color="inherit"
                        />
                        :
                        "Sign In"
                    }

                </Button>

                <Button
                    type="button"
                    fullWidth
                    onClick={handleBack}
                    disabled={loading}
                    sx={{
                        textTransform: "none",
                        color: "#544070"
                    }}
                >
                    Back
                </Button>

            </Box>

        );

    };


    //--------------------------------------------------
    // Render MFA Registration
    //--------------------------------------------------

    const renderRegistrationStep = () => {

        const getMethodValue = (method) => {

            if (
                typeof method === "string"
            ) {

                return method;

            }

            return (
                method?.type ??
                method?.authMethodType ??
                method?.name ??
                ""
            );

        };


        return (

            <Box
                component="form"
                onSubmit={
                    handleRegistrationSubmit
                }
            >

                <Typography
                    sx={{
                        fontSize: 20,
                        fontWeight: 600,
                        color: "#2a1c3b",
                        mb: 1
                    }}
                >
                    Set up verification
                </Typography>

                <Typography
                    sx={{
                        fontSize: 14,
                        color: "#546078",
                        mb: 3
                    }}
                >
                    Before you can sign in, you need to
                    register a verification method.
                </Typography>


                <Typography
                    sx={{
                        fontSize: 13,
                        fontWeight: 600,
                        mb: 1
                    }}
                >
                    Verification method
                </Typography>


                {registrationMethods.map(
                    (method, index) => {

                        const value =
                            getMethodValue(
                                method
                            );

                        const isEmail =
                            value
                                .toLowerCase()
                                .includes("email");

                        return (

                            <Button
                                key={
                                    `${value}-${index}`
                                }
                                type="button"
                                fullWidth
                                onClick={() =>
                                    setSelectedRegistrationMethod(
                                        method
                                    )
                                }
                                sx={{
                                    justifyContent:
                                        "flex-start",
                                    mb: 1,
                                    py: 1.5,
                                    px: 2,
                                    borderRadius: "14px",
                                    border:
                                        selectedRegistrationMethod ===
                                        method
                                            ? "2px solid #544070"
                                            : "1px solid #ccc",
                                    color: "#2a1c3b",
                                    backgroundColor:
                                        selectedRegistrationMethod ===
                                        method
                                            ? "rgba(84,64,112,0.08)"
                                            : "#fff",
                                    textTransform:
                                        "none"
                                }}
                            >

                                {isEmail
                                    ? "Email OTP"
                                    : value || "Authentication method"
                                }

                            </Button>

                        );

                    }
                )}


                {registrationMethods.length === 0 && (

                    <Alert
                        severity="warning"
                        sx={{
                            mb: 2
                        }}
                    >
                        No authentication registration
                        methods are currently available.
                    </Alert>

                )}


                <Typography
                    sx={{
                        fontSize: 13,
                        fontWeight: 600,
                        mb: 0.5,
                        mt: 2
                    }}
                >
                    Email address
                </Typography>

                <TextField
                    fullWidth
                    autoFocus
                    value={
                        registrationContact
                    }
                    onChange={(e) =>
                        setRegistrationContact(
                            e.target.value
                        )
                    }
                    placeholder="Enter your email address"
                    autoComplete="email"
                    sx={{
                        mb: 3
                    }}
                />


                <Button
                    type="submit"
                    fullWidth
                    disabled={
                        loading ||
                        !selectedRegistrationMethod
                    }
                    sx={{
                        py: 1.75,
                        borderRadius: "18px",
                        fontWeight: 600,
                        fontSize: 16,
                        color: "#fff",
                        background:
                            "linear-gradient(90deg, #544070, #2e3258)",
                        textTransform: "none",
                        mb: 1
                    }}
                >

                    {loading
                        ?
                        <CircularProgress
                            size={22}
                            color="inherit"
                        />
                        :
                        "Send verification code"
                    }

                </Button>


                <Button
                    type="button"
                    fullWidth
                    onClick={handleBack}
                    disabled={loading}
                    sx={{
                        textTransform: "none",
                        color: "#544070"
                    }}
                >
                    Back
                </Button>

            </Box>

        );

    };


    //--------------------------------------------------
    // Render MFA Registration Code
    //--------------------------------------------------

    const renderRegistrationCodeStep = () => {

        return (

            <Box
                component="form"
                onSubmit={
                    handleRegistrationCodeSubmit
                }
            >

                <Typography
                    sx={{
                        fontSize: 20,
                        fontWeight: 600,
                        color: "#2a1c3b",
                        mb: 1
                    }}
                >
                    Check your email
                </Typography>

                <Typography
                    sx={{
                        fontSize: 14,
                        color: "#546078",
                        mb: 3
                    }}
                >

                    We have sent a verification code to:

                    <br />

                    <strong>
                        {registrationContact}
                    </strong>

                </Typography>


                <Typography
                    sx={{
                        fontSize: 13,
                        fontWeight: 600,
                        mb: 0.5
                    }}
                >
                    Verification code
                </Typography>


                <TextField
                    fullWidth
                    autoFocus
                    placeholder="Enter verification code"
                    value={
                        registrationCode
                    }
                    onChange={(e) =>
                        setRegistrationCode(
                            e.target.value
                        )
                    }
                    inputProps={{
                        inputMode: "numeric",
                        maxLength: 8
                    }}
                    sx={{
                        mb: 3
                    }}
                />


                <Button
                    type="submit"
                    fullWidth
                    disabled={loading}
                    sx={{
                        py: 1.75,
                        borderRadius: "18px",
                        fontWeight: 600,
                        fontSize: 16,
                        color: "#fff",
                        background:
                            "linear-gradient(90deg, #544070, #2e3258)",
                        textTransform: "none",
                        mb: 1
                    }}
                >

                    {loading
                        ?
                        <CircularProgress
                            size={22}
                            color="inherit"
                        />
                        :
                        "Verify code"
                    }

                </Button>


                <Button
                    type="button"
                    fullWidth
                    onClick={handleBack}
                    disabled={loading}
                    sx={{
                        textTransform: "none",
                        color: "#544070"
                    }}
                >
                    Back
                </Button>

            </Box>

        );

    };

    //--------------------------------------------------
    // Render MFA Email OTP
    //--------------------------------------------------

    const renderMfaStep = () => {

        return (

            <Box
                component="form"
                onSubmit={
                    handleMfaSubmit
                }
            >

                <Typography
                    sx={{
                        fontSize: 20,
                        fontWeight: 600,
                        color: "#2a1c3b",
                        mb: 1
                    }}
                >
                    Verify your identity
                </Typography>


                <Typography
                    sx={{
                        fontSize: 14,
                        color: "#546078",
                        mb: 3
                    }}
                >

                    We have sent a verification code
                    to your email address.

                    <br />

                    <strong>
                        {username}
                    </strong>

                </Typography>


                <Typography
                    sx={{
                        fontSize: 13,
                        fontWeight: 600,
                        mb: 0.5
                    }}
                >
                    Verification code
                </Typography>


                <TextField
                    fullWidth
                    autoFocus
                    type="text"
                    placeholder="Enter verification code"
                    value={code}
                    onChange={(e) =>
                        setCode(
                            e.target.value
                        )
                    }
                    autoComplete="one-time-code"
                    slotProps={{
                        htmlInput: {
                            inputMode: "numeric",
                            maxLength: 8
                        }
                    }}
                    sx={{
                        mb: 3
                    }}
                />


                <Button
                    type="submit"
                    fullWidth
                    disabled={
                        loading ||
                        !code.trim()
                    }
                    sx={{
                        py: 1.75,
                        borderRadius: "18px",
                        fontWeight: 600,
                        fontSize: 16,
                        color: "#fff",
                        background:
                            "linear-gradient(90deg, #544070, #2e3258)",
                        textTransform: "none",
                        mb: 1
                    }}
                >

                    {loading
                        ?
                        <CircularProgress
                            size={22}
                            color="inherit"
                        />
                        :
                        "Verify code"
                    }

                </Button>


                <Button
                    type="button"
                    fullWidth
                    onClick={handleBack}
                    disabled={loading}
                    sx={{
                        textTransform: "none",
                        color: "#544070"
                    }}
                >

                    Back

                </Button>

            </Box>

        );

    };
    //--------------------------------------------------
    // Render Existing Sign-In OTP
    //--------------------------------------------------

    const renderCodeStep = () => {

        return (

            <Box
                component="form"
                onSubmit={
                    handleCodeSubmit
                }
            >

                <Typography
                    sx={{
                        fontSize: 14,
                        color: "#546078",
                        mb: 2
                    }}
                >

                    We have sent a verification code to:

                    <br />

                    <strong>
                        {username}
                    </strong>

                </Typography>


                <Typography
                    sx={{
                        fontSize: 13,
                        fontWeight: 600,
                        mb: 0.5
                    }}
                >
                    Verification code
                </Typography>


                <TextField
                    fullWidth
                    autoFocus
                    placeholder="Enter verification code"
                    value={code}
                    onChange={(e) =>
                        setCode(
                            e.target.value
                        )
                    }
                    inputProps={{
                        inputMode: "numeric",
                        maxLength: 8
                    }}
                    sx={{
                        mb: 3
                    }}
                />


                <Button
                    type="submit"
                    fullWidth
                    disabled={loading}
                    sx={{
                        py: 1.75,
                        borderRadius: "18px",
                        fontWeight: 600,
                        fontSize: 16,
                        color: "#fff",
                        background:
                            "linear-gradient(90deg, #544070, #2e3258)",
                        textTransform: "none",
                        mb: 1
                    }}
                >

                    {loading
                        ?
                        <CircularProgress
                            size={22}
                            color="inherit"
                        />
                        :
                        "Verify code"
                    }

                </Button>


                <Button
                    type="button"
                    fullWidth
                    onClick={handleBack}
                    disabled={loading}
                    sx={{
                        textTransform: "none",
                        color: "#544070"
                    }}
                >

                    Back

                </Button>

            </Box>

        );

    };


    //--------------------------------------------------
    // Main render
    //--------------------------------------------------

    return (

        <Box
            sx={{
                position: "fixed",
                inset: 0,

                bgcolor:
                    "rgba(17,11,26,0.55)",

                backdropFilter:
                    "blur(4px)",

                display: "flex",

                alignItems: "center",

                justifyContent: "center",

                zIndex: 1300,

                px: 2
            }}
        >

            <Card
                onClick={(e) =>
                    e.stopPropagation()
                }
                sx={{
                    width: "100%",
                    maxWidth: 380,
                    p: "24px 28px 32px",
                    borderRadius: "24px",
                    boxShadow:
                        "0 20px 50px rgba(24,16,36,0.25)",
                    bgcolor: "#F3ECE6"
                }}
            >

                {/* HEADER */}

                <Box
                    textAlign="center"
                    mb={3}
                >

                    <Typography
                        sx={{
                            fontFamily: "serif",
                            fontSize: 30,
                            fontWeight: 600,
                            color: "#2a1c3b"
                        }}
                    >
                        Welcome
                    </Typography>

                    <Typography
                        sx={{
                            fontSize: 14,
                            color: "#546078",
                            mt: 0.5
                        }}
                    >
                        Sign in to access the client portal
                    </Typography>

                </Box>


                {/* MESSAGES */}

                {error && (

                    <Alert
                        severity="error"
                        sx={{
                            mb: 2
                        }}
                    >
                        {error}
                    </Alert>

                )}


                {success && (

                    <Alert
                        severity="success"
                        sx={{
                            mb: 2
                        }}
                    >
                        {success}
                    </Alert>

                )}


                {/* STEP */}

                {step === "email" &&
                    renderEmailStep()
                }

                {step === "password" &&
                    renderPasswordStep()
                }

                {step === "code" &&
                    renderCodeStep()
                }

                {step === "registration" &&
                    renderRegistrationStep()
                }

                {step === "registration-code" &&
                    renderRegistrationCodeStep()
                }
                {step === "mfa" &&
                    renderMfaStep()
                }
            </Card>

        </Box>

    );

};


export default CustomLoginPage;

