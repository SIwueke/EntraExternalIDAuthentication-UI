import {
    useState
}
from "react";

import {

    Box,

    Button,

    CircularProgress,

    Paper,

    TextField,

    Typography,

    Alert

}
from "@mui/material";

import {

    startSignIn,

    submitPassword,

    submitVerificationCode,

    clearSignInState

}
from "../auth/nativeAuthService";

import {
    getNativeAuthClient
} from "../auth/nativeAuthClient";
const NativeLoginTestPage = () => {

    const [email, setEmail] =
        useState("");

    const [password, setPassword] =
        useState("");

    const [code, setCode] =
        useState("");

    const [step, setStep] =
        useState("email");

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState("");

    const [message, setMessage] =
        useState("");

    const [completed, setCompleted] =
        useState(false);


    //----------------------------------------------------
    // Start Sign-In
    //----------------------------------------------------

    const handleStartSignIn =
        async () => {

            try {

                setLoading(true);

                setError("");

                setMessage("");

                const result =
                    await startSignIn(
                        email
                    );

                if (!result.success) {

                    setError(
                        result.message
                    );

                    return;

                }

                setMessage(
                    result.message ?? ""
                );

                if (
                    result.step === "password"
                ) {

                    setStep(
                        "password"
                    );

                    return;

                }

                if (
                    result.step === "code"
                ) {

                    setStep(
                        "code"
                    );

                    return;

                }

                if (
                    result.step === "completed"
                ) {

                    setCompleted(
                        true
                    );

                }

            }
            finally {

                setLoading(false);

            }

        };


    //----------------------------------------------------
    // Submit Password
    //----------------------------------------------------

    const handlePasswordSubmit =
        async () => {

            try {

                setLoading(true);

                setError("");

                setMessage("");

                const result =
                    await submitPassword(
                        password
                    );

                if (!result.success) {

                    setError(
                        result.message
                    );

                    return;

                }

                setMessage(
                    result.message ?? ""
                );

                if (
                    result.step === "code"
                ) {

                    setStep(
                        "code"
                    );

                    return;

                }

                if (
                    result.step === "completed"
                ) {

                    setCompleted(
                        true
                    );

                }

            }
            finally {

                setLoading(false);

            }

        };


    //----------------------------------------------------
    // Submit Verification Code
    //----------------------------------------------------

    const handleCodeSubmit =
        async () => {

            try {

                setLoading(true);

                setError("");

                setMessage("");

                const result =
                    await submitVerificationCode(
                        code
                    );

                if (!result.success) {

                    setError(
                        result.message
                    );

                    return;

                }

                if (
                    result.step === "completed"
                ) {

                    setCompleted(
                        true
                    );

                }

            }
            finally {

                setLoading(false);

            }

        };


    //----------------------------------------------------
    // Start Again
    //----------------------------------------------------

    const handleReset = () => {

        clearSignInState();

        setEmail("");

        setPassword("");

        setCode("");

        setError("");

        setMessage("");

        setCompleted(false);

        setStep("email");

    };

  
const checkCurrentAccount = async () => {

    try {

        const authClient =
            await getNativeAuthClient();

        const account =
            authClient.getCurrentAccount();

        console.log(
            "========== CURRENT AUTH STATE =========="
        );

        console.log(
            "Current account:",
            account
        );

        console.log(
            "Account username:",
            account?.username
        );

        console.log(
            "Account homeAccountId:",
            account?.homeAccountId
        );

        console.log(
            "Account localAccountId:",
            account?.localAccountId
        );

        console.log(
            "========================================"
        );

    }
    catch (error) {

        console.error(
            "Error getting current account:",
            error
        );

    }

};
    //----------------------------------------------------
    // Completed
    //----------------------------------------------------

    if (completed) {

        return (

            <Box
                sx={{
                    maxWidth: 500,
                    mx: "auto",
                    mt: 8
                }}
            >

                <Paper
                    sx={{
                        p: 4
                    }}
                >

                    <Alert
                        severity="success"
                        sx={{
                            mb: 3
                        }}
                    >

                        Authentication completed successfully.

                    </Alert>

                    <Typography
                        variant="h5"
                        gutterBottom
                    >

                        Signed In

                    </Typography>

                    <Typography
                        color="text.secondary"
                        mb={3}
                    >

                        Your Entra External ID
                        authentication flow completed.

                    </Typography>

                    <Button
                        variant="outlined"
                        onClick={handleReset}
                    >

                        Test Again

                    </Button>
                    <Button
                        variant="outlined"
                        onClick={checkCurrentAccount}
                        sx={{ mt: 2 }}
                    >
                        Check Current Account
                    </Button>
                </Paper>

            </Box>

        );

    }


    //----------------------------------------------------
    // Page
    //----------------------------------------------------

    return (

        <Box
            sx={{
                maxWidth: 500,
                mx: "auto",
                mt: 8
            }}
        >

            <Paper
                sx={{
                    p: 4
                }}
            >

                <Typography
                    variant="h4"
                    gutterBottom
                >

                    Native Authentication Test

                </Typography>


                {

                    error && (

                        <Alert
                            severity="error"
                            sx={{
                                mb: 2
                            }}
                        >

                            {error}

                        </Alert>

                    )

                }


                {

                    message && (

                        <Alert
                            severity="info"
                            sx={{
                                mb: 2
                            }}
                        >

                            {message}

                        </Alert>

                    )

                }


                {/* EMAIL */}

                {

                    step === "email" && (

                        <>

                            <TextField

                                fullWidth

                                label="Email"

                                type="email"

                                value={email}

                                onChange={(event) =>
                                    setEmail(
                                        event.target.value
                                    )
                                }

                                disabled={loading}

                                sx={{
                                    mb: 3
                                }}

                            />

                            <Button

                                fullWidth

                                variant="contained"

                                onClick={
                                    handleStartSignIn
                                }

                                disabled={
                                    loading ||
                                    !email
                                }

                            >

                                {

                                    loading ?

                                        <CircularProgress
                                            size={24}
                                        />

                                        :

                                        "Continue"

                                }

                            </Button>

                        </>

                    )

                }


                {/* PASSWORD */}

                {

                    step === "password" && (

                        <>

                            <Typography
                                color="text.secondary"
                                mb={2}
                            >

                                Signing in as:

                                {" "}

                                {email}

                            </Typography>

                            <TextField

                                fullWidth

                                label="Password"

                                type="password"

                                value={password}

                                onChange={(event) =>
                                    setPassword(
                                        event.target.value
                                    )
                                }

                                disabled={loading}

                                sx={{
                                    mb: 3
                                }}

                            />

                            <Button

                                fullWidth

                                variant="contained"

                                onClick={
                                    handlePasswordSubmit
                                }

                                disabled={
                                    loading ||
                                    !password
                                }

                            >

                                {

                                    loading ?

                                        <CircularProgress
                                            size={24}
                                        />

                                        :

                                        "Sign In"

                                }

                            </Button>

                        </>

                    )

                }


                {/* VERIFICATION CODE */}

                {

                    step === "code" && (

                        <>

                            <Typography
                                color="text.secondary"
                                mb={2}
                            >

                                Enter the verification
                                code sent to you.

                            </Typography>

                            <TextField

                                fullWidth

                                label="Verification Code"

                                value={code}

                                onChange={(event) =>
                                    setCode(
                                        event.target.value
                                    )
                                }

                                disabled={loading}

                                sx={{
                                    mb: 3
                                }}

                            />

                            <Button

                                fullWidth

                                variant="contained"

                                onClick={
                                    handleCodeSubmit
                                }

                                disabled={
                                    loading ||
                                    !code
                                }

                            >

                                {

                                    loading ?

                                        <CircularProgress
                                            size={24}
                                        />

                                        :

                                        "Verify Code"

                                }

                            </Button>

                        </>

                    )

                }


                {

                    step !== "email" && (

                        <Button

                            fullWidth

                            variant="text"

                            onClick={handleReset}

                            disabled={loading}

                            sx={{
                                mt: 2
                            }}

                        >

                            Cancel

                        </Button>

                    )

                }

            </Paper>

        </Box>

    );

};


export default NativeLoginTestPage;