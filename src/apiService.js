import axios from "axios";

const API_BASE_URL = "https://localhost:7290";

// ============================================================
// AUTHENTICATED REQUEST CONFIG
// ============================================================

const authenticatedConfig = (token) => {

    if (!token) {
        throw new Error(
            "No access token was supplied."
        );
    }

    return {
        headers: {
            Authorization: `Bearer ${token}`
        },
        withCredentials: true
    };
};


// ============================================================
// PUBLIC API
// ============================================================

export const getPublicData = async () => {

    const response =
        await axios.get(
            `${API_BASE_URL}/api/public`
        );

    return response.data;
};


// ============================================================
// MFA STATUS
// ============================================================

export const getMfaStatus = async (token) => {

    const response =
        await axios.get(
            `${API_BASE_URL}/api/mfa/status`,
            authenticatedConfig(token)
        );

    return response.data;
};


// ============================================================
// MFA VERIFY
// ============================================================

export const verifyMfa = async (
    token,
    code
) => {

    const response =
        await axios.post(
            `${API_BASE_URL}/api/mfa/verify`,
            {
                code
            },
            authenticatedConfig(token)
        );

    return response.data;
};


// ============================================================
// SECURE API
// ============================================================

export const getSecureData = async (token) => {

    console.log(
        "GET SECURE TOKEN EXISTS:",
        !!token
    );

    console.log(
        "GET SECURE TOKEN LENGTH:",
        token?.length
    );

    const response =
        await axios.get(
            `${API_BASE_URL}/api/secure`,
            authenticatedConfig(token)
        );

    return response.data;
};


// ============================================================
// MY CLAIMS API
// ============================================================

export const getMe = async (token) => {

    const response =
        await axios.get(
            `${API_BASE_URL}/api/me`,
            authenticatedConfig(token)
        );

    return response.data;
};


// ============================================================
// GENERIC PROTECTED API
// ============================================================

export const callProtectedApi = async (
    token,
    url,
    options = {}
) => {

    if (!token) {
        throw new Error(
            "No access token was supplied."
        );
    }

    const response = await axios({
        url: `${API_BASE_URL}${url}`,
        ...options,
        headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`
        },
        withCredentials: true
    });

    return response.data;
};