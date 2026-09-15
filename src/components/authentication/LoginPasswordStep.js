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