import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EntryCard } from "@/components/EntryCard";
import { EmptyState } from "@/components/EmptyState";
import { useDiary } from "@/context/DiaryContext";
import { useColors } from "@/hooks/useColors";
import { COVER_STYLES } from "@/constants/moods";
import type { Entry } from "@/types";

export default function DiaryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { diaries, getEntries } = useDiary();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [view, setView] = useState<"cover" | "pages">("cover");
  const diary = diaries.find(d => d.id === id);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const load = useCallback(async () => {
    if (!id) return;
    const e = await getEntries(id);
    setEntries([...e].reverse());
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (!diary) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <Text style={{ color: colors.mutedForeground }}>Diary not found</Text>
      </View>
    );
  }

  const coverStyle = COVER_STYLES.find(c => c.id === diary.coverStyle) || COVER_STYLES[0];

  if (view === "cover") {
    return (
      <View style={[styles.coverContainer, { backgroundColor: coverStyle.colors[0] }]}>
        <View style={[styles.coverBackBtn, { top: topPad + 16 }]}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.coverIconBtn, { backgroundColor: "#FFFFFF30" }]}>
            <Feather name="arrow-left" size={22} color="#FFFDF9" />
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
          <Text style={styles.coverPagesCount}>
            {diary.entryCount} {diary.entryCount === 1 ? "page" : "pages"}
          </Text>
        </View>

        <View style={[styles.coverFooter, { paddingBottom: botPad + 24 }]}>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setView("pages"); }}
            style={styles.openBtn}
            activeOpacity={0.85}
          >
            <Feather name="book-open" size={20} color={coverStyle.colors[0]} />
            <Text style={[styles.openBtnText, { color: coverStyle.colors[0] }]}>Open Diary</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push({ pathname: "/write", params: { diaryId: diary.id } })}
            style={[styles.newPageBtn, { borderColor: "#FFFFFF50" }]}
          >
            <Feather name="plus" size={18} color="#FFFDF9" />
            <Text style={styles.newPageText}>New Page</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <TouchableOpacity onPress={() => setView("cover")} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={[styles.headerName, { color: colors.foreground }]} numberOfLines={1}>{diary.title}</Text>
          <Text style={[styles.headerMeta, { color: colors.mutedForeground }]}>{diary.entryCount} pages</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push({ pathname: "/write", params: { diaryId: diary.id } })}
          style={[styles.headerAddBtn, { backgroundColor: colors.primary }]}
        >
          <Feather name="plus" size={18} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={entries}
        keyExtractor={e => e.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: botPad + 24, gap: 12, flexGrow: 1 }}
        renderItem={({ item }) => (
          <EntryCard
            entry={item}
            onPress={() => router.push(`/diary/${diary.id}/entry/${item.id}`)}
          />
        )}
        ListEmptyComponent={() => (
          <View style={{ flex: 1, justifyContent: "center" }}>
            <EmptyState
              icon="book-open"
              title="This diary is empty"
              subtitle="Write the first page of your story."
            />
            <TouchableOpacity
              onPress={() => router.push({ pathname: "/write", params: { diaryId: diary.id } })}
              style={[styles.emptyWriteBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.emptyWriteText, { color: colors.primaryForeground }]}>Write First Page</Text>
            </TouchableOpacity>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  coverContainer: { flex: 1, justifyContent: "space-between" },
  coverBackBtn: { position: "absolute", left: 20, zIndex: 10 },
  coverIconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  coverContent: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20 },
  coverBook: {
    width: 200, height: 260, borderRadius: 8, flexDirection: "row",
    borderWidth: 1, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 4, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16,
  },
  coverBookSpine: { width: 16 },
  coverBookBody: { flex: 1, padding: 20, justifyContent: "flex-end", gap: 6 },
  coverBookTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFFDF9", letterSpacing: -0.5 },
  coverBookSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#FFFDF9CC" },
  coverBookCat: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#FFFDF9AA", letterSpacing: 0.5 },
  coverPagesCount: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#FFFDF9AA" },
  coverFooter: { paddingHorizontal: 28, gap: 12 },
  openBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, height: 56, borderRadius: 28, backgroundColor: "#FFFDF9",
  },
  openBtnText: { fontSize: 17, fontFamily: "Inter_700Bold" },
  newPageBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, height: 48, borderRadius: 24, borderWidth: 1,
  },
  newPageText: { fontSize: 15, fontFamily: "Inter_500Medium", color: "#FFFDF9" },
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingBottom: 16,
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1 },
  headerName: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  headerMeta: { fontSize: 13, fontFamily: "Inter_400Regular" },
  headerAddBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  emptyWriteBtn: {
    marginHorizontal: 40, height: 48, borderRadius: 24,
    alignItems: "center", justifyContent: "center", marginTop: 8,
  },
  emptyWriteText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
