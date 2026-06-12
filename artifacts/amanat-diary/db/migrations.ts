import AsyncStorage from "@react-native-async-storage/async-storage";

import { getMeta, setMeta } from "@/db/database";
import { upsertDiary } from "@/db/diaryRepository";
import { normalizeEntry } from "@/db/mappers";
import { upsertEntry } from "@/db/entryRepository";
import { upsertFutureMessage } from "@/db/futureMessageRepository";
import type { Diary, Entry, FutureMessage } from "@/types";

const MIGRATION_KEY = "async_storage_migration_v1";
const DIARIES_KEY = "@amanat/diaries";
const FUTURE_MSGS_KEY = "@amanat/future_messages";

export async function migrateAsyncStorageToSQLite() {
  if (await getMeta(MIGRATION_KEY) === "complete") return { migrated: false, diaries: 0, entries: 0 };
  const [diariesRaw, futureRaw] = await Promise.all([
    AsyncStorage.getItem(DIARIES_KEY),
    AsyncStorage.getItem(FUTURE_MSGS_KEY),
  ]);
  const parseArray = <T,>(raw: string | null): T[] => {
    try {
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const diaries = parseArray<Diary>(diariesRaw).filter(diary => diary?.id && diary?.title);
  const futureMessages = parseArray<FutureMessage>(futureRaw).filter(message => message?.id);
  let entryCount = 0;

  try {
    for (const diary of diaries) {
      await upsertDiary(diary);
      const raw = await AsyncStorage.getItem(`@amanat/entries_${diary.id}`);
      const oldEntries = parseArray<Entry>(raw).filter(entry => entry?.id && entry?.diaryId);
      const chronological = [...oldEntries].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      for (let index = 0; index < chronological.length; index++) {
        await upsertEntry(normalizeEntry(chronological[index], index + 1));
        entryCount++;
      }
    }
    for (const message of futureMessages) await upsertFutureMessage(message);
    await setMeta(MIGRATION_KEY, "complete");
    if (__DEV__) console.info(`[database] Migrated ${diaries.length} diaries and ${entryCount} entries. AsyncStorage originals kept.`);
    return { migrated: true, diaries: diaries.length, entries: entryCount };
  } catch (error) {
    if (__DEV__) console.warn("[database] Migration failed. AsyncStorage originals remain available.", error);
    throw error;
  }
}
