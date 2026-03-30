const DEFAULT_FETCH_TIMEOUT_MS = 25_000;

/**
 * Abort hanging requests (e.g. DB stuck) so the UI does not spin forever.
 */
export async function fetchWithTimeout(url, init = {}, timeoutMs = DEFAULT_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    if (e.name === "AbortError") {
      throw new Error(
        `Request timed out (${timeoutMs / 1000}s). Check: backend terminal (npm run dev), PostgreSQL running, DATABASE_URL in .env`
      );
    }
    throw e;
  } finally {
    clearTimeout(id);
  }
}

/**
 * In dev, leave VITE_API_URL unset so requests use same origin + Vite proxy → backend :3001.
 * In production, set VITE_API_URL to your API origin (e.g. https://api.example.com).
 */
export function apiUrl(path) {
  const env = import.meta.env.VITE_API_URL;
  if (typeof env === "string" && env.trim() !== "") {
    const base = env.trim().replace(/\/$/, "");
    const p = path.startsWith("/") ? path : `/${path}`;
    return `${base}${p}`;
  }
  return path.startsWith("/") ? path : `/${path}`;
}

/** For Socket.io: undefined = same origin (dev proxy). */
export function getSocketOrigin() {
  const env = import.meta.env.VITE_API_URL;
  if (typeof env === "string" && env.trim() !== "") {
    return env.trim().replace(/\/$/, "");
  }
  return undefined;
}
