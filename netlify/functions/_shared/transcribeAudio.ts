import { AiServiceError } from "./groqClient";

const GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const GROQ_TRANSCRIPTION_MODEL = "whisper-large-v3-turbo";
const MAX_AUDIO_BYTES = 24 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = new Set(["flac", "mp3", "mp4", "mpeg", "mpga", "m4a", "ogg", "wav", "webm"]);
const LANGUAGES = new Set(["auto", "en", "ur", "hi", "roman-ur"]);

declare const process: {
  env: Record<string, string | undefined>;
};

function audioExtension(file: File) {
  const nameExtension = file.name.toLowerCase().split(".").pop();
  if (nameExtension && SUPPORTED_EXTENSIONS.has(nameExtension)) return nameExtension;
  const mimeExtension = file.type.toLowerCase().split("/").pop()?.replace("x-", "");
  if (mimeExtension && SUPPORTED_EXTENSIONS.has(mimeExtension)) return mimeExtension;
  throw new AiServiceError("Audio format is not supported", 400);
}

export async function transcribeAudio(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.includes("replace_with")) throw new AiServiceError("AI service is not configured", 503);
  if (!request.headers.get("content-type")?.toLowerCase().includes("multipart/form-data")) {
    throw new AiServiceError("Audio upload must use multipart/form-data", 400);
  }

  const input = await request.formData();
  const audio = input.get("audio");
  const selectedLanguage = input.get("language");
  if (!(audio instanceof File) || !audio.size) throw new AiServiceError("Audio file is required", 400);
  if (audio.size > MAX_AUDIO_BYTES) throw new AiServiceError("Audio file is too large", 413);
  audioExtension(audio);
  const language = typeof selectedLanguage === "string" && LANGUAGES.has(selectedLanguage) ? selectedLanguage : "auto";

  const form = new FormData();
  form.append("file", audio, audio.name);
  form.append("model", GROQ_TRANSCRIPTION_MODEL);
  form.append("response_format", "verbose_json");
  form.append("temperature", "0");
  if (language !== "auto") form.append("language", language === "roman-ur" ? "ur" : language);
  if (language === "roman-ur") form.append("prompt", "Roman Urdu written using the Latin alphabet.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
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
