

import { getNativeAccessToken } from "../auth/nativeAuthService";

export async function authenticatedFetch(
    url,
    options = {},
    authenticationResult
) {
    if (!authenticationResult) {
        throw new Error(
            "No authenticated Entra authentication result is available."
        );
    }

    const accessToken = await getNativeAccessToken(
        authenticationResult
    );

    const headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
    };

    const response = await fetch(url, {
        ...options,
        headers,
        credentials: "include"
    });

    if (response.status === 401) {
        throw new Error(
            "Authentication failed or the authentication session has expired."
        );
    }

    if (response.status === 403) {
        throw new Error(
            "You are authenticated but are not authorized to access this resource."
        );
    }

    return response;
}