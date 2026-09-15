import React from "react";

import {
    Box,
    Button,
    CircularProgress,
    FormControl,
    FormControlLabel,
    Radio,
    RadioGroup,
    Typography
} from "@mui/material";


/**
 * Convert the MFA method returned by Entra External ID
 * into a user-friendly label.
 *
 * Expected method shape:
 *
 * {
 *     id: "...",
 *     challenge_type: "oob",
 *     challenge_channel: "email",
 *     login_hint: "s************e@d***************k"
 * }
 */
const getMethodLabel = (method) => {
    const channel = String(
        method?.challenge_channel ?? ""
    ).toLowerCase();

    switch (channel) {
        case "email":
            return "Email";

        case "sms":
            return "SMS";

        case "authenticator":
        case "push":
            return "Microsoft Authenticator";

        default:
            if (channel) {
                return (
                    channel.charAt(0).toUpperCase() +
                    channel.slice(1)
                );
            }

            return "Authentication method";
    }
};


/**
 * Return additional information about the MFA method.
 */
const getMethodDescription = (method) => {
    if (method?.login_hint) {
        return method.login_hint;
    }

    const challengeType = String(
        method?.challenge_type ?? ""
    ).toLowerCase();

    if (challengeType === "oob") {
        return "A verification challenge will be sent.";
    }

    return "Use this authentication method to verify your identity.";
};


const LoginMfaMethodStep = ({
    username,
    mfaMethods,
    selectedMfaMethod,
    setSelectedMfaMethod,
    loading,
    handleMfaMethodSubmit,
    handleBack,
    primaryButtonSx,
    backButtonSx
}) => {

    const methods = Array.isArray(mfaMethods)
        ? mfaMethods
        : [];


    const handleSelectionChange = (event) => {
        setSelectedMfaMethod(event.target.value);
    };


    return (
        <Box>

            {/* ==================================================
                HEADER
               ================================================== */}

            <Typography
                variant="h5"
                component="h1"
                sx={{
                    mb: 1,
                    fontWeight: 600
                }}
            >
                Verify your identity
            </Typography>


            <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                    mb: 3
                }}
            >
                Choose how you would like to verify your identity.
            </Typography>


            {/* ==================================================
                USERNAME
               ================================================== */}

            {username && (
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                        mb: 2
                    }}
                >
                    Signing in as <strong>{username}</strong>
                </Typography>
            )}


            {/* ==================================================
                NO METHODS
               ================================================== */}

            {methods.length === 0 && (
                <Typography
                    variant="body2"
                    color="error"
                    sx={{
                        mb: 3
                    }}
                >
                    No MFA authentication methods are available.
                </Typography>
            )}


            {/* ==================================================
                MFA METHODS
               ================================================== */}

            {methods.length > 0 && (
                <FormControl
                    component="fieldset"
                    fullWidth
                    sx={{
                        mb: 3
                    }}
                >

                    <RadioGroup
                        value={selectedMfaMethod}
                        onChange={handleSelectionChange}
                    >

                        {methods.map((method) => {

                            const methodId = method?.id;

                            if (!methodId) {
                                return null;
                            }

                            const label =
                                getMethodLabel(method);

                            const description =
                                getMethodDescription(method);

                            return (
                                <Box
                                    key={methodId}
                                    sx={{
                                        border: "1px solid",
                                        borderColor:
                                            selectedMfaMethod === methodId
                                                ? "primary.main"
                                                : "divider",
                                        borderRadius: 2,
                                        mb: 2,
                                        p: 1.5,
                                        transition:
                                            "border-color 0.2s ease"
                                    }}
                                >

                                    <FormControlLabel
                                        value={methodId}
                                        control={<Radio />}
                                        label={
                                            <Box>
                                                <Typography
                                                    variant="body1"
                                                    sx={{
                                                        fontWeight: 500
                                                    }}
                                                >
                                                    {label}
                                                </Typography>

                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                >
                                                    {description}
                                                </Typography>
                                            </Box>
                                        }
                                        sx={{
                                            width: "100%",
                                            m: 0
                                        }}
                                    />

                                </Box>
                            );
                        })}

                    </RadioGroup>

                </FormControl>
            )}


            {/* ==================================================
                CONTINUE
               ================================================== */}

            <Button
                type="button"
                variant="contained"
                fullWidth
                disabled={
                    loading ||
                    !selectedMfaMethod ||
                    methods.length === 0
                }
                onClick={handleMfaMethodSubmit}
                sx={primaryButtonSx}
            >
                {loading ? (
                    <CircularProgress
                        size={24}
                        color="inherit"
                    />
                ) : (
                    "Continue"
                )}
            </Button>


            {/* ==================================================
                BACK
               ================================================== */}

            <Button
                type="button"
                variant="text"
                fullWidth
                disabled={loading}
                onClick={handleBack}
                sx={{
                    ...backButtonSx,
                    mt: 1
                }}
            >
                Back
            </Button>

        </Box>
    );
};


export default LoginMfaMethodStep;