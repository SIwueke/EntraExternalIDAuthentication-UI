import {
    Alert,
    Box,
    Button,
    Divider,
    TextField,
    Typography
} from "@mui/material";


const MfaEnrollmentStep = ({
    enrollmentData,
    enrollmentCode,
    setEnrollmentCode,
    loading,
    handleEnrollmentSubmit,
    handleBack,
    primaryButtonSx,
    backButtonSx
}) => {

    const otpAuthUri =
        enrollmentData?.otpAuthUri || "";

    const secret =
        enrollmentData?.secret || "";


    /*
     * Generate the QR-code URL using Google's chart endpoint.
     *
     * The QR code contains only the otpauth:// URI generated
     * by our backend.
     */
    const qrCodeUrl =
        otpAuthUri
            ? `https://quickchart.io/qr?text=${encodeURIComponent(
                otpAuthUri
            )}&size=160`
            : "";


    return (

        <Box
            sx={{
                width: "100%"
            }}
        >

            {/* ====================================================
                TITLE
            ==================================================== */}

            <Typography
                sx={{
                    fontSize: 19,
                    fontWeight: 600,
                    color: "#2a1c3b",
                    mb: 0.75,
                    lineHeight: 1.25
                }}
            >
                Set up Microsoft Authenticator
            </Typography>


            <Typography
                sx={{
                    fontSize: 12.5,
                    color: "#546078",
                    mb: 1.5,
                    lineHeight: 1.4
                }}
            >
                Scan the QR code below using the
                Microsoft Authenticator app.
            </Typography>


            {/* ====================================================
                QR CODE
            ==================================================== */}

            {qrCodeUrl && (

                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "center",
                        mb: 1.5
                    }}
                >

                    <Box
                        sx={{
                            p: 1,
                            bgcolor: "#fff",
                            borderRadius: "12px",
                            border:
                                "1px solid rgba(42,28,59,0.12)"
                        }}
                    >

                        <img
                            src={qrCodeUrl}
                            alt="Microsoft Authenticator QR code"
                            width={160}
                            height={160}
                            style={{
                                display: "block"
                            }}
                        />

                    </Box>

                </Box>
            )}


            {/* ====================================================
                MANUAL SECRET
            ==================================================== */}

            {secret && (

                <Box
                    sx={{
                        mb: 1.5
                    }}
                >

                    <Typography
                        sx={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#2a1c3b",
                            mb: 0.5
                        }}
                    >
                        Can't scan the QR code?
                    </Typography>


                    <Typography
                        sx={{
                            fontSize: 11.5,
                            color: "#546078",
                            mb: 0.5,
                            lineHeight: 1.3
                        }}
                    >
                        Enter this setup key manually
                        in Microsoft Authenticator:
                    </Typography>


                    <Box
                        sx={{
                            bgcolor: "#fff",
                            borderRadius: "8px",
                            p: 1,
                            border:
                                "1px solid rgba(42,28,59,0.12)",
                            wordBreak: "break-all",
                            fontFamily: "monospace",
                            fontSize: 11.5,
                            lineHeight: 1.3
                        }}
                    >
                        {secret}
                    </Box>

                </Box>
            )}


            <Divider
                sx={{
                    mb: 1.5
                }}
            />


            {/* ====================================================
                VERIFICATION INSTRUCTIONS
            ==================================================== */}

            <Typography
                sx={{
                    fontSize: 12.5,
                    color: "#546078",
                    mb: 1,
                    lineHeight: 1.4
                }}
            >
                Enter the 6-digit code displayed by
                Microsoft Authenticator.
            </Typography>


            {/* ====================================================
                CODE
            ==================================================== */}

            <TextField
                fullWidth
                size="small"
                label="Authenticator code"
                value={enrollmentCode}
                onChange={(event) => {

                    const value =
                        event.target.value
                            .replace(/\D/g, "")
                            .slice(0, 6);

                    setEnrollmentCode(value);
                }}
                inputProps={{
                    inputMode: "numeric",
                    maxLength: 6,
                    autoComplete: "one-time-code"
                }}
                disabled={loading}
                sx={{
                    mb: 1.25,

                    "& .MuiOutlinedInput-root": {
                        borderRadius: "12px",
                        bgcolor: "#fff"
                    }
                }}
            />


            {/* ====================================================
                INFORMATION
            ==================================================== */}

            <Alert
                severity="info"
                sx={{
                    mb: 1.25,
                    py: 0.25,
                    borderRadius: "10px",

                    "& .MuiAlert-message": {
                        fontSize: 11.5,
                        lineHeight: 1.35
                    },

                    "& .MuiAlert-icon": {
                        fontSize: 18
                    }
                }}
            >
                This code verifies your new
                Microsoft Authenticator registration.
            </Alert>


            {/* ====================================================
                COMPLETE ENROLLMENT
            ==================================================== */}

            <Button
                fullWidth
                variant="contained"
                size="small"
                disabled={
                    loading ||
                    enrollmentCode.length !== 6
                }
                onClick={
                    handleEnrollmentSubmit
                }
                sx={{
                    ...primaryButtonSx,
                    py: 1.1,
                    borderRadius: "14px",

                    "&:hover": {
                        background:
                            "linear-gradient(90deg, #544070, #2e3258)"
                    }
                }}
            >
                {loading
                    ? "Completing enrollment..."
                    : "Complete enrollment"}
            </Button>


            {/* ====================================================
                BACK
            ==================================================== */}

            <Button
                fullWidth
                size="small"
                disabled={loading}
                onClick={handleBack}
                sx={{
                    ...backButtonSx,
                    mt: 0.25,
                    py: 0.5
                }}
            >
                Back
            </Button>

        </Box>
    );
};


export default MfaEnrollmentStep;