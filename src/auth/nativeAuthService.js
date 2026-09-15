import {
    CustomAuthPublicClientApplication,
    SignInPasswordRequiredState,
    SignInCodeRequiredState,
    SignInCompletedState,
    AuthMethodRegistrationRequiredState,
    MfaAwaitingState,
    MfaVerificationRequiredState
} from "@azure/msal-browser/custom-auth";

import {
    registerAuthenticationMethod,
    verifyAuthenticationMethod,
    getRegistrationMethods,
    selectPreferredRegistrationMethod,
    getAuthMethodValue
} from "../auth/authRegistrationService";

import {nativeAuthConfig } from "../auth/nativeAuthConfig";
// ============================================================
// CURRENT AUTHENTICATION FLOW STATE
// ============================================================

let signInState = null;
// ============================================================
// NATIVE AUTH CLIENT
// ============================================================

let nativeAuthClient = null;

const getNativeAuthClient = async () => {

    if (nativeAuthClient) {
        return nativeAuthClient;
    }

    nativeAuthClient =
    await CustomAuthPublicClientApplication.create(
        nativeAuthConfig
    );

    return nativeAuthClient;
};
// ============================================================
// ERROR HANDLING
// ============================================================

const getErrorMessage = (result) => {

    if (!result) {
        return "An unknown authentication error occurred.";
    }

    if (
        result.error?.errorData?.errorDescription
    ) {
        return result.error.errorData.errorDescription;
    }

    if (result.error?.message) {
        return result.error.message;
    }

    if (typeof result.error === "string") {
        return result.error;
    }

    if (result.message) {
        return result.message;
    }

    return "Authentication failed.";
};


const isPasswordExpiredError = (result) => {

    const message =
        getErrorMessage(result);

    return (
        message.includes("AADSTS50055") ||
        message
            .toLowerCase()
            .includes("password is expired")
    );
};


// ============================================================
// RESULT HELPERS
// ============================================================

const isFailed = (result) => {

    return (
        typeof result?.isFailed === "function" &&
        result.isFailed()
    );
};


const isCompleted = (result) => {

    return (
        typeof result?.isCompleted === "function" &&
        result.isCompleted()
    );
};


const isMfaRequired = (result) => {

    return (
        typeof result?.isMfaRequired === "function" &&
        result.isMfaRequired()
    );
};


const isAuthMethodRegistrationRequired = (result) => {

    return (
        typeof result?.isAuthMethodRegistrationRequired ===
        "function" &&
        result.isAuthMethodRegistrationRequired()
    );
};


const createCompletedResult = (result) => {

    return {

        success: true,

        step: "completed",

        state:
            result?.state ?? null,

        account:
            result?.data?.account ?? null,

        authenticationResult:
            result?.data ?? null

    };
};


// ============================================================
// COMMON AUTHENTICATION RESULT PROCESSOR
//
// This is the main architectural change.
//
// Every MSAL operation can eventually return:
//
//   failed
//   completed
//   password
//   code
//   MFA
//   registration
//   unsupported
//
// Rather than repeating that logic in every function,
// we centralise it here.
// ============================================================

const processAuthenticationResult = async (
    result,
    options = {}
) => {

    const {
        defaultStep = "error"
    } = options;


    console.log(
        "========== PROCESS AUTH RESULT =========="
    );

    console.log(
        "Result:",
        result
    );

    console.log(
        "Result constructor:",
        result?.constructor?.name
    );

    console.log(
        "State:",
        result?.state
    );

    console.log(
        "State constructor:",
        result?.state?.constructor?.name
    );

    console.log(
        "=========================================="
    );


    // ---------------------------------------------------------
    // Always update the current state
    // ---------------------------------------------------------

    signInState =
        result?.state ?? null;


    // ---------------------------------------------------------
    // FAILED
    // ---------------------------------------------------------

    if (isFailed(result)) {

        return {

            success: false,

            step: defaultStep,

            state:
                signInState,

            message:
                getErrorMessage(result)

        };

    }


    // ---------------------------------------------------------
    // COMPLETED
    // ---------------------------------------------------------

    if (isCompleted(result)) {

        return createCompletedResult(result);

    }


    // ---------------------------------------------------------
    // AUTHENTICATION METHOD REGISTRATION
    // ---------------------------------------------------------

    if (
        isAuthMethodRegistrationRequired(result)
    ) {

        return {

            success: true,

            step:
                "authMethodRegistration",

            state:
                signInState,

            message:
                "An authentication method must be registered."

        };

    }


    // ---------------------------------------------------------
    // MFA
    // ---------------------------------------------------------

    if (isMfaRequired(result)) {

        return await processMfaAwaitingState(
            signInState
        );

    }


    // ---------------------------------------------------------
    // Explicit MFA state
    // ---------------------------------------------------------

    if (
        signInState instanceof
        MfaAwaitingState
    ) {

        return await processMfaAwaitingState(
            signInState
        );

    }


    // ---------------------------------------------------------
    // Explicit registration state
    // ---------------------------------------------------------

    if (
        signInState instanceof
        AuthMethodRegistrationRequiredState
    ) {

        return {

            success: true,

            step:
                "authMethodRegistration",

            state:
                signInState,

            message:
                "An authentication method must be registered."

        };

    }


    // ---------------------------------------------------------
    // Explicit verification-code state
    // ---------------------------------------------------------

    if (
        signInState instanceof
        SignInCodeRequiredState
    ) {

        return {

            success: true,

            step: "code",

            state:
                signInState,

            message:
                "Enter the verification code."

        };

    }


    // ---------------------------------------------------------
    // Unsupported
    // ---------------------------------------------------------

    console.error(
        "Unsupported authentication state:",
        signInState
    );

    return {

        success: false,

        step: defaultStep,

        state:
            signInState,

        message:
            "An unsupported authentication state was returned."

    };

};


// ============================================================
// START SIGN-IN
// ============================================================

export const startSignIn = async (
    username
) => {

    try {

        const cleanUsername =
            String(username ?? "").trim();


        if (!cleanUsername) {

            return {

                success: false,

                step: "email",

                message:
                    "Please enter your email address."

            };

        }


        const authClient =
            await getNativeAuthClient();


        console.log(
            "========== START SIGN-IN =========="
        );

        console.log(
            "Username:",
            cleanUsername
        );


        const result =
            await authClient.signIn({

                username:
                    cleanUsername

            });


        console.log(
            "Native sign-in result:",
            result
        );


        // ------------------------------------------------------
        // FAILED
        // ------------------------------------------------------

        if (isFailed(result)) {

            signInState = null;

            return {

                success: false,

                step: "email",

                message:
                    getErrorMessage(result)

            };

        }


        // ------------------------------------------------------
        // Store state
        // ------------------------------------------------------

        signInState =
            result?.state ?? null;


        // ------------------------------------------------------
        // PASSWORD REQUIRED
        // ------------------------------------------------------

        if (
            signInState instanceof
            SignInPasswordRequiredState
        ) {

            return {

                success: true,

                step: "password",

                state:
                    signInState,

                message:
                    "Password required."

            };

        }


        // ------------------------------------------------------
        // Process all other states
        // ------------------------------------------------------

        return await processAuthenticationResult(
            result,
            {
                defaultStep: "email"
            }
        );

    }
    catch (error) {

        console.error(
            "Native authentication start sign-in error:",
            error
        );

        signInState = null;

        return {

            success: false,

            step: "email",

            message:
                error?.message ??
                "Unable to start sign-in."

        };

    }

};


// ============================================================
// SUBMIT PASSWORD
// ============================================================

export const submitPassword = async (
    password
) => {

    try {

        if (!signInState) {

            return {

                success: false,

                step: "error",

                message:
                    "No authentication state is active."

            };

        }


        if (
            !(
                signInState instanceof
                SignInPasswordRequiredState
            )
        ) {

            console.warn(
                "submitPassword called while state is:",
                signInState?.constructor?.name
            );

        }


        const cleanPassword =
            String(password ?? "");


        if (!cleanPassword) {

            return {

                success: false,

                step: "password",

                message:
                    "Please enter your password."

            };

        }


        console.log(
            "========== SUBMIT PASSWORD =========="
        );


        const result =
            await signInState.submitPassword(
                cleanPassword
            );
        //============================
        console.log(
            "========== AFTER PASSWORD =========="
        );

        console.log(
            "Full result:",
            result
        );

        console.log(
            "Result constructor:",
            result?.constructor?.name
        );

        console.log(
            "Result state:",
            result?.state
        );

        console.log(
            "State constructor:",
            result?.state?.constructor?.name
        );

        console.log(
            "isCompleted:",
            typeof result?.isCompleted === "function"
                ? result.isCompleted()
                : "not available"
        );

        console.log(
            "isMfaRequired:",
            typeof result?.isMfaRequired === "function"
                ? result.isMfaRequired()
                : "not available"
        );

        console.log(
            "isFailed:",
            typeof result?.isFailed === "function"
                ? result.isFailed()
                : "not available"
        );

        console.log(
            "isAuthMethodRegistrationRequired:",
            typeof result?.isAuthMethodRegistrationRequired === "function"
                ? result.isAuthMethodRegistrationRequired()
                : "not available"
        );

        console.log(
            "===================================="
        );
            //===================

        console.log(
            "Password authentication result:",
            result
        );


        return await processAuthenticationResult(
            result,
            {
                defaultStep: "password"
            }
        );

    }
    catch (error) {

        console.error(
            "Native authentication password error:",
            error
        );

        return {

            success: false,

            step: "password",

            message:
                error?.message ??
                "Unable to submit password."

        };

    }

};


// ============================================================
// PROCESS MFA AWAITING STATE
// ============================================================

const processMfaAwaitingState = async (
    mfaState
) => {

    console.log(
        "========== MFA AWAITING =========="
    );

    console.log(
        "MFA state:",
        mfaState
    );

    console.log(
        "MFA state constructor:",
        mfaState?.constructor?.name
    );


    if (!mfaState) {

        return {

            success: false,

            step: "error",

            message:
                "MFA is required, but no MFA state was returned."

        };

    }


    signInState =
        mfaState;


    let authMethods = [];


    // ---------------------------------------------------------
    // Get available authentication methods
    // ---------------------------------------------------------

    if (
        typeof mfaState.getAuthMethods ===
        "function"
    ) {

        try {

            authMethods =
                await mfaState.getAuthMethods();

        }
        catch (error) {

            console.error(
                "Unable to retrieve MFA authentication methods:",
                error
            );

            return {

                success: false,

                step: "error",

                message:
                    error?.message ??
                    "Unable to retrieve MFA authentication methods."

            };

        }

    }


    // =========================================================
    // PHASE 6.1 DIAGNOSTICS
    // =========================================================

    console.log(
        "========== AVAILABLE MFA METHODS =========="
    );

    console.log(
        "Number of methods:",
        authMethods?.length ?? 0
    );

    if (Array.isArray(authMethods)) {

        authMethods.forEach(
            (method, index) => {

                console.log(
                    `----- MFA METHOD ${index + 1} -----`
                );

                console.log(
                    "Full method:",
                    method
                );
                console.log(
                "Own property names:",
                Object.getOwnPropertyNames(method)
            );

            console.log(
                "Own property symbols:",
                Object.getOwnPropertySymbols(method)
            );

            console.log(
                "Prototype:",
                Object.getPrototypeOf(method)
            );

            console.log(
                "Prototype property names:",
                Object.getOwnPropertyNames(
                    Object.getPrototypeOf(method) ?? {}
                )
            );

            console.log(
                "JSON:",
                JSON.stringify(method, null, 2)
            );
                console.log(
                    "Constructor:",
                    method?.constructor?.name
                );

                console.log(
                    "ID:",
                    method?.id
                );

                console.log(
                    "Type:",
                    method?.type
                );

                console.log(
                    "Method:",
                    method?.method
                );

                console.log(
                    "Display name:",
                    method?.displayName
                );

                console.log(
                    "Authentication method ID:",
                    method?.authenticationMethodId
                );

                console.log(
                    "Value:",
                    method?.value
                );

                console.log(
                    "=========================================="
                );

            }
        );

    }

    console.log(
        "=========================================="
    );


    // ---------------------------------------------------------
    // No methods
    // ---------------------------------------------------------

    if (
        !authMethods ||
        authMethods.length === 0
    ) {

        return {

            success: false,

            step: "error",

            message:
                "MFA is required, but no usable authentication method is registered for this account."

        };

    }


    // ---------------------------------------------------------
    // Return methods to UI
    // ---------------------------------------------------------

    return {

        success: true,

        step: "mfa",

        state:
            mfaState,

        authMethods,

        message:
            "MFA verification is required."

    };

};

// ============================================================
// REQUEST MFA CHALLENGE
// ============================================================

export const requestMfaChallenge = async (
    authenticationMethodId
) => {

    try {

        if (
            !signInState ||
            !(
                signInState instanceof
                MfaAwaitingState
            )
        ) {

            return {

                success: false,

                step: "error",

                message:
                    "The MFA authentication method selection step is not active."

            };

        }


        if (!authenticationMethodId) {

            return {

                success: false,

                step: "mfa",

                message:
                    "No MFA authentication method was selected."

            };

        }


        console.log(
            "========== REQUEST MFA CHALLENGE =========="
        );

        console.log(
            "Authentication method:",
            authenticationMethodId
        );


        const result =
    await signInState.requestChallenge(
        authenticationMethodId
    );

    console.log("========== MFA CHALLENGE RAW RESULT ==========");

    console.log("Result:", result);
    console.log("Result constructor:", result?.constructor?.name);
    console.log("Result state:", result?.state);
    console.log(
        "State constructor:",
        result?.state?.constructor?.name
    );

    console.log(
        "isVerificationRequired:",
        typeof result?.isVerificationRequired === "function"
            ? result.isVerificationRequired()
            : "not available"
    );

    console.log(
        "isCompleted:",
        typeof result?.isCompleted === "function"
            ? result.isCompleted()
            : "not available"
    );

    console.log(
        "isFailed:",
        typeof result?.isFailed === "function"
            ? result.isFailed()
            : "not available"
    );

    console.log("==============================================");


        console.log(
            "MFA challenge result:",
            result
        );


        // ------------------------------------------------------
        // FAILED
        // ------------------------------------------------------

        if (isFailed(result)) {

            return {

                success: false,

                step: "mfa",

                message:
                    getErrorMessage(result)

            };

        }


        // ------------------------------------------------------
        // Update state
        // ------------------------------------------------------

        signInState =
            result?.state ?? null;


        // ------------------------------------------------------
        // VERIFICATION REQUIRED
        // ------------------------------------------------------

        if (
            typeof result?.isVerificationRequired ===
            "function" &&
            result.isVerificationRequired()
        ) {

            return {

                success: true,

                step: "mfaCode",

                state:
                    signInState,

                message:
                    "A verification code has been sent to your email."

            };

        }


        // ------------------------------------------------------
        // Explicit state check
        // ------------------------------------------------------

        if (
            signInState instanceof
            MfaVerificationRequiredState
        ) {

            return {

                success: true,

                step: "mfaCode",

                state:
                    signInState,

                message:
                    "A verification code has been sent to your email."

            };

        }


        // ------------------------------------------------------
        // COMPLETED
        // ------------------------------------------------------

        if (isCompleted(result)) {

            return createCompletedResult(result);

        }


        // ------------------------------------------------------
        // Unexpected
        // ------------------------------------------------------

        return {

            success: false,

            step: "error",

            state:
                signInState,

            message:
                "Unable to start the MFA verification challenge."

        };

    }
    catch (error) {

        console.error(
            "MFA challenge request error:",
            error
        );

        return {

            success: false,

            step: "mfa",

            message:
                error?.message ??
                "Unable to send the MFA verification code."

        };

    }

};


// ============================================================
// SUBMIT MFA CHALLENGE
// ============================================================

export const submitMfaChallenge = async (
    code
) => {

    try {

        if (
            !signInState ||
            !(
                signInState instanceof
                MfaVerificationRequiredState
            )
        ) {

            return {

                success: false,

                step: "error",

                message:
                    "The MFA verification step is not active."

            };

        }


        const cleanCode =
            String(code ?? "").trim();


        if (!cleanCode) {

            return {

                success: false,

                step: "mfaCode",

                message:
                    "Please enter the verification code."

            };

        }


        console.log(
            "========== SUBMIT MFA CHALLENGE =========="
        );


        const result =
            await signInState.submitChallenge(
                cleanCode
            );


        console.log(
            "MFA submit result:",
            result
        );


        // ------------------------------------------------------
        // FAILED
        // ------------------------------------------------------

        if (isFailed(result)) {

            // Password expired
            if (
                isPasswordExpiredError(result)
            ) {

                return {

                    success: false,

                    step: "passwordExpired",

                    state:
                        result?.state ?? null,

                    message:
                        "Your password has expired. Please reset your password."

                };

            }


            // Incorrect OTP
            if (
                result.error &&
                typeof
                    result.error.isIncorrectChallenge ===
                "function" &&
                result.error.isIncorrectChallenge()
            ) {

                return {

                    success: false,

                    step: "mfaCode",

                    message:
                        "The verification code is incorrect."

                };

            }


            return {

                success: false,

                step: "mfaCode",

                message:
                    getErrorMessage(result)

            };

        }


        // ------------------------------------------------------
        // Update state
        // ------------------------------------------------------

        signInState =
            result?.state ?? null;


        // ------------------------------------------------------
        // COMPLETED
        // ------------------------------------------------------

        if (isCompleted(result)) {

            console.log(
                "========== MFA AUTHENTICATION COMPLETED =========="
            );

            return createCompletedResult(result);

        }


        // ------------------------------------------------------
        // MFA required again
        // ------------------------------------------------------

        if (isMfaRequired(result)) {

            return await processMfaAwaitingState(
                result.state
            );

        }


        // ------------------------------------------------------
        // Another verification state
        // ------------------------------------------------------

        if (
            signInState instanceof
            MfaVerificationRequiredState
        ) {

            return {

                success: true,

                step: "mfaCode",

                state:
                    signInState,

                message:
                    "Please enter the verification code."

            };

        }


        return {

            success: false,

            step: "error",

            state:
                signInState,

            message:
                "The MFA verification did not complete the sign-in."

        };

    }
    catch (error) {

        console.error(
            "MFA challenge submission error:",
            error
        );

        return {

            success: false,

            step: "mfaCode",

            message:
                error?.message ??
                "Unable to verify the MFA code."

        };

    }

};


// ============================================================
// STANDARD SIGN-IN VERIFICATION CODE
//
// This remains separate from MFA.
//
// This is important because your existing email authentication
// flow must continue to work.
// ============================================================

export const submitVerificationCode = async (
    code
) => {

    try {

        if (
            !signInState ||
            !(
                signInState instanceof
                SignInCodeRequiredState
            )
        ) {

            return {

                success: false,

                step: "error",

                message:
                    "No verification code step is active."

            };

        }


        const cleanCode =
            String(code ?? "").trim();


        if (!cleanCode) {

            return {

                success: false,

                step: "code",

                message:
                    "Please enter the verification code."

            };

        }


        console.log(
            "========== SUBMIT STANDARD CODE =========="
        );


        const result =
            await signInState.submitCode(
                cleanCode
            );


        console.log(
            "Standard code result:",
            result
        );


        return await processAuthenticationResult(
            result,
            {
                defaultStep: "code"
            }
        );

    }
    catch (error) {

        console.error(
            "Native authentication code error:",
            error
        );

        return {

            success: false,

            step: "code",

            message:
                error?.message ??
                "Unable to verify the code."

        };

    }

};


// ============================================================
// GET CURRENT USER
// ============================================================

export const getCurrentUser = async () => {

    try {

        const authClient =
            await getNativeAuthClient();


        const account =
            authClient.getCurrentAccount();


        console.log(
            "Current account:",
            account
        );


        return {

            authenticated:
                !!account,

            data:
                account ?? null

        };

    }
    catch (error) {

        console.error(
            "Get current user error:",
            error
        );

        return {

            authenticated: false,

            data: null

        };

    }

};


// ============================================================
// CLEAR AUTHENTICATION FLOW
// ============================================================

export const clearSignInState = () => {

    console.log(
        "Clearing native authentication state."
    );

    signInState = null;

};


// ============================================================
// GET CURRENT AUTHENTICATION STATE
// ============================================================

export const getCurrentSignInState = () => {

    return signInState;

};