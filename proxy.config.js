const tenantSubdomain =
    "devsandboxciam";

const tenantId =
    "0f0fd0ef-f80f-4b88-bc6a-bc62cdb0bfdb";

const config = {

    localApiPath:
        "/api",

    port:
        3001,

    proxy:
        `https://${tenantSubdomain}.ciamlogin.com/${tenantId}`

};

module.exports = config;