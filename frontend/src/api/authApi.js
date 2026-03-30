import { apiUrl, fetchWithTimeout } from "./apiUrl.js";

async function parseJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const hint =
      data.error ||
      (response.status === 404
        ? "API not found. Is the backend running on port 3001? Open http://localhost:3001/health"
        : `Server returned ${response.status}. Is the backend running?`);
    const error = new Error(hint);
    error.code = data.code;
    throw error;
  }
  return data;
}

async function apiFetch(path, options = {}) {
  try {
    const response = await fetchWithTimeout(apiUrl(path), options);
    return parseJson(response);
  } catch (e) {
    if (e instanceof TypeError && e.message === "Failed to fetch") {
      throw new Error(
        "Cannot reach the server. Start the backend (cd backend → npm run dev) and use the app at http://localhost:3000"
      );
    }
    throw e;
  }
}

export async function login(team_name, password) {
  return apiFetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ team_name, password }),
  });
}

export async function getMe(token) {
  return apiFetch("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function logout() {
  return apiFetch("/api/auth/logout", {
    method: "POST",
  });
}
