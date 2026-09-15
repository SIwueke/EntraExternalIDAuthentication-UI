import {
    Box,
    Button,
    CircularProgress,
    TextField,
    Typography
} from "@mui/material";


const LoginEmailStep = ({
    username,
    setUsername,
    loading,
    handleEmailSubmit,
    primaryButtonSx
}) => {

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
                onChange={(event) =>
                    setUsername(
                        event.target.value
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
                sx={primaryButtonSx}
            >

                {loading ? (

                    <CircularProgress
                        size={22}
                        color="inherit"
                    />

                ) : (

                    "Continue"

                )}

            </Button>

        </Box>

    );

};


export default LoginEmailStep;