import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { exportAllLocalData, importBackupData, type BackupData } from "@/db/backupRepository";
import { getDatabase } from "@/db/database";
import type { Diary, Entry, FutureMessage } from "@/types";

const ARRAY_KEYS = ["diaries", "entries", "voiceNotes", "media", "futureMessages", "collections"] as const;
const FORBIDDEN_KEYS = ["pin", "pinhash", "salt", "biometric", "token", "session", "apikey", "groq", "supabase"];

export interface BackupPreview {
  backup: BackupData;
  fileName: string;
  counts: Record<(typeof ARRAY_KEYS)[number], number>;
}

export function datedFileName(prefix: string, extension: string) {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

function webDownload(contents: string, fileName: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function fallbackBackup(diaries: Diary[], entries: Entry[], futureMessages: FutureMessage[]): BackupData {
  const safeDiaries = diaries.map(({ lockPin: _lockPin, ...diary }) => diary);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    appName: "Amanat Diary",
    diaries: safeDiaries,
    entries,
    voiceNotes: [],
    media: [],
    futureMessages,
    collections: [],
  };
}

export async function exportFullBackup(fallback: { diaries: Diary[]; entries: Entry[]; futureMessages: FutureMessage[] }) {
  const backup = getDatabase() ? await exportAllLocalData() : fallbackBackup(fallback.diaries, fallback.entries, fallback.futureMessages);
  const contents = JSON.stringify(backup, null, 2);
  const fileName = datedFileName("amanat-diary-backup", "json");
  if (Platform.OS === "web") {
    webDownload(contents, fileName, "application/json");
    return fileName;
  }
  const uri = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, contents, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "application/json", dialogTitle: "Share your private diary backup" });
  return fileName;
}

export function validateBackup(value: unknown, fileName = "backup.json"): BackupPreview {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("This file is not a valid Amanat Diary backup.");
  const backup = value as Record<string, unknown>;
  if (backup.version !== 1 || backup.appName !== "Amanat Diary") throw new Error("This backup version is not supported.");
  for (const key of ARRAY_KEYS) if (!Array.isArray(backup[key])) throw new Error(`The backup is missing its ${key} records.`);
  const containsForbiddenKey = (input: unknown): boolean => {
    if (Array.isArray(input)) return input.some(containsForbiddenKey);
    if (!input || typeof input !== "object") return false;
    return Object.entries(input).some(([key, nested]) =>
      FORBIDDEN_KEYS.some(forbidden => key.toLowerCase().includes(forbidden)) || containsForbiddenKey(nested),
    );
  };
  if (containsForbiddenKey(backup)) throw new Error("This file contains unsupported security or secret fields.");
  backup.diaries = (backup.diaries as any[]).map(({ lockPin: _lockPin, ...diary }) => ({
    ...diary, isLocked: Number(diary.isLocked === true || diary.isLocked === 1),
  }));
  backup.entries = (backup.entries as any[]).map(entry => entry.bodyOriginal !== undefined ? entry : ({
    ...entry,
    bodyOriginal: entry.body ?? "",
    tagsJson: JSON.stringify(entry.tags ?? []),
    photosJson: JSON.stringify(entry.photos ?? []),
    customizationJson: JSON.stringify({
      fontKey: entry.fontKey,
      backgroundKey: entry.backgroundKey,
      stickers: entry.stickers ?? [],
      photoFrameKey: entry.photoFrameKey,
      textStyleKey: entry.textStyleKey,
    }),
    isFavorite: Number(entry.isFavorite === true || entry.isFavorite === 1),
    isLocked: Number(entry.isLocked === true || entry.isLocked === 1),
    hasVoice: Number(entry.hasVoice === true || entry.hasVoice === 1),
    hasMedia: Number((entry.photos?.length ?? 0) > 0),
    userOverriddenTheme: Number(entry.userOverriddenTheme === true || entry.userOverriddenTheme === 1),
  }));
  return {
    backup: backup as unknown as BackupData,
    fileName,
    counts: Object.fromEntries(ARRAY_KEYS.map(key => [key, (backup[key] as unknown[]).length])) as BackupPreview["counts"],
  };
}

export async function pickBackupFile(): Promise<BackupPreview | null> {
  if (Platform.OS === "web") throw new Error("Backup import is currently available in the iOS and Android app.");
  const result = await DocumentPicker.getDocumentAsync({ type: "application/json", copyToCacheDirectory: true });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const raw = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
  try {
    return validateBackup(JSON.parse(raw), asset.name);
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error("This file is not readable JSON.");
    throw error;
  }
}

export async function restoreBackup(preview: BackupPreview) {
  if (!getDatabase()) throw new Error("Backup import requires the iOS or Android app.");
  return importBackupData(preview.backup);
}
