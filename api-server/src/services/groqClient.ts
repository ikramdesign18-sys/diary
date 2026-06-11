const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_CHAT_MODEL = "llama-3.1-8b-instant";
const REQUEST_TIMEOUT_MS = 15_000;

export class AiServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fallbackAllowed = true,
  ) {
    super(message);
  }
}

export async function requestGroqJson(system: string, user: string) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.includes("replace_with")) {
    throw new AiServiceError("AI service is not configured", 503);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(GROQ_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_CHAT_MODEL,
        temperature: 0.15,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new AiServiceError("AI provider request failed", 502);
    const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new AiServiceError("AI provider returned an invalid response", 502);
    try {
      const parsed: unknown = JSON.parse(content);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid JSON object");
      return parsed as Record<string, unknown>;
    } catch {
      throw new AiServiceError("AI provider returned invalid JSON", 502);
    }
  } catch (error) {
    if (error instanceof AiServiceError) throw error;
    throw new AiServiceError(error instanceof Error && error.name === "AbortError" ? "AI provider request timed out" : "AI provider is unavailable", 502);
  } finally {
    clearTimeout(timeout);
  }
}
