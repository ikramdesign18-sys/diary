import { AiServiceError, requestGroqJson } from "./groqClient";
import {
  validateThemeDetectRequest,
  validateVoicePolishRequest,
} from "./validateAiRequest";

const MOODS = ["Happy", "Sad", "Emotional", "Calm", "Grateful", "Romantic", "Motivated", "Angry", "Reflective", "Hopeful", "Dreamy", "Neutral"];
const POLISH_THEMES = ["classic-cream-diary", "morning-sunshine", "golden-gratitude", "soft-sad-letter", "calm-sage-journal", "love-letter", "work-planner", "school-notebook", "dream-mist", "travel-postcard", "future-letter", "healing-page", "angry-release", "deep-reflection"];

function strings(value: unknown, limit = 6) {
  return Array.isArray(value) ? value.filter(item => typeof item === "string").slice(0, limit) as string[] : null;
}

export async function detectTheme(input: unknown) {
  const value = validateThemeDetectRequest(input);
  const result = await requestGroqJson(
    `Classify a private diary entry. Return JSON only with mood, tone, themeId, tags, confidence. Mood must be one of ${MOODS.join(", ")}. themeId must be one of ${value.availableThemes.join(", ")}. tags must be short strings. confidence must be between 0 and 1. Never include diary text in the response.`,
    [value.title, value.body, value.transcript].filter(Boolean).join("\n").slice(0, 10_000),
  );
  const tags = strings(result.tags);
  if (!MOODS.includes(String(result.mood)) || typeof result.tone !== "string" || !value.availableThemes.includes(String(result.themeId)) || !tags || typeof result.confidence !== "number") {
    throw new AiServiceError("AI provider returned an invalid theme result", 502);
  }
  return { mood: result.mood, tone: result.tone, themeId: result.themeId, tags, confidence: result.confidence, source: "groq" };
}

export async function polishVoice(input: unknown) {
  const value = validateVoicePolishRequest(input);
  if (value.style === "keep_original") {
    return { polishedText: value.transcript, suggestedTitle: "", mood: "Neutral", tags: [], themeId: "classic-cream-diary", source: "fallback" };
  }
  const result = await requestGroqJson(
    `Polish a private voice diary transcript in style "${value.style}". Preserve meaning, facts, names, and emotion. Never invent details. Return JSON only with polishedText, suggestedTitle, mood, tags, themeId. Mood must be one of ${MOODS.join(", ")}. themeId must be one of ${POLISH_THEMES.join(", ")}.`,
    value.transcript,
  );
  const tags = strings(result.tags);
  if (typeof result.polishedText !== "string" || typeof result.suggestedTitle !== "string" || !MOODS.includes(String(result.mood)) || !tags || !POLISH_THEMES.includes(String(result.themeId))) {
    throw new AiServiceError("AI provider returned an invalid polish result", 502);
  }
  return { polishedText: result.polishedText, suggestedTitle: result.suggestedTitle, mood: result.mood, tags, themeId: result.themeId, source: "groq" };
}
