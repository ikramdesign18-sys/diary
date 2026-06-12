import { DIARY_THEMES } from "@/constants/diaryThemes";
import { postApiJson } from "@/lib/apiClient";
import { detectThemeLocally } from "@/services/themeDetectionService";
import type { Mood } from "@/types";

export type VoiceLanguage = "auto" | "en" | "ur" | "hi" | "roman-ur";
export type PolishStyle = "light" | "diary" | "concise";
const apiBaseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "").trim().replace(/\/+$/, "");

export interface VoicePolishResult {
  polishedText: string;
  title: string;
  mood: Mood;
  tags: string[];
  themeId: string;
  source: "groq" | "fallback";
}

const fallbackTitle = (text: string) => {
  const words = text.trim().replace(/\s+/g, " ").split(" ").slice(0, 8).join(" ");
  return words ? `${words}${text.trim().split(/\s+/).length > 8 ? "…" : ""}` : `Voice Memory · ${new Date().toLocaleDateString()}`;
};

export async function transcribeVoice(uri: string, language: VoiceLanguage) {
  if (!apiBaseUrl || !uri) return { transcript: "", source: "unavailable" as const };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 65_000);
  try {
    const extension = uri.toLowerCase().split("?")[0].split(".").pop();
    const form = new FormData();
    if (typeof window !== "undefined" && uri.startsWith("blob:")) {
      const blob = await fetch(uri).then(response => response.blob());
      const webm = blob.type.includes("webm");
      form.append("audio", blob, webm ? "voice-memory.webm" : "voice-memory.m4a");
    } else {
      const webm = extension === "webm";
      form.append("audio", {
        uri,
        name: webm ? "voice-memory.webm" : "voice-memory.m4a",
        type: webm ? "audio/webm" : "audio/mp4",
      } as unknown as Blob);
    }
    form.append("language", language);
    const response = await fetch(`${apiBaseUrl}/api/ai/transcribe-audio`, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: form,
      signal: controller.signal,
    });
    if (!response.ok) return { transcript: "", source: "unavailable" as const };
    const result = await response.json() as { transcript?: unknown; language?: unknown; source?: unknown };
    return {
      transcript: typeof result.transcript === "string" ? result.transcript.trim() : "",
      language: typeof result.language === "string" ? result.language : undefined,
      source: result.source === "groq" ? "groq" as const : "unavailable" as const,
    };
  } catch {
    return { transcript: "", source: "unavailable" as const };
  } finally {
    clearTimeout(timeout);
  }
}

export async function polishVoiceTranscript(text: string, style: PolishStyle): Promise<VoicePolishResult> {
  const detection = detectThemeLocally(text);
  const fallback: VoicePolishResult = {
    polishedText: text.trim(),
    title: fallbackTitle(text),
    mood: detection.mood,
    tags: detection.tags,
    themeId: detection.themeId,
    source: "fallback",
  };
  if (!text.trim()) return fallback;
  try {
    const styleMap: Record<PolishStyle, string> = { light: "grammar_only", diary: "beautiful_diary", concise: "simple_clean" };
    const result = await postApiJson<{
      polishedText?: unknown;
      suggestedTitle?: unknown;
      mood?: unknown;
      tags?: unknown;
      themeId?: unknown;
      source?: unknown;
    }>("/api/ai/voice-polish", {
      transcript: text,
      style: styleMap[style],
    });
    const validTheme = DIARY_THEMES.some(theme => theme.id === result?.themeId);
    if (typeof result?.polishedText !== "string" || typeof result.suggestedTitle !== "string" || !validTheme) return fallback;
    return {
      polishedText: result.polishedText.trim(),
      title: result.suggestedTitle.trim().slice(0, 80),
      mood: typeof result.mood === "string" ? result.mood as Mood : fallback.mood,
      tags: Array.isArray(result.tags) ? result.tags.filter((tag: unknown) => typeof tag === "string").slice(0, 6) as string[] : fallback.tags,
      themeId: result.themeId as string,
      source: "groq",
    };
  } catch {
    return fallback;
  }
}
