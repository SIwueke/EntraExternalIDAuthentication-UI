
import {
    SignInPasswordRequiredState,
    SignInCodeRequiredState,
    SignInCompletedState,
    AuthMethodRegistrationRequiredState,
    MfaAwaitingState,
    MfaVerificationRequiredState
} from "@azure/msal-browser/custom-auth";

import {
    getNativeAuthClient
} from "./nativeAuthClient";


//----------------------------------------------------
// Current Native Authentication Flow State
//----------------------------------------------------

let signInState = null;


//----------------------------------------------------
// Get Error Message
//----------------------------------------------------

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


//----------------------------------------------------
// Start Sign-In
//----------------------------------------------------

export const startSignIn = async (username) => {

    try {

        const authClient =
            await getNativeAuthClient();

        //------------------------------------------------
        // Start native authentication
        //------------------------------------------------

        const result =
            await authClient.signIn({
                username
            });

        //------------------------------------------------
        // Diagnostics
        //------------------------------------------------

        console.log(
            "========== NATIVE AUTH RESULT =========="
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
            "Result state:",
            result?.state
        );

        console.log(
            "Result state constructor:",
            result?.state?.constructor?.name
        );

        console.log(
            "isFailed:",
            result?.isFailed?.()
        );

        console.log(
            "isCompleted:",
            result?.isCompleted?.()
        );

        console.log(
            "isMfaRequired:",
            result?.isMfaRequired?.()
        );

        console.log(
            "isAuthMethodRegistrationRequired:",
            result?.isAuthMethodRegistrationRequired?.()
        );

        console.log(
            "========================================"
        );


        //------------------------------------------------
        // Failed
        //------------------------------------------------

        if (
            typeof result?.isFailed === "function" &&
            result.isFailed()
        ) {

            signInState = null;

            return {

                success: false,

                step: "error",

                message:
                    getErrorMessage(result)

            };

        }


        //------------------------------------------------
        // Store state
        //------------------------------------------------

        signInState =
            result?.state ?? null;


        //------------------------------------------------
        // Password Required
        //------------------------------------------------

        if (
            signInState instanceof
            SignInPasswordRequiredState
        ) {

            return {

                success: true,

                step: "password",

                message:
                    "Password required.",

                state:
                    signInState

            };

        }


        //------------------------------------------------
        // MFA Required
        //
        // MFA can potentially be returned directly
        // from signIn().
        //------------------------------------------------

        if (
            typeof result?.isMfaRequired ===
            "function" &&
            result.isMfaRequired()
        ) {

            return await processMfaAwaitingState(
                result.state
            );

        }


        //------------------------------------------------
        // Explicit MfaAwaitingState check
        //
        // This is important because the SDK may return
        // an MfaAwaitingState even when the result's
        // isMfaRequired() helper is not available.
        //------------------------------------------------

        if (
            result?.state instanceof
            MfaAwaitingState
        ) {

            return await processMfaAwaitingState(
                result.state
            );

        }


        //------------------------------------------------
        // Code Required
        //------------------------------------------------

        if (
            signInState instanceof
            SignInCodeRequiredState
        ) {

            return {

                success: true,

                step: "code",

                message:
                    "Enter the verification code.",

                state:
                    signInState

            };

        }


        //------------------------------------------------
        // Authentication Already Completed
        //------------------------------------------------

        if (
            signInState instanceof
            SignInCompletedState
        ) {

            return {

                success: true,

                step: "completed",

                account:
                    result.data?.account ??
                    null,

                authenticationResult:
                    result.data ??
                    null

            };

        }


        //------------------------------------------------
        // Unsupported state
        //------------------------------------------------

        console.error(
            "Unsupported state returned from signIn():",
            signInState
        );

        return {

            success: false,

            step: "error",

            state:
                signInState,

            message:
                "An unsupported sign-in state was returned."

        };

    }
    catch (error) {

        console.error(
            "Native authentication start sign-in error:",
            error
        );

        signInState = null;

        return {

            success: false,

            step: "error",

            message:
                error?.message ??
                "Unable to start sign-in."

        };

    }

};


//----------------------------------------------------
// Get Current User
//----------------------------------------------------

export const getCurrentUser = async () => {

    try {

        const authClient =
            await getNativeAuthClient();

        const account =
            authClient.getCurrentAccount();

        console.log(
            "========== CURRENT ACCOUNT =========="
        );

        console.log(
            "Current account:",
            account
        );

        console.log(
            "Account constructor:",
            account?.constructor?.name
        );

        console.log(
            "====================================="
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

//----------------------------------------------------
// Process MFA Awaiting State
//
// MfaAwaitingState means:
//
// "MFA is required and the application must select
//  one of the user's registered authentication
//  methods."
//
// IMPORTANT:
//
// We DO NOT call requestChallenge() here.
//
// We return the MfaAwaitingState and the available
// methods to the caller.
//
// The caller then selects a method and calls:
//
//     requestMfaChallenge(method.id)
//
//----------------------------------------------------

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


    //------------------------------------------------
    // Validate MFA state
    //------------------------------------------------

    if (
        !mfaState
    ) {

        console.error(
            "MFA was required but no MFA state was returned."
        );

        return {

            success: false,

            step: "error",

            message:
                "MFA is required, but no MFA state was returned."

        };

    }


    //------------------------------------------------
    // Store MFA state
    //------------------------------------------------

    signInState =
        mfaState;


    //------------------------------------------------
    // Verify expected state type
    //------------------------------------------------

    if (
        !(
            mfaState instanceof
            MfaAwaitingState
        )
    ) {

        console.warn(
            "Expected MfaAwaitingState but received:",
            mfaState?.constructor?.name
        );

    }


    //------------------------------------------------
    // Get authentication methods
    //------------------------------------------------

    let authMethods = [];


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


    //------------------------------------------------
    // Diagnostics
    //------------------------------------------------

    console.log(
        "MFA authentication methods:",
        authMethods
    );

    console.log(
        "MFA authentication methods JSON:",
        JSON.stringify(
            authMethods,
            null,
            2
        )
    );


    //------------------------------------------------
    // Make sure at least one method exists
    //------------------------------------------------

    if (
        !authMethods ||
        authMethods.length === 0
    ) {

        console.error(
            "No MFA authentication methods are available."
        );

        return {

            success: false,

            step: "error",

            message:
                "MFA is required, but no usable authentication method is registered for this account."

        };

    }


    //------------------------------------------------
    // MFA client diagnostics
    //------------------------------------------------

    const mfaClient =
        mfaState
            ?.stateParameters
            ?.mfaClient;


    console.log(
        "========== MFA CLIENT =========="
    );

    console.log(
        "MFA client:",
        mfaClient
    );

    console.log(
        "MFA client constructor:",
        mfaClient?.constructor?.name
    );

    console.log(
        "MFA client methods:",
        mfaClient
            ?
            Object.getOwnPropertyNames(
                Object.getPrototypeOf(
                    mfaClient
                )
            )
            :
            []
    );

    console.log(
        "================================"
    );


    //------------------------------------------------
    // Return MFA state to React
    //------------------------------------------------

    console.log(
        "Returning MFA state to React."
    );

    return {

        success: true,

        step: "mfa",

        state:
            mfaState,

        authMethods:
            authMethods,

        message:
            "MFA verification is required."

    };

};


//----------------------------------------------------
// Submit Password
//----------------------------------------------------

export const submitPassword = async (password) => {

    try {

        console.log(
            "========== SUBMIT PASSWORD =========="
        );

        console.log(
            "Current signInState:",
            signInState
        );

        console.log(
            "Current state constructor:",
            signInState?.constructor?.name
        );


        //------------------------------------------------
        // Validate password state
        //------------------------------------------------

        if (!signInState) {

            return {

                success: false,

                step: "error",

                message:
                    "No authentication state is active."

            };

        }


        //------------------------------------------------
        // Validate password
        //------------------------------------------------

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


        //------------------------------------------------
        // Submit password
        //------------------------------------------------

        const result =
            await signInState.submitPassword(
                cleanPassword
            );


        //------------------------------------------------
        // Diagnostics
        //------------------------------------------------

        console.log(
            "========== RAW MSAL PASSWORD RESULT =========="
        );

        console.log(
            "result:",
            result
        );

        console.log(
            "result constructor:",
            result?.constructor?.name
        );

        console.log(
            "isFailed:",
            typeof result?.isFailed === "function"
                ? result.isFailed()
                : "N/A"
        );

        console.log(
            "isCompleted:",
            typeof result?.isCompleted === "function"
                ? result.isCompleted()
                : "N/A"
        );

        console.log(
            "isMfaRequired:",
            typeof result?.isMfaRequired === "function"
                ? result.isMfaRequired()
                : "N/A"
        );

        console.log(
            "isAuthMethodRegistrationRequired:",
            typeof result?.isAuthMethodRegistrationRequired === "function"
                ? result.isAuthMethodRegistrationRequired()
                : "N/A"
        );

        console.log(
            "state:",
            result?.state
        );

        console.log(
            "state constructor:",
            result?.state?.constructor?.name
        );

        console.log(
            "=============================================="
        );


        //------------------------------------------------
        // Always update state first
        //------------------------------------------------

        signInState =
            result?.state ?? null;


        //------------------------------------------------
        // 1. FAILED
        //------------------------------------------------

        if (
            typeof result?.isFailed === "function" &&
            result.isFailed()
        ) {

            console.error(
                "PASSWORD AUTHENTICATION FAILED:",
                result
            );

            return {

                success: false,

                step: "password",

                state:
                    signInState,

                message:
                    getErrorMessage(result)

            };

        }


        //------------------------------------------------
        // 2. COMPLETED
        //
        // IMPORTANT:
        //
        // If this is true, authentication is finished.
        // Do NOT try to determine another step.
        //------------------------------------------------

        if (
            typeof result?.isCompleted === "function" &&
            result.isCompleted()
        ) {

            console.log(
                "========== PASSWORD AUTHENTICATION COMPLETED =========="
            );

            console.log(
                "Authentication completed directly after password."
            );

            console.log(
                "Account:",
                result.data?.account
            );

            console.log(
                "Authentication result:",
                result.data
            );

            console.log(
                "========================================================"
            );


            return {

                success: true,

                step: "completed",

                state:
                    signInState,

                account:
                    result.data?.account ??
                    null,

                authenticationResult:
                    result.data ??
                    null

            };

        }


        //------------------------------------------------
        // 3. AUTHENTICATION METHOD REGISTRATION
        //------------------------------------------------

        // if (
        //     typeof result?.isAuthMethodRegistrationRequired ===
        //     "function" &&
        //     result.isAuthMethodRegistrationRequired()
        // ) {

        //     console.log(
        //         "========== AUTH METHOD REGISTRATION REQUIRED =========="
        //     );

        //     console.log(
        //         "Registration state:",
        //         signInState
        //     );

        //     console.log(
        //         "Registration state constructor:",
        //         signInState?.constructor?.name
        //     );

        //     console.log(
        //         "======================================================="
        //     );


        //     return {

        //         success: true,

        //         step: "authMethodRegistration",

        //         state:
        //             signInState,

        //         message:
        //             "An authentication method must be registered."

        //     };

        // }

       //------------------------------------------------
        // Authentication method registration required
        //------------------------------------------------

        if (
            typeof result?.isAuthMethodRegistrationRequired ===
            "function" &&
            result.isAuthMethodRegistrationRequired()
        ) {

            signInState =  result.state;

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
        //------------------------------------------------
        // 4. MFA REQUIRED
        //------------------------------------------------

        if (
            typeof result?.isMfaRequired ===
            "function" &&
            result.isMfaRequired()
        ) {

            return await processMfaAwaitingState(
                signInState
            );

        }


        //------------------------------------------------
        // 5. Explicit MFA state fallback
        //------------------------------------------------

        if (
            signInState instanceof
            MfaAwaitingState
        ) {

            return await processMfaAwaitingState(
                signInState
            );

        }


        //------------------------------------------------
        // 6. Explicit registration state fallback
        //------------------------------------------------

        if (
            signInState instanceof
            AuthMethodRegistrationRequiredState
        ) {

            return {

                success: true,

                step: "authMethodRegistration",

                state:
                    signInState,

                message:
                    "An authentication method must be registered."

            };

        }


        //------------------------------------------------
        // 7. Unexpected result
        //------------------------------------------------

        console.error(
            "========== UNKNOWN PASSWORD RESULT =========="
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
            "State:",
            signInState
        );

        console.error(
            "State constructor:",
            signInState?.constructor?.name
        );

        console.error(
            "============================================="
        );


        return {

            success: false,

            step: "error",

            state:
                signInState,

            message:
                "An unsupported authentication state was returned after submitting the password."

        };

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


//----------------------------------------------------
// Request MFA Challenge
//
// MfaAwaitingState means that the available MFA
// method must first be selected.
//
// For your current migrated users the method returned
// by Entra is:
//
//     challenge_type:  oob
//     challenge_channel: email
//
// Calling requestChallenge(method.id) causes Entra
// to issue the email MFA challenge.
//
// Expected next state:
//
//     MfaVerificationRequiredState
//----------------------------------------------------

export const requestMfaChallenge = async (
    authenticationMethodId
) => {

    try {

        console.log(
            "========== REQUEST MFA CHALLENGE =========="
        );

        console.log(
            "Current signInState:",
            signInState
        );

        console.log(
            "Current state constructor:",
            signInState?.constructor?.name
        );

        console.log(
            "Authentication method ID:",
            authenticationMethodId
        );


        //------------------------------------------------
        // Validate state
        //------------------------------------------------

        if (
            !signInState ||
            !(
                signInState instanceof
                MfaAwaitingState
            )
        ) {

            console.error(
                "MFA awaiting state is not active."
            );

            return {

                success: false,

                step: "error",

                message:
                    "The MFA authentication method selection step is not active."

            };

        }


        //------------------------------------------------
        // Validate method ID
        //------------------------------------------------

        if (
            !authenticationMethodId
        ) {

            return {

                success: false,

                step: "mfa",

                message:
                    "No MFA authentication method was selected."

            };

        }


        //------------------------------------------------
        // Request challenge
        //------------------------------------------------

        const result =
            await signInState.requestChallenge(
                authenticationMethodId
            );


        //------------------------------------------------
        // Diagnostics
        //------------------------------------------------

        console.log(
            "========== MFA CHALLENGE RESULT =========="
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
            "isFailed:",
            result?.isFailed?.()
        );

        console.log(
            "isVerificationRequired:",
            result?.isVerificationRequired?.()
        );

        console.log(
            "isCompleted:",
            result?.isCompleted?.()
        );

        console.log(
            "=========================================="
        );


        //------------------------------------------------
        // Failed
        //------------------------------------------------

        if (
            typeof result?.isFailed === "function" &&
            result.isFailed()
        ) {

            console.error(
                "MFA CHALLENGE REQUEST FAILED:",
                result
            );

            return {

                success: false,

                step: "mfa",

                message:
                    getErrorMessage(result)

            };

        }


        //------------------------------------------------
        // Verification required
        //------------------------------------------------

        if (
            typeof result?.isVerificationRequired ===
            "function" &&
            result.isVerificationRequired()
        ) {

            signInState =
                result.state;


            console.log(
                "========== MFA VERIFICATION REQUIRED =========="
            );

            console.log(
                "New MFA state:",
                signInState
            );

            console.log(
                "New MFA state constructor:",
                signInState?.constructor?.name
            );

            console.log(
                "================================================"
            );


            return {

                success: true,

                step: "mfaCode",

                state:
                    signInState,

                message:
                    "A verification code has been sent to your email."

            };

        }


        //------------------------------------------------
        // Explicit MfaVerificationRequiredState check
        //------------------------------------------------

        if (
            result?.state instanceof
            MfaVerificationRequiredState
        ) {

            signInState =
                result.state;


            console.log(
                "MFA state explicitly identified as MfaVerificationRequiredState."
            );


            return {

                success: true,

                step: "mfaCode",

                state:
                    signInState,

                message:
                    "A verification code has been sent to your email."

            };

        }


        //------------------------------------------------
        // Completed
        //------------------------------------------------

        if (
            typeof result?.isCompleted === "function" &&
            result.isCompleted()
        ) {

            signInState =
                result.state;


            return {

                success: true,

                step: "completed",

                account:
                    result.data?.account ??
                    null,

                authenticationResult:
                    result.data ??
                    null

            };

        }


        //------------------------------------------------
        // Unexpected result
        //------------------------------------------------

        console.error(
            "Unexpected MFA challenge result:",
            result
        );


        return {

            success: false,

            step: "error",

            state:
                result?.state,

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


//----------------------------------------------------
// Submit MFA Challenge
//
// This is where the user-entered email OTP is sent
// to Entra.
//
// Expected current state:
//
//     MfaVerificationRequiredState
//
// Expected successful result:
//
//     SignInCompletedState
//----------------------------------------------------

export const submitMfaChallenge = async (
    code
) => {

    try {

        console.log(
            "========== SUBMIT MFA CHALLENGE =========="
        );

        console.log(
            "Current signInState:",
            signInState
        );

        console.log(
            "Current state constructor:",
            signInState?.constructor?.name
        );


        //------------------------------------------------
        // Validate state
        //------------------------------------------------

        if (
            !signInState ||
            !(
                signInState instanceof
                MfaVerificationRequiredState
            )
        ) {

            console.error(
                "MFA verification state is not active."
            );

            return {

                success: false,

                step: "error",

                message:
                    "The MFA verification step is not active."

            };

        }


        //------------------------------------------------
        // Clean code
        //------------------------------------------------

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
            "Submitting MFA challenge code."
        );

        console.log(
            "MFA code length:",
            cleanCode.length
        );


        //------------------------------------------------
        // Submit OTP
        //------------------------------------------------

        const result =
            await signInState.submitChallenge(
                cleanCode
            );


        //------------------------------------------------
        // Diagnostics
        //------------------------------------------------

        console.log(
            "========== MFA CHALLENGE SUBMIT RESULT =========="
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
            "isFailed:",
            result?.isFailed?.()
        );

        console.log(
            "isCompleted:",
            result?.isCompleted?.()
        );

        console.log(
            "isMfaRequired:",
            result?.isMfaRequired?.()
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
            "=================================================="
        );


        //------------------------------------------------
        // Failed
        //------------------------------------------------

        if (
            typeof result?.isFailed === "function" &&
            result.isFailed()
        ) {

            console.error(
                "MFA CHALLENGE FAILED:",
                result
            );


            //------------------------------------------------
            // Incorrect OTP
            //------------------------------------------------

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


        //------------------------------------------------
        // Completed
        //------------------------------------------------

        if (
            typeof result?.isCompleted === "function" &&
            result.isCompleted()
        ) {

            console.log(
                "========== MFA AUTHENTICATION COMPLETED =========="
            );

            console.log(
                "Account:",
                result.data?.account
            );

            console.log(
                "Authentication result:",
                result.data
            );

            console.log(
                "=================================================="
            );


            signInState =
                result.state;


            return {

                success: true,

                step: "completed",

                account:
                    result.data?.account ??
                    null,

                authenticationResult:
                    result.data ??
                    null

            };

        }


        //------------------------------------------------
        // MFA may potentially require another state
        //------------------------------------------------

        if (
            typeof result?.isMfaRequired ===
            "function" &&
            result.isMfaRequired()
        ) {

            return await processMfaAwaitingState(
                result.state
            );

        }


        //------------------------------------------------
        // Update state
        //------------------------------------------------

        signInState =
            result?.state ?? null;


        //------------------------------------------------
        // If another verification state was returned
        //------------------------------------------------

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


        //------------------------------------------------
        // Unexpected state
        //------------------------------------------------

        console.error(
            "MFA challenge did not complete."
        );

        console.error(
            "Result:",
            result
        );

        console.error(
            "New state:",
            signInState
        );

        console.error(
            "New state constructor:",
            signInState?.constructor?.name
        );


        return {

            success: false,

            step: "error",

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


//----------------------------------------------------
// Existing Standard Verification Code
//
// Retained for non-MFA native-auth flows.
//----------------------------------------------------

export const submitVerificationCode =
    async (code) => {

        try {

            //------------------------------------------------
            // Validate state
            //------------------------------------------------

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


            //------------------------------------------------
            // Clean code
            //------------------------------------------------

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


            //------------------------------------------------
            // Submit code
            //------------------------------------------------

            const result =
                await signInState.submitCode(
                    cleanCode
                );


            //------------------------------------------------
            // Diagnostics
            //------------------------------------------------

            console.log(
                "========== STANDARD CODE RESULT =========="
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
                "isFailed:",
                result?.isFailed?.()
            );

            console.log(
                "isCompleted:",
                result?.isCompleted?.()
            );

            console.log(
                "isMfaRequired:",
                result?.isMfaRequired?.()
            );

            console.log(
                "=========================================="
            );


            //------------------------------------------------
            // Failed
            //------------------------------------------------

            if (
                typeof result?.isFailed === "function" &&
                result.isFailed()
            ) {

                return {

                    success: false,

                    step: "code",

                    message:
                        getErrorMessage(result)

                };

            }


            //------------------------------------------------
            // Completed
            //------------------------------------------------

            if (
                typeof result?.isCompleted === "function" &&
                result.isCompleted()
            ) {

                signInState =
                    result.state;

                return {

                    success: true,

                    step: "completed",

                    account:
                        result.data?.account ??
                        null,

                    authenticationResult:
                        result.data ??
                        null

                };

            }


            //------------------------------------------------
            // MFA
            //------------------------------------------------

            if (
                typeof result?.isMfaRequired ===
                "function" &&
                result.isMfaRequired()
            ) {

                return await processMfaAwaitingState(
                    result.state
                );

            }


            //------------------------------------------------
            // Explicit MFA state
            //------------------------------------------------

            if (
                result?.state instanceof
                MfaAwaitingState
            ) {

                return await processMfaAwaitingState(
                    result.state
                );

            }


            //------------------------------------------------
            // Update state
            //------------------------------------------------

            signInState =
                result?.state ?? null;


            //------------------------------------------------
            // Unexpected state
            //------------------------------------------------

            return {

                success: false,

                step: "error",

                state:
                    signInState,

                message:
                    "Verification did not complete the sign-in."

            };

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


//----------------------------------------------------
// Clear Current Authentication Flow
//----------------------------------------------------

export const clearSignInState = () => {

    console.log(
        "Clearing native authentication state."
    );

    signInState = null;

};


//----------------------------------------------------
// Get Current Authentication State
//----------------------------------------------------

export const getCurrentSignInState = () => {

    return signInState;

};

