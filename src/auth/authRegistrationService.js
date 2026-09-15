
import {
    AuthMethodRegistrationRequiredState,
    AuthMethodVerificationRequiredState
} from "@azure/msal-browser/custom-auth";

import {
    getCurrentSignInState
} from "./nativeAuthService";


//--------------------------------------------------
// Error helper
//--------------------------------------------------

const getErrorMessage = (error) => {

    if (!error) {
        return "";
    }

    if (typeof error === "string") {
        return error;
    }

    return (
        error.message ??
        error.errorDescription ??
        "Unable to complete authentication."
    );
};


//--------------------------------------------------
// Get authentication method value
//--------------------------------------------------

export const getAuthMethodValue = (method) => {

    if (typeof method === "string") {
        return method;
    }

    return (
        method?.type ??
        method?.authMethodType ??
        method?.name ??
        ""
    );
};


//--------------------------------------------------
// Get available registration methods
//--------------------------------------------------

export const getRegistrationMethods = (state) => {

    if (
        !state ||
        typeof state.getAuthMethods !== "function"
    ) {
        return [];
    }

    try {

        return state.getAuthMethods() ?? [];

    }
    catch (error) {

        console.error(
            "Unable to get registration methods:",
            error
        );

        return [];
    }
};


//--------------------------------------------------
// Select preferred registration method
//--------------------------------------------------

export const selectPreferredRegistrationMethod = (
    methods
) => {

    const emailMethod =
        methods.find(
            method => {

                const value =
                    getAuthMethodValue(method);

                return value
                    .toLowerCase()
                    .includes("email");

            }
        );

    return (
        emailMethod ??
        methods[0] ??
        ""
    );
};


//--------------------------------------------------
// Validate registration state
//--------------------------------------------------

const getRegistrationState = (
    registrationState
) => {

    return (
        registrationState ??
        getCurrentSignInState()
    );

};


//--------------------------------------------------
// Register MFA authentication method
//--------------------------------------------------

export const registerAuthenticationMethod =
    async ({
        registrationState,
        authenticationMethod,
        verificationContact
    }) => {

        const state =
            getRegistrationState(
                registrationState
            );

        console.log(
            "========== SUBMIT MFA REGISTRATION =========="
        );

        console.log(
            "State:",
            state
        );

        console.log(
            "State constructor:",
            state?.constructor?.name
        );

        console.log(
            "Selected method:",
            authenticationMethod
        );

        console.log(
            "Verification contact:",
            verificationContact
        );

        console.log(
            "=============================================="
        );


        //--------------------------------------------------
        // Validate state
        //--------------------------------------------------

        if (
            !(
                state instanceof
                AuthMethodRegistrationRequiredState
            )
        ) {

            return {
                success: false,
                message:
                    "The authentication method registration state is no longer active."
            };

        }


        //--------------------------------------------------
        // Ask Entra to challenge/register the method
        //--------------------------------------------------

        try {

            const result =
                await state.challengeAuthMethod({

                    authMethodType:
                        authenticationMethod,

                    verificationContact:
                        verificationContact.trim()

                });


            console.log(
                "MFA registration result:",
                result
            );


            //--------------------------------------------------
            // Failed
            //--------------------------------------------------

            if (
                result.isFailed()
            ) {

                const errorObject =
                    result.error;


                if (
                    errorObject?.isInvalidInput?.()
                ) {

                    return {
                        success: false,
                        message:
                            "The verification email address is invalid."
                    };

                }


                if (
                    errorObject?.isVerificationContactBlocked?.()
                ) {

                    return {
                        success: false,
                        message:
                            "This verification email address is blocked. Please use another email address."
                    };

                }


                return {
                    success: false,
                    message:
                        getErrorMessage(
                            errorObject
                        )
                };

            }


            //--------------------------------------------------
            // Verification required
            //--------------------------------------------------

            if (
                typeof result.isVerificationRequired ===
                "function" &&
                result.isVerificationRequired()
            ) {

                console.log(
                    "Email OTP registration challenge sent."
                );

                return {

                    success: true,

                    step:
                        "verificationRequired",

                    state:
                        result.state

                };

            }


            //--------------------------------------------------
            // Completed
            //--------------------------------------------------

            if (
                result.isCompleted()
            ) {

                return {

                    success: true,

                    step:
                        "completed",

                    account:
                        result.data?.account ??
                        null,

                    authenticationResult:
                        result.data ??
                        null

                };

            }


            //--------------------------------------------------
            // Unexpected state
            //--------------------------------------------------

            return {

                success: false,

                message:
                    "The authentication method registration returned an unexpected state."

            };

        }
        catch (error) {

            console.error(
                "MFA registration error:",
                error
            );

            return {

                success: false,

                message:
                    getErrorMessage(error)

            };

        }

    };


//--------------------------------------------------
// Verify MFA registration code
//--------------------------------------------------

export const verifyAuthenticationMethod =
    async ({
        registrationState,
        code
    }) => {

        const state =
            getRegistrationState(
                registrationState
            );


        console.log(
            "========== VERIFY MFA REGISTRATION =========="
        );

        console.log(
            "State:",
            state
        );

        console.log(
            "State constructor:",
            state?.constructor?.name
        );

        console.log(
            "=============================================="
        );


        //--------------------------------------------------
        // Validate state
        //--------------------------------------------------

        if (
            !(
                state instanceof
                AuthMethodVerificationRequiredState
            )
        ) {

            return {

                success: false,

                message:
                    "The authentication method verification state is no longer active."

            };

        }


        try {

            //--------------------------------------------------
            // Submit OTP
            //--------------------------------------------------

            const result =
                await state.submitChallenge(
                    code.trim()
                );


            console.log(
                "MFA registration verification result:",
                result
            );


            //--------------------------------------------------
            // Failed
            //--------------------------------------------------

            if (
                result.isFailed()
            ) {

                if (
                    result.error?.isIncorrectChallenge?.()
                ) {

                    return {

                        success: false,

                        message:
                            "The verification code is incorrect."

                    };

                }


                return {

                    success: false,

                    message:
                        getErrorMessage(
                            result.error
                        )

                };

            }


            //--------------------------------------------------
            // Completed
            //--------------------------------------------------

            if (
                result.isCompleted()
            ) {

                console.log(
                    "========== MFA REGISTRATION COMPLETED =========="
                );

                console.log(
                    "Result:",
                    result
                );

                console.log(
                    "================================================="
                );


                return {

                    success: true,

                    step:
                        "completed",

                    account:
                        result.data?.account ??
                        null,

                    authenticationResult:
                        result.data ??
                        null

                };

            }


            //--------------------------------------------------
            // Unexpected state
            //--------------------------------------------------

            return {

                success: false,

                message:
                    "The verification was not completed."

            };

        }
        catch (error) {

            console.error(
                "MFA registration verification error:",
                error
            );

            return {

                success: false,

                message:
                    getErrorMessage(error)

            };

        }

    };

