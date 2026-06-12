import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { getThemeForMood } from "@/constants/diaryThemes";
import { disableDatabase, getDatabase, initializeDatabase, setMeta } from "@/db/database";
import { deleteDiarySoft, listDiaries, upsertDiary } from "@/db/diaryRepository";
import { deleteEntrySoft, getNextPageNumber, listAllEntries, listEntriesByDiary, upsertEntry } from "@/db/entryRepository";
import { cancelFutureMessage as cancelFutureMessageRecord, listFutureMessages, markFutureMessageUnlocked, upsertFutureMessage } from "@/db/futureMessageRepository";
import { normalizeEntry } from "@/db/mappers";
import { migrateAsyncStorageToSQLite } from "@/db/migrations";
import { searchEntries as searchDatabaseEntries } from "@/db/searchRepository";
import type { AppSettings, Diary, Entry, FutureMessage } from "@/types";

const DIARIES_KEY = "@amanat/diaries";
const SETTINGS_KEY = "@amanat/settings";
const FUTURE_MSGS_KEY = "@amanat/future_messages";

function genId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

const defaultSettings: AppSettings = {
  appLockEnabled: false, biometricEnabled: false, autoLockMinutes: 5,
  moodThemesEnabled: true, onboardingComplete: false, firstDiaryCreated: false,
  reminderEnabled: false, reminderTime: "20:00", transcriptionLanguage: "en",
};

async function readLegacyEntries(diaryId: string) {
  const raw = await AsyncStorage.getItem(`@amanat/entries_${diaryId}`);
  if (!raw) return [];
  let parsed: Entry[] = [];
  try {
    const value = JSON.parse(raw);
    parsed = Array.isArray(value) ? value : [];
  } catch {}
  return [...parsed]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((entry, index) => normalizeEntry(entry, index + 1));
}

async function mirrorEntries(diaryId: string, entries: Entry[]) {
  await AsyncStorage.setItem(`@amanat/entries_${diaryId}`, JSON.stringify(entries));
}

interface DiaryContextType {
  diaries: Diary[];
  settings: AppSettings;
  futureMessages: FutureMessage[];
  loading: boolean;
  databaseReady: boolean;
  createDiary: (d: Omit<Diary, "id" | "createdAt" | "updatedAt" | "entryCount">) => Promise<Diary>;
  updateDiary: (id: string, updates: Partial<Diary>) => Promise<void>;
  deleteDiary: (id: string) => Promise<void>;
  getEntries: (diaryId: string) => Promise<Entry[]>;
  createEntry: (e: Omit<Entry, "id" | "createdAt" | "updatedAt" | "pageNumber">) => Promise<Entry>;
  updateEntry: (diaryId: string, entryId: string, updates: Partial<Entry>) => Promise<void>;
  deleteEntry: (diaryId: string, entryId: string) => Promise<void>;
  getAllEntries: () => Promise<Entry[]>;
  searchEntries: (query: string, diaryId?: string) => Promise<Entry[]>;
  reloadLocalData: () => Promise<void>;
  updateSettings: (s: Partial<AppSettings>) => Promise<void>;
  createFutureMessage: (m: Omit<FutureMessage, "id" | "createdAt">) => Promise<FutureMessage>;
  updateFutureMessage: (m: FutureMessage) => Promise<void>;
  cancelFutureMessage: (id: string) => Promise<void>;
  unlockFutureMessage: (id: string) => Promise<void>;
}

const DiaryContext = createContext<DiaryContextType | null>(null);

export function DiaryProvider({ children }: { children: React.ReactNode }) {
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [futureMessages, setFutureMessages] = useState<FutureMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [databaseReady, setDatabaseReady] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [dRaw, sRaw, fRaw] = await Promise.all([
        AsyncStorage.getItem(DIARIES_KEY),
        AsyncStorage.getItem(SETTINGS_KEY),
        AsyncStorage.getItem(FUTURE_MSGS_KEY),
      ]);
      const parseArray = <T,>(raw: string | null): T[] => {
        try { const value = raw ? JSON.parse(raw) : []; return Array.isArray(value) ? value : []; } catch { return []; }
      };
      const legacyDiaries = parseArray<Diary>(dRaw);
      const legacyFuture = parseArray<FutureMessage>(fRaw);
      try {
        if (sRaw) setSettings({ ...defaultSettings, ...JSON.parse(sRaw) });
      } catch {}

      const ready = await initializeDatabase();
      setDatabaseReady(ready);
      if (ready) {
        try {
          await migrateAsyncStorageToSQLite();
          if (sRaw) await setMeta("app_settings", sRaw);
          setDiaries(await listDiaries());
          setFutureMessages(await listFutureMessages());
        } catch {
          await disableDatabase();
          setDatabaseReady(false);
          setDiaries(legacyDiaries);
          setFutureMessages(legacyFuture);
        }
      } else {
        setDiaries(legacyDiaries);
        setFutureMessages(legacyFuture);
      }
      setLoading(false);
    };
    load().catch(() => setLoading(false));
  }, []);

  const mirrorDiaries = async (list: Diary[]) => {
    setDiaries(list);
    await AsyncStorage.setItem(DIARIES_KEY, JSON.stringify(list));
  };

  const createDiary = useCallback(async (input: Omit<Diary, "id" | "createdAt" | "updatedAt" | "entryCount">) => {
    const now = new Date().toISOString();
    const diary: Diary = { ...input, id: genId(), createdAt: now, updatedAt: now, entryCount: 0 };
    if (getDatabase()) await upsertDiary(diary);
    await mirrorDiaries([...diaries, diary]);
    return diary;
  }, [diaries]);

  const updateDiary = useCallback(async (id: string, updates: Partial<Diary>) => {
    const updated = diaries.map(diary => diary.id === id ? { ...diary, ...updates, updatedAt: new Date().toISOString() } : diary);
    const diary = updated.find(item => item.id === id);
    if (diary && getDatabase()) await upsertDiary(diary);
    await mirrorDiaries(updated);
  }, [diaries]);

  const deleteDiary = useCallback(async (id: string) => {
    if (getDatabase()) await deleteDiarySoft(id);
    await mirrorDiaries(diaries.filter(diary => diary.id !== id));
    // Old entry JSON is intentionally retained as migration/disaster-recovery fallback.
  }, [diaries]);

  const getEntries = useCallback(async (diaryId: string) => {
    if (getDatabase()) return listEntriesByDiary(diaryId);
    return readLegacyEntries(diaryId);
  }, []);

  const createEntry = useCallback(async (input: Omit<Entry, "id" | "createdAt" | "updatedAt" | "pageNumber">) => {
    const now = new Date().toISOString();
    const existing = await getEntries(input.diaryId);
    const pageNumber = getDatabase() ? await getNextPageNumber(input.diaryId) : existing.length + 1;
    const entry = normalizeEntry({ ...input, id: genId(), createdAt: now, updatedAt: now, pageNumber });
    if (getDatabase()) await upsertEntry(entry);
    const updated = [...existing, entry];
    await mirrorEntries(input.diaryId, updated);
    await updateDiary(input.diaryId, { entryCount: updated.length });
    return entry;
  }, [getEntries, updateDiary]);

  const updateEntry = useCallback(async (diaryId: string, entryId: string, updates: Partial<Entry>) => {
    const entries = await getEntries(diaryId);
    const updatedAt = new Date().toISOString();
    const updated = entries.map(entry => entry.id === entryId ? normalizeEntry({ ...entry, ...updates, updatedAt }) : entry);
    const entry = updated.find(item => item.id === entryId);
    if (entry && getDatabase()) await upsertEntry(entry);
    await mirrorEntries(diaryId, updated);
  }, [getEntries]);

  const deleteEntry = useCallback(async (diaryId: string, entryId: string) => {
    if (getDatabase()) await deleteEntrySoft(diaryId, entryId);
    const updated = (await getEntries(diaryId)).filter(entry => entry.id !== entryId).map((entry, index) => ({ ...entry, pageNumber: index + 1 }));
    await mirrorEntries(diaryId, updated);
    await updateDiary(diaryId, { entryCount: updated.length });
  }, [getEntries, updateDiary]);

  const getAllEntries = useCallback(async () => {
    if (getDatabase()) return listAllEntries();
    const all = (await Promise.all(diaries.map(diary => readLegacyEntries(diary.id)))).flat();
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [diaries]);

  const searchEntries = useCallback(async (query: string, diaryId?: string) => {
    if (getDatabase()) return searchDatabaseEntries(query, diaryId);
    const entries = diaryId ? await readLegacyEntries(diaryId) : await getAllEntries();
    const normalizedQuery = query.trim().toLowerCase();
    return entries.filter(entry => [
      entry.title, entry.body, entry.bodyPolished, entry.mood, entry.voiceTranscript,
      entry.tags.join(" "), entry.date,
    ].some(value => value?.toLowerCase().includes(normalizedQuery)));
  }, [getAllEntries]);

  const reloadLocalData = useCallback(async () => {
    if (!getDatabase()) return;
    const [updatedDiaries, updatedMessages] = await Promise.all([listDiaries(), listFutureMessages()]);
    await mirrorDiaries(updatedDiaries);
    setFutureMessages(updatedMessages);
    await AsyncStorage.setItem(FUTURE_MSGS_KEY, JSON.stringify(updatedMessages));
    for (const diary of updatedDiaries) await mirrorEntries(diary.id, await listEntriesByDiary(diary.id));
  }, []);

  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    const updated = { ...settings, ...updates };
    setSettings(updated);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    if (getDatabase()) await setMeta("app_settings", JSON.stringify(updated));
  }, [settings]);

  const createFutureMessage = useCallback(async (input: Omit<FutureMessage, "id" | "createdAt">) => {
    const now = new Date().toISOString();
    const message: FutureMessage = { ...input, id: genId(), createdAt: now, updatedAt: now };
    if (getDatabase()) await upsertFutureMessage(message);
    const updated = [...futureMessages, message];
    setFutureMessages(updated);
    await AsyncStorage.setItem(FUTURE_MSGS_KEY, JSON.stringify(updated));
    return message;
  }, [futureMessages]);

  const updateFutureMessage = useCallback(async (message: FutureMessage) => {
    const next = { ...message, updatedAt: new Date().toISOString() };
    if (getDatabase()) await upsertFutureMessage(next);
    const updated = futureMessages.some(item => item.id === next.id)
      ? futureMessages.map(item => item.id === next.id ? next : item)
      : [...futureMessages, next];
    setFutureMessages(updated);
    await AsyncStorage.setItem(FUTURE_MSGS_KEY, JSON.stringify(updated));
  }, [futureMessages]);

  const cancelFutureMessage = useCallback(async (id: string) => {
    if (getDatabase()) await cancelFutureMessageRecord(id);
    const updated = futureMessages.map(message => message.id === id ? { ...message, status: "canceled" as const, updatedAt: new Date().toISOString() } : message);
    setFutureMessages(updated);
    await AsyncStorage.setItem(FUTURE_MSGS_KEY, JSON.stringify(updated));
  }, [futureMessages]);

  const unlockFutureMessage = useCallback(async (id: string) => {
    if (getDatabase()) await markFutureMessageUnlocked(id);
    const updated = futureMessages.map(message => message.id === id ? { ...message, status: "unlocked" as const, updatedAt: new Date().toISOString() } : message);
    setFutureMessages(updated);
    await AsyncStorage.setItem(FUTURE_MSGS_KEY, JSON.stringify(updated));
  }, [futureMessages]);

  return (
    <DiaryContext.Provider value={{
      diaries, settings, futureMessages, loading, databaseReady,
      createDiary, updateDiary, deleteDiary, getEntries, createEntry, updateEntry, deleteEntry, getAllEntries, searchEntries,
      reloadLocalData, updateSettings, createFutureMessage, updateFutureMessage, cancelFutureMessage, unlockFutureMessage,
    }}>
      {children}
    </DiaryContext.Provider>
  );
}

export function useDiary() {
  const context = useContext(DiaryContext);
  if (!context) throw new Error("useDiary must be used within DiaryProvider");
  return context;
}
