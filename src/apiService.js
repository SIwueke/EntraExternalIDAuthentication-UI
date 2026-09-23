const API_BASE_URL = "https://localhost:7290";

/**
 * Call a protected API using an already-acquired Entra access token.
 *
 * IMPORTANT:
 * This function must NOT acquire the token itself.
 * The token is obtained by useNativeLogin.js and passed here.
 */
export const callProtectedApi = async (
    accessToken,
    url,
    options = {}
) => {
    console.log("========== CALL PROTECTED API ==========");

    if (!accessToken) {
        throw new Error(
            "No Entra access token was supplied to callProtectedApi()."
        );
    }

    if (typeof accessToken !== "string") {
        throw new Error(
            "The Entra access token supplied to callProtectedApi() is not a string."
        );
    }

    console.log(
        "Using existing Entra access token. Length:",
        accessToken.length
    );

    const {
        method = "GET",
        headers = {},
        body,
        ...restOptions
    } = options;

    const requestHeaders = {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...headers,
    };

    if (body !== undefined && body !== null) {
        requestHeaders["Content-Type"] = "application/json";
    }

    const response = await fetch(
        `${API_BASE_URL}${url}`,
        {
            method,
            ...restOptions,
            headers: requestHeaders,
            body,
            credentials: "include",
        }
    );

    console.log(
        `Protected API response: ${response.status} ${response.statusText}`
    );

    const contentType =
        response.headers.get("content-type") || "";

    let responseData;

    if (contentType.includes("application/json")) {
        responseData = await response.json();
    } else {
        responseData = await response.text();
    }

    if (!response.ok) {
        const error = new Error(
            `Protected API returned HTTP ${response.status}.`
        );

        error.status = response.status;
        error.statusText = response.statusText;
        error.data = responseData;

        console.error(
            "Protected API request failed:",
            error
        );

        throw error;
    }

    return responseData;
};


/**
 * GET helper for protected APIs.
 */
export const getProtectedApi = async (
    accessToken,
    url,
    options = {}
) => {
    return callProtectedApi(
        accessToken,
        url,
        {
            ...options,
            method: "GET",
        }
    );
};


/**
 * POST helper for protected APIs.
 */
export const postProtectedApi = async (
    accessToken,
    url,
    body,
    options = {}
) => {
    return callProtectedApi(
        accessToken,
        url,
        {
            ...options,
            method: "POST",
            body: JSON.stringify(body),
        }
    );
};