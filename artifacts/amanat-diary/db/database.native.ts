import type { SQLiteDatabase } from "expo-sqlite";

import { SCHEMA_SQL } from "@/db/schema";

let database: SQLiteDatabase | null = null;
let initialization: Promise<boolean> | null = null;

export function getDatabase() {
  return database;
}

export function isDatabaseReady() {
  return database !== null;
}

export async function disableDatabase() {
  const current = database;
  database = null;
  initialization = Promise.resolve(false);
  try { await current?.closeAsync(); } catch {}
}

export async function initializeDatabase() {
  if (initialization) return initialization;
  initialization = (async () => {
    try {
      const SQLite = await import("expo-sqlite");
      database = await SQLite.openDatabaseAsync("amanat-diary.db");
      await database.execAsync(SCHEMA_SQL);
      for (const statement of [
        "ALTER TABLE future_messages ADD COLUMN voiceNoteId TEXT",
        "ALTER TABLE future_messages ADD COLUMN notificationId TEXT",
        "ALTER TABLE future_messages ADD COLUMN unlockDate TEXT",
        "ALTER TABLE future_messages ADD COLUMN emailDeliveryId TEXT",
        "ALTER TABLE future_messages ADD COLUMN emailDeliveryStatus TEXT",
        "ALTER TABLE future_messages ADD COLUMN emailDeliveryMode TEXT",
        "ALTER TABLE future_messages ADD COLUMN consentConfirmed INTEGER DEFAULT 0",
        "ALTER TABLE entries ADD COLUMN voiceLanguage TEXT",
        "ALTER TABLE entries ADD COLUMN customizationJson TEXT",
      ]) {
        try { await database.execAsync(statement); } catch {}
      }
      await database.execAsync("CREATE INDEX IF NOT EXISTS idx_future_delivery ON future_messages(deliveryDate); CREATE INDEX IF NOT EXISTS idx_future_entry ON future_messages(entryId);");
      await setMeta("database_version", "1");
      await setMeta("future_messages_schedule_migration_v1", "complete");
      return true;
    } catch (error) {
      database = null;
      if (__DEV__) console.warn("[database] SQLite unavailable; using AsyncStorage fallback.", error);
      return false;
    }
  })();
  return initialization;
}

export async function setMeta(key: string, value: string) {
  if (!database) return;
  await database.runAsync(
    `INSERT INTO app_meta (key, value, updatedAt) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt`,
    key, value, new Date().toISOString(),
  );
}

export async function getMeta(key: string) {
  if (!database) return null;
  const row = await database.getFirstAsync<{ value: string | null }>("SELECT value FROM app_meta WHERE key = ?", key);
  return row?.value ?? null;
}
