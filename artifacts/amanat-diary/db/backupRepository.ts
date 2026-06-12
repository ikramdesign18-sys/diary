import { DATABASE_VERSION } from "@/db/schema";
import { getDatabase } from "@/db/database";

export interface BackupData {
  version: number;
  exportedAt: string;
  appName: "Amanat Diary";
  diaries: any[];
  entries: any[];
  voiceNotes: any[];
  media: any[];
  futureMessages: any[];
  collections: any[];
}

export async function exportAllLocalData(): Promise<BackupData> {
  const db = getDatabase();
  if (!db) throw new Error("Local database is unavailable.");
  const [diaries, entries, voiceNotes, media, futureMessages, collections] = await Promise.all([
    db.getAllAsync<any>("SELECT * FROM diaries"),
    db.getAllAsync<any>("SELECT * FROM entries"),
    db.getAllAsync<any>("SELECT * FROM voice_notes"),
    db.getAllAsync<any>("SELECT * FROM media"),
    db.getAllAsync<any>("SELECT * FROM future_messages"),
    db.getAllAsync<any>("SELECT * FROM collections"),
  ]);
  return { version: DATABASE_VERSION, exportedAt: new Date().toISOString(), appName: "Amanat Diary", diaries, entries, voiceNotes, media, futureMessages, collections };
}

export async function getUnsyncedChanges() {
  const db = getDatabase();
  if (!db) return { diaries: [], entries: [] };
  return {
    diaries: await db.getAllAsync<any>("SELECT * FROM diaries WHERE syncStatus='local'"),
    entries: await db.getAllAsync<any>("SELECT * FROM entries WHERE syncStatus='local'"),
  };
}

export async function importBackupData(backup: BackupData) {
  const db = getDatabase();
  if (!db) throw new Error("Local database is unavailable.");
  if (!backup || backup.version !== DATABASE_VERSION) throw new Error("Unsupported backup version.");
  const summary = { inserted: 0, updated: 0, skipped: 0, failed: 0, diaries: 0, entries: 0 };

  const allowedColumns: Record<string, string[]> = {
    diaries: ["id","title","subtitle","category","coverStyle","accentColor","isLocked","defaultMood","entryCount","createdAt","updatedAt","deletedAt","syncStatus","lastSyncedAt"],
    entries: ["id","diaryId","pageNumber","title","bodyOriginal","bodyPolished","mood","themeId","aiDetectedTheme","userOverriddenTheme","tagsJson","date","day","time","isFavorite","isLocked","hasVoice","hasMedia","voiceUri","voiceDuration","voiceTranscript","voiceLanguage","photosJson","createdAt","updatedAt","deletedAt","syncStatus","lastSyncedAt"],
    voice_notes: ["id","entryId","localPath","duration","transcript","language","createdAt","updatedAt"],
    media: ["id","entryId","type","localPath","thumbnailPath","width","height","createdAt","updatedAt"],
    future_messages: ["id","entryId","diaryId","title","body","voiceNoteId","recipientName","recipientEmail","deliveryDate","deliveryType","status","notificationId","unlockDate","emailDeliveryId","emailDeliveryStatus","emailDeliveryMode","consentConfirmed","createdAt","updatedAt"],
    collections: ["id","title","description","entryIdsJson","createdAt","updatedAt"],
  };

  const importRows = async (table: string, rows: any[]) => {
    const allowed = allowedColumns[table];
    if (!allowed) return;
    for (const originalRow of rows ?? []) {
      let row = originalRow;
      if (!row?.id || typeof row.id !== "string") {
        summary.skipped++;
        continue;
      }
      const existing = await db.getFirstAsync<any>(
        table === "future_messages" ? "SELECT updatedAt,notificationId FROM future_messages WHERE id=?" : `SELECT updatedAt FROM ${table} WHERE id=?`,
        row.id,
      );
      if (table === "future_messages") row = { ...originalRow, notificationId: existing?.notificationId ?? null };
      if (existing && (!row.updatedAt || existing.updatedAt >= row.updatedAt)) {
        summary.skipped++;
        continue;
      }
      const columns = allowed.filter(column => Object.prototype.hasOwnProperty.call(row, column));
      const values = columns.map(column => row[column] ?? null);
      const update = columns.filter(column => column !== "id").map(column => `${column}=excluded.${column}`).join(",");
      try {
        await db.runAsync(
          `INSERT INTO ${table} (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})
           ON CONFLICT(id) DO UPDATE SET ${update}`,
          ...values,
        );
        existing ? summary.updated++ : summary.inserted++;
        if (table === "diaries") summary.diaries++;
        if (table === "entries") summary.entries++;
      } catch {
        summary.failed++;
      }
    }
  };

  await importRows("diaries", backup.diaries);
  await importRows("entries", backup.entries);
  await importRows("voice_notes", backup.voiceNotes);
  await importRows("media", backup.media);
  await importRows("future_messages", backup.futureMessages);
  await importRows("collections", backup.collections);
  return summary;
}
