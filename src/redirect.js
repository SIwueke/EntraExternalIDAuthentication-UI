import {
    broadcastResponseToMainFrame
} from "@azure/msal-browser/redirect-bridge";

broadcastResponseToMainFrame().catch((error) => {
    console.error(
        "Error broadcasting authentication response:",
        error
    );
});