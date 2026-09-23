const API_BASE_URL = "https://localhost:7290";

/**
 * Builds the final API URL.
 *
 * If the caller supplies:
 *
 *     /api/me
 *
 * it becomes:
 *
 *     https://localhost:7290/api/me
 *
 * If the caller supplies an absolute URL, it is used unchanged.
 */
function buildApiUrl(url) {
  if (!url) {
    throw new Error("No API URL was supplied.");
  }

  // Already an absolute URL.
  if (
    url.startsWith("http://") ||
    url.startsWith("https://")
  ) {
    return url;
  }

  // Make sure there is exactly one slash.
  return `${API_BASE_URL}/${url.replace(/^\/+/, "")}`;
}


/**
 * Calls a protected API using an already-acquired
 * Entra access token.
 *
 * IMPORTANT:
 * This function does NOT acquire the access token.
 *
 * The access token is obtained by useNativeLogin.js
 * through nativeAuthService.js and passed into this function.
 *
 * credentials: "include" is important because the
 * application MFA session is maintained by the
 * mfa_session cookie.
 */
export async function callProtectedApi(
  accessToken,
  url,
  options = {}
) {
  console.log(
    "========== CALL PROTECTED API =========="
  );

  if (!accessToken) {
    throw new Error(
      "No Entra access token was supplied."
    );
  }

  if (typeof accessToken !== "string") {
    throw new Error(
      "The Entra access token must be a string."
    );
  }

  const apiUrl = buildApiUrl(url);

  console.log(
    "API URL:",
    apiUrl
  );

  console.log(
    "Access token type:",
    typeof accessToken
  );

  console.log(
    "Access token length:",
    accessToken.length
  );

  const {
    headers = {},
    credentials = "include",
    ...requestOptions
  } = options;

  const response = await fetch(
    apiUrl,
    {
      ...requestOptions,

      headers: {
        Accept: "application/json",
        ...headers,
        Authorization: `Bearer ${accessToken}`,
      },

      credentials,
    }
  );

  console.log(
    "API response:",
    response.status,
    response.statusText
  );

  let responseBody = null;

  const contentType =
    response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    responseBody = await response.json();
  } else {
    responseBody = await response.text();
  }

  if (!response.ok) {
    const message =
      typeof responseBody === "object"
        ? responseBody?.message ||
          responseBody?.title ||
          responseBody?.detail ||
          `API request failed with status ${response.status}.`
        : responseBody ||
          `API request failed with status ${response.status}.`;

    const error = new Error(message);

    error.status = response.status;
    error.statusText = response.statusText;
    error.response = responseBody;

    console.error(
      "Protected API request failed:",
      error
    );

    throw error;
  }

  console.log(
    "Protected API request completed successfully."
  );

  return responseBody;
}


/**
 * GET helper for protected endpoints.
 */
export async function getProtectedApi(
  accessToken,
  url,
  options = {}
) {
  return callProtectedApi(
    accessToken,
    url,
    {
      ...options,
      method: "GET",
    }
  );
}


/**
 * POST helper for protected endpoints.
 */
export async function postProtectedApi(
  accessToken,
  url,
  body = null,
  options = {}
) {
  return callProtectedApi(
    accessToken,
    url,
    {
      ...options,

      method: "POST",

      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },

      body:
        body !== null
          ? JSON.stringify(body)
          : undefined,
    }
  );
}