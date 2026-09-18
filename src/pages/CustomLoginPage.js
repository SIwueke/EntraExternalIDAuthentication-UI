import {
    Alert,
    Box,
    Card,
    Typography
} from "@mui/material";

import useNativeLogin from "../hooks/useNativeLogin";

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

import LoginMfaMethodStep from "../components/authentication/LoginMfaMethodStep";
import MfaChallenge  from "../components/MfaChallenge";

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

    const {
        username,
        setUsername,
        password,
        setPassword,
        code,
        setCode,
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
        handleBack
    } = useNativeLogin();


    const renderAuthenticationStep = () => {

        switch (step) {
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
                        handleBack={handleBack}
                        primaryButtonSx={
                            primaryButtonSx
                        }
                        backButtonSx={
                            backButtonSx
                        }
                    />
                );
            case "mfa":
                return (
                    <MfaChallenge
                        nativeMfaMethods={mfaMethods}
                        selectedNativeMfaMethod={
                            selectedMfaMethod
                        }
                        onSelectNativeMfaMethod={
                            setSelectedMfaMethod
                        }
                        onSubmitNativeMfaMethod={
                            handleMfaMethodSubmit
                        }
                        nativeMfaStep={false}
                        loading={loading}
                        message={
                            "Choose how you want to verify your identity."
                        }
                        onCancel={handleBack}
                    />
                );
            case "mfaCode": {
                const nativeMfaCodeLength =
                    activeMfaMethod?.challenge_channel ===
                    "email"
                        ? 8
                        : 6;
                return (
                    <MfaChallenge
                        nativeMfaMethods={mfaMethods}
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
                        nativeMfaStep={true}
                        nativeMfaCode={code}
                        nativeMfaCodeLength={
                            nativeMfaCodeLength
                        }
                        onNativeMfaCodeChange={
                            setCode
                        }
                        loading={loading}
                        message={
                            activeMfaMethod?.challenge_channel ===
                            "authenticator"
                                ? "Enter the 6-digit code from Microsoft Authenticator."
                                : activeMfaMethod?.challenge_channel ===
                                "sms"
                                    ? "Enter the verification code sent by text message."
                                    : "Enter the verification code sent by email."
                        }

                        onCancel={handleBack}
                    />
                );
            }
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
                        handleBack={handleBack}
                        primaryButtonSx={
                            primaryButtonSx
                        }
                        backButtonSx={
                            backButtonSx
                        }
                    />
                );
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
                        loading={loading}
                        handleRegistrationSubmit={
                            handleRegistrationSubmit
                        }
                        handleBack={handleBack}
                        primaryButtonSx={
                            primaryButtonSx
                        }
                        backButtonSx={
                            backButtonSx
                        }
                    />
                );
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
                        loading={loading}
                        handleRegistrationCodeSubmit={
                            handleRegistrationCodeSubmit
                        }
                        handleBack={handleBack}
                        primaryButtonSx={
                            primaryButtonSx
                        }
                        backButtonSx={
                            backButtonSx
                        }
                    />
                );
            default:
                return null;
        }
    };
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


                {/* AUTHENTICATION STEP */}

                {renderAuthenticationStep()}

            </Card>

        </Box>

    );

};


export default CustomLoginPage;