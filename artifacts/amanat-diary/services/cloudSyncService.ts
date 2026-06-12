import AsyncStorage from "@react-native-async-storage/async-storage";

import { exportAllLocalData, importBackupData, type BackupData } from "@/db/backupRepository";
import { getDatabase, setMeta } from "@/db/database";
import { supabase, supabaseConfigured } from "@/lib/supabase";

const ENABLED_USER_KEY = "@amanat/cloud_sync_enabled_user";
const LAST_SYNC_KEY = "@amanat/cloud_sync_last_at";
const LAST_ERROR_KEY = "@amanat/cloud_sync_last_error";
const TABLES = ["diaries", "entries", "voice_notes", "media", "future_messages", "collections"] as const;
type CloudTable = (typeof TABLES)[number];

export interface SyncSummary {
  pushed: number;
  pulled: number;
  skipped: number;
  failed: number;
  completedAt: string;
}

export type CloudSyncStatus =
  | { state: "local"; enabled: false; available: false; lastSyncTime: string | null; message: string }
  | { state: "unverified"; enabled: boolean; available: false; lastSyncTime: string | null; message: string }
  | { state: "ready"; enabled: boolean; available: true; lastSyncTime: string | null; message: string };

const booleanValue = (value: unknown) => value === true || value === 1;
const jsonArray = (value: unknown) => {
  if (Array.isArray(value)) return value;
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};
const newer = (a?: string | null, b?: string | null) => (a ?? "") > (b ?? "");
const userStorageKey = (key: string, userId: string) => `${key}:${userId}`;
const safeErrorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "Cloud sync failed.";
  return message
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/\b(?:Bearer\s+)?eyJ[\w.-]+/g, "[token]")
    .replace(/\bgsk_[A-Za-z0-9_-]+/g, "[key]")
    .replace(/(?:file|content):\/\/\S+/gi, "[local path]")
    .slice(0, 300);
};

async function currentUser() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  return error ? null : data.user;
}

async function verifiedUser() {
  const user = await currentUser();
  return user?.email_confirmed_at ? user : null;
}

export async function isCloudSyncAvailable() {
  return !!getDatabase() && supabaseConfigured && !!(await verifiedUser());
}

export async function isCloudSyncEnabled() {
  const user = await verifiedUser();
  return !!user && (await AsyncStorage.getItem(ENABLED_USER_KEY)) === user.id;
}

export async function setCloudSyncEnabled(enabled: boolean) {
  if (!enabled) {
    await AsyncStorage.removeItem(ENABLED_USER_KEY);
    return;
  }
  const user = await verifiedUser();
  if (!user) throw new Error("Sign in with a verified email before enabling cloud backup.");
  await AsyncStorage.setItem(ENABLED_USER_KEY, user.id);
}

export async function getLastSyncTime() {
  const user = await currentUser();
  return user ? AsyncStorage.getItem(userStorageKey(LAST_SYNC_KEY, user.id)) : null;
}

export async function setLastSyncError(error: unknown) {
  const user = await currentUser();
  if (!user) return;
  await AsyncStorage.setItem(userStorageKey(LAST_ERROR_KEY, user.id), safeErrorMessage(error));
}

export async function clearLastSyncError() {
  const user = await currentUser();
  if (user) await AsyncStorage.removeItem(userStorageKey(LAST_ERROR_KEY, user.id));
}

export async function getCloudSyncDiagnostic() {
  if (!__DEV__) return null;
  const user = await currentUser();
  const backup = getDatabase() ? await exportAllLocalData() : null;
  const localRecordCounts = {
    diaries: backup?.diaries.length ?? 0,
    entries: backup?.entries.length ?? 0,
    voiceNotes: backup?.voiceNotes.length ?? 0,
    media: backup?.media.length ?? 0,
    futureMessages: backup?.futureMessages.length ?? 0,
    collections: backup?.collections.length ?? 0,
  };
  return {
    userId: user?.id ?? null,
    emailVerified: !!user?.email_confirmed_at,
    cloudSyncEnabled: await isCloudSyncEnabled(),
    lastSyncTime: user ? await AsyncStorage.getItem(userStorageKey(LAST_SYNC_KEY, user.id)) : null,
    localRecordsReady: Object.values(localRecordCounts).reduce((total, count) => total + count, 0),
    localRecordCounts,
    lastSyncError: user ? await AsyncStorage.getItem(userStorageKey(LAST_ERROR_KEY, user.id)) : null,
  };
}

export async function getSyncStatus(): Promise<CloudSyncStatus> {
  const [enabled, lastSyncTime] = await Promise.all([isCloudSyncEnabled(), getLastSyncTime()]);
  if (!supabaseConfigured || !supabase || !getDatabase()) {
    return { state: "local", enabled: false, available: false, lastSyncTime, message: supabaseConfigured ? "Local Mode" : "Cloud backup is not configured. Local Mode" };
  }
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email_confirmed_at) {
    if (data.user) return { state: "unverified", enabled, available: false, lastSyncTime, message: "Verify your email before syncing." };
    return { state: "local", enabled: false, available: false, lastSyncTime, message: "Local Mode" };
  }
  return { state: "ready", enabled, available: true, lastSyncTime, message: enabled ? "Cloud Sync Ready" : "Cloud backup is available but disabled." };
}

function toCloud(table: CloudTable, row: any, userId: string) {
  const base = { id: row.id, user_id: userId, created_at: row.createdAt, updated_at: row.updatedAt, deleted_at: row.deletedAt ?? null };
  if (table === "diaries") return { ...base, title: row.title, subtitle: row.subtitle, category: row.category, cover_style: row.coverStyle, accent_color: row.accentColor, is_locked: booleanValue(row.isLocked), default_mood: row.defaultMood, entry_count: row.entryCount, sync_status: "synced" };
  if (table === "entries") return { ...base, diary_id: row.diaryId, page_number: row.pageNumber, title: row.title, body_original: row.bodyOriginal, body_polished: row.bodyPolished, mood: row.mood, theme_id: row.themeId, ai_detected_theme: row.aiDetectedTheme, user_overridden_theme: booleanValue(row.userOverriddenTheme), tags: jsonArray(row.tagsJson), date: row.date, day: row.day, time: row.time, is_favorite: booleanValue(row.isFavorite), is_locked: booleanValue(row.isLocked), has_voice: booleanValue(row.hasVoice), has_media: booleanValue(row.hasMedia) };
  if (table === "voice_notes") return { ...base, entry_id: row.entryId, local_path: null, remote_path: row.remotePath ?? null, duration: row.duration, transcript: row.transcript, language: row.language };
  if (table === "media") return { ...base, entry_id: row.entryId, type: row.type, local_path: null, remote_path: row.remotePath ?? null, thumbnail_path: null, width: row.width, height: row.height };
  if (table === "future_messages") return { ...base, entry_id: row.entryId, diary_id: row.diaryId, title: row.title, body: row.body, voice_note_id: row.voiceNoteId, recipient_name: row.recipientName, recipient_email: row.recipientEmail, delivery_date: row.deliveryDate, delivery_type: row.deliveryType, status: row.status, unlock_date: row.unlockDate };
  return { ...base, title: row.title, description: row.description, entry_ids: jsonArray(row.entryIdsJson) };
}

function toLocal(table: CloudTable, row: any, existing?: any) {
  const base = { id: row.id, createdAt: row.created_at, updatedAt: row.updated_at, deletedAt: row.deleted_at ?? null };
  if (table === "diaries") return { ...base, title: row.title, subtitle: row.subtitle, category: row.category, coverStyle: row.cover_style, accentColor: row.accent_color, isLocked: Number(!!row.is_locked), defaultMood: row.default_mood, entryCount: row.entry_count, syncStatus: "synced", lastSyncedAt: new Date().toISOString() };
  if (table === "entries") return { ...base, diaryId: row.diary_id, pageNumber: row.page_number, title: row.title, bodyOriginal: row.body_original, bodyPolished: row.body_polished, mood: row.mood, themeId: row.theme_id, aiDetectedTheme: row.ai_detected_theme, userOverriddenTheme: Number(!!row.user_overridden_theme), tagsJson: JSON.stringify(row.tags ?? []), date: row.date, day: row.day, time: row.time, isFavorite: Number(!!row.is_favorite), isLocked: Number(!!row.is_locked), hasVoice: Number(!!row.has_voice), hasMedia: Number(!!row.has_media), syncStatus: "synced", lastSyncedAt: new Date().toISOString() };
  if (table === "voice_notes") return { ...base, entryId: row.entry_id, localPath: existing?.localPath ?? null, duration: row.duration, transcript: row.transcript, language: row.language };
  if (table === "media") return { ...base, entryId: row.entry_id, type: row.type, localPath: existing?.localPath ?? null, thumbnailPath: existing?.thumbnailPath ?? null, width: row.width, height: row.height };
  if (table === "future_messages") return { ...base, entryId: row.entry_id, diaryId: row.diary_id, title: row.title, body: row.body, voiceNoteId: row.voice_note_id, recipientName: row.recipient_name, recipientEmail: row.recipient_email, deliveryDate: row.delivery_date, deliveryType: row.delivery_type, status: row.status, notificationId: existing?.notificationId ?? null, unlockDate: row.unlock_date };
  return { ...base, title: row.title, description: row.description, entryIdsJson: JSON.stringify(row.entry_ids ?? []) };
}

function rowsForTable(backup: BackupData, table: CloudTable) {
  if (table === "voice_notes") return backup.voiceNotes;
  if (table === "future_messages") return backup.futureMessages;
  return backup[table] as any[];
}

export function resolveConflict(local: any, remote: any) {
  return newer(remote?.updated_at, local?.updatedAt) ? "remote" : "local";
}

export async function markSynced(ids: { diaries: string[]; entries: string[] }, completedAt = new Date().toISOString()) {
  const db = getDatabase();
  const user = await verifiedUser();
  if (!db || !user) return;
  for (const [table, rowIds] of Object.entries(ids)) {
    for (const id of rowIds) await db.runAsync(`UPDATE ${table} SET syncStatus='synced',lastSyncedAt=? WHERE id=?`, completedAt, id);
  }
  await setMeta("cloud_sync_last_at", completedAt);
  await AsyncStorage.setItem(userStorageKey(LAST_SYNC_KEY, user.id), completedAt);
}

async function requireEnabledVerifiedUser() {
  if (!(await isCloudSyncEnabled())) throw new Error("Enable Cloud Backup before syncing.");
  const user = await verifiedUser();
  if (!supabase || !user || !getDatabase()) throw new Error("Sign in with a verified email before syncing.");
  return user;
}

export async function pushLocalChanges() {
  const user = await requireEnabledVerifiedUser();
  const { error: profileError } = await supabase!.from("profiles").upsert({
    id: user.id,
    user_id: user.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });
  if (profileError) throw profileError;
  const backup = await exportAllLocalData();
  let pushed = 0;
  let skipped = 0;
  for (const table of TABLES) {
    const localRows = rowsForTable(backup, table);
    const { data: remoteRows, error: readError } = await supabase!.from(table).select("id,updated_at");
    if (readError) throw readError;
    const remoteById = new Map((remoteRows ?? []).map(row => [row.id, row]));
    const upload = localRows.filter(row => {
      const remote = remoteById.get(row.id);
      if (remote && newer(remote.updated_at, row.updatedAt)) { skipped++; return false; }
      return true;
    }).map(row => toCloud(table, row, user.id));
    if (!upload.length) continue;
    const { error } = await supabase!.from(table).upsert(upload, { onConflict: "id" });
    if (error) throw error;
    pushed += upload.length;
  }
  return { pushed, skipped, syncedIds: { diaries: backup.diaries.map(row => row.id), entries: backup.entries.map(row => row.id) } };
}

export async function pullRemoteChanges() {
  const user = await requireEnabledVerifiedUser();
  const local = await exportAllLocalData();
  const pulled: BackupData = { version: local.version, appName: local.appName, exportedAt: new Date().toISOString(), diaries: [], entries: [], voiceNotes: [], media: [], futureMessages: [], collections: [] };
  let skipped = 0;
  for (const table of TABLES) {
    const localById = new Map(rowsForTable(local, table).map(row => [row.id, row]));
    const { data, error } = await supabase!.from(table).select("*");
    if (error) throw error;
    for (const remote of data ?? []) {
      const existing = localById.get(remote.id);
      if (existing && resolveConflict(existing, remote) === "local") { skipped++; continue; }
      const target = table === "voice_notes" ? pulled.voiceNotes : table === "future_messages" ? pulled.futureMessages : pulled[table];
      target.push(toLocal(table, remote, existing));
    }
  }
  const summary = await importBackupData(pulled);
  if (summary.failed > 0) throw new Error("Some cloud records could not be restored. Your local diary is safe; retry sync.");
  await AsyncStorage.setItem(userStorageKey(LAST_SYNC_KEY, user.id), new Date().toISOString());
  await clearLastSyncError();
  return { pulled: summary.inserted + summary.updated, skipped: skipped + summary.skipped, failed: summary.failed };
}

export async function syncNow(): Promise<SyncSummary> {
  const push = await pushLocalChanges();
  const pull = await pullRemoteChanges();
  const completedAt = new Date().toISOString();
  await markSynced(push.syncedIds, completedAt);
  await clearLastSyncError();
  return { pushed: push.pushed, pulled: pull.pulled, skipped: push.skipped + pull.skipped, failed: pull.failed, completedAt };
}
