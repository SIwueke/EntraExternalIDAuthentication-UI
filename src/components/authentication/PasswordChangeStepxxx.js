import React, { useMemo, useState } from "react";

import {
    Box,
    Button,
    IconButton,
    InputAdornment,
    TextField,
    Typography
} from "@mui/material";

import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

const PasswordChangeStep = ({
    username,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    loading,
    error,
    handlePasswordChangeSubmit,
    handleBack,
    primaryButtonSx,
    backButtonSx
}) => {

    const [showNewPassword, setShowNewPassword] =
        useState(false);

    const [showConfirmPassword, setShowConfirmPassword] =
        useState(false);

    const passwordsMatch =
        newPassword.length > 0 &&
        confirmPassword.length > 0 &&
        newPassword === confirmPassword;

    const passwordRequirements = useMemo(() => ({
        length: newPassword.length >= 8,
        upper: /[A-Z]/.test(newPassword),
        lower: /[a-z]/.test(newPassword),
        number: /\d/.test(newPassword),
        special: /[^A-Za-z0-9]/.test(newPassword)
    }), [newPassword]);

    const passwordValid =
        passwordRequirements.length &&
        passwordRequirements.upper &&
        passwordRequirements.lower &&
        passwordRequirements.number &&
        passwordRequirements.special;

    const handleSubmit = (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (!passwordValid) {
            return;
        }

        if (!passwordsMatch) {
            return;
        }

        handlePasswordChangeSubmit(event);
    };

    return (
        <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
                width: "100%"
            }}
        >

            <Typography
                sx={{
                    fontSize: 21,
                    fontWeight: 600,
                    color: "#2a1c3b",
                    mb: 0.75
                }}
            >
                Change your password
            </Typography>

            <Typography
                sx={{
                    fontSize: 13.5,
                    color: "#546078",
                    mb: 2,
                    lineHeight: 1.5
                }}
            >
                Your password needs to be changed
                before you can continue.
            </Typography>

            {username && (
                <Typography
                    sx={{
                        fontSize: 13,
                        color: "#546078",
                        mb: 2
                    }}
                >
                    {username}
                </Typography>
            )}

            <TextField
                fullWidth
                size="small"
                label="New password"
                type={
                    showNewPassword
                        ? "text"
                        : "password"
                }
                value={newPassword}
                onChange={(event) =>
                    setNewPassword(
                        event.target.value
                    )
                }
                disabled={loading}
                autoComplete="new-password"
                sx={{
                    mb: 1.5,
                    "& .MuiOutlinedInput-root": {
                        borderRadius: "12px",
                        bgcolor: "#fff"
                    }
                }}
                InputProps={{
                    endAdornment: (
                        <InputAdornment position="end">
                            <IconButton
                                onClick={() =>
                                    setShowNewPassword(
                                        value => !value
                                    )
                                }
                                edge="end"
                                disabled={loading}
                            >
                                {showNewPassword
                                    ? <VisibilityOff />
                                    : <Visibility />}
                            </IconButton>
                        </InputAdornment>
                    )
                }}
            />

            <TextField
                fullWidth
                size="small"
                label="Confirm new password"
                type={
                    showConfirmPassword
                        ? "text"
                        : "password"
                }
                value={confirmPassword}
                onChange={(event) =>
                    setConfirmPassword(
                        event.target.value
                    )
                }
                disabled={loading}
                autoComplete="new-password"
                error={
                    confirmPassword.length > 0 &&
                    !passwordsMatch
                }
                helperText={
                    confirmPassword.length > 0 &&
                    !passwordsMatch
                        ? "Passwords do not match."
                        : ""
                }
                sx={{
                    mb: 2,
                    "& .MuiOutlinedInput-root": {
                        borderRadius: "12px",
                        bgcolor: "#fff"
                    }
                }}
                InputProps={{
                    endAdornment: (
                        <InputAdornment position="end">
                            <IconButton
                                onClick={() =>
                                    setShowConfirmPassword(
                                        value => !value
                                    )
                                }
                                edge="end"
                                disabled={loading}
                            >
                                {showConfirmPassword
                                    ? <VisibilityOff />
                                    : <Visibility />}
                            </IconButton>
                        </InputAdornment>
                    )
                }}
            />

            <Box
                sx={{
                    bgcolor: "#fff",
                    borderRadius: "12px",
                    border:
                        "1px solid rgba(42,28,59,0.10)",
                    p: 1.5,
                    mb: 2
                }}
            >
                <Typography
                    sx={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: "#2a1c3b",
                        mb: 0.75
                    }}
                >
                    Password requirements
                </Typography>

                <Typography
                    sx={{
                        fontSize: 12,
                        color:
                            passwordRequirements.length
                                ? "#2e7d32"
                                : "#546078"
                    }}
                >
                    {passwordRequirements.length
                        ? "✓"
                        : "•"}{" "}
                    At least 8 characters
                </Typography>

                <Typography
                    sx={{
                        fontSize: 12,
                        color:
                            passwordRequirements.upper &&
                            passwordRequirements.lower
                                ? "#2e7d32"
                                : "#546078"
                    }}
                >
                    {passwordRequirements.upper &&
                    passwordRequirements.lower
                        ? "✓"
                        : "•"}{" "}
                    Uppercase and lowercase letters
                </Typography>

                <Typography
                    sx={{
                        fontSize: 12,
                        color:
                            passwordRequirements.number
                                ? "#2e7d32"
                                : "#546078"
                    }}
                >
                    {passwordRequirements.number
                        ? "✓"
                        : "•"}{" "}
                    At least one number
                </Typography>

                <Typography
                    sx={{
                        fontSize: 12,
                        color:
                            passwordRequirements.special
                                ? "#2e7d32"
                                : "#546078"
                    }}
                >
                    {passwordRequirements.special
                        ? "✓"
                        : "•"}{" "}
                    At least one special character
                </Typography>
            </Box>

            {error && (
                <Typography
                    sx={{
                        color: "#c62828",
                        fontSize: 12.5,
                        mb: 1.5
                    }}
                >
                    {error}
                </Typography>
            )}

            <Button
                fullWidth
                type="submit"
                variant="contained"
                disabled={
                    loading ||
                    !passwordValid ||
                    !passwordsMatch
                }
                sx={{
                    ...primaryButtonSx,
                    py: 1.1,
                    borderRadius: "14px"
                }}
            >
                {loading
                    ? "Changing password..."
                    : "Change password"}
            </Button>

            <Button
                fullWidth
                type="button"
                disabled={loading}
                onClick={handleBack}
                sx={{
                    ...backButtonSx,
                    mt: 0.5,
                    py: 0.5
                }}
            >
                Back
            </Button>

        </Box>
    );
};

export default PasswordChangeStep;