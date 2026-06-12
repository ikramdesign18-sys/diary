import { getDatabase } from "@/db/database";
import { entryFromRow } from "@/db/mappers";

async function queryEntries(where: string, params: Array<string | number> = [], limit = 250) {
  const db = getDatabase();
  if (!db) return [];
  return (await db.getAllAsync<any>(
    `SELECT * FROM entries WHERE deletedAt IS NULL AND ${where} ORDER BY createdAt DESC LIMIT ?`,
    ...params, limit,
  )).map(entryFromRow);
}

export async function searchEntries(query: string, diaryId?: string) {
  const escaped = `%${query.trim().toLowerCase()}%`;
  const diaryClause = diaryId ? "diaryId=? AND " : "";
  return queryEntries(
    `${diaryClause}(LOWER(title) LIKE ? OR LOWER(bodyOriginal) LIKE ? OR LOWER(bodyPolished) LIKE ? OR LOWER(mood) LIKE ? OR LOWER(tagsJson) LIKE ? OR LOWER(voiceTranscript) LIKE ? OR LOWER(date) LIKE ?)`,
    [...(diaryId ? [diaryId] : []), escaped, escaped, escaped, escaped, escaped, escaped, escaped],
  );
}

export const filterEntriesByMood = (mood: string, diaryId?: string) =>
  queryEntries(`${diaryId ? "diaryId=? AND " : ""}mood=?`, diaryId ? [diaryId, mood] : [mood]);

export const filterEntriesByTag = (tag: string, diaryId?: string) =>
  queryEntries(`${diaryId ? "diaryId=? AND " : ""}LOWER(tagsJson) LIKE ?`, diaryId ? [diaryId, `%"${tag.toLowerCase()}"%`] : [`%"${tag.toLowerCase()}"%`]);

export const filterEntriesByDiary = (diaryId: string) => queryEntries("diaryId=?", [diaryId]);
export const listFavorites = (diaryId?: string) => queryEntries(`${diaryId ? "diaryId=? AND " : ""}isFavorite=1`, diaryId ? [diaryId] : []);
export const listVoiceEntries = (diaryId?: string) => queryEntries(`${diaryId ? "diaryId=? AND " : ""}hasVoice=1`, diaryId ? [diaryId] : []);
