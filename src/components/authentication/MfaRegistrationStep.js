import {
    Alert,
    Box,
    Button,
    CircularProgress,
    TextField,
    Typography
} from "@mui/material";

import {
    getAuthMethodValue
} from "../../auth/authRegistrationService";


const MfaRegistrationStep = ({
    registrationMethods,
    selectedRegistrationMethod,
    setSelectedRegistrationMethod,
    registrationContact,
    setRegistrationContact,
    loading,
    handleRegistrationSubmit,
    handleBack,
    primaryButtonSx,
    backButtonSx
}) => {

    return (

        <Box
            component="form"
            onSubmit={handleRegistrationSubmit}
        >

            <Typography
                sx={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: "#2a1c3b",
                    mb: 1
                }}
            >
                Set up verification
            </Typography>


            <Typography
                sx={{
                    fontSize: 14,
                    color: "#546078",
                    mb: 3
                }}
            >
                Before you can sign in, you need to
                register a verification method.
            </Typography>


            <Typography
                sx={{
                    fontSize: 13,
                    fontWeight: 600,
                    mb: 1
                }}
            >
                Verification method
            </Typography>


            {registrationMethods.map(
                (method, index) => {

                    const value =
                        getAuthMethodValue(
                            method
                        );


                    const isEmail =
                        value
                            .toLowerCase()
                            .includes("email");


                    const selected =
                        selectedRegistrationMethod ===
                        method;


                    return (

                        <Button
                            key={
                                `${value}-${index}`
                            }
                            type="button"
                            fullWidth
                            onClick={() =>
                                setSelectedRegistrationMethod(
                                    method
                                )
                            }
                            sx={{
                                justifyContent:
                                    "flex-start",
                                mb: 1,
                                py: 1.5,
                                px: 2,
                                borderRadius: "14px",
                                border:
                                    selected
                                        ? "2px solid #544070"
                                        : "1px solid #ccc",
                                color: "#2a1c3b",
                                backgroundColor:
                                    selected
                                        ? "rgba(84,64,112,0.08)"
                                        : "#fff",
                                textTransform:
                                    "none"
                            }}
                        >

                            {isEmail
                                ? "Email OTP"
                                : value ||
                                  "Authentication method"}

                        </Button>

                    );

                }
            )}


            {registrationMethods.length === 0 && (

                <Alert
                    severity="warning"
                    sx={{
                        mb: 2
                    }}
                >
                    No authentication registration
                    methods are currently available.
                </Alert>

            )}


            <Typography
                sx={{
                    fontSize: 13,
                    fontWeight: 600,
                    mb: 0.5,
                    mt: 2
                }}
            >
                Email address
            </Typography>


            <TextField
                fullWidth
                autoFocus
                value={registrationContact}
                onChange={(event) =>
                    setRegistrationContact(
                        event.target.value
                    )
                }
                placeholder="Enter your email address"
                autoComplete="email"
                sx={{
                    mb: 3
                }}
            />


            <Button
                type="submit"
                fullWidth
                disabled={
                    loading ||
                    !selectedRegistrationMethod
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

                    "Send verification code"

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


export default MfaRegistrationStep;