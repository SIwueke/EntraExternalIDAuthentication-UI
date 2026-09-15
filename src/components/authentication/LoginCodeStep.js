import {
    Box,
    Button,
    CircularProgress,
    TextField,
    Typography
} from "@mui/material";


const LoginCodeStep = ({
    username,
    code,
    setCode,
    loading,
    handleCodeSubmit,
    handleBack,
    primaryButtonSx,
    backButtonSx
}) => {

    return (

        <Box
            component="form"
            onSubmit={handleCodeSubmit}
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
                onChange={(event) =>
                    setCode(
                        event.target.value
                    )
                }
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
                disabled={loading}
                sx={{
                    ...primaryButtonSx,
                    mb: 1
                }}
            >

                {loading ? (

                    <CircularProgress
                        size={22}
                        color="inherit"
                    />

                ) : (

                    "Verify code"

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


export default LoginCodeStep;