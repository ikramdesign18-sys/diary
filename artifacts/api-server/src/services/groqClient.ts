const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_CHAT_MODEL = "llama-3.1-8b-instant";
const GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const GROQ_TRANSCRIPTION_MODEL = "whisper-large-v3-turbo";
const REQUEST_TIMEOUT_MS = 15_000;
const TRANSCRIPTION_TIMEOUT_MS = 60_000;

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

export async function requestGroqTranscription(file: Express.Multer.File, selectedLanguage: string) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.includes("replace_with")) throw new AiServiceError("AI service is not configured", 503);

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), file.originalname);
  form.append("model", GROQ_TRANSCRIPTION_MODEL);
  form.append("response_format", "verbose_json");
  form.append("temperature", "0");
  if (selectedLanguage !== "auto") form.append("language", selectedLanguage === "roman-ur" ? "ur" : selectedLanguage);
  if (selectedLanguage === "roman-ur") form.append("prompt", "Roman Urdu written using the Latin alphabet.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TRANSCRIPTION_TIMEOUT_MS);
  try {
    const response = await fetch(GROQ_TRANSCRIPTION_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: controller.signal,
    });
    if (!response.ok) throw new AiServiceError("Audio transcription request failed", 502);
    const payload = await response.json() as { text?: unknown; language?: unknown };
    if (typeof payload.text !== "string" || !payload.text.trim()) throw new AiServiceError("Audio transcription returned no text", 502);
    return {
      transcript: payload.text.trim(),
      language: typeof payload.language === "string" ? payload.language : undefined,
      source: "groq" as const,
    };
  } catch (error) {
    if (error instanceof AiServiceError) throw error;
    throw new AiServiceError(error instanceof Error && error.name === "AbortError" ? "Audio transcription timed out" : "Audio transcription is unavailable", 502);
  } finally {
    clearTimeout(timeout);
  }
}
