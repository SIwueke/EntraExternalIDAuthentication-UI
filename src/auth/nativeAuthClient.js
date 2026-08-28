import {
    CustomAuthPublicClientApplication
}
from "@azure/msal-browser/custom-auth";

import {
    nativeAuthConfig
}
from "./nativeAuthConfig";

let authClient = null;

export const getNativeAuthClient =
    async () => {

        if (authClient) {

            return authClient;

        }

        authClient =
            await CustomAuthPublicClientApplication
                .create(
                    nativeAuthConfig
                );

        return authClient;

    };