import { DIARY_THEMES, DEFAULT_THEME_ID } from "@/constants/diaryThemes";
import { postApiJson } from "@/lib/apiClient";
import type { Mood, ThemeDetectionResult } from "@/types";

const rules: Array<[RegExp, string, Mood, string[]]> = [
  [/\b(thank|thankful|grateful|blessing)\b/i, "golden-gratitude", "Grateful", ["gratitude", "peace"]],
  [/\b(happy|amazing|best|proud|excited|smile|joy)\b/i, "morning-sunshine", "Happy", ["joy", "memory"]],
  [/\b(sad|cry|miss|lonely|hurt|pain)\b/i, "soft-sad-letter", "Sad", ["emotional", "reflection"]],
  [/\b(work|task|meeting|design|project|client)\b/i, "work-planner", "Motivated", ["work", "focus"]],
  [/\b(school|class|homework|exam|study|university)\b/i, "school-notebook", "Reflective", ["school", "study"]],
  [/\b(love|wife|husband|relationship|wedding)\b/i, "love-letter", "Romantic", ["love", "relationship"]],
  [/\b(dream|sleep|imagination)\b/i, "dream-mist", "Dreamy", ["dream", "imagination"]],
  [/\b(angry|hate|stress|furious)\b/i, "angry-release", "Angry", ["stress", "release"]],
  [/\b(travel|trip|place|journey|flight)\b/i, "travel-postcard", "Hopeful", ["travel", "journey"]],
  [/\b(future|later|message|child|years)\b/i, "future-letter", "Hopeful", ["future", "memory"]],
  [/\b(heal|healing|recover|gentle)\b/i, "healing-page", "Calm", ["healing", "peace"]],
];

export function detectThemeLocally(text: string): ThemeDetectionResult {
  const match = rules.find(([pattern]) => pattern.test(text));
  if (!match) return { mood: "Neutral", tone: "quiet and reflective", themeId: DEFAULT_THEME_ID, tags: [], confidence: 0.55, source: "fallback" };
  return { mood: match[2], tone: match[3].join(" and "), themeId: match[1], tags: match[3], confidence: 0.78, source: "fallback" };
}

function validResult(value: any): value is Omit<ThemeDetectionResult, "source"> {
  const moods: Mood[] = ["Happy", "Sad", "Emotional", "Calm", "Grateful", "Romantic", "Motivated", "Angry", "Reflective", "Hopeful", "Dreamy", "Neutral"];
  return value && DIARY_THEMES.some(theme => theme.id === value.themeId) &&
    moods.includes(value.mood) && typeof value.tone === "string" &&
    Array.isArray(value.tags) && typeof value.confidence === "number";
}

export async function detectThemeForEntry(input: { title?: string; body?: string; transcript?: string }): Promise<ThemeDetectionResult> {
  const text = [input.title, input.body, input.transcript].filter(Boolean).join("\n");
  const fallback = detectThemeLocally(text);
  try {
    const result = await postApiJson<Omit<ThemeDetectionResult, "source"> & { source?: string }>("/api/ai/theme-detect", {
      title: input.title,
      body: input.body,
      transcript: input.transcript,
      availableThemes: DIARY_THEMES.map(theme => theme.id),
    });
    if (!validResult(result) || result.confidence < 0.6) return fallback;
    return { mood: result.mood, tone: result.tone, themeId: result.themeId, tags: result.tags, confidence: result.confidence, source: "groq" };
  } catch {
    return fallback;
  }
}
