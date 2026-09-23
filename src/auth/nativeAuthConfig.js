import {
    LogLevel
}
from "@azure/msal-browser/custom-auth";

export const nativeAuthConfig = {

    customAuth: {

        challengeTypes: [
            "password",
            "oob",
            "redirect"
        ],

         capabilities: [
            "mfa_required",
            "registration_required"
        ],

        authApiProxyUrl:
            "http://localhost:3001/api"

    },

    auth: {
        clientId: "aa13de8e-a0f3-4501-a6d0-27f790f7929f",
        authority: "https://devsandboxciam.ciamlogin.com",
        redirectUri: "http://localhost:3000/redirect.html",
        postLogoutRedirectUri: "http://localhost:3000/",
        navigateToLoginRequestUrl: false
    },

    cache: {

        cacheLocation:
            "sessionStorage"

    },

    system: {

        loggerOptions: {

            loggerCallback: (
                level,
                message,
                containsPii
            ) => {

                if (containsPii) {
                    return;
                }

                switch (level) {

                    case LogLevel.Error:
                        console.error(message);
                        return;

                    case LogLevel.Info:
                        console.info(message);
                        return;

                    case LogLevel.Verbose:
                        console.debug(message);
                        return;

                    case LogLevel.Warning:
                        console.warn(message);
                        return;

                    default:
                        return;
                }
            }

        }

    }

};