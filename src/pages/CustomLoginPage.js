import { useNavigate } from "react-router-dom";

import {
    Alert,
    Box,
    Button,
    Card,
    Typography
} from "@mui/material";

import { useNativeAuth } from "../auth/NativeAuthContext";

import LoginEmailStep
    from "../components/authentication/LoginEmailStep";

import LoginPasswordStep
    from "../components/authentication/LoginPasswordStep";

import LoginMfaStep
    from "../components/authentication/LoginMfaStep";

import LoginCodeStep
    from "../components/authentication/LoginCodeStep";

import MfaRegistrationStep
    from "../components/authentication/MfaRegistrationStep";

import MfaRegistrationCodeStep
    from "../components/authentication/MfaRegistrationCodeStep";

import LoginMfaMethodStep
    from "../components/authentication/LoginMfaMethodStep";

import MfaChallenge
    from "../components/MfaChallenge";

import MfaEnrollmentStep
    from "../components/authentication/MfaEnrollmentStep";

import PasswordResetCodeStep
    from "../components/authentication/PasswordResetCodeStep";

import PasswordChangeStep
    from "../components/authentication/PasswordChangeStep";


const primaryButtonSx = {
    py: 1.75,
    borderRadius: "18px",
    fontWeight: 600,
    fontSize: 16,
    color: "#fff",
    background:
        "linear-gradient(90deg, #544070, #2e3258)",
    textTransform: "none"
};


const backButtonSx = {
    textTransform: "none",
    color: "#544070"
};


const CustomLoginPage = () => {

    // ============================================================
    // REACT ROUTER NAVIGATION
    // ============================================================

    const navigate = useNavigate();


    // ============================================================
    // NATIVE LOGIN
    // ============================================================

    const {
        username,
        setUsername,

        password,
        setPassword,

        code,
        setCode,

        // ========================================================
        // PASSWORD RESET
        // ========================================================

        passwordResetCode,
        setPasswordResetCode,

        newPassword,
        setNewPassword,

        confirmPassword,
        setConfirmPassword,

        handlePasswordResetCodeSubmit,
        handleNewPasswordSubmit,

        // ========================================================
        // MFA
        // ========================================================

        activeMfaMethod,

        registrationMethods,
        selectedRegistrationMethod,
        setSelectedRegistrationMethod,

        registrationContact,
        setRegistrationContact,

        registrationCode,
        setRegistrationCode,

        step,

        loading,
        error,
        success,

        showPassword,
        setShowPassword,

        remember,
        setRemember,

        mfaEnrollmentStatus,
        enrollmentData,
        enrollmentCode,
        setEnrollmentCode,

        handleEnrollmentSubmit,

        mfaMethods,
        selectedMfaMethod,
        setSelectedMfaMethod,

        handleMfaMethodSubmit,

        handleEmailSubmit,
        handlePasswordSubmit,

        handleMfaSubmit,

        handleRegistrationSubmit,
        handleRegistrationCodeSubmit,

        handleCodeSubmit,

        handleBack,

        // ========================================================
        // EXISTING AUTHENTICATION
        // ========================================================

        existingAccount,
        checkingExistingAccount,
        continueWithExistingAuthentication,
        signInWithDifferentAccount

    } = useNativeAuth();


    // ============================================================
    // DEBUG
    // ============================================================

    console.log(
        "========== CUSTOM LOGIN HANDLERS =========="
    );

    console.log(
        "Current authentication step:",
        step
    );

    console.log(
        "Checking existing account:",
        checkingExistingAccount
    );

    console.log(
        "Existing account:",
        existingAccount
    );

    console.log(
        "handleEmailSubmit:",
        handleEmailSubmit
    );

    console.log(
        "handlePasswordSubmit:",
        handlePasswordSubmit
    );

    console.log(
        "continueWithExistingAuthentication:",
        continueWithExistingAuthentication
    );

    console.log(
        "signInWithDifferentAccount:",
        signInWithDifferentAccount
    );


    // ============================================================
    // AUTHENTICATION STEP RENDERING
    // ============================================================

    const renderAuthenticationStep = () => {

        // ========================================================
        // CHECKING FOR EXISTING ACCOUNT
        // ========================================================

        if (checkingExistingAccount) {

            return (
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        alignItems: "center",
                        textAlign: "center",
                        py: 3
                    }}
                >

                    <Typography
                        variant="h6"
                        sx={{
                            fontWeight: 600
                        }}
                    >
                        Checking your sign-in
                    </Typography>

                    <Typography
                        variant="body2"
                        color="text.secondary"
                    >
                        Checking whether you are already signed in...
                    </Typography>

                </Box>
            );
        }


        // ========================================================
        // STEP SWITCH
        // ========================================================

        switch (step) {

            // ====================================================
            // EMAIL
            // ====================================================

            case "email":

                return (
                    <LoginEmailStep
                        username={username}
                        setUsername={setUsername}
                        loading={loading}
                        handleEmailSubmit={
                            handleEmailSubmit
                        }
                        primaryButtonSx={
                            primaryButtonSx
                        }
                    />
                );


            // ====================================================
            // ALREADY AUTHENTICATED
            // ====================================================

            case "alreadyAuthenticated":

                return (
                    <Box
                        sx={{
                            textAlign: "center"
                        }}
                    >

                        <Typography
                            sx={{
                                fontSize: 17,
                                fontWeight: 600,
                                color: "#2a1c3b",
                                mb: 1
                            }}
                        >
                            You are already signed in
                        </Typography>


                        <Typography
                            sx={{
                                fontSize: 14,
                                color: "#546078",
                                mb: 1
                            }}
                        >
                            {existingAccount?.account?.username ||
                                username ||
                                "An existing account"}
                        </Typography>


                        <Typography
                            sx={{
                                fontSize: 14,
                                color: "#546078",
                                mb: 3
                            }}
                        >
                            Continue with this account or
                            sign in with a different account.
                        </Typography>


                        <Button
                            variant="contained"
                            fullWidth
                            disabled={loading}
                            onClick={async () => {

                                console.log(
                                    "========== CONTINUE EXISTING ACCOUNT =========="
                                );

                                await continueWithExistingAuthentication();
                            }}
                            sx={{
                                ...primaryButtonSx,

                                mb: 1.5,

                                "&:hover": {
                                    background:
                                        "linear-gradient(90deg, #544070, #2e3258)"
                                }
                            }}
                        >
                            {loading
                                ? "Continuing..."
                                : "Continue"}
                        </Button>


                        <Button
                            variant="text"
                            fullWidth
                            disabled={loading}
                            onClick={async () => {

                                console.log(
                                    "========== SIGN IN WITH DIFFERENT ACCOUNT =========="
                                );

                                await signInWithDifferentAccount();
                            }}
                            sx={{
                                ...backButtonSx,
                                fontWeight: 600
                            }}
                        >
                            Sign in with a different account
                        </Button>

                    </Box>
                );


            // ====================================================
            // PASSWORD
            // ====================================================

            case "password":

                return (
                    <LoginPasswordStep
                        username={username}
                        password={password}
                        setPassword={setPassword}
                        loading={loading}
                        showPassword={showPassword}
                        setShowPassword={
                            setShowPassword
                        }
                        remember={remember}
                        setRemember={setRemember}
                        handlePasswordSubmit={
                            handlePasswordSubmit
                        }
                        handleBack={
                            handleBack
                        }
                        primaryButtonSx={
                            primaryButtonSx
                        }
                        backButtonSx={
                            backButtonSx
                        }
                    />
                );


            // ====================================================
            // PASSWORD RESET CODE
            // ====================================================

            case "passwordResetCode":

                return (
                    <PasswordResetCodeStep
                        username={username}

                        passwordResetCode={
                            passwordResetCode
                        }

                        setPasswordResetCode={
                            setPasswordResetCode
                        }

                        loading={loading}

                        handlePasswordResetCodeSubmit={
                            handlePasswordResetCodeSubmit
                        }

                        handleBack={
                            handleBack
                        }

                        primaryButtonSx={
                            primaryButtonSx
                        }

                        backButtonSx={
                            backButtonSx
                        }
                    />
                );


            // ====================================================
            // PASSWORD CHANGE
            // ====================================================

            case "passwordChange":

                return (
                    <PasswordChangeStep
                        newPassword={
                            newPassword
                        }

                        setNewPassword={
                            setNewPassword
                        }

                        confirmPassword={
                            confirmPassword
                        }

                        setConfirmPassword={
                            setConfirmPassword
                        }

                        loading={loading}

                        handleNewPasswordSubmit={
                            handleNewPasswordSubmit
                        }

                        handleBack={
                            handleBack
                        }

                        primaryButtonSx={
                            primaryButtonSx
                        }

                        backButtonSx={
                            backButtonSx
                        }
                    />
                );


            // ====================================================
            // MFA METHOD SELECTION
            // ====================================================

            case "mfa":

                return (
                    <MfaChallenge
                        nativeMfaMethods={
                            mfaMethods
                        }

                        selectedNativeMfaMethod={
                            selectedMfaMethod
                        }

                        onSelectNativeMfaMethod={
                            setSelectedMfaMethod
                        }

                        onSubmitNativeMfaMethod={
                            handleMfaMethodSubmit
                        }

                        nativeMfaStep={
                            false
                        }

                        loading={
                            loading
                        }

                        message={
                            "Choose how you want to verify your identity."
                        }

                        onCancel={
                            handleBack
                        }
                    />
                );


            // ====================================================
            // APPLICATION MFA ENROLLMENT
            // ====================================================

            case "mfaEnrollment":

                return (
                    <MfaEnrollmentStep
                        enrollmentData={
                            enrollmentData
                        }

                        enrollmentCode={
                            enrollmentCode
                        }

                        setEnrollmentCode={
                            setEnrollmentCode
                        }

                        loading={
                            loading
                        }

                        handleEnrollmentSubmit={
                            handleEnrollmentSubmit
                        }

                        handleBack={
                            handleBack
                        }

                        primaryButtonSx={
                            primaryButtonSx
                        }

                        backButtonSx={
                            backButtonSx
                        }
                    />
                );


            // ====================================================
            // MFA CODE
            // ====================================================

            case "mfaCode": {

                const nativeMfaCodeLength =
                    activeMfaMethod?.challenge_channel ===
                    "email"
                        ? 8
                        : 6;

                return (
                    <MfaChallenge
                        nativeMfaMethods={
                            mfaMethods
                        }

                        selectedNativeMfaMethod={
                            selectedMfaMethod
                        }

                        onSelectNativeMfaMethod={
                            setSelectedMfaMethod
                        }

                        onSubmitNativeMfaMethod={
                            handleMfaMethodSubmit
                        }

                        onVerifyNativeMfaCode={
                            handleMfaSubmit
                        }

                        nativeMfaStep={
                            true
                        }

                        nativeMfaCode={
                            code
                        }

                        nativeMfaCodeLength={
                            nativeMfaCodeLength
                        }

                        onNativeMfaCodeChange={
                            setCode
                        }

                        loading={
                            loading
                        }

                        message={
                            activeMfaMethod?.challenge_channel ===
                            "authenticator"
                                ? "Enter the 6-digit code from Microsoft Authenticator."
                                : activeMfaMethod?.challenge_channel ===
                                  "sms"
                                    ? "Enter the verification code sent by text message."
                                    : "Enter the verification code sent by email."
                        }

                        onCancel={
                            handleBack
                        }
                    />
                );
            }


            // ====================================================
            // STANDARD VERIFICATION CODE
            // ====================================================

            case "code":

                return (
                    <LoginCodeStep
                        username={username}
                        code={code}
                        setCode={setCode}
                        loading={loading}
                        handleCodeSubmit={
                            handleCodeSubmit
                        }
                        handleBack={
                            handleBack
                        }
                        primaryButtonSx={
                            primaryButtonSx
                        }
                        backButtonSx={
                            backButtonSx
                        }
                    />
                );


            // ====================================================
            // MFA REGISTRATION
            // ====================================================

            case "registration":

                return (
                    <MfaRegistrationStep
                        registrationMethods={
                            registrationMethods
                        }

                        selectedRegistrationMethod={
                            selectedRegistrationMethod
                        }

                        setSelectedRegistrationMethod={
                            setSelectedRegistrationMethod
                        }

                        registrationContact={
                            registrationContact
                        }

                        setRegistrationContact={
                            setRegistrationContact
                        }

                        loading={
                            loading
                        }

                        handleRegistrationSubmit={
                            handleRegistrationSubmit
                        }

                        handleBack={
                            handleBack
                        }

                        primaryButtonSx={
                            primaryButtonSx
                        }

                        backButtonSx={
                            backButtonSx
                        }
                    />
                );


            // ====================================================
            // MFA REGISTRATION CODE
            // ====================================================

            case "registration-code":

                return (
                    <MfaRegistrationCodeStep
                        registrationContact={
                            registrationContact
                        }

                        registrationCode={
                            registrationCode
                        }

                        setRegistrationCode={
                            setRegistrationCode
                        }

                        loading={
                            loading
                        }

                        handleRegistrationCodeSubmit={
                            handleRegistrationCodeSubmit
                        }

                        handleBack={
                            handleBack
                        }

                        primaryButtonSx={
                            primaryButtonSx
                        }

                        backButtonSx={
                            backButtonSx
                        }
                    />
                );


            // ====================================================
            // AUTHENTICATED
            // ====================================================

            case "authenticated":

                return (
                    <Box
                        sx={{
                            textAlign: "center"
                        }}
                    >

                        <Typography
                            sx={{
                                fontSize: 16,
                                color: "#2a1c3b",
                                mb: 2
                            }}
                        >
                            Your identity has been verified
                            successfully.
                        </Typography>


                        <Typography
                            sx={{
                                fontSize: 14,
                                color: "#546078",
                                mb: 3
                            }}
                        >
                            You can now continue to the
                            client portal.
                        </Typography>


                        <Button
                            variant="contained"
                            fullWidth
                            onClick={() => {

                                console.log(
                                    "========== CONTINUE TO CLIENT PORTAL =========="
                                );

                                console.log(
                                    "Navigating to / using React Router."
                                );

                                navigate("/");
                            }}
                            sx={{
                                ...primaryButtonSx,

                                "&:hover": {
                                    background:
                                        "linear-gradient(90deg, #544070, #2e3258)"
                                }
                            }}
                        >
                            Continue to Client Portal
                        </Button>

                    </Box>
                );


            // ====================================================
            // CHECKING AUTHENTICATION
            // ====================================================

            case "checkingAuthentication":

                return (
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                            alignItems: "center",
                            textAlign: "center",
                            py: 3
                        }}
                    >

                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 600
                            }}
                        >
                            Checking your sign-in
                        </Typography>

                        <Typography
                            variant="body2"
                            color="text.secondary"
                        >
                            Checking whether you are already signed in...
                        </Typography>

                    </Box>
                );


            // ====================================================
            // DEFAULT
            // ====================================================

            default:

                console.warn(
                    "CustomLoginPage received unknown authentication step:",
                    step
                );

                return null;
        }
    };


    // ============================================================
    // PAGE
    // ============================================================

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
                onClick={(event) =>
                    event.stopPropagation()
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

                {/* ==================================================
                    HEADER
                ================================================== */}

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


                {/* ==================================================
                    ERROR MESSAGE
                ================================================== */}

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


                {/* ==================================================
                    SUCCESS MESSAGE
                ================================================== */}

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


                {/* ==================================================
                    AUTHENTICATION STEP
                ================================================== */}

                {renderAuthenticationStep()}

            </Card>

        </Box>
    );
};

export default CustomLoginPage;
