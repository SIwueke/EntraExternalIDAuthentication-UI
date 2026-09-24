import {
    Box,
    Button,
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


const LoginPasswordStep = ({
    username,
    password,
    setPassword,
    loading,
    showPassword,
    setShowPassword,
    remember,
    setRemember,
    handlePasswordSubmit,
    handleBack,
    primaryButtonSx,
    backButtonSx
}) => {

    // ============================================================
    // EXPLICIT PASSWORD FORM SUBMIT HANDLER
    //
    // We deliberately handle the browser submit event here rather
    // than passing handlePasswordSubmit directly to onSubmit.
    //
    // This prevents the browser's native form submission and lets
    // us verify that the password form is actually reaching the
    // native authentication handler.
    // ============================================================

    const handleSubmit = (event) => {

        event.preventDefault();
        event.stopPropagation();

        console.log(
            "========== LOGIN PASSWORD FORM SUBMITTED =========="
        );

        console.log(
            "Username:",
            username
        );

        console.log(
            "Password supplied:",
            password
                ? "YES"
                : "NO"
        );

        console.log(
            "handlePasswordSubmit:",
            handlePasswordSubmit
        );

        if (
            typeof handlePasswordSubmit !==
            "function"
        ) {

            console.error(
                "handlePasswordSubmit is not a function."
            );

            return;
        }

        handlePasswordSubmit(event);
    };


    return (

        <Box
            component="form"
            onSubmit={handleSubmit}
        >

            {/* ==================================================
                EMAIL
            ================================================== */}

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


            {/* ==================================================
                PASSWORD
            ================================================== */}

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
                onChange={(event) =>
                    setPassword(
                        event.target.value
                    )
                }
                autoComplete="current-password"
                InputProps={{
                    endAdornment: (

                        <IconButton
                            type="button"
                            onClick={() =>
                                setShowPassword(
                                    (current) =>
                                        !current
                                )
                            }
                        >

                            {showPassword ? (

                                <VisibilityOff />

                            ) : (

                                <Visibility />

                            )}

                        </IconButton>

                    )
                }}
                sx={{
                    mb: 1
                }}
            />


            {/* ==================================================
                REMEMBER ME / FORGOT PASSWORD
            ================================================== */}

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
                            onChange={(event) =>
                                setRemember(
                                    event.target.checked
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


            {/* ==================================================
                SIGN IN
            ================================================== */}

            <Button
                type="submit"
                fullWidth
                disabled={loading}
                sx={{
                    ...primaryButtonSx,
                    mb: 2
                }}
            >

                {loading ? (

                    <CircularProgress
                        size={22}
                        color="inherit"
                    />

                ) : (

                    "Sign In"

                )}

            </Button>


            {/* ==================================================
                BACK
            ================================================== */}

            <Button
                type="button"
                fullWidth
                onClick={handleBack}
                disabled={loading}
                sx={backButtonSx}
            >
                Back
            </Button>

        </Box>

    );

};


export default LoginPasswordStep;