const http = require("http");
const https = require("https");

const proxyConfig =
    require("./proxy.config");

// ------------------------------------------------------------
// Allowed development origins
// ------------------------------------------------------------

const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3002"
];

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

const server =
    http.createServer(
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

                const headers =
                    setCorsHeaders(req);

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

            const options = {

                hostname:
                    target.hostname,

                port:
                    443,

                path:
                    finalPath,

                method:
                    req.method,

                rejectUnauthorized:
                    false,

                headers: {

                    ...req.headers,

                    host:
                        target.hostname
                }
            };

            const proxyReq =
                https.request(
                    options,
                    proxyRes => {

                        console.log(
                            "ENTRA RESPONSE:",
                            proxyRes.statusCode
                        );

                        console.log(
                            "ENTRA HEADERS:",
                            proxyRes.headers
                        );

                        const headers =
                            setCorsHeaders(
                                req,
                                {
                                    ...proxyRes.headers
                                }
                            );

                        res.writeHead(
                            proxyRes.statusCode,
                            headers
                        );

                        proxyRes.pipe(res);
                    }
                );

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