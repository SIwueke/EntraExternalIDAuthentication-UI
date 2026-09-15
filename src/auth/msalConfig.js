export const msalConfig = {
    auth: {
        clientId:
            "aa13de8e-a0f3-4501-a6d0-27f790f7929f",

        authority:
            "https://devsandboxciam.ciamlogin.com/0f0fd0ef-f80f-4b88-bc6a-bc62cdb0bfdb",

        knownAuthorities: [
            "devsandboxciam.ciamlogin.com"
        ],

        redirectUri:
            "http://localhost:3000/redirect.html",

        postLogoutRedirectUri:
            "http://localhost:3000/"
    },

    cache: {
        cacheLocation: "sessionStorage"
    }
};

export const loginRequest = {
    scopes: [
        "openid",
        "profile",
        "offline_access",
        "api://266fbe6d-e931-433e-b17f-6c833d78c8a5/access_as_user"
    ]
};