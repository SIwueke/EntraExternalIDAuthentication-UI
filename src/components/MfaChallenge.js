import React, { useState } from "react";

const MfaChallenge = ({
    // ============================================================
    // Application TOTP
    // ============================================================

    methods = {
        totp: false,
        email: false,
        sms: false
    },

    defaultMethod = "totp",

    message = "",

    onVerifyTotp,

    onCancel,

    // ============================================================
    // Entra Native MFA
    // ============================================================

    nativeMfaMethods = [],

    selectedNativeMfaMethod = "",

    onSelectNativeMfaMethod,

    onSubmitNativeMfaMethod,

    onVerifyNativeMfaCode,

    nativeMfaCode = "",

    nativeMfaCodeLength = 6,

    onNativeMfaCodeChange,

    nativeMfaStep = false,

    loading = false
}) => {

    // ============================================================
    // APPLICATION TOTP STATE
    // ============================================================

    const [selectedMethod, setSelectedMethod] =
        useState(defaultMethod);

    const [totpCode, setTotpCode] =
        useState("");


    // ============================================================
    // DETERMINE AVAILABLE NATIVE METHODS
    // ============================================================

    const hasNativeMethods =
        Array.isArray(nativeMfaMethods) &&
        nativeMfaMethods.length > 0;


    // ============================================================
    // NATIVE MFA METHOD DISPLAY HELPERS
    // ============================================================

    const getNativeMethodLabel = (method) => {

        if (
            method?.challenge_channel ===
            "sms"
        ) {
            return "Text message";
        }

        if (
            method?.challenge_channel ===
            "email"
        ) {
            return "Email";
        }

        return "Microsoft Authenticator";
    };


    const getNativeMethodDescription = (
        method
    ) => {

        if (
            method?.challenge_channel ===
            "sms"
        ) {
            return method?.login_hint
                ? `Send a verification code to ${method.login_hint}.`
                : "Send a verification code by text message.";
        }

        if (
            method?.challenge_channel ===
            "email"
        ) {
            return method?.login_hint
                ? `Send a verification code to ${method.login_hint}.`
                : "Send a verification code to your email.";
        }

        return "Use this verification method.";
    };


    // ============================================================
    // APPLICATION TOTP
    // ============================================================

    const handleTotpSelect = () => {

        setSelectedMethod("totp");

        setTotpCode("");

    };


    const handleTotpVerify = async () => {

        if (
            selectedMethod !== "totp"
        ) {
            return;
        }

        const cleanCode =
            String(totpCode ?? "").trim();

        if (
            cleanCode.length !== 6
        ) {
            return;
        }

        if (onVerifyTotp) {

            await onVerifyTotp(
                cleanCode
            );

        }

    };


    // ============================================================
    // NATIVE MFA METHOD SELECTION
    // ============================================================

    const handleNativeMethodSelect = (
        methodId
    ) => {

        if (loading) {
            return;
        }

        if (onSelectNativeMfaMethod) {

            onSelectNativeMfaMethod(
                methodId
            );

        }

    };


    // ============================================================
    // REQUEST NATIVE MFA CHALLENGE
    // ============================================================

    const handleNativeMethodSubmit = async () => {

        if (
            !selectedNativeMfaMethod ||
            loading
        ) {
            return;
        }

        if (onSubmitNativeMfaMethod) {

            await onSubmitNativeMfaMethod();

        }

    };


    // ============================================================
    // VERIFY NATIVE MFA CODE
    // ============================================================

    const handleNativeCodeVerify = async () => {

        if (
            loading ||
            nativeMfaCode.length !== nativeMfaCodeLength
        ) {
            return;
        }

        console.log(
            "Submitting native MFA code..."
        );

        if (onVerifyNativeMfaCode) {

            await onVerifyNativeMfaCode();

        }

    };


    // ============================================================
    // RENDER
    // ============================================================

    return (
        <div
            style={{
                marginTop: "20px",
                padding: "24px",
                border: "1px solid #d0d0d0",
                borderRadius: "8px",
                maxWidth: "500px",
                background: "#ffffff"
            }}
        >

            {/* =====================================================
                HEADER
               ===================================================== */}

            <h2
                style={{
                    marginTop: 0
                }}
            >
                Two-step verification
            </h2>


            {/* <p>
                Choose how you want to verify your identity.
            </p> */}


            {/* =====================================================
                MESSAGE
               ===================================================== */}

            {message && (
                <p>
                    {message}
                </p>
            )}


            {/* =====================================================
                ENTRA NATIVE MFA METHOD SELECTION
               ===================================================== */}

            {hasNativeMethods &&
                !nativeMfaStep && (

                    <div>

                        {nativeMfaMethods.map(
                            (method) => {

                                const methodId =
                                    method?.id;

                                const selected =
                                    selectedNativeMfaMethod ===
                                    methodId;

                                return (
                                    <button
                                        key={methodId}
                                        type="button"
                                        disabled={loading}
                                        onClick={() =>
                                            handleNativeMethodSelect(
                                                methodId
                                            )
                                        }
                                        style={{
                                            display: "block",
                                            width: "100%",
                                            padding: "14px",
                                            marginBottom: "10px",
                                            textAlign: "left",
                                            cursor:
                                                loading
                                                    ? "default"
                                                    : "pointer",
                                            border:
                                                selected
                                                    ? "2px solid #1976d2"
                                                    : "1px solid #ccc",
                                            borderRadius: "6px",
                                            background:
                                                selected
                                                    ? "#f5f9ff"
                                                    : "#fff"
                                        }}
                                    >

                                        <strong>
                                            {
                                                getNativeMethodLabel(
                                                    method
                                                )
                                            }
                                        </strong>

                                        <br />

                                        <small>
                                            {
                                                getNativeMethodDescription(
                                                    method
                                                )
                                            }
                                        </small>

                                    </button>
                                );

                            }
                        )}


                        {/* =================================================
                            REQUEST CODE
                           ================================================= */}

                        {selectedNativeMfaMethod && (

                            <button
                                type="button"
                                disabled={loading}
                                onClick={
                                    handleNativeMethodSubmit
                                }
                                style={{
                                    marginTop: "10px"
                                }}
                            >
                                {loading
                                    ? "Sending..."
                                    : "Continue"}
                            </button>

                        )}

                    </div>

                )}


            {/* =====================================================
                ENTRA NATIVE MFA CODE
               ===================================================== */}

            {hasNativeMethods &&
                nativeMfaStep && (

                    <div
                        style={{
                            marginTop: "20px"
                        }}
                    >

                        <label
                            htmlFor="native-mfa-code"
                            style={{
                                display: "block",
                                marginBottom: "8px"
                            }}
                        >
                            Verification code
                        </label>


                        <input
                            id="native-mfa-code"
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={nativeMfaCodeLength}
                            placeholder={`Enter ${nativeMfaCodeLength}-digit code`}
                            value={nativeMfaCode}
                            onChange={(event) => {

                                if (
                                    onNativeMfaCodeChange
                                ) {

                                    onNativeMfaCodeChange(
                                        event.target.value
                                            .replace(
                                                /\D/g,
                                                ""
                                            )
                                            .slice(
                                                0,
                                                nativeMfaCodeLength
                                            )
                                    );

                                }

                            }}
                            style={{
                                width: "100%",
                                boxSizing: "border-box",
                                padding: "10px",
                                fontSize: "18px",
                                letterSpacing: "4px"
                            }}
                        />


                        {/* =================================================
                            VERIFY / BACK
                           ================================================= */}

                        <div
                            style={{
                                marginTop: "15px"
                            }}
                        >

                            <button
                                type="button"
                                disabled={
                                    loading ||
                                    nativeMfaCode.length !==
                                        nativeMfaCodeLength
                                }
                                onClick={
                                    handleNativeCodeVerify
                                }
                            >
                                {loading
                                    ? "Verifying..."
                                    : "Verify"}
                            </button>


                            <button
                                type="button"
                                onClick={onCancel}
                                disabled={loading}
                                style={{
                                    marginLeft: "10px"
                                }}
                            >
                                Back
                            </button>

                        </div>

                    </div>

                )}


            {/* =====================================================
                APPLICATION TOTP
               ===================================================== */}

            {!hasNativeMethods &&
                methods.totp && (

                    <div>

                        {/* =================================================
                            AUTHENTICATOR METHOD
                           ================================================= */}

                        <button
                            type="button"
                            onClick={
                                handleTotpSelect
                            }
                            disabled={loading}
                            style={{
                                display: "block",
                                width: "100%",
                                padding: "14px",
                                marginBottom: "20px",
                                textAlign: "left",
                                cursor:
                                    loading
                                        ? "default"
                                        : "pointer",
                                border:
                                    selectedMethod ===
                                    "totp"
                                        ? "2px solid #1976d2"
                                        : "1px solid #ccc",
                                borderRadius: "6px",
                                background:
                                    selectedMethod ===
                                    "totp"
                                        ? "#f5f9ff"
                                        : "#fff"
                            }}
                        >

                            <strong>
                                Microsoft Authenticator
                            </strong>

                            <br />

                            <small>
                                Enter the 6-digit code
                                from your Authenticator app.
                            </small>

                        </button>


                        {/* =================================================
                            TOTP CODE
                           ================================================= */}

                        <label
                            htmlFor="mfa-code"
                            style={{
                                display: "block",
                                marginBottom: "8px"
                            }}
                        >
                            Authenticator code
                        </label>


                        <input
                            id="mfa-code"
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            placeholder="Enter 6-digit code"
                            value={totpCode}
                            onChange={(event) => {

                                setTotpCode(
                                    event.target.value
                                        .replace(
                                            /\D/g,
                                            ""
                                        )
                                        .slice(
                                            0,
                                            6
                                        )
                                );

                            }}
                            style={{
                                width: "100%",
                                boxSizing: "border-box",
                                padding: "10px",
                                fontSize: "18px",
                                letterSpacing: "4px"
                            }}
                        />


                        {/* =================================================
                            VERIFY / CANCEL
                           ================================================= */}

                        <div
                            style={{
                                marginTop: "15px"
                            }}
                        >

                            <button
                                type="button"
                                disabled={
                                    loading ||
                                    totpCode.length !== 6
                                }
                                onClick={
                                    handleTotpVerify
                                }
                            >
                                {loading
                                    ? "Verifying..."
                                    : "Verify"}
                            </button>


                            {onCancel && (

                                <button
                                    type="button"
                                    onClick={onCancel}
                                    disabled={loading}
                                    style={{
                                        marginLeft: "10px"
                                    }}
                                >
                                    Cancel
                                </button>

                            )}

                        </div>

                    </div>

                )}

        </div>
    );
};

export default MfaChallenge;
