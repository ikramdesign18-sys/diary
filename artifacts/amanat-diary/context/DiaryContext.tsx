import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import type {
  AppSettings,
  Diary,
  Entry,
  FutureMessage,
  Mood,
} from "@/types";

const DIARIES_KEY = "@amanat/diaries";
const SETTINGS_KEY = "@amanat/settings";
const FUTURE_MSGS_KEY = "@amanat/future_messages";

function genId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

const defaultSettings: AppSettings = {
  appLockEnabled: false,
  biometricEnabled: false,
  autoLockMinutes: 5,
  moodThemesEnabled: true,
  onboardingComplete: false,
  firstDiaryCreated: false,
  reminderEnabled: false,
  reminderTime: "20:00",
  transcriptionLanguage: "en",
};

interface DiaryContextType {
  diaries: Diary[];
  settings: AppSettings;
  futureMessages: FutureMessage[];
  loading: boolean;
  createDiary: (d: Omit<Diary, "id" | "createdAt" | "updatedAt" | "entryCount">) => Promise<Diary>;
  updateDiary: (id: string, updates: Partial<Diary>) => Promise<void>;
  deleteDiary: (id: string) => Promise<void>;
  getEntries: (diaryId: string) => Promise<Entry[]>;
  createEntry: (e: Omit<Entry, "id" | "createdAt" | "updatedAt" | "pageNumber">) => Promise<Entry>;
  updateEntry: (diaryId: string, entryId: string, updates: Partial<Entry>) => Promise<void>;
  deleteEntry: (diaryId: string, entryId: string) => Promise<void>;
  getAllEntries: () => Promise<Entry[]>;
  updateSettings: (s: Partial<AppSettings>) => Promise<void>;
  createFutureMessage: (m: Omit<FutureMessage, "id" | "createdAt">) => Promise<void>;
  deleteFutureMessage: (id: string) => Promise<void>;
}

const DiaryContext = createContext<DiaryContextType | null>(null);

export function DiaryProvider({ children }: { children: React.ReactNode }) {
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [futureMessages, setFutureMessages] = useState<FutureMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [dRaw, sRaw, fRaw] = await Promise.all([
          AsyncStorage.getItem(DIARIES_KEY),
          AsyncStorage.getItem(SETTINGS_KEY),
          AsyncStorage.getItem(FUTURE_MSGS_KEY),
        ]);
        if (dRaw) setDiaries(JSON.parse(dRaw));
        if (sRaw) setSettings({ ...defaultSettings, ...JSON.parse(sRaw) });
        if (fRaw) setFutureMessages(JSON.parse(fRaw));
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const saveDiaries = async (list: Diary[]) => {
    setDiaries(list);
    await AsyncStorage.setItem(DIARIES_KEY, JSON.stringify(list));
  };

  const createDiary = useCallback(async (d: Omit<Diary, "id" | "createdAt" | "updatedAt" | "entryCount">) => {
    const now = new Date().toISOString();
    const diary: Diary = { ...d, id: genId(), createdAt: now, updatedAt: now, entryCount: 0 };
    const updated = [...diaries, diary];
    await saveDiaries(updated);
    return diary;
  }, [diaries]);

  const updateDiary = useCallback(async (id: string, updates: Partial<Diary>) => {
    const updated = diaries.map(d => d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d);
    await saveDiaries(updated);
  }, [diaries]);

  const deleteDiary = useCallback(async (id: string) => {
    const updated = diaries.filter(d => d.id !== id);
    await saveDiaries(updated);
    await AsyncStorage.removeItem(`@amanat/entries_${id}`);
  }, [diaries]);

  const getEntries = useCallback(async (diaryId: string): Promise<Entry[]> => {
    const raw = await AsyncStorage.getItem(`@amanat/entries_${diaryId}`);
    return raw ? JSON.parse(raw) : [];
  }, []);

  const saveEntries = async (diaryId: string, entries: Entry[]) => {
    await AsyncStorage.setItem(`@amanat/entries_${diaryId}`, JSON.stringify(entries));
  };

  const createEntry = useCallback(async (e: Omit<Entry, "id" | "createdAt" | "updatedAt" | "pageNumber">) => {
    const now = new Date().toISOString();
    const entries = await getEntries(e.diaryId);
    const entry: Entry = { ...e, id: genId(), createdAt: now, updatedAt: now, pageNumber: entries.length + 1 };
    const updated = [...entries, entry];
    await saveEntries(e.diaryId, updated);
    const diary = diaries.find(d => d.id === e.diaryId);
    if (diary) await updateDiary(e.diaryId, { entryCount: updated.length });
    return entry;
  }, [getEntries, diaries, updateDiary]);

  const updateEntry = useCallback(async (diaryId: string, entryId: string, updates: Partial<Entry>) => {
    const entries = await getEntries(diaryId);
    const updated = entries.map(e => e.id === entryId ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e);
    await saveEntries(diaryId, updated);
  }, [getEntries]);

  const deleteEntry = useCallback(async (diaryId: string, entryId: string) => {
    const entries = await getEntries(diaryId);
    const updated = entries.filter(e => e.id !== entryId).map((e, i) => ({ ...e, pageNumber: i + 1 }));
    await saveEntries(diaryId, updated);
    await updateDiary(diaryId, { entryCount: updated.length });
  }, [getEntries, updateDiary]);

  const getAllEntries = useCallback(async (): Promise<Entry[]> => {
    const all: Entry[] = [];
    for (const diary of diaries) {
      const entries = await getEntries(diary.id);
      all.push(...entries);
    }
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [diaries, getEntries]);

  const updateSettings = useCallback(async (s: Partial<AppSettings>) => {
    const updated = { ...settings, ...s };
    setSettings(updated);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  }, [settings]);

  const createFutureMessage = useCallback(async (m: Omit<FutureMessage, "id" | "createdAt">) => {
    const now = new Date().toISOString();
    const msg: FutureMessage = { ...m, id: genId(), createdAt: now };
    const updated = [...futureMessages, msg];
    setFutureMessages(updated);
    await AsyncStorage.setItem(FUTURE_MSGS_KEY, JSON.stringify(updated));
  }, [futureMessages]);

  const deleteFutureMessage = useCallback(async (id: string) => {
    const updated = futureMessages.filter(m => m.id !== id);
    setFutureMessages(updated);
    await AsyncStorage.setItem(FUTURE_MSGS_KEY, JSON.stringify(updated));
  }, [futureMessages]);

  return (
    <DiaryContext.Provider value={{
      diaries, settings, futureMessages, loading,
      createDiary, updateDiary, deleteDiary,
      getEntries, createEntry, updateEntry, deleteEntry, getAllEntries,
      updateSettings,
      createFutureMessage, deleteFutureMessage,
    }}>
      {children}
    </DiaryContext.Provider>
  );
}

export function useDiary() {
  const ctx = useContext(DiaryContext);
  if (!ctx) throw new Error("useDiary must be used within DiaryProvider");
  return ctx;
}
