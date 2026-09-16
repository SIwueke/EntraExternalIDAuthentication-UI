import axios from "axios";

const API_BASE_URL =
    "https://localhost:7290";

export const getMfaConfiguration = async () => {
    const response =
        await axios.get(
            `${API_BASE_URL}/api/mfa/configuration`
        );

    return response.data;
};