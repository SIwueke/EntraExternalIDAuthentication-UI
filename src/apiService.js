import axios from "axios";

const API_BASE_URL = "https://localhost:7290";

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
            {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                withCredentials: true
            }
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
            {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                withCredentials: true
            }
        );

    return response.data;
};


// ============================================================
// SECURE API
// ============================================================

// export const getSecureData = async (token) => {

//     const response =
//         await axios.get(
//             `${API_BASE_URL}/api/secure`,
//             {
//                 headers: {
//                     Authorization: `Bearer ${token}`
//                 },
//                 withCredentials: true
//             }
//         );

//     return response.data;
// };

//Tem
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
            {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                withCredentials: true
            }
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
            {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                withCredentials: true
            }
        );

    return response.data;
};