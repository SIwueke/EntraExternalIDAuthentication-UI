import React from "react";
import {
    Box,
    Button,
    TextField,
    Typography
} from "@mui/material";


const PasswordResetCodeStep = ({
    username,
    passwordResetCode,
    setPasswordResetCode,
    loading,
    handlePasswordResetCodeSubmit,
    handleBack,
    primaryButtonSx,
    backButtonSx
}) => {

    return (
        <Box>

            <Typography
                sx={{
                    fontSize: 22,
                    fontWeight: 600,
                    color: "#2a1c3b",
                    mb: 1
                }}
            >
                Verify your password reset
            </Typography>


            <Typography
                sx={{
                    fontSize: 14,
                    color: "#546078",
                    mb: 3,
                    lineHeight: 1.6
                }}
            >
                Your password has expired. A verification
                code has been sent to the email address
                associated with your account.
            </Typography>


            {username && (
                <Typography
                    sx={{
                        fontSize: 13,
                        color: "#546078",
                        mb: 2
                    }}
                >
                    Account: {username}
                </Typography>
            )}


            <TextField
                fullWidth
                label="Verification code"
                value={passwordResetCode}
                onChange={(event) =>
                    setPasswordResetCode(
                        event.target.value
                    )
                }
                placeholder="Enter verification code"
                autoComplete="one-time-code"
                disabled={loading}
                inputProps={{
                    inputMode: "numeric"
                }}
                sx={{
                    mb: 2,

                    "& .MuiOutlinedInput-root": {
                        borderRadius: "14px",
                        backgroundColor: "#fff"
                    }
                }}
            />


            <Button
                variant="contained"
                fullWidth
                disabled={
                    loading ||
                    !passwordResetCode?.trim()
                }
                onClick={
                    handlePasswordResetCodeSubmit
                }
                sx={{
                    ...primaryButtonSx,

                    "&:hover": {
                        background:
                            "linear-gradient(90deg, #544070, #2e3258)"
                    }
                }}
            >
                {loading
                    ? "Verifying..."
                    : "Verify Code"}
            </Button>


            <Button
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


export default PasswordResetCodeStep;

