import React, { useState } from "react";

const UnifiedMfaChallenge = ({
    totpEnabled = true,
    emailEnabled = true,
    smsEnabled = true,
    onSelectMethod,
    onVerify,
    onCancel
}) => {

    const [
        selectedMethod,
        setSelectedMethod
    ] = useState("");

    const [
        code,
        setCode
    ] = useState("");

    const [
        verifying,
        setVerifying
    ] = useState(false);

    const handleSelectMethod = (method) => {

        setSelectedMethod(method);
        setCode("");

        if (onSelectMethod) {
            onSelectMethod(method);
        }
    };

    const handleVerify = async () => {

        if (!code || code.length !== 6) {
            return;
        }

        try {

            setVerifying(true);

            if (onVerify) {
                await onVerify(code);
            }

        }
        finally {

            setVerifying(false);
        }
    };

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

            <h2 style={{ marginTop: 0 }}>
                Two-step verification
            </h2>

            <p>
                Choose how you want to verify
                your identity.
            </p>

            {/* =====================================================
                AUTHENTICATOR
               ===================================================== */}

            {totpEnabled && (

                <button
                    type="button"
                    onClick={() =>
                        handleSelectMethod("totp")
                    }
                    style={{
                        display: "block",
                        width: "100%",
                        padding: "16px",
                        marginBottom: "12px",
                        textAlign: "left",
                        cursor: "pointer",
                        border:
                            selectedMethod === "totp"
                                ? "2px solid #1976d2"
                                : "1px solid #ccc",
                        borderRadius: "8px",
                        background:
                            selectedMethod === "totp"
                                ? "#f5f9ff"
                                : "#fff"
                    }}
                >
                    <strong>
                        Microsoft Authenticator
                    </strong>

                    <br />

                    <small>
                        Enter the verification
                        code from your
                        Authenticator app.
                    </small>
                </button>

            )}

            {/* =====================================================
                EMAIL
               ===================================================== */}

            {emailEnabled && (

                <button
                    type="button"
                    onClick={() =>
                        handleSelectMethod("email")
                    }
                    style={{
                        display: "block",
                        width: "100%",
                        padding: "16px",
                        marginBottom: "12px",
                        textAlign: "left",
                        cursor: "pointer",
                        border:
                            selectedMethod === "email"
                                ? "2px solid #1976d2"
                                : "1px solid #ccc",
                        borderRadius: "8px",
                        background:
                            selectedMethod === "email"
                                ? "#f5f9ff"
                                : "#fff"
                    }}
                >
                    <strong>
                        Email
                    </strong>

                    <br />

                    <small>
                        Send a verification
                        code to your email.
                    </small>
                </button>

            )}

            {/* =====================================================
                SMS
               ===================================================== */}

            {smsEnabled && (

                <button
                    type="button"
                    onClick={() =>
                        handleSelectMethod("sms")
                    }
                    style={{
                        display: "block",
                        width: "100%",
                        padding: "16px",
                        marginBottom: "12px",
                        textAlign: "left",
                        cursor: "pointer",
                        border:
                            selectedMethod === "sms"
                                ? "2px solid #1976d2"
                                : "1px solid #ccc",
                        borderRadius: "8px",
                        background:
                            selectedMethod === "sms"
                                ? "#f5f9ff"
                                : "#fff"
                    }}
                >
                    <strong>
                        Text message
                    </strong>

                    <br />

                    <small>
                        Send a verification
                        code by SMS.
                    </small>
                </button>

            )}

            {/* =====================================================
                TOTP CODE
               ===================================================== */}

            {selectedMethod === "totp" && (

                <div
                    style={{
                        marginTop: "20px"
                    }}
                >

                    <label
                        htmlFor="unified-mfa-code"
                        style={{
                            display: "block",
                            marginBottom: "8px",
                            fontWeight: "bold"
                        }}
                    >
                        Verification code
                    </label>

                    <input
                        id="unified-mfa-code"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={code}
                        onChange={(event) => {
                            const value =
                                event.target.value
                                    .replace(/\D/g, "");

                            setCode(value);
                        }}
                        placeholder="Enter 6-digit code"
                        style={{
                            width: "100%",
                            boxSizing: "border-box",
                            padding: "12px",
                            fontSize: "18px",
                            letterSpacing: "4px",
                            textAlign: "center",
                            border: "1px solid #ccc",
                            borderRadius: "6px"
                        }}
                    />

                    <p
                        style={{
                            fontSize: "14px",
                            color: "#666"
                        }}
                    >
                        Enter the 6-digit code shown
                        in Microsoft Authenticator.
                    </p>

                </div>

            )}

            {/* =====================================================
                ACTIONS
               ===================================================== */}

            <div
                style={{
                    marginTop: "20px"
                }}
            >

                {selectedMethod === "totp" ? (

                    <button
                        type="button"
                        disabled={
                            code.length !== 6 ||
                            verifying
                        }
                        onClick={handleVerify}
                    >
                        {verifying
                            ? "Verifying..."
                            : "Verify"}
                    </button>

                ) : (

                    <button
                        type="button"
                        disabled={!selectedMethod}
                        onClick={() => {

                            if (onSelectMethod) {
                                onSelectMethod(
                                    selectedMethod
                                );
                            }

                        }}
                    >
                        Continue
                    </button>

                )}

                {onCancel && (

                    <button
                        type="button"
                        onClick={onCancel}
                        style={{
                            marginLeft: "10px"
                        }}
                    >
                        Back
                    </button>

                )}

            </div>

        </div>
    );
};

export default UnifiedMfaChallenge;