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
// STORE COMPLETED AUTHENTICATION RESULT
// ============================================================
//
// The result.data object is the CustomAuthAccountData instance.
//
// This is deliberately stored instead of the raw access token.
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
//
// This allows React/application code to retrieve the
// CustomAuthAccountData object without exposing the raw token.
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
//
// This does NOT acquire a token.
// It only inspects the native authentication result.
//
// IMPORTANT:
// Do not log the actual access token.
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

        // IMPORTANT:
        // Keep the CustomAuthAccountData object.
        storeCompletedAuthenticationResult(
            result?.data 
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


    signInState = mfaState;


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
// IMPORTANT:
//
// authenticationResult is a CustomAuthAccountData object.
//
// getAccessToken() returns a GetAccessTokenResult:
//
//     {
//         state: ...,
//         data: {
//             accessToken: "..."
//         }
//     }
//
// Therefore the actual token is:
//
//     result.data.accessToken
//
// We never return or log the token during diagnostics.
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
