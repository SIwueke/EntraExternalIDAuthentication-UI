const http = require("http");
const https = require("https");

const proxyConfig = require("./proxy.config");

// ------------------------------------------------------------
// Allowed development origins
// ------------------------------------------------------------

const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3002"
];

// ------------------------------------------------------------
// Set our own CORS headers
// ------------------------------------------------------------

function setCorsHeaders(req, headers = {}) {
    const origin = req.headers.origin;

    if (origin && allowedOrigins.includes(origin)) {
        headers["Access-Control-Allow-Origin"] = origin;
    }

    headers["Access-Control-Allow-Methods"] =
        "GET, POST, PUT, DELETE, OPTIONS";

    headers["Access-Control-Allow-Headers"] =
        req.headers["access-control-request-headers"] ||
        "Content-Type, Authorization";

    headers["Access-Control-Allow-Credentials"] =
        "true";

    return headers;
}

// ------------------------------------------------------------
// Remove CORS headers supplied by Entra
// ------------------------------------------------------------

function removeUpstreamCorsHeaders(headers) {
    const cleanedHeaders = {
        ...headers
    };

    delete cleanedHeaders["access-control-allow-origin"];
    delete cleanedHeaders["access-control-allow-methods"];
    delete cleanedHeaders["access-control-allow-headers"];
    delete cleanedHeaders["access-control-allow-credentials"];
    delete cleanedHeaders["access-control-expose-headers"];

    return cleanedHeaders;
}

// ------------------------------------------------------------
// HTTP server
// ------------------------------------------------------------

const server = http.createServer(
    (req, res) => {

        console.log(
            "PROXY REQUEST:",
            req.method,
            req.url
        );

        // ------------------------------------------------
        // CORS preflight
        // ------------------------------------------------

        if (req.method === "OPTIONS") {

            console.log(
                "CORS PREFLIGHT",
                req.headers
            );

            console.log(
                "CORS ORIGIN:",
                req.headers.origin
            );

            const headers = setCorsHeaders(req);

            res.writeHead(
                204,
                headers
            );

            res.end();

            return;
        }

        // ------------------------------------------------
        // Check local API path
        // ------------------------------------------------

        if (
            !req.url.startsWith(
                proxyConfig.localApiPath
            )
        ) {

            res.writeHead(
                404,
                setCorsHeaders(
                    req,
                    {
                        "Content-Type":
                            "text/plain"
                    }
                )
            );

            res.end("Not Found");

            return;
        }

        // ------------------------------------------------
        // Remove /api from incoming request
        // ------------------------------------------------

        const targetPath =
            req.url.substring(
                proxyConfig.localApiPath.length
            );

        // ------------------------------------------------
        // Target Entra URL
        // ------------------------------------------------

        const target =
            new URL(
                proxyConfig.proxy
            );

        // ------------------------------------------------
        // Preserve tenant path
        // ------------------------------------------------

        const finalPath =
            target.pathname.replace(/\/$/, "") +
            targetPath;

        console.log(
            `${req.method} ${req.url} -> https://${target.hostname}${finalPath}`
        );

        // ------------------------------------------------
        // HTTPS request to Entra
        // ------------------------------------------------

        const forwardedHeaders = {
            ...req.headers,
            host: target.hostname
        };

        // The refresh-token redemption must not be sent to Entra
        // with the browser Origin header.
        if (finalPath.includes("/oauth2/v2.0/token")) {
            delete forwardedHeaders.origin;
            delete forwardedHeaders.referer;

            console.log("========== TOKEN REQUEST ==========");
            console.log("Removing browser Origin header before forwarding to Entra.");
            console.log("Original Origin:", req.headers.origin);
            console.log("Forwarded Origin:", forwardedHeaders.origin);
            console.log("==================================");
        }

        const options = {
            hostname: target.hostname,
            port: 443,
            path: finalPath,
            method: req.method,
            rejectUnauthorized: false,
            headers: forwardedHeaders
        };
        const proxyReq = https.request(options, proxyRes => {
            console.log("========================================");
            console.log("ENTRA RESPONSE:", proxyRes.statusCode);
            console.log("ENTRA HEADERS:", proxyRes.headers);

            const cleanedHeaders = removeUpstreamCorsHeaders(proxyRes.headers);

            console.log(
                "UPSTREAM ACCESS-CONTROL-ALLOW-ORIGIN:",
                proxyRes.headers["access-control-allow-origin"]
            );

            console.log(
                "CLEANED ACCESS-CONTROL-ALLOW-ORIGIN:",
                cleanedHeaders["access-control-allow-origin"]
            );

            const headers = setCorsHeaders(req, cleanedHeaders);

            console.log(
                "FINAL ACCESS-CONTROL-ALLOW-ORIGIN:",
                headers["Access-Control-Allow-Origin"]
            );

            console.log("FINAL PROXY RESPONSE HEADERS:", headers);
            console.log("========================================");

           let responseBody = "";

            proxyRes.on("data", chunk => {
                responseBody += chunk.toString();
            });

            proxyRes.on("end", () => {
                console.log("========== ENTRA RESPONSE BODY ==========");
                console.log(responseBody);
                console.log("=========================================");

                res.writeHead(proxyRes.statusCode, headers);
                res.end(responseBody);
            });
        });
        // ------------------------------------------------
        // Proxy error
        // ------------------------------------------------

        proxyReq.on(
            "error",
            error => {

                console.error(
                    "Native authentication proxy error:",
                    error
                );

                res.writeHead(
                    500,
                    setCorsHeaders(
                        req,
                        {
                            "Content-Type":
                                "application/json"
                        }
                    )
                );

                res.end(
                    JSON.stringify({
                        message:
                            error.message,

                        code:
                            error.code,

                        errno:
                            error.errno,

                        syscall:
                            error.syscall,

                        hostname:
                            error.hostname
                    })
                );
            }
        );

        // ------------------------------------------------
        // Forward request body
        // ------------------------------------------------

        req.pipe(proxyReq);
    }
);

// ------------------------------------------------------------
// Start server
// ------------------------------------------------------------

server.listen(
    proxyConfig.port,
    () => {

        console.log(
            `Native authentication CORS proxy running on http://localhost:${proxyConfig.port}`
        );

        console.log(
            `Proxy target: ${proxyConfig.proxy}`
        );

        console.log(
            "Allowed origins:",
            allowedOrigins
        );
    }
);