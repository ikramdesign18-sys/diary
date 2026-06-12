import { getDatabase } from "@/db/database";
import { boolInt, entryFromRow, normalizeEntry } from "@/db/mappers";
import type { Entry } from "@/types";

export async function upsertEntry(input: Entry) {
  const db = getDatabase();
  if (!db) return;
  const entry = normalizeEntry(input);
  const date = new Date(entry.date);
  await db.runAsync(
    `INSERT INTO entries (id,diaryId,pageNumber,title,bodyOriginal,bodyPolished,mood,themeId,aiDetectedTheme,userOverriddenTheme,
     tagsJson,date,day,time,isFavorite,isLocked,hasVoice,hasMedia,voiceUri,voiceDuration,voiceTranscript,voiceLanguage,photosJson,customizationJson,createdAt,updatedAt,syncStatus)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'local')
     ON CONFLICT(id) DO UPDATE SET diaryId=excluded.diaryId,pageNumber=excluded.pageNumber,title=excluded.title,
     bodyOriginal=excluded.bodyOriginal,bodyPolished=excluded.bodyPolished,mood=excluded.mood,themeId=excluded.themeId,
     aiDetectedTheme=excluded.aiDetectedTheme,userOverriddenTheme=excluded.userOverriddenTheme,tagsJson=excluded.tagsJson,
     date=excluded.date,day=excluded.day,time=excluded.time,isFavorite=excluded.isFavorite,isLocked=excluded.isLocked,
     hasVoice=excluded.hasVoice,hasMedia=excluded.hasMedia,voiceUri=excluded.voiceUri,voiceDuration=excluded.voiceDuration,
     voiceTranscript=excluded.voiceTranscript,voiceLanguage=excluded.voiceLanguage,photosJson=excluded.photosJson,customizationJson=excluded.customizationJson,updatedAt=excluded.updatedAt,deletedAt=NULL,syncStatus='local'`,
    entry.id, entry.diaryId, entry.pageNumber, entry.title, entry.body, entry.bodyPolished ?? null, entry.mood, entry.themeId ?? null,
    entry.aiDetectedTheme ?? null, boolInt(entry.userOverriddenTheme), JSON.stringify(entry.tags), entry.date,
    Number.isNaN(date.getTime()) ? null : date.toLocaleDateString("en-US", { weekday: "long" }),
    Number.isNaN(date.getTime()) ? null : date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    boolInt(entry.isFavorite), boolInt(entry.isLocked), boolInt(entry.hasVoice), boolInt(entry.photos.length > 0),
    entry.voiceUri ?? null, entry.voiceDuration ?? null, entry.voiceTranscript ?? null, entry.voiceLanguage ?? null, JSON.stringify(entry.photos),
    JSON.stringify({ fontKey: entry.fontKey, backgroundKey: entry.backgroundKey, stickers: entry.stickers, photoFrameKey: entry.photoFrameKey, textStyleKey: entry.textStyleKey }),
    entry.createdAt, entry.updatedAt,
  );
  if (entry.hasVoice) {
    await db.runAsync(
      `INSERT INTO voice_notes (id,entryId,localPath,duration,transcript,language,createdAt,updatedAt)
       VALUES (?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET localPath=excluded.localPath,duration=excluded.duration,transcript=excluded.transcript,language=excluded.language,updatedAt=excluded.updatedAt`,
      `voice-${entry.id}`, entry.id, entry.voiceUri ?? null, entry.voiceDuration ?? null,
      entry.voiceTranscript ?? null, entry.voiceLanguage ?? null, entry.createdAt, entry.updatedAt,
    );
  }
  for (let index = 0; index < entry.photos.length; index++) {
    await db.runAsync(
      `INSERT INTO media (id,entryId,type,localPath,createdAt,updatedAt) VALUES (?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET localPath=excluded.localPath,updatedAt=excluded.updatedAt`,
      `media-${entry.id}-${index}`, entry.id, "image", entry.photos[index], entry.createdAt, entry.updatedAt,
    );
  }
}

export async function listEntriesByDiary(diaryId: string) {
  const db = getDatabase();
  if (!db) return [];
  return (await db.getAllAsync<any>("SELECT * FROM entries WHERE diaryId=? AND deletedAt IS NULL ORDER BY pageNumber", diaryId)).map(entryFromRow);
}

export async function listAllEntries(limit = 1000, offset = 0) {
  const db = getDatabase();
  if (!db) return [];
  return (await db.getAllAsync<any>("SELECT * FROM entries WHERE deletedAt IS NULL ORDER BY createdAt DESC LIMIT ? OFFSET ?", limit, offset)).map(entryFromRow);
}

export async function listEntriesByDiaryPaged(diaryId: string, limit = 50, offset = 0) {
  const db = getDatabase();
  if (!db) return [];
  return (await db.getAllAsync<any>("SELECT * FROM entries WHERE diaryId=? AND deletedAt IS NULL ORDER BY pageNumber LIMIT ? OFFSET ?", diaryId, limit, offset)).map(entryFromRow);
}

export async function getEntryById(id: string) {
  const db = getDatabase();
  if (!db) return null;
  const row = await db.getFirstAsync<any>("SELECT * FROM entries WHERE id=? AND deletedAt IS NULL", id);
  return row ? entryFromRow(row) : null;
}

export async function getEntryByPageNumber(diaryId: string, pageNumber: number) {
  const db = getDatabase();
  if (!db) return null;
  const row = await db.getFirstAsync<any>("SELECT * FROM entries WHERE diaryId=? AND pageNumber=? AND deletedAt IS NULL", diaryId, pageNumber);
  return row ? entryFromRow(row) : null;
}

export async function getNextPageNumber(diaryId: string) {
  const db = getDatabase();
  if (!db) return 1;
  const row = await db.getFirstAsync<{ nextPage: number }>("SELECT COALESCE(MAX(pageNumber),0)+1 nextPage FROM entries WHERE diaryId=? AND deletedAt IS NULL", diaryId);
  return row?.nextPage ?? 1;
}

export async function deleteEntrySoft(diaryId: string, id: string) {
  const db = getDatabase();
  if (!db) return;
  const now = new Date().toISOString();
  await db.runAsync("UPDATE entries SET deletedAt=?,updatedAt=?,syncStatus='local' WHERE id=?", now, now, id);
  const entries = await listEntriesByDiary(diaryId);
  for (let index = 0; index < entries.length; index++) {
    await db.runAsync("UPDATE entries SET pageNumber=?,updatedAt=?,syncStatus='local' WHERE id=?", index + 1, now, entries[index].id);
  }
}

export async function favoriteEntry(id: string, favorite: boolean) {
  const db = getDatabase();
  if (db) await db.runAsync("UPDATE entries SET isFavorite=?,updatedAt=?,syncStatus='local' WHERE id=?", boolInt(favorite), new Date().toISOString(), id);
}

export async function lockEntry(id: string, locked: boolean) {
  const db = getDatabase();
  if (db) await db.runAsync("UPDATE entries SET isLocked=?,updatedAt=?,syncStatus='local' WHERE id=?", boolInt(locked), new Date().toISOString(), id);
}
