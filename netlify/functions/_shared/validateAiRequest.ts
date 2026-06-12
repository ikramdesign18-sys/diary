export const VOICE_POLISH_STYLES = [
  "keep_original",
  "beautiful_diary",
  "emotional",
  "simple_clean",
  "grammar_only",
] as const;

export type VoicePolishStyle = (typeof VOICE_POLISH_STYLES)[number];

export class ValidationError extends Error {
  readonly status = 400;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError("Request body must be a JSON object");
  }
  return value as Record<string, unknown>;
}

function optionalText(value: unknown, field: string, maxLength: number) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new ValidationError(`${field} must be a string`);
  const text = value.trim();
  if (text.length > maxLength) throw new ValidationError(`${field} is too long`);
  return text;
}

function requiredText(value: unknown, field: string, maxLength: number) {
  const text = optionalText(value, field, maxLength);
  if (!text) throw new ValidationError(`${field} is required`);
  return text;
}

export function validateThemeDetectRequest(input: unknown) {
  const value = record(input);
  const title = optionalText(value.title, "title", 200);
  const body = optionalText(value.body, "body", 10_000);
  const transcript = optionalText(value.transcript, "transcript", 10_000);
  if (!title && !body && !transcript) throw new ValidationError("At least one text field is required");
  if (!Array.isArray(value.availableThemes) || !value.availableThemes.length || value.availableThemes.length > 60) {
    throw new ValidationError("availableThemes must contain between 1 and 60 theme IDs");
  }
  const availableThemes = value.availableThemes.map((theme, index) => {
    if (typeof theme !== "string" || !/^[a-z0-9-]{1,80}$/.test(theme)) {
      throw new ValidationError(`availableThemes[${index}] is invalid`);
    }
    return theme;
  });
  return { title, body, transcript, availableThemes };
}

export function validateVoicePolishRequest(input: unknown) {
  const value = record(input);
  const transcript = requiredText(value.transcript, "transcript", 12_000);
  if (typeof value.style !== "string" || !VOICE_POLISH_STYLES.includes(value.style as VoicePolishStyle)) {
    throw new ValidationError(`style must be one of: ${VOICE_POLISH_STYLES.join(", ")}`);
  }
  return { transcript, style: value.style as VoicePolishStyle };
}
