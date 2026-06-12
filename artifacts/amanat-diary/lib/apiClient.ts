const apiBaseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "").trim().replace(/\/+$/, "");
const DEFAULT_TIMEOUT_MS = 8_000;

export async function postApiJson<T>(path: string, body: unknown, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T | null> {
  if (!apiBaseUrl) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    return payload && typeof payload === "object" && !Array.isArray(payload) ? payload as T : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
