import { getDatabase } from "@/db/database";
import { boolInt, diaryFromRow } from "@/db/mappers";
import type { Diary } from "@/types";

export async function upsertDiary(diary: Diary) {
  const db = getDatabase();
  if (!db) return;
  await db.runAsync(
    `INSERT INTO diaries (id,title,subtitle,category,coverStyle,accentColor,isLocked,defaultMood,entryCount,createdAt,updatedAt,syncStatus)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,'local')
     ON CONFLICT(id) DO UPDATE SET title=excluded.title,subtitle=excluded.subtitle,category=excluded.category,
     coverStyle=excluded.coverStyle,accentColor=excluded.accentColor,isLocked=excluded.isLocked,defaultMood=excluded.defaultMood,
     entryCount=excluded.entryCount,updatedAt=excluded.updatedAt,deletedAt=NULL,syncStatus='local'`,
    diary.id, diary.title, diary.subtitle ?? null, diary.category, diary.coverStyle, diary.accentColor,
    boolInt(diary.isLocked), diary.defaultMood, diary.entryCount, diary.createdAt, diary.updatedAt,
  );
}

export async function listDiaries() {
  const db = getDatabase();
  if (!db) return [];
  return (await db.getAllAsync<any>("SELECT * FROM diaries WHERE deletedAt IS NULL ORDER BY updatedAt DESC")).map(diaryFromRow);
}

export async function getDiaryById(id: string) {
  const db = getDatabase();
  if (!db) return null;
  const row = await db.getFirstAsync<any>("SELECT * FROM diaries WHERE id = ? AND deletedAt IS NULL", id);
  return row ? diaryFromRow(row) : null;
}

export async function deleteDiarySoft(id: string) {
  const db = getDatabase();
  if (!db) return;
  const now = new Date().toISOString();
  await db.runAsync("UPDATE diaries SET deletedAt=?,updatedAt=?,syncStatus='local' WHERE id=?", now, now, id);
  await db.runAsync("UPDATE entries SET deletedAt=?,updatedAt=?,syncStatus='local' WHERE diaryId=?", now, now, id);
}

export async function getDiaryStats(id: string) {
  const db = getDatabase();
  if (!db) return { pages: 0, favorites: 0, voicePages: 0 };
  const row = await db.getFirstAsync<any>(
    "SELECT COUNT(*) pages, SUM(isFavorite) favorites, SUM(hasVoice) voicePages FROM entries WHERE diaryId=? AND deletedAt IS NULL", id,
  );
  return { pages: row?.pages ?? 0, favorites: row?.favorites ?? 0, voicePages: row?.voicePages ?? 0 };
}
