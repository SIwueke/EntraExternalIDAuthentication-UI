import {
    CustomAuthPublicClientApplication,
    SignInPasswordRequiredState,
    SignInCodeRequiredState,
    SignInCompletedState,
    AuthMethodRegistrationRequiredState,
    MfaAwaitingState,
    MfaVerificationRequiredState,
    ResetPasswordCodeRequiredState,
    ResetPasswordPasswordRequiredState,
    ResetPasswordCompletedState
} from "@azure/msal-browser/custom-auth";

import {
    registerAuthenticationMethod,
    verifyAuthenticationMethod,
    getRegistrationMethods,
    selectPreferredRegistrationMethod,
    getAuthMethodValue
} from "../auth/authRegistrationService";

import { nativeAuthConfig } from "../auth/nativeAuthConfig";


// ============================================================
// CURRENT AUTHENTICATION FLOW STATE
// ============================================================

let signInState = null;


// ============================================================
// CURRENT SIGN-IN USERNAME
// ============================================================
//
// This is required when Entra returns AADSTS50055.
//
// The SignInPasswordRequiredState becomes a
// SignInFailedState when the password is expired, so we cannot
// continue the password-change operation through that failed
// state.
//
// Instead, we use the username to start the native
// resetPassword() flow.
//

let currentUsername = null;


// ============================================================
// PASSWORD RESET / CHANGE FLOW STATE
// ============================================================
//
// This is deliberately kept separate from signInState.
//
// signInState:
//     Normal native sign-in flow.
//
// passwordResetState:
//     Entra native password reset/change flow.
//
// Keeping them separate prevents the password-change flow
// from accidentally corrupting the existing sign-in state.
//

let passwordResetState = null;


// ============================================================
// COMPLETED ENTRA AUTHENTICATION RESULT
//
// IMPORTANT:
//
// This stores the CustomAuthAccountData object returned by
// Microsoft Entra after successful password authentication.
//
// We do NOT store the raw access token here.
//
// The CustomAuthAccountData object can acquire an access token
// when the application needs one.
// ============================================================

let completedAuthenticationResult = null;


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

// ============================================================
// ERROR HANDLING
// ============================================================

// ============================================================
// ERROR HANDLING
// ============================================================

const getErrorText = (value) => {
    if (!value) {
        return "";
    }

    const parts = [];

    // --------------------------------------------------------
    // Direct properties
    // --------------------------------------------------------

    const directProperties = [
        "message",
        "name",
        "errorCode",
        "errorMessage",
        "errorDescription",
        "description",
        "code"
    ];

    directProperties.forEach((property) => {
        try {
            const propertyValue =
                value[property];

            if (
                propertyValue !== undefined &&
                propertyValue !== null &&
                propertyValue !== ""
            ) {
                parts.push(
                    String(propertyValue)
                );
            }
        }
        catch {
            // Ignore inaccessible properties.
        }
    });

    // --------------------------------------------------------
    // Nested errorData
    // --------------------------------------------------------

    try {
        const errorData =
            value.errorData;

        if (errorData) {
            directProperties.forEach((property) => {
                try {
                    const propertyValue =
                        errorData[property];

                    if (
                        propertyValue !== undefined &&
                        propertyValue !== null &&
                        propertyValue !== ""
                    ) {
                        parts.push(
                            String(propertyValue)
                        );
                    }
                }
                catch {
                    // Ignore inaccessible properties.
                }
            });
        }
    }
    catch {
        // Ignore.
    }

    // --------------------------------------------------------
    // Walk the prototype chain.
    //
    // This is important because the MSAL CustomAuth error
    // properties may not be enumerable.
    // --------------------------------------------------------

    try {
        let current =
            value;

        let level = 0;

        while (
            current &&
            level < 5
        ) {
            const properties =
                Object.getOwnPropertyNames(
                    current
                );

            properties.forEach((property) => {
                try {
                    const propertyValue =
                        current[property];

                    if (
                        propertyValue !== undefined &&
                        propertyValue !== null &&
                        typeof propertyValue !== "object" &&
                        typeof propertyValue !== "function"
                    ) {
                        parts.push(
                            String(propertyValue)
                        );
                    }
                }
                catch {
                    // Ignore inaccessible properties.
                }
            });

            current =
                Object.getPrototypeOf(
                    current
                );

            level++;
        }
    }
    catch {
        // Ignore prototype inspection errors.
    }

    return [
        ...new Set(
            parts
        )
    ]
        .join(" ")
        .toLowerCase();
};


// ============================================================
// GET ERROR MESSAGE
// ============================================================

const getErrorMessage = (result) => {
    if (!result) {
        return "An unknown authentication error occurred.";
    }

    try {
        if (result.error?.message) {
            return result.error.message;
        }
    }
    catch {
        // Continue.
    }

    try {
        if (result.error?.errorData?.message) {
            return result.error.errorData.message;
        }
    }
    catch {
        // Continue.
    }

    try {
        if (result.error?.errorData?.errorDescription) {
            return result.error.errorData.errorDescription;
        }
    }
    catch {
        // Continue.
    }

    try {
        if (result.error?.errorData?.errorMessage) {
            return result.error.errorData.errorMessage;
        }
    }
    catch {
        // Continue.
    }

    try {
        if (result.error?.errorDescription) {
            return result.error.errorDescription;
        }
    }
    catch {
        // Continue.
    }

    try {
        if (result.error?.errorMessage) {
            return result.error.errorMessage;
        }
    }
    catch {
        // Continue.
    }

    try {
        if (typeof result.error === "string") {
            return result.error;
        }
    }
    catch {
        // Continue.
    }

    try {
        if (result.message) {
            return result.message;
        }
    }
    catch {
        // Continue.
    }

    return "Authentication failed.";
};


// ============================================================
// DETECT EXPIRED PASSWORD
// ============================================================

const isPasswordExpiredError = (error) => {
    const errorText =
        getErrorText(error);

    console.log(
        "========== PASSWORD EXPIRY DETECTION =========="
    );

    console.log(
        "Error object:",
        error
    );

    console.log(
        "Error constructor:",
        error?.constructor?.name
    );

    console.log(
        "Error message:",
        error?.message
    );

    console.log(
        "Error errorData:",
        error?.errorData
    );

    console.log(
        "Extracted error text:",
        errorText
    );

    const expired =
        errorText.includes(
            "aadsts50055"
        ) ||
        errorText.includes(
            "password is expired"
        ) ||
        errorText.includes(
            "password expired"
        );

    console.log(
        "Password expired detected:",
        expired
    );

    console.log(
        "==============================================="
    );

    return expired;
};


// ============================================================
// DETECT PASSWORD CHANGE REQUIRED
// ============================================================

const isPasswordChangeRequiredError = (
    result
) => {
    // --------------------------------------------------------
    // IMPORTANT:
    //
    // The actual MSAL error is on result.error.
    // Do NOT rely on JSON.stringify(result).
    // --------------------------------------------------------

    const error =
        result?.error;

    const errorText =
        getErrorText(
            error
        );

    console.log(
        "========== PASSWORD CHANGE DETECTION =========="
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
        "Error:",
        error
    );

    console.log(
        "Error constructor:",
        error?.constructor?.name
    );

    console.log(
        "Error message:",
        error?.message
    );

    console.log(
        "Error errorData:",
        error?.errorData
    );

    console.log(
        "Extracted error text:",
        errorText
    );

    const required =
        errorText.includes(
            "aadsts50055"
        ) ||
        errorText.includes(
            "password is expired"
        ) ||
        errorText.includes(
            "password expired"
        ) ||
        errorText.includes(
            "password must be changed"
        ) ||
        errorText.includes(
            "password change required"
        ) ||
        errorText.includes(
            "change your password"
        );

    console.log(
        "Password change required:",
        required
    );

    console.log(
        "==============================================="
    );

    return required;
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


// ============================================================
// COMPLETED RESULT
// ============================================================

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
// STORE COMPLETED AUTHENTICATION RESULT
// ============================================================

export const storeCompletedAuthenticationResult = (
    authenticationResult
) => {

    console.log(
        "========== STORED COMPLETED NATIVE AUTHENTICATION RESULT =========="
    );

    if (!authenticationResult) {

        console.error(
            "Completed authentication did not contain authentication data."
        );

        completedAuthenticationResult = null;

        return null;
    }

    completedAuthenticationResult =
        authenticationResult;

    console.log(
        "=========================================================="
    );

    console.log(
        "========== COMPLETED ENTRA AUTHENTICATION STORED ========="
    );

    console.log(
        "Authentication result constructor:",
        authenticationResult?.constructor?.name
    );

    console.log(
        "Account:",
        authenticationResult?.account
    );

    console.log(
        "Has getAccessToken():",
        typeof authenticationResult?.getAccessToken ===
            "function"
    );

    console.log(
        "=========================================================="
    );

    return authenticationResult;
};


// ============================================================
// GET COMPLETED AUTHENTICATION RESULT
// ============================================================

export const getCompletedAuthenticationResult = () => {

    console.log(
        "========== GET COMPLETED NATIVE AUTH RESULT =========="
    );

    console.log(
        "Result available:",
        !!completedAuthenticationResult
    );

    if (completedAuthenticationResult) {

        console.log(
            "Result constructor:",
            completedAuthenticationResult?.constructor?.name
        );

        console.log(
            "Account:",
            completedAuthenticationResult?.account
        );

        console.log(
            "Has getAccessToken():",
            typeof completedAuthenticationResult?.getAccessToken ===
                "function"
        );
    }

    console.log(
        "======================================================="
    );

    return completedAuthenticationResult;
};


// ============================================================
// CLEAR COMPLETED AUTHENTICATION RESULT
// ============================================================

export const clearCompletedAuthenticationResult = () => {

    console.log(
        "========== CLEARING COMPLETED NATIVE AUTHENTICATION RESULT =========="
    );

    console.trace(
        "CLEAR COMPLETED NATIVE AUTH RESULT CALL STACK"
    );

    completedAuthenticationResult = null;
};


// ============================================================
// NATIVE TOKEN DIAGNOSTICS
// ============================================================

const diagnoseNativeTokenCapabilities = async (
    result
) => {

    console.log(
        "=========================================================="
    );

    console.log(
        "========== NATIVE AUTH TOKEN DIAGNOSTICS ================="
    );

    try {

        const authenticationResult =
            result?.data ?? null;

        console.log(
            "Authentication result constructor:",
            authenticationResult?.constructor?.name
        );

        console.log(
            "Has getAccessToken():",
            typeof authenticationResult?.getAccessToken ===
                "function"
        );

        console.log(
            "Account present:",
            !!authenticationResult?.account
        );

        console.log(
            "Account username:",
            authenticationResult?.account?.username
        );

        console.log(
            "=========================================================="
        );

    }
    catch (diagnosticError) {

        console.error(
            "Native auth token diagnostics failed:",
            diagnosticError
        );

        console.log(
            "=========================================================="
        );
    }
};


// ============================================================
// PASSWORD RESET RESULT PROCESSOR
// ============================================================

const processPasswordResetResult = async (
    result,
    options = {}
) => {

    const {
        defaultStep = "passwordChange"
    } = options;

    console.log(
        "========== PROCESS PASSWORD RESET RESULT =========="
    );

    console.log(
        "Password reset result:",
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


    // ---------------------------------------------------------
    // FAILED
    // ---------------------------------------------------------

    if (isFailed(result)) {

        return {

            success: false,

            step:
                defaultStep,

            state:
                result?.state ?? null,

            message:
                getErrorMessage(result)

        };

    }


    // ---------------------------------------------------------
    // PASSWORD CODE REQUIRED
    // ---------------------------------------------------------

    if (
        result?.state instanceof
        ResetPasswordCodeRequiredState
    ) {

        passwordResetState =
            result.state;

        return {

            success: true,

            step: "passwordResetCode",

            state:
                passwordResetState,

            message:
                "Enter the verification code sent to your email."

        };

    }


    // ---------------------------------------------------------
    // NEW PASSWORD REQUIRED
    // ---------------------------------------------------------

    if (
        result?.state instanceof
        ResetPasswordPasswordRequiredState
    ) {

        passwordResetState =
            result.state;

        return {

            success: true,

            step: "passwordChange",

            state:
                passwordResetState,

            message:
                "Please enter your new password."

        };

    }


    // ---------------------------------------------------------
    // PASSWORD RESET COMPLETED
    // ---------------------------------------------------------

    if (
        result?.state instanceof
        ResetPasswordCompletedState
    ) {

        passwordResetState =
            null;

        return {

            success: true,

            step: "passwordChanged",

            state:
                result.state,

            message:
                "Your password has been changed successfully."

        };

    }


    // ---------------------------------------------------------
    // SDK COMPLETION FALLBACK
    // ---------------------------------------------------------

    if (
        isCompleted(result)
    ) {

        passwordResetState =
            null;

        return {

            success: true,

            step: "passwordChanged",

            state:
                result?.state ?? null,

            message:
                "Your password has been changed successfully."

        };

    }


    // ---------------------------------------------------------
    // UNEXPECTED STATE
    // ---------------------------------------------------------

    console.error(
        "Unsupported password reset state:",
        result
    );

    return {

        success: false,

        step:
            defaultStep,

        state:
            result?.state ?? null,

        message:
            "An unsupported password change state was returned."

    };
};

// ============================================================
// START PASSWORD RESET FOR EXPIRED PASSWORD
// ============================================================

const startPasswordResetForExpiredPassword = async () => {
    if (!currentUsername) {
        console.error(
            "Cannot start password reset because no username is available."
        );

        return {
            success: false,
            step: "password",
            message:
                "Your password has expired. Please restart the sign-in process."
        };
    }

    try {
        const authClient =
            await getNativeAuthClient();

        console.log(
            "=================================================="
        );

        console.log(
            "========== START EXPIRED PASSWORD RESET =========="
        );

        console.log(
            "Username:",
            currentUsername
        );

        console.log(
            "=================================================="
        );

        const result =
            await authClient.resetPassword({
                username:
                    currentUsername
            });

        console.log(
            "Expired-password reset result:",
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

        return await processPasswordResetResult(
            result
        );
    }
    catch (error) {
        console.error(
            "Expired-password reset error:",
            error
        );

        return {
            success: false,
            step: "password",
            message:
                error?.message ??
                "Unable to start the password reset process."
        };
    }
};

// ============================================================
// START PASSWORD CHANGE FROM EXPIRED PASSWORD
// ============================================================
//
// IMPORTANT:
//
// AADSTS50055 is returned from submitPassword() as a failed
// sign-in result.
//
// That failed SignInState is NOT a ResetPasswordPasswordRequiredState
// and therefore cannot be used with submitNewPassword().
//
// We therefore start the native password reset/change flow using
// the username captured when sign-in started.
//
// ============================================================

const startPasswordChangeFromExpiredPassword = async () => {

    console.log(
        "========== START PASSWORD CHANGE FROM EXPIRED PASSWORD =========="
    );

    console.log(
        "Current username:",
        currentUsername
    );

    if (!currentUsername) {

        console.error(
            "Cannot start password change because no username is stored."
        );

        return {

            success: false,

            step: "passwordChange",

            message:
                "The username for the password change could not be determined."

        };
    }

    try {

        const authClient =
            await getNativeAuthClient();

        console.log(
            "Calling native auth resetPassword()..."
        );

        const result =
            await authClient.resetPassword({

                username:
                    currentUsername

            });

        console.log(
            "Native password reset result:",
            result
        );

        console.log(
            "Password reset result constructor:",
            result?.constructor?.name
        );

        console.log(
            "Password reset state:",
            result?.state
        );

        console.log(
            "Password reset state constructor:",
            result?.state?.constructor?.name
        );

        return await processPasswordResetResult(
            result,
            {
                defaultStep: "passwordChange"
            }
        );

    }
    catch (error) {

        console.error(
            "Starting password change from expired password failed:",
            error
        );

        passwordResetState =
            null;

        return {

            success: false,

            step: "passwordChange",

            message:
                error?.message ??
                "Unable to start the password change."

        };
    }
};


// ============================================================
// COMMON AUTHENTICATION RESULT PROCESSOR
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
    // Always update current state
    // ---------------------------------------------------------

    signInState =
        result?.state ?? null;


    // ---------------------------------------------------------
    // FAILED
    // ---------------------------------------------------------

    if (isFailed(result)) {

        console.error(
            "Native authentication result is FAILED:",
            result
        );

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
    //
    // IMPORTANT:
    //
    // Check both:
    //
    // 1. SDK isCompleted()
    // 2. Explicit SignInCompletedState
    //
    // This avoids relying exclusively on the helper method.
    // ---------------------------------------------------------

    const completed =
        isCompleted(result) ||
        result instanceof SignInCompletedState ||
        result?.state instanceof SignInCompletedState;

    if (completed) {

        console.log(
            "========== NATIVE SIGN-IN COMPLETED =========="
        );

        await diagnoseNativeTokenCapabilities(
            result
        );

        const authenticationResult =
            result?.data ?? null;

        if (!authenticationResult) {

            console.error(
                "Sign-in completed but no authentication data was returned.",
                result
            );

            return {

                success: false,

                step: defaultStep,

                state:
                    signInState,

                message:
                    "Native Authentication completed, but no authentication result was returned."

            };

        }


        storeCompletedAuthenticationResult(
            authenticationResult
        );


        return createCompletedResult(
            result
        );

    }


    // ---------------------------------------------------------
    // MFA REQUIRED
    // ---------------------------------------------------------

    const mfaRequired =
        isMfaRequired(result) ||
        result?.state instanceof MfaAwaitingState;

    if (mfaRequired) {

        console.log(
            "========== NATIVE MFA REQUIRED =========="
        );

        return await processMfaAwaitingState(
            result?.state ?? signInState
        );

    }


    // ---------------------------------------------------------
    // AUTHENTICATION METHOD REGISTRATION
    // ---------------------------------------------------------

    const registrationRequired =
        isAuthMethodRegistrationRequired(result) ||
        result?.state instanceof
            AuthMethodRegistrationRequiredState;

    if (registrationRequired) {

        console.log(
            "========== AUTHENTICATION METHOD REGISTRATION REQUIRED =========="
        );

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
    // STANDARD VERIFICATION CODE
    // ---------------------------------------------------------

    if (
        signInState instanceof
        SignInCodeRequiredState
    ) {

        console.log(
            "========== STANDARD VERIFICATION CODE REQUIRED =========="
        );

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
    // UNSUPPORTED STATE
    // ---------------------------------------------------------

    console.error(
        "========== UNSUPPORTED AUTHENTICATION STATE =========="
    );

    console.error(
        "Result:",
        result
    );

    console.error(
        "Result constructor:",
        result?.constructor?.name
    );

    console.error(
        "Result state:",
        result?.state
    );

    console.error(
        "State constructor:",
        result?.state?.constructor?.name
    );

    console.error(
        "isCompleted:",
        typeof result?.isCompleted === "function"
            ? result.isCompleted()
            : "not available"
    );

    console.error(
        "isMfaRequired:",
        typeof result?.isMfaRequired === "function"
            ? result.isMfaRequired()
            : "not available"
    );

    console.error(
        "isFailed:",
        typeof result?.isFailed === "function"
            ? result.isFailed()
            : "not available"
    );

    console.error(
        "isAuthMethodRegistrationRequired:",
        typeof result?.isAuthMethodRegistrationRequired ===
            "function"
            ? result.isAuthMethodRegistrationRequired()
            : "not available"
    );

    console.error(
        "======================================================"
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

const signOutExistingNativeUser = async () => {
    try {
        const authClient = await getNativeAuthClient();

        const currentAccount =
            authClient.getCurrentAccount?.();

        console.log(
            "========== CHECK EXISTING NATIVE USER =========="
        );

        console.log(
            "Current account:",
            currentAccount
        );

        if (!currentAccount) {
            console.log(
                "No existing native-authenticated user."
            );

            return {
                success: true,
                signedOut: false
            };
        }

        console.log(
            "Existing user detected:",
            currentAccount?.username ??
            currentAccount?.data?.username ??
            "(username unavailable)"
        );

        if (
            typeof authClient.logoutPopup !==
            "function"
        ) {
            throw new Error(
                "The native authentication client does not support logoutPopup()."
            );
        }

        console.log(
            "Signing out existing native user..."
        );

        await authClient.logoutPopup();

        console.log(
            "Existing native user signed out."
        );

        return {
            success: true,
            signedOut: true
        };

    } catch (error) {

        console.error(
            "Failed to sign out existing native user:",
            error
        );

        return {
            success: false,
            signedOut: false,
            message:
                error?.message ??
                "Unable to sign out the existing user."
        };
    }
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


        // ------------------------------------------------------
        // Store username for the complete authentication session
        // ------------------------------------------------------

        currentUsername =   cleanUsername;
        // ------------------------------------------------------
        // Clear stale password reset state
        // ------------------------------------------------------
        currentUsername = cleanUsername;


        // ------------------------------------------------------
        // Start a completely fresh native sign-in flow
        // ------------------------------------------------------

        signInState = null;

        passwordResetState = null;

        completedAuthenticationResult = null;
       const authClient = await getNativeAuthClient();

        console.log(
            "========== CUSTOM AUTH CLIENT METHODS =========="
        );

        console.log(
            "authClient:",
            authClient
        );

        console.log(
            "authClient constructor:",
            authClient?.constructor?.name
        );

        console.log(
            "signOut:",
            typeof authClient?.signOut
        );

        console.log(
            "logout:",
            typeof authClient?.logout
        );

        console.log(
            "logoutRedirect:",
            typeof authClient?.logoutRedirect
        );

        console.log(
            "logoutPopup:",
            typeof authClient?.logoutPopup
        );

        console.log(
            "getCurrentAccount:",
            typeof authClient?.getCurrentAccount
        );

        console.log(
            "getAllAccounts:",
            typeof authClient?.getAllAccounts
        );

        console.log(
            "================================================"
        );
        console.log(
            "Username:",
            cleanUsername
        );

        const result =  await authClient.signIn({

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

            completedAuthenticationResult = null;

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

        passwordResetState = null;

        completedAuthenticationResult = null;


        return {

            success: false,

            step: "email",

            message:
                error?.message ??
                "Unable to start sign-in."

        };

    }

};
// export const startSignIn = async (
//     username
// ) => {

//     try {

//         const cleanUsername =
//             String(username ?? "").trim();


//         if (!cleanUsername) {

//             return {

//                 success: false,

//                 step: "email",

//                 message:
//                     "Please enter your email address."

//             };

//         }


//         // ------------------------------------------------------
//         // Store username
//         // ------------------------------------------------------

//         currentUsername =
//             cleanUsername;


//         // ------------------------------------------------------
//         // IMPORTANT:
//         // Start a completely fresh sign-in transaction.
//         //
//         // This does NOT remove MFA enrollment.
//         // It only clears the previous client-side authentication
//         // transaction.
//         // ------------------------------------------------------

//         signInState =
//             null;

//         passwordResetState =
//             null;

//         completedAuthenticationResult =
//             null;


//         const authClient =
//             await getNativeAuthClient();


//         console.log(
//             "========== START SIGN-IN =========="
//         );

//         console.log(
//             "Username:",
//             cleanUsername
//         );


//         const result =
//             await authClient.signIn({

//                 username:
//                     cleanUsername

//             });


//         console.log(
//             "Native sign-in result:",
//             result
//         );


//         // ------------------------------------------------------
//         // FAILED
//         // ------------------------------------------------------

//         if (isFailed(result)) {

//             signInState =
//                 null;

//             completedAuthenticationResult =
//                 null;

//             return {

//                 success: false,

//                 step: "email",

//                 message:
//                     getErrorMessage(result)

//             };

//         }


//         // ------------------------------------------------------
//         // Store state
//         // ------------------------------------------------------

//         signInState =
//             result?.state ?? null;


//         // ------------------------------------------------------
//         // PASSWORD REQUIRED
//         // ------------------------------------------------------

//         if (
//             signInState instanceof
//             SignInPasswordRequiredState
//         ) {

//             return {

//                 success: true,

//                 step: "password",

//                 state:
//                     signInState,

//                 message:
//                     "Password required."

//             };

//         }


//         // ------------------------------------------------------
//         // Process all other states
//         // ------------------------------------------------------

//         return await processAuthenticationResult(
//             result,
//             {
//                 defaultStep: "email"
//             }
//         );

//     }
//     catch (error) {

//         console.error(
//             "Native authentication start sign-in error:",
//             error
//         );


//         signInState =
//             null;

//         passwordResetState =
//             null;

//         completedAuthenticationResult =
//             null;


//         return {

//             success: false,

//             step: "email",

//             message:
//                 error?.message ??
//                 "Unable to start sign-in."

//         };

//     }

// };

// ============================================================
// START PASSWORD CHANGE
// ============================================================
//
// This starts the Microsoft Entra native password reset/change
// flow.
//
// The username is the same username that was used for sign-in.
//
// Microsoft Entra may return:
//
//     ResetPasswordCodeRequiredState
//
// which means an OTP must be supplied before the new password
// can be submitted.
// ============================================================

export const startPasswordChange = async (
    username
) => {

    try {

        const cleanUsername =
            String(
                username ??
                currentUsername ??
                ""
            ).trim();


        if (!cleanUsername) {

            return {

                success: false,

                step: "passwordChange",

                message:
                    "A username is required to change the password."

            };

        }


        currentUsername =
            cleanUsername;


        const authClient =
            await getNativeAuthClient();


        console.log(
            "========== START PASSWORD CHANGE =========="
        );


        console.log(
            "Username:",
            cleanUsername
        );


        const result =
            await authClient.resetPassword({

                username:
                    cleanUsername

            });


        console.log(
            "Native password reset result:",
            result
        );


        return await processPasswordResetResult(
            result
        );

    }
    catch (error) {

        console.error(
            "Native password change start error:",
            error
        );


        passwordResetState =
            null;


        return {

            success: false,

            step: "passwordChange",

            message:
                error?.message ??
                "Unable to start the password change."

        };

    }

};


// ============================================================
// SUBMIT NEW PASSWORD
// ============================================================

export const submitNewPassword = async (
    newPassword
) => {

    try {

        if (
            !passwordResetState ||
            !(
                passwordResetState instanceof
                ResetPasswordPasswordRequiredState
            )
        ) {

            return {

                success: false,

                step: "error",

                message:
                    "The new-password step is not active."

            };

        }


        const cleanPassword =
            String(newPassword ?? "");


        if (!cleanPassword) {

            return {

                success: false,

                step: "passwordChange",

                message:
                    "Please enter a new password."

            };

        }


        console.log(
            "========== SUBMIT NEW PASSWORD =========="
        );


        const result =
            await passwordResetState.submitNewPassword(
                cleanPassword
            );


        console.log(
            "New password result:",
            result
        );


        console.log(
            "New password result constructor:",
            result?.constructor?.name
        );


        console.log(
            "New password result state:",
            result?.state
        );


        console.log(
            "New password state constructor:",
            result?.state?.constructor?.name
        );


        // ------------------------------------------------------
        // FAILED
        // ------------------------------------------------------

        if (isFailed(result)) {

            if (
                result.error &&
                typeof
                    result.error.isInvalidPassword ===
                "function" &&
                result.error.isInvalidPassword()
            ) {

                return {

                    success: false,

                    step: "passwordChange",

                    state:
                        passwordResetState,

                    message:
                        "The new password does not meet the password requirements."

                };

            }


            if (
                result.error &&
                typeof
                    result.error.isPasswordResetFailed ===
                "function" &&
                result.error.isPasswordResetFailed()
            ) {

                return {

                    success: false,

                    step: "passwordChange",

                    state:
                        passwordResetState,

                    message:
                        "Microsoft Entra could not complete the password change."

                };

            }


            return {

                success: false,

                step: "passwordChange",

                state:
                    passwordResetState,

                message:
                    getErrorMessage(result)

            };

        }


        // ------------------------------------------------------
        // UPDATE STATE
        // ------------------------------------------------------

        passwordResetState =
            result?.state ?? null;


        // ------------------------------------------------------
        // COMPLETED
        // ------------------------------------------------------

        if (
            result?.state instanceof
            ResetPasswordCompletedState
        ) {

            console.log(
                "========== PASSWORD CHANGE COMPLETED =========="
            );


            passwordResetState =
                null;


            return {

                success: true,

                step: "passwordChanged",

                state:
                    result.state,

                message:
                    "Your password has been changed successfully."

            };

        }


        // ------------------------------------------------------
        // SDK COMPLETION FALLBACK
        // ------------------------------------------------------

        if (
            isCompleted(result)
        ) {

            passwordResetState =
                null;


            return {

                success: true,

                step: "passwordChanged",

                state:
                    result?.state ?? null,

                message:
                    "Your password has been changed successfully."

            };

        }


        // ------------------------------------------------------
        // ANOTHER PASSWORD STATE
        // ------------------------------------------------------

        return await processPasswordResetResult(
            result
        );

    }
    catch (error) {

        console.error(
            "Submit new password error:",
            error
        );


        return {

            success: false,

            step: "passwordChange",

            message:
                error?.message ??
                "Unable to change the password."

        };

    }

};


// ============================================================
// SUBMIT PASSWORD RESET CODE
// ============================================================

export const submitPasswordResetCode = async (
    code
) => {

    try {

        if (
            !passwordResetState ||
            !(
                passwordResetState instanceof
                ResetPasswordCodeRequiredState
            )
        ) {

            return {

                success: false,

                step: "error",

                message:
                    "The password reset verification step is not active."

            };

        }


        const cleanCode =
            String(code ?? "").trim();


        if (!cleanCode) {

            return {

                success: false,

                step: "passwordResetCode",

                message:
                    "Please enter the verification code."

            };

        }


        console.log(
            "========== SUBMIT PASSWORD RESET CODE =========="
        );


        const result =
            await passwordResetState.submitCode(
                cleanCode
            );


        console.log(
            "Password reset code result:",
            result
        );


        if (isFailed(result)) {

            return {

                success: false,

                step: "passwordResetCode",

                message:
                    getErrorMessage(result)

            };

        }


        passwordResetState =
            result?.state ?? null;


        return await processPasswordResetResult(
            result
        );

    }
    catch (error) {

        console.error(
            "Password reset code error:",
            error
        );


        return {

            success: false,

            step: "passwordResetCode",

            message:
                error?.message ??
                "Unable to verify the password reset code."

        };

    }

};


// ============================================================
// SUBMIT PASSWORD
// ============================================================

export const submitPassword = async (password) => {
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

        console.log(
            "========== RAW MSAL PASSWORD RESULT =========="
        );

        console.log(
            "RAW result:",
            result
        );

        console.log(
            "RAW result constructor:",
            result?.constructor?.name
        );

        console.log(
            "RAW result error:",
            result?.error
        );

        console.log(
            "RAW result error constructor:",
            result?.error?.constructor?.name
        );

        console.log(
            "RAW result error message:",
            result?.error?.message
        );

        console.log(
            "RAW result errorData:",
            result?.error?.errorData
        );

        console.log(
            "RAW result errorData message:",
            result?.error?.errorData?.message
        );

        console.log(
            "==============================================="
        );
        // ====================================================
        // IMPORTANT:
        // HANDLE EXPIRED PASSWORD BEFORE processAuthenticationResult()
        // ====================================================

        if (
            isPasswordChangeRequiredError(result)
        ) {
            console.log(
                "=================================================="
            );

            console.log(
                "========== PASSWORD CHANGE REQUIRED ============="
            );

            console.log(
                "AADSTS50055 detected."
            );

            console.log(
                "The supplied password was accepted by Entra, "
                + "but the password has expired."
            );

            console.log(
                "Current username:",
                currentUsername
            );

            console.log(
                "Original failed state:",
                result?.state
            );

            console.log(
                "Original error:",
                result?.error
            );

            console.log(
                "=================================================="
            );

            // ------------------------------------------------
            // The SignInFailedState cannot be used to submit
            // a new password.
            //
            // Therefore we must NOT return:
            //
            // state: result.state
            //
            // Instead, start the native password-reset flow.
            // ------------------------------------------------

            signInState = null;

            return await startPasswordResetForExpiredPassword();
        }

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
            typeof result?.isAuthMethodRegistrationRequired ===
                "function"
                ? result.isAuthMethodRegistrationRequired()
                : "not available"
        );

        console.log(
            "===================================="
        );

        console.log(
            "Password authentication result:",
            result
        );

        const processedResult =
            await processAuthenticationResult(
                result,
                {
                    defaultStep: "password"
                }
            );


        console.log(
            "=================================================="
        );

        console.log(
            "========== SUBMIT PASSWORD FINAL RESULT =========="
        );

        console.log(
            "Processed result:",
            processedResult
        );

        console.log(
            "Processed result step:",
            processedResult?.step
        );

        console.log(
            "Processed result success:",
            processedResult?.success
        );

        console.log(
            "Processed result state:",
            processedResult?.state
        );

        console.log(
            "Processed result state constructor:",
            processedResult?.state?.constructor?.name
        );

        console.log(
            "Processed result authenticationResult:",
            processedResult?.authenticationResult
        );

        console.log(
            "=================================================="
        );


        return processedResult;
    }
    catch (error) {
        console.error(
            "Native authentication password error:",
            error
        );

        // ----------------------------------------------------
        // Also check thrown exceptions for AADSTS50055.
        // ----------------------------------------------------

        if (isPasswordExpiredError(error)) {
            console.log(
                "========== PASSWORD EXPIRED IN CATCH =========="
            );

            signInState = null;

            return await startPasswordResetForExpiredPassword();
        }

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

const processMfaAwaitingState = async (mfaState) => {

    console.log(
        "========== MFA AWAITING STATE =========="
    );


    console.log(
        "MFA state:",
        mfaState
    );


    console.log(
        "MFA state constructor:",
        mfaState?.constructor?.name
    );


    signInState =
        mfaState;


    try {

        console.log(
            "========== CALLING getAuthMethods() =========="
        );


        const authMethods =
            await mfaState.getAuthMethods();


        console.log(
            "========== getAuthMethods() COMPLETED =========="
        );


        console.log(
            "Raw authMethods:",
            authMethods
        );


        console.log(
            "authMethods constructor:",
            authMethods?.constructor?.name
        );


        console.log(
            "authMethods is array:",
            Array.isArray(authMethods)
        );


        console.log(
            "Number of authentication methods:",
            authMethods?.length ?? 0
        );


        if (
            !authMethods ||
            authMethods.length === 0
        ) {

            console.warn(
                "========== NO ENTRA MFA METHODS RETURNED =========="
            );


            return {

                success: false,

                step: "error",

                error:
                    "Microsoft Entra External ID did not return any MFA authentication methods."

            };

        }


        console.log(
            "========== AVAILABLE ENTRA MFA METHODS =========="
        );


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
                    "Challenge type:",
                    method?.challenge_type
                );


                console.log(
                    "Challenge channel:",
                    method?.challenge_channel
                );


                console.log(
                    "Login hint:",
                    method?.login_hint
                );


                console.log(
                    "Object keys:",
                    Object.keys(method ?? {})
                );

            }
        );


        console.log(
            "========== END AVAILABLE MFA METHODS =========="
        );


        return {

            success: true,

            step: "mfa",

            state: mfaState,

            authMethods,

            message:
                "MFA verification is required."

        };

    }
    catch (error) {

        console.error(
            "========== getAuthMethods() ERROR =========="
        );


        console.error(
            "Error:",
            error
        );


        console.error(
            "Message:",
            error?.message
        );


        console.error(
            "Stack:",
            error?.stack
        );


        return {

            success: false,

            step: "error",

            error:
                error?.message ||
                "Unable to retrieve MFA authentication methods."

        };

    }

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
        // Update current state
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

                authenticationMethodId,

                verificationRequired: true,

                message:
                    "A verification code has been sent."

            };

        }


        // ------------------------------------------------------
        // Explicit verification state
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

                authenticationMethodId,

                verificationRequired: true,

                message:
                    "A verification code has been sent."

            };

        }


        // ------------------------------------------------------
        // COMPLETED
        // ------------------------------------------------------

        if (isCompleted(result)) {

            await diagnoseNativeTokenCapabilities(
                result
            );

            storeCompletedAuthenticationResult(
                result?.data
            );

            return createCompletedResult(
                result
            );

        }


        // ------------------------------------------------------
        // Unexpected
        // ------------------------------------------------------

        return {

            success: false,

            step: "error",

            state:
                signInState,

            authenticationMethodId,

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

            authenticationMethodId,

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


            await diagnoseNativeTokenCapabilities(
                result
            );


            storeCompletedAuthenticationResult(
                result?.data
            );


            return createCompletedResult(
                result
            );

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
// GET NATIVE ACCESS TOKEN
// ============================================================
//
// authenticationResult is a CustomAuthAccountData object.
//
// getAccessToken() returns:
//
//     {
//         state: ...,
//         data: {
//             accessToken: "..."
//         }
//     }
//
// Therefore:
//
//     result.data.accessToken
//
// is the actual access token.
// ============================================================

export const getNativeAccessToken = async (
    authenticationResult = null
) => {

    const authResult =
        authenticationResult ||
        getCompletedAuthenticationResult();


    if (!authResult) {

        throw new Error(
            "No completed Native Authentication result was found. Complete Native Authentication and Microsoft Authenticator MFA first."
        );

    }


    console.log(
        "Getting Native Access Token..."
    );


    const result =
        await authResult.getAccessToken({

            scopes: [
                "api://266fbe6d-e931-433e-b17f-6c833d78c8a5/access_as_user"
            ],

            forceRefresh: false

        });


    const accessToken =
        result?.data?.accessToken;


    if (!accessToken) {

        throw new Error(
            "Native Authentication completed, but no access token was returned."
        );

    }


    console.log(
        "Native Access Token acquired. Length:",
        accessToken.length
    );


    return accessToken;
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
// CLEAR EVERYTHING
//
// Use this when the application logs the user out.
// ============================================================

export const clearAuthentication = () => {

    console.log(
        "========== CLEARING NATIVE AUTHENTICATION =========="
    );


    signInState = null;

    currentUsername = null;

    passwordResetState = null;

    completedAuthenticationResult = null;


    console.log(
        "Native authentication state cleared."
    );

};


// ============================================================
// GET CURRENT AUTHENTICATION STATE
// ============================================================

export const getCurrentSignInState = () => {

    return signInState;

};


// ============================================================
// GET PASSWORD RESET STATE
// ============================================================

export const getCurrentPasswordResetState = () => {

    return passwordResetState;

};


// ============================================================
// GET CURRENT USERNAME
// ============================================================

export const getCurrentUsername = () => {

    return currentUsername;

};


// ============================================================
// CLEAR PASSWORD RESET STATE
// ============================================================

export const clearPasswordResetState = () => {

    console.log(
        "Clearing native password reset state."
    );


    passwordResetState = null;

};

