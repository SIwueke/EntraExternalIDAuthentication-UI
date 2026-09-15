import {
    Box,
    Button,
    CircularProgress,
    TextField,
    Typography
} from "@mui/material";


const LoginMfaStep = ({
    username,
    code,
    setCode,
    loading,
    activeMfaMethod,
    handleMfaSubmit,
    handleBack,
    primaryButtonSx,
    backButtonSx
}) => {

    const challengeChannel =
        String(
            activeMfaMethod?.challenge_channel ?? ""
        ).toLowerCase();


    const verificationDestination =
        activeMfaMethod?.login_hint || username;


    let verificationMessage =
        "We have sent a verification code.";


    switch (challengeChannel) {

        case "email":

            verificationMessage =
                "We have sent a verification code to your email address.";

            break;


        case "sms":

            verificationMessage =
                "We have sent a verification code to your mobile phone.";

            break;


        case "authenticator":
        case "push":

            verificationMessage =
                "Approve the verification request in Microsoft Authenticator.";

            break;


        default:

            verificationMessage =
                "We have sent a verification code.";

            break;
    }


    return (

        <Box
            component="form"
            onSubmit={handleMfaSubmit}
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

                {verificationMessage}

                {verificationDestination && (
                    <>
                        <br />

                        <strong>
                            {verificationDestination}
                        </strong>
                    </>
                )}

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
                onChange={(event) =>
                    setCode(
                        event.target.value
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


export default LoginMfaStep;