import { getThemeForMood } from "@/constants/diaryThemes";
import type { Diary, Entry, FutureMessage, Mood } from "@/types";

export const boolInt = (value?: boolean) => value ? 1 : 0;
export const intBool = (value?: number | null) => value === 1;
export const jsonArray = (value?: string | null) => {
  try { return value ? JSON.parse(value) : []; } catch { return []; }
};
export const jsonObject = (value?: string | null) => {
  try {
    const parsed = value ? JSON.parse(value) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
};

export function normalizeEntry(entry: Entry, pageNumber = entry.pageNumber): Entry {
  return {
    ...entry,
    pageNumber,
    tags: entry.tags ?? [],
    photos: entry.photos ?? [],
    stickers: entry.stickers ?? [],
    fontKey: entry.fontKey ?? "clean",
    backgroundKey: entry.backgroundKey ?? "theme",
    photoFrameKey: entry.photoFrameKey ?? "rounded-classic",
    textStyleKey: entry.textStyleKey ?? "classic",
    themeId: entry.themeId ?? getThemeForMood(entry.mood).id,
    userOverriddenTheme: entry.userOverriddenTheme ?? false,
  };
}

export function diaryFromRow(row: any): Diary {
  return {
    id: row.id, title: row.title, subtitle: row.subtitle ?? undefined,
    category: row.category, coverStyle: row.coverStyle, accentColor: row.accentColor,
    isLocked: intBool(row.isLocked), defaultMood: row.defaultMood as Mood,
    entryCount: row.entryCount ?? 0, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

export function entryFromRow(row: any): Entry {
  const customization = jsonObject(row.customizationJson);
  return normalizeEntry({
    id: row.id, diaryId: row.diaryId, pageNumber: row.pageNumber, title: row.title ?? "",
    body: row.bodyOriginal ?? "", bodyPolished: row.bodyPolished ?? undefined,
    mood: (row.mood ?? "Neutral") as Mood, themeId: row.themeId ?? undefined,
    aiDetectedTheme: row.aiDetectedTheme ?? undefined, userOverriddenTheme: intBool(row.userOverriddenTheme),
    tags: jsonArray(row.tagsJson), isFavorite: intBool(row.isFavorite), isLocked: intBool(row.isLocked),
    hasVoice: intBool(row.hasVoice), voiceUri: row.voiceUri ?? undefined,
    voiceDuration: row.voiceDuration ?? undefined, voiceTranscript: row.voiceTranscript ?? undefined,
    voiceLanguage: row.voiceLanguage ?? undefined,
    photos: jsonArray(row.photosJson), date: row.date ?? row.createdAt,
    fontKey: customization.fontKey, backgroundKey: customization.backgroundKey,
    stickers: Array.isArray(customization.stickers) ? customization.stickers : [],
    photoFrameKey: customization.photoFrameKey, textStyleKey: customization.textStyleKey,
    createdAt: row.createdAt, updatedAt: row.updatedAt,
  });
}

export function futureMessageFromRow(row: any): FutureMessage {
  return {
    id: row.id, entryId: row.entryId ?? undefined, title: row.title ?? "", body: row.body ?? "",
    diaryId: row.diaryId ?? undefined, voiceNoteId: row.voiceNoteId ?? undefined,
    recipientName: row.recipientName ?? "", recipientEmail: row.recipientEmail ?? undefined,
    deliveryDate: row.deliveryDate, deliveryType: row.deliveryType, status: row.status,
    notificationId: row.notificationId ?? undefined, unlockDate: row.unlockDate ?? undefined,
    emailDeliveryId: row.emailDeliveryId ?? undefined, emailDeliveryStatus: row.emailDeliveryStatus ?? undefined,
    emailDeliveryMode: row.emailDeliveryMode ?? undefined, consentConfirmed: intBool(row.consentConfirmed),
    createdAt: row.createdAt, updatedAt: row.updatedAt ?? undefined,
  };
}
