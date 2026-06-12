import { Alert, Share } from "react-native";

import type { Diary, Entry } from "@/types";

export function sortEntriesByPage(entries: Entry[]) {
  return [...entries].sort((a, b) => {
    if (a.pageNumber !== b.pageNumber) return a.pageNumber - b.pageNumber;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

export function entryMatchesQuery(entry: Entry, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const date = new Date(entry.date);
  const searchable = [
    entry.title,
    entry.body,
    entry.bodyPolished,
    entry.mood,
    entry.voiceTranscript,
    entry.tags?.join(" "),
    Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
  ];

  return searchable.some(value => value?.toLowerCase().includes(q));
}

export function formatEntryShareText(entry: Entry, diaryTitle?: string) {
  const date = new Date(entry.date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const tags = entry.tags?.length ? `\n\n${entry.tags.map(tag => `#${tag}`).join(" ")}` : "";

  return [
    diaryTitle,
    `Page ${entry.pageNumber} · ${date} · ${entry.mood}`,
    entry.title,
    entry.body || entry.voiceTranscript || "A quiet page.",
  ].filter(Boolean).join("\n\n") + tags;
}

export async function shareEntry(entry: Entry, diaryTitle?: string) {
  await Share.share({
    title: entry.title || `${diaryTitle ?? "Diary"} · Page ${entry.pageNumber}`,
    message: formatEntryShareText(entry, diaryTitle),
  });
}

export async function shareDiarySummary(diary: Diary, entries: Entry[]) {
  const moodCounts = entries.reduce<Record<string, number>>((counts, entry) => {
    counts[entry.mood] = (counts[entry.mood] ?? 0) + 1;
    return counts;
  }, {});
  const moods = Object.entries(moodCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([mood, count]) => `${mood} ${count}`)
    .join(" · ");

  await Share.share({
    title: diary.title,
    message: [
      diary.title,
      diary.subtitle,
      `${entries.length} ${entries.length === 1 ? "page" : "pages"}`,
      moods,
    ].filter(Boolean).join("\n"),
  });
}

export function showComingSoon() {
  Alert.alert("PDF export is coming soon", "Your diary stays private until you choose how to share it.");
}
