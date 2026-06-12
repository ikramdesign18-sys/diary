import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EntryCard } from "@/components/EntryCard";
import { EmptyState } from "@/components/EmptyState";
import { COVER_STYLES, MOODS } from "@/constants/moods";
import { useDiary } from "@/context/DiaryContext";
import { useColors } from "@/hooks/useColors";
import {
  entryMatchesQuery,
  shareDiarySummary,
  shareEntry,
  sortEntriesByPage,
} from "@/lib/diary";
import { exportFullBackup } from "@/services/backupService";
import { exportEntriesPdf, shareEntriesText } from "@/services/pdfExportService";
import { activeEntryLock } from "@/lib/futureMemories";
import type { Entry } from "@/types";

type Filter = "All" | "Voice" | "Favorites" | string;

export default function DiaryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { diaries, futureMessages, getAllEntries, getEntries, updateEntry } = useDiary();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [view, setView] = useState<"cover" | "pages">("cover");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const diary = diaries.find(d => d.id === id);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const load = useCallback(async () => {
    if (!id) return;
    setEntries(sortEntriesByPage(await getEntries(id)));
  }, [getEntries, id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const chips = useMemo(() => {
    const moods = MOODS.map(mood => mood.label);
    const standard = [...moods, "Work", "School", "Voice", "Favorites"];
    const tags = Array.from(new Set(entries.filter(entry => !activeEntryLock(futureMessages, entry.id)).flatMap(entry => entry.tags ?? [])))
      .filter(tag => !standard.some(item => item.toLowerCase() === tag.toLowerCase()));
    return ["All", ...standard, ...tags];
  }, [entries, futureMessages]);

  const filtered = useMemo(() => entries.filter(entry => {
    const locked = activeEntryLock(futureMessages, entry.id);
    if (locked && (query.trim() || filter !== "All")) return false;
    if (!entryMatchesQuery(entry, query)) return false;
    if (filter === "All") return true;
    if (filter === "Voice") return entry.hasVoice;
    if (filter === "Favorites") return entry.isFavorite;
    return entry.mood === filter || entry.tags?.some(tag => tag.toLowerCase() === filter.toLowerCase());
  }), [entries, filter, futureMessages, query]);

  if (!diary) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <Text style={{ color: colors.mutedForeground }}>Diary not found</Text>
      </View>
    );
  }

  const coverStyle = COVER_STYLES.find(c => c.id === diary.coverStyle) || COVER_STYLES[0];
  const openReader = (entryId?: string) => router.push(
    `/diary/${diary.id}/view${entryId ? `?entryId=${entryId}` : ""}` as any,
  );
  const newPage = () => router.push({ pathname: "/write", params: { diaryId: diary.id } });
  const newVoicePage = () => router.push({ pathname: "/voice", params: { diaryId: diary.id } });
  const unlockedEntries = entries.filter(entry => !activeEntryLock(futureMessages, entry.id));
  const selectedEntries = unlockedEntries.filter(entry => selectedIds.includes(entry.id));
  const runExport = async (work: () => Promise<unknown>) => {
    try { await work(); } catch (error) { Alert.alert("Unable to export", error instanceof Error ? error.message : "Please try again."); }
  };
  const toggleSelected = (entry: Entry) => {
    if (activeEntryLock(futureMessages, entry.id)) return Alert.alert("This memory is sealed", "Unlock it with your PIN before selecting or exporting it.");
    setSelectedIds(ids => ids.includes(entry.id) ? ids.filter(id => id !== entry.id) : [...ids, entry.id]);
  };

  const showDiaryShareMenu = () => {
    Alert.alert("Share diary", "Choose what leaves your private diary.", [
      { text: "Share diary summary", onPress: () => shareDiarySummary(diary, unlockedEntries) },
      ...(unlockedEntries.length ? [{ text: "Share latest page", onPress: () => shareEntry(unlockedEntries[unlockedEntries.length - 1], diary.title) }] : []),
      { text: "Export diary as PDF book", onPress: () => runExport(() => exportEntriesPdf(diary, unlockedEntries, true)) },
      { text: "Select pages to export", onPress: () => { setView("pages"); if (unlockedEntries[0]) setSelectedIds([unlockedEntries[0].id]); } },
      { text: "Export diary backup", onPress: () => runExport(async () => exportFullBackup({ diaries, entries: await getAllEntries(), futureMessages })) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const showEntryActions = (entry: Entry) => {
    if (activeEntryLock(futureMessages, entry.id)) {
      Alert.alert("This memory is sealed", "Open it in Diary View to unlock early with your PIN.", [
        { text: "Cancel", style: "cancel" },
        { text: "Open Sealed Page", onPress: () => openReader(entry.id) },
      ]);
      return;
    }
    Alert.alert(entry.title || `Page ${entry.pageNumber}`, "Page actions", [
      { text: "Open in Diary View", onPress: () => openReader(entry.id) },
      { text: "Share page", onPress: () => shareEntry(entry, diary.title) },
      { text: "Export page as PDF", onPress: () => runExport(() => exportEntriesPdf(diary, [entry])) },
      { text: "Schedule page for future", onPress: () => router.push(`/future-messages?entryId=${entry.id}&diaryId=${diary.id}` as any) },
      { text: "Unlock this page later", onPress: () => router.push(`/future-messages?entryId=${entry.id}&diaryId=${diary.id}&mode=unlock` as any) },
      {
        text: entry.isFavorite ? "Remove favorite" : "Favorite",
        onPress: async () => {
          await updateEntry(diary.id, entry.id, { isFavorite: !entry.isFavorite });
          load();
        },
      },
      { text: entry.isLocked ? "Unlock page" : "Lock page", onPress: () => updateEntry(diary.id, entry.id, { isLocked: !entry.isLocked }).then(load) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  if (view === "cover") {
    return (
      <View style={[styles.coverContainer, { backgroundColor: coverStyle.colors[0] }]}>
        <View style={[styles.coverTop, { top: topPad + 16 }]}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.coverIconBtn, { backgroundColor: "#FFFFFF30" }]}>
            <Feather name="arrow-left" size={22} color="#FFFDF9" />
          </TouchableOpacity>
          <TouchableOpacity onPress={showDiaryShareMenu} style={[styles.coverIconBtn, { backgroundColor: "#FFFFFF30" }]}>
            <Feather name="share-2" size={20} color="#FFFDF9" />
          </TouchableOpacity>
        </View>

        <View style={styles.coverContent}>
          <View style={[styles.coverBook, { backgroundColor: coverStyle.colors[0], borderColor: "#FFFFFF25" }]}>
            <View style={[styles.coverBookSpine, { backgroundColor: coverStyle.colors[1] }]} />
            <View style={styles.coverBookBody}>
              <Text style={styles.coverBookTitle} numberOfLines={2}>{diary.title}</Text>
              {diary.subtitle && <Text style={styles.coverBookSub}>{diary.subtitle}</Text>}
              <Text style={styles.coverBookCat}>{diary.category}</Text>
            </View>
          </View>
          <Text style={styles.coverPagesCount}>{entries.length} {entries.length === 1 ? "page" : "pages"}</Text>
        </View>

        <View style={[styles.coverFooter, { paddingBottom: botPad + 24 }]}>
          <TouchableOpacity onPress={() => openReader()} style={styles.openBtn} activeOpacity={0.85}>
            <Feather name="book-open" size={20} color={coverStyle.colors[0]} />
            <View>
              <Text style={[styles.openBtnText, { color: coverStyle.colors[0] }]}>Open Diary View</Text>
              <Text style={[styles.openBtnSub, { color: coverStyle.colors[0] }]}>Swipe through pages like a real diary</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setView("pages"); }}
            style={[styles.newPageBtn, { borderColor: "#FFFFFF50" }]}
          >
            <Feather name="list" size={18} color="#FFFDF9" />
            <Text style={styles.newPageText}>Entries, Search & Tags</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={newPage} style={[styles.newPageBtn, { borderColor: "#FFFFFF50" }]}>
            <Feather name="plus" size={18} color="#FFFDF9" />
            <Text style={styles.newPageText}>New Page</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={newVoicePage} style={[styles.newPageBtn, { borderColor: "#FFFFFF50" }]}>
            <Feather name="mic" size={18} color="#FFFDF9" />
            <Text style={styles.newPageText}>New Voice Page</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const activeLabel = filter === "All" ? "All pages" : `${filter} · ${filtered.length} ${filtered.length === 1 ? "page" : "pages"}`;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {!!selectedIds.length && (
        <View style={[styles.selectionBar, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setSelectedIds([])} style={styles.iconBtn}><Feather name="x" size={21} color={colors.foreground} /></TouchableOpacity>
          <Text style={[styles.selectionTitle, { color: colors.foreground }]}>{selectedIds.length} selected</Text>
          <TouchableOpacity onPress={() => runExport(() => shareEntriesText(diary, selectedEntries))} style={styles.iconBtn}><Feather name="share-2" size={18} color={colors.foreground} /></TouchableOpacity>
          <TouchableOpacity onPress={() => runExport(() => exportEntriesPdf(diary, selectedEntries))} style={styles.iconBtn}><Feather name="file-text" size={18} color={colors.primary} /></TouchableOpacity>
        </View>
      )}
      {!selectedIds.length && (
      <View style={[styles.header, { paddingTop: topPad + 10 }]}>
        <TouchableOpacity onPress={() => setView("cover")} style={styles.iconBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={[styles.headerName, { color: colors.foreground }]} numberOfLines={1}>{diary.title}</Text>
          <Text style={[styles.headerMeta, { color: colors.mutedForeground }]}>{entries.length} pages</Text>
        </View>
        <TouchableOpacity onPress={showDiaryShareMenu} style={styles.iconBtn}>
          <Feather name="share-2" size={19} color={colors.foreground} />
        </TouchableOpacity>
        <TouchableOpacity onPress={newVoicePage} style={styles.iconBtn}>
          <Feather name="mic" size={19} color={colors.foreground} />
        </TouchableOpacity>
        <TouchableOpacity onPress={newPage} style={[styles.headerAddBtn, { backgroundColor: colors.primary }]}>
          <Feather name="plus" size={18} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={entry => entry.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: botPad + 24 }]}
        renderItem={({ item }) => (
          (() => {
            const lock = activeEntryLock(futureMessages, item.id);
            return (
          <EntryCard
            entry={item}
            lockedUntil={lock?.unlockDate ?? lock?.deliveryDate}
            selected={selectedIds.includes(item.id)}
            onPress={() => selectedIds.length ? toggleSelected(item) : openReader(item.id)}
            onShare={lock ? undefined : () => shareEntry(item, diary.title)}
            onMore={() => showEntryActions(item)}
            onLongPress={() => toggleSelected(item)}
          />
            );
          })()
        )}
        ListHeaderComponent={(
          <View style={styles.listHeader}>
            <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="search" size={18} color={colors.mutedForeground} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search pages, moods, tags…"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.searchInput, { color: colors.foreground }]}
              />
              {!!query && (
                <TouchableOpacity onPress={() => setQuery("")}>
                  <Feather name="x" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {chips.map(chip => (
                <TouchableOpacity
                  key={chip}
                  onPress={() => setFilter(chip)}
                  style={[
                    styles.chip,
                    { backgroundColor: filter === chip ? colors.primary : colors.card, borderColor: filter === chip ? colors.primary : colors.border },
                  ]}
                >
                  <Text style={[styles.chipText, { color: filter === chip ? colors.primaryForeground : colors.mutedForeground }]}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => openReader()} style={[styles.readerCta, { backgroundColor: colors.primary }]}>
              <View style={styles.readerCtaIcon}><Feather name="book-open" size={20} color={colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.readerCtaTitle, { color: colors.primaryForeground }]}>Open Diary View</Text>
                <Text style={[styles.readerCtaSub, { color: colors.primaryForeground }]}>Swipe through pages like a real diary</Text>
              </View>
              <Feather name="arrow-right" size={20} color={colors.primaryForeground} />
            </TouchableOpacity>
            <View style={styles.resultHeading}>
              <Text style={[styles.resultTitle, { color: colors.foreground }]}>{query ? `${filtered.length} matches` : activeLabel}</Text>
              {filter !== "All" && filtered.length > 0 && (
                <TouchableOpacity onPress={() => openReader(filtered[0].id)}>
                  <Text style={[styles.firstPageLink, { color: colors.primary }]}>Open first page</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <EmptyState
              icon={query ? "search" : "book-open"}
              title={query ? "No matching pages found" : filter === "All" ? "Your first page is waiting." : `No ${filter} pages yet.`}
              subtitle={query ? "Try another word, date, mood, or tag." : "A blank page is a lovely place to begin."}
            />
            {!query && (
              <TouchableOpacity onPress={newPage} style={[styles.emptyWriteBtn, { backgroundColor: colors.primary }]}>
                <Text style={[styles.emptyWriteText, { color: colors.primaryForeground }]}>
                  {filter === "All" ? "Write First Page" : `Write a ${filter} Page`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  coverContainer: { flex: 1, justifyContent: "space-between" },
  coverTop: { position: "absolute", left: 20, right: 20, zIndex: 10, flexDirection: "row", justifyContent: "space-between" },
  coverIconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  coverContent: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20 },
  coverBook: { width: 200, height: 260, borderRadius: 8, flexDirection: "row", borderWidth: 1, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 4, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16 },
  coverBookSpine: { width: 16 },
  coverBookBody: { flex: 1, padding: 20, justifyContent: "flex-end", gap: 6 },
  coverBookTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFFDF9", letterSpacing: -0.5 },
  coverBookSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#FFFDF9CC" },
  coverBookCat: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#FFFDF9AA", letterSpacing: 0.5 },
  coverPagesCount: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#FFFDF9AA" },
  coverFooter: { paddingHorizontal: 28, gap: 10 },
  openBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, minHeight: 64, borderRadius: 32, backgroundColor: "#FFFDF9", paddingHorizontal: 18 },
  openBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  openBtnSub: { fontSize: 11, fontFamily: "Inter_400Regular", opacity: 0.75, marginTop: 2 },
  newPageBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 46, borderRadius: 24, borderWidth: 1 },
  newPageText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#FFFDF9" },
  header: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingBottom: 12 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1 },
  headerName: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  headerMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  headerAddBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  listContent: { paddingHorizontal: 20, gap: 12, flexGrow: 1 },
  listHeader: { gap: 14, marginBottom: 2 },
  searchBar: { height: 48, borderWidth: 1, borderRadius: 24, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", gap: 10 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  chips: { gap: 8, paddingRight: 8 },
  chip: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 13, paddingVertical: 8 },
  chipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  readerCta: { minHeight: 72, borderRadius: 20, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  readerCtaIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFDF9" },
  readerCtaTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  readerCtaSub: { fontSize: 11, fontFamily: "Inter_400Regular", opacity: 0.78, marginTop: 2 },
  resultHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2 },
  resultTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  firstPageLink: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  empty: { flex: 1, justifyContent: "center", paddingVertical: 36 },
  emptyWriteBtn: { marginHorizontal: 40, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginTop: 8 },
  emptyWriteText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  selectionBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 1 },
  selectionTitle: { flex: 1, fontSize: 15, fontFamily: "Inter_700Bold" },
});
