import axios from "axios";

const API_BASE_URL = "https://localhost:7290";

export const getPublicData = async () => {

    const response = await axios.get(
        `${API_BASE_URL}/api/public`
    );

    return response.data;
}

export const getSecureData = async (token) => {

    const response = await axios.get(
        `${API_BASE_URL}/api/secure`,
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    return response.data;
}

export const getMe = async (token) => {

    const response = await axios.get(
        `${API_BASE_URL}/api/me`,
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    return response.data;
}