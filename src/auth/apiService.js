import { getNativeAccessToken } from "./nativeAuthService";

/**
 * Calls a protected API using the current Entra access token.
 *
 * The caller supplies the original CustomAuthAccountData object.
 *
 * credentials: "include" is important because the application MFA
 * session is maintained by the mfa_session cookie.
 */
export async function callProtectedApi(
  authenticationResult,
  url,
  options = {}
) {
  if (!authenticationResult) {
    throw new Error("No authenticated Entra account is available.");
  }

  const accessToken = await getNativeAccessToken(authenticationResult);

  if (!accessToken) {
    throw new Error("Unable to acquire an Entra access token.");
  }

  const {
    headers = {},
    credentials = "include",
    ...requestOptions
  } = options;

  const response = await fetch(url, {
    ...requestOptions,
    headers: {
      ...headers,
      Authorization: `Bearer ${accessToken}`,
    },
    credentials,
  });

  let responseBody = null;

  const contentType = response.headers.get("content-type") || "";

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
    error.response = responseBody;

    throw error;
  }

  return responseBody;
}

/**
 * GET helper for protected endpoints.
 */
export async function getProtectedApi(
  authenticationResult,
  url,
  options = {}
) {
  return callProtectedApi(authenticationResult, url, {
    ...options,
    method: "GET",
  });
}

/**
 * POST helper for protected endpoints.
 */
export async function postProtectedApi(
  authenticationResult,
  url,
  body = null,
  options = {}
) {
  return callProtectedApi(authenticationResult, url, {
    ...options,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: body !== null ? JSON.stringify(body) : undefined,
  });
}