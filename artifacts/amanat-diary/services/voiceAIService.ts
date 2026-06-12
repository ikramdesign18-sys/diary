import { DIARY_THEMES } from "@/constants/diaryThemes";
import { postApiJson } from "@/lib/apiClient";
import { detectThemeLocally } from "@/services/themeDetectionService";
import type { Mood } from "@/types";

export type VoiceLanguage = "auto" | "en" | "ur" | "hi" | "roman-ur";
export type PolishStyle = "light" | "diary" | "concise";

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
  try {
    const result = await postApiJson<{ transcript?: unknown; source?: unknown }>("/api/ai/transcribe-audio", {
      language,
      hasLocalAudio: !!uri,
    }, 12_000);
    return { transcript: typeof result?.transcript === "string" ? result.transcript.trim() : "", source: result?.source === "groq" ? "groq" as const : "unavailable" as const };
  } catch {
    return { transcript: "", source: "unavailable" as const };
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
