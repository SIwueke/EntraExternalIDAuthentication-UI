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

import { nativeAuthConfig } from "../auth/nativeAuthConfig";

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
// NATIVE TOKEN DIAGNOSTICS
//
// IMPORTANT:
// This does NOT acquire a token.
// It only tells us which APIs are exposed by the native
// authentication client after successful authentication.
//
// We are deliberately doing this before changing token
// acquisition logic.
// ============================================================

const diagnoseNativeTokenCapabilities = async (
    result
) => {

    console.log(
        "=========================================================="
    );

    console.log(
        "========== NATIVE AUTH CLIENT TOKEN DIAGNOSTICS =========="
    );

    try {

        const authClient =
            await getNativeAuthClient();


        console.log(
            "Native auth client:",
            authClient
        );


        console.log(
            "Native auth client constructor:",
            authClient?.constructor?.name
        );


        // ----------------------------------------------------
        // Public methods exposed directly by the prototype
        // ----------------------------------------------------

        const prototype =
            Object.getPrototypeOf(authClient);


        const prototypeMethods =
            prototype
                ? Object.getOwnPropertyNames(prototype)
                : [];


        console.log(
            "Native auth client prototype methods:",
            prototypeMethods
        );


        // ----------------------------------------------------
        // Look specifically for token-related methods
        // ----------------------------------------------------

        const tokenMethods =
            prototypeMethods.filter(
                name =>
                    name
                        .toLowerCase()
                        .includes("token")
            );


        console.log(
            "TOKEN-RELATED CLIENT METHODS:",
            tokenMethods
        );


        // ----------------------------------------------------
        // Look for account-related methods
        // ----------------------------------------------------

        const accountMethods =
            prototypeMethods.filter(
                name =>
                    name
                        .toLowerCase()
                        .includes("account")
            );


        console.log(
            "ACCOUNT-RELATED CLIENT METHODS:",
            accountMethods
        );


        // ----------------------------------------------------
        // Look for authentication-related methods
        // ----------------------------------------------------

        const authMethods =
            prototypeMethods.filter(
                name => {

                    const lower =
                        name.toLowerCase();

                    return (
                        lower.includes("auth") ||
                        lower.includes("sign") ||
                        lower.includes("silent")
                    );
                }
            );


        console.log(
            "AUTH/SIGN-IN RELATED CLIENT METHODS:",
            authMethods
        );


        // ----------------------------------------------------
        // Completed authentication result
        // ----------------------------------------------------

        console.log(
            "Completed result:",
            result
        );


        console.log(
            "Completed result constructor:",
            result?.constructor?.name
        );


        // ----------------------------------------------------
        // Completed result data
        // ----------------------------------------------------

        console.log(
            "Completed result data:",
            result?.data
        );
        console.log(
            "========== CACHE CLIENT DIAGNOSTICS =========="
        );

        const cacheClient =
            result?.data?.cacheClient;

        console.log(
            "Cache client:",
            cacheClient
        );

        console.log(
            "Cache client constructor:",
            cacheClient?.constructor?.name
        );

        const cachePrototype =
            cacheClient
                ? Object.getPrototypeOf(cacheClient)
                : null;

        const cacheMethods =
            cachePrototype
                ? Object.getOwnPropertyNames(cachePrototype)
                : [];

        console.log(
            "Cache client methods:",
            cacheMethods
        );

        console.log(
            "TOKEN-RELATED CACHE METHODS:",
            cacheMethods.filter(
                name =>
                    name
                        .toLowerCase()
                        .includes("token")
            )
        );

        console.log(
            "ACCOUNT-RELATED CACHE METHODS:",
            cacheMethods.filter(
                name =>
                    name
                        .toLowerCase()
                        .includes("account")
            )
        );

        console.log(
            "============================================="
        );

        console.log(
            "Completed result data constructor:",
            result?.data?.constructor?.name
        );


        // ----------------------------------------------------
        // Account
        // ----------------------------------------------------

        console.log(
            "Completed account:",
            result?.data?.account
        );


        console.log(
            "Completed account keys:",
            result?.data?.account
                ? Object.keys(result.data.account)
                : []
        );


        // ----------------------------------------------------
        // ID TOKEN
        // ----------------------------------------------------

        console.log(
            "ID token present:",
            !!result?.data?.account?.idToken
        );


        console.log(
            "ID token claims:",
            result?.data?.account?.idTokenClaims
        );


        // ----------------------------------------------------
        // Authentication result keys
        // ----------------------------------------------------

        console.log(
            "Authentication result keys:",
            result?.data
                ? Object.keys(result.data)
                : []
        );


        // ----------------------------------------------------
        // Completed state
        // ----------------------------------------------------

        console.log(
            "Completed state:",
            result?.state
        );


        console.log(
            "Completed state constructor:",
            result?.state?.constructor?.name
        );


        // ----------------------------------------------------
        // Check methods on completed state
        // ----------------------------------------------------

        const statePrototype =
            result?.state
                ? Object.getPrototypeOf(result.state)
                : null;


        const stateMethods =
            statePrototype
                ? Object.getOwnPropertyNames(statePrototype)
                : [];


        console.log(
            "Completed state methods:",
            stateMethods
        );


        const stateTokenMethods =
            stateMethods.filter(
                name =>
                    name
                        .toLowerCase()
                        .includes("token")
            );


        console.log(
            "TOKEN-RELATED STATE METHODS:",
            stateTokenMethods
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


    console.log(
        "========== NATIVE AUTH STATE AFTER SIGN-IN =========="
    );


    console.log(
        "Result constructor:",
        result?.constructor?.name
    );


    console.log(
        "State constructor:",
        result?.state?.constructor?.name
    );


    console.log(
        "MFA required:",
        isMfaRequired(result)
    );


    console.log(
        "Auth method registration required:",
        isAuthMethodRegistrationRequired(result)
    );


    console.log(
        "Sign-in state:",
        signInState
    );


    console.log(
        "===================================================="
    );


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

        await diagnoseNativeTokenCapabilities(
            result
        );

        return createCompletedResult(
            result
        );

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
    // MFA DIAGNOSTICS
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
                    JSON.stringify(
                        method,
                        null,
                        2
                    )
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

        console.log("========== MFA CHALLENGE DIAGNOSTIC ==========");

console.log(
    "signInState constructor:",
    signInState?.constructor?.name
);

console.log(
    "Selected MFA method id:",
    authenticationMethodId
);

console.log(
    "signInState keys:",
    signInState
        ? Object.keys(signInState)
        : []
);

console.log(
    "signInState own properties:",
    signInState
        ? Object.getOwnPropertyNames(signInState)
        : []
);

console.log(
    "signInState prototype:",
    signInState
        ? Object.getOwnPropertyNames(
              Object.getPrototypeOf(signInState)
          )
        : []
);

console.log("==============================================");
     console.log(
    "MFA state constructor before request:",
    signInState?.constructor?.name
);

console.log(
    "MFA method ID before request:",
    authenticationMethodId
);

console.log(
    "MFA state prototype methods:",
    Object.getOwnPropertyNames(
        Object.getPrototypeOf(signInState)
    )
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


            // ==================================================
            // NEW DIAGNOSTICS
            //
            // This is the only new functional change.
            // We inspect the native client before implementing
            // access-token acquisition.
            // ==================================================

            await diagnoseNativeTokenCapabilities(
                result
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

/**
 * Get an access token after native authentication has completed.
 *
 * The native authentication SDK stores the account and tokens in its
 * internal cache. The completed authentication result is a
 * CustomAuthAccountData instance, which exposes getAccessToken().
 */
export async function getNativeAccessToken(authenticationResult) {
    console.log("========== GET NATIVE ACCESS TOKEN ==========");

    console.log("========== NATIVE AUTH CACHE INSPECTION ==========");

    const cacheClient = authenticationResult?.cacheClient;

    console.log("========== BROWSER STORAGE INSPECTION ==========");

const browserStorage = cacheClient?.browserStorage;
console.log("========== REFRESH TOKEN CACHE INSPECTION ==========");

if (
    browserStorage &&
    typeof browserStorage.getRefreshTokenCredential === "function"
) {
    console.log(
        "getRefreshTokenCredential method found."
    );

    console.log(
        "getTokenKeys method found:",
        typeof browserStorage.getTokenKeys === "function"
    );

    console.log(
        "generateCredentialKey method found:",
        typeof browserStorage.generateCredentialKey === "function"
    );

    console.log(
        "internalStorage constructor:",
        browserStorage?.internalStorage?.constructor?.name
    );

    console.log(
        "browserStorage constructor:",
        browserStorage?.browserStorage?.constructor?.name
    );

    console.log(
        "temporaryCacheStorage constructor:",
        browserStorage?.temporaryCacheStorage?.constructor?.name
    );
} else {
    console.log(
        "getRefreshTokenCredential method NOT found."
    );
}

console.log("=====================================================");

console.log(
    "Browser storage constructor:",
    browserStorage?.constructor?.name
);

console.log(
    "Browser storage keys:",
    browserStorage
        ? Object.keys(browserStorage)
        : []
);

console.log(
    "Browser storage own properties:",
    browserStorage
        ? Object.getOwnPropertyNames(browserStorage)
        : []
);

console.log(
    "Browser storage prototype:",
    browserStorage
        ? Object.getOwnPropertyNames(
              Object.getPrototypeOf(browserStorage)
          )
        : []
);

console.log("================================================");

    console.log("========== ACQUIRE TOKEN INSPECTION ==========");

if (cacheClient && typeof cacheClient.acquireToken === "function") {
    const originalAcquireToken = cacheClient.acquireToken.bind(cacheClient);

    cacheClient.acquireToken = async function (request) {
        console.log("========== ACQUIRE TOKEN REQUEST ==========");

        console.log(
            "Request keys:",
            request ? Object.keys(request) : []
        );

        console.log(
            "Request grantType:",
            request?.grantType
        );

        console.log(
            "Request scopes:",
            request?.scopes
        );

        console.log(
            "Request authority:",
            request?.authority
        );

        console.log(
            "Request clientId:",
            request?.clientId
        );

        console.log(
            "Has refreshToken:",
            !!request?.refreshToken
        );

        console.log(
            "Has authorizationCode:",
            !!request?.code
        );

        console.log(
            "Has password:",
            !!request?.password
        );

        console.log("============================================");

        return originalAcquireToken(request);
    };

    console.log("acquireToken inspection installed.");
} else {
    console.log("acquireToken method was not available.");
}

console.log("==============================================");
    console.log(
        "Cache client constructor:",
        cacheClient?.constructor?.name
    );

    console.log(
        "Cache client keys:",
        cacheClient ? Object.keys(cacheClient) : []
    );

    console.log(
        "Cache client own properties:",
        cacheClient
            ? Object.getOwnPropertyNames(cacheClient)
            : []
    );

    console.log(
        "Cache client prototype:",
        cacheClient
            ? Object.getOwnPropertyNames(
                  Object.getPrototypeOf(cacheClient)
              )
            : []
    );

    console.log("==================================================");


    try {
        if (!authenticationResult) {
            throw new Error("No authentication result was supplied.");
        }

        console.log(
            "Authentication result constructor:",
            authenticationResult?.constructor?.name
        );

        console.log(
            "Authentication result methods:",
            Object.getOwnPropertyNames(
                Object.getPrototypeOf(authenticationResult)
            )
        );

        if (typeof authenticationResult.getAccessToken !== "function") {
            throw new Error(
                "The native authentication result does not expose getAccessToken()."
            );
        }

        const scopes = [
            "api://266fbe6d-e931-433e-b17f-6c833d78c8a5/access_as_user"
        ];

        console.log("Requesting native access token...");
        console.log("Scopes:", scopes);
        console.log("========== NATIVE AUTH CACHE INSPECTION ==========");

        const cacheClient = authenticationResult?.cacheClient;

        console.log("========== BROWSER STORAGE INSPECTION ==========");

const browserStorage = cacheClient?.browserStorage;
console.log("========== REFRESH TOKEN CACHE INSPECTION ==========");

if (
    browserStorage &&
    typeof browserStorage.getRefreshTokenCredential === "function"
) {
    console.log(
        "getRefreshTokenCredential method found."
    );

    console.log(
        "getTokenKeys method found:",
        typeof browserStorage.getTokenKeys === "function"
    );

    console.log(
        "generateCredentialKey method found:",
        typeof browserStorage.generateCredentialKey === "function"
    );

    console.log(
        "internalStorage constructor:",
        browserStorage?.internalStorage?.constructor?.name
    );

    console.log(
        "browserStorage constructor:",
        browserStorage?.browserStorage?.constructor?.name
    );

    console.log(
        "temporaryCacheStorage constructor:",
        browserStorage?.temporaryCacheStorage?.constructor?.name
    );
} else {
    console.log(
        "getRefreshTokenCredential method NOT found."
    );
}

console.log("=====================================================");

console.log(
    "Browser storage constructor:",
    browserStorage?.constructor?.name
);

console.log(
    "Browser storage keys:",
    browserStorage
        ? Object.keys(browserStorage)
        : []
);

console.log(
    "Browser storage own properties:",
    browserStorage
        ? Object.getOwnPropertyNames(browserStorage)
        : []
);

console.log(
    "Browser storage prototype:",
    browserStorage
        ? Object.getOwnPropertyNames(
              Object.getPrototypeOf(browserStorage)
          )
        : []
);

console.log("================================================");


       console.log("========== ACQUIRE TOKEN INSPECTION ==========");

if (cacheClient && typeof cacheClient.acquireToken === "function") {
    const originalAcquireToken = cacheClient.acquireToken.bind(cacheClient);

    cacheClient.acquireToken = async function (request) {
        console.log("========== ACQUIRE TOKEN REQUEST ==========");

        console.log(
            "Request keys:",
            request ? Object.keys(request) : []
        );

        console.log(
            "Request grantType:",
            request?.grantType
        );

        console.log(
            "Request scopes:",
            request?.scopes
        );

        console.log(
            "Request authority:",
            request?.authority
        );

        console.log(
            "Request clientId:",
            request?.clientId
        );

        console.log(
            "Has refreshToken:",
            !!request?.refreshToken
        );

        console.log(
            "Has authorizationCode:",
            !!request?.code
        );

        console.log(
            "Has password:",
            !!request?.password
        );

        console.log("============================================");

        return originalAcquireToken(request);
    };

    console.log("acquireToken inspection installed.");
} else {
    console.log("acquireToken method was not available.");
}

console.log("==============================================");
        console.log(
            "Cache client constructor:",
            cacheClient?.constructor?.name
        );

        console.log(
            "Cache client keys:",
            cacheClient ? Object.keys(cacheClient) : []
        );

        console.log(
            "Cache client own properties:",
            cacheClient
                ? Object.getOwnPropertyNames(cacheClient)
                : []
        );

        console.log(
            "Cache client prototype:",
            cacheClient
                ? Object.getOwnPropertyNames(
                    Object.getPrototypeOf(cacheClient)
                )
                : []
        );

        console.log("==================================================");
        const result = await authenticationResult.getAccessToken({
            scopes,
            forceRefresh: false
        });

        console.log("========== NATIVE ACCESS TOKEN RESULT ==========");
        console.log("Result:", result);
        console.log(
            "Result constructor:",
            result?.constructor?.name
        );

        console.log(
            "Result keys:",
            result
                ? Object.keys(result)
                : []
        );

        return result;

    } catch (error) {
        console.error(
            "========== NATIVE ACCESS TOKEN ERROR =========="
        );

        console.error("Error:", error);
        console.error("Error name:", error?.name);
        console.error("Error message:", error?.message);
        console.error("Error code:", error?.errorCode);
        console.error("Error stack:", error?.stack);

        throw error;
    }
}
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