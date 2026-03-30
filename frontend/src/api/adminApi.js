import { apiUrl, fetchWithTimeout, getSocketOrigin } from "./apiUrl.js";

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(
      data.error ||
        (response.status === 404
          ? "API not found — check backend on :3001 and use http://localhost:3000 for the app"
          : `Request failed (${response.status})`)
    );
    err.code = data.code;
    throw err;
  }
  return data;
}

export async function adminFetch(path, token, options = {}) {
  const headers = {
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  try {
    const response = await fetchWithTimeout(apiUrl(path), { ...options, headers });
    return parseResponse(response);
  } catch (e) {
    if (e instanceof TypeError && e.message === "Failed to fetch") {
      throw new Error(
        "Cannot reach the server. Run the backend on port 3001 and open the site at http://localhost:3000"
      );
    }
    throw e;
  }
}

export function getApiBase() {
  return getSocketOrigin() ?? window.location.origin;
}
