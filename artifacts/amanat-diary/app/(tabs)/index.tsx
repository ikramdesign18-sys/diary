import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DiaryCard } from "@/components/DiaryCard";
import { EntryCard } from "@/components/EntryCard";
import { EmptyState } from "@/components/EmptyState";
import { useDiary } from "@/context/DiaryContext";
import { useColors } from "@/hooks/useColors";
import type { Entry } from "@/types";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function todayStr() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { diaries, getEntries } = useDiary();
  const [recentEntries, setRecentEntries] = useState<Entry[]>([]);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    const load = async () => {
      const all: Entry[] = [];
      for (const d of diaries) {
        const entries = await getEntries(d.id);
        all.push(...entries);
      }
      all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRecentEntries(all.slice(0, 5));
    };
    load();
  }, [diaries]);

  const getDiaryTitle = (diaryId: string) => diaries.find(d => d.id === diaryId)?.title;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: botPad + 88 }}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: topPad + 16 }]}>
          <View>
            <Text style={[styles.greeting, { color: colors.foreground }]}>{greeting()}</Text>
            <Text style={[styles.date, { color: colors.mutedForeground }]}>{todayStr()}</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/search")}
            style={[styles.searchBtn, { backgroundColor: colors.secondary }]}
          >
            <Feather name="search" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            onPress={() => router.push("/write")}
            style={[styles.quickBtn, styles.quickBtnPrimary, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <Feather name="edit-3" size={20} color={colors.primaryForeground} />
            <Text style={[styles.quickText, { color: colors.primaryForeground }]}>Write Today</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/voice")}
            style={[styles.quickBtn, { backgroundColor: colors.secondary, flex: 1 }]}
            activeOpacity={0.85}
          >
            <Feather name="mic" size={20} color={colors.primary} />
            <Text style={[styles.quickText, { color: colors.primary }]}>Speak Today</Text>
          </TouchableOpacity>
        </View>

        {/* Diaries */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>My Diaries</Text>
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/create-diary"); }}
              style={[styles.addBtn, { backgroundColor: colors.secondary }]}
            >
              <Feather name="plus" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {diaries.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <EmptyState icon="book" title="No diaries yet" subtitle="Create your first diary to begin your story." />
              <TouchableOpacity
                onPress={() => router.push("/create-diary")}
                style={[styles.createDiaryBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.createDiaryText, { color: colors.primaryForeground }]}>Create First Diary</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.diaryList}>
              {diaries.map(diary => (
                <DiaryCard
                  key={diary.id}
                  diary={diary}
                  onPress={() => router.push(`/diary/${diary.id}`)}
                />
              ))}
              <TouchableOpacity
                onPress={() => router.push("/create-diary")}
                style={[styles.newDiaryBtn, { borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                <Feather name="plus" size={18} color={colors.mutedForeground} />
                <Text style={[styles.newDiaryText, { color: colors.mutedForeground }]}>New Diary</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Recent Memories */}
        {recentEntries.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Memories</Text>
            <View style={styles.entriesList}>
              {recentEntries.map(entry => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  diaryTitle={getDiaryTitle(entry.diaryId)}
                  onPress={() => router.push(`/diary/${entry.diaryId}/entry/${entry.id}`)}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push("/write")}
        style={[styles.fab, { backgroundColor: colors.primary, bottom: botPad + 80 }]}
        activeOpacity={0.85}
      >
        <Feather name="edit-3" size={24} color={colors.primaryForeground} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  greeting: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  date: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 3 },
  searchBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  quickActions: { flexDirection: "row", gap: 10, paddingHorizontal: 24, marginBottom: 28 },
  quickBtn: { flexDirection: "row", alignItems: "center", gap: 8, height: 50, borderRadius: 25, paddingHorizontal: 18 },
  quickBtnPrimary: { flex: 1.2 },
  quickText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  section: { paddingHorizontal: 24, marginBottom: 28 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  addBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  diaryList: { gap: 10 },
  emptyCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  createDiaryBtn: {
    margin: 16, marginTop: 0, height: 46, borderRadius: 23,
    alignItems: "center", justifyContent: "center",
  },
  createDiaryText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  newDiaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, height: 54, borderRadius: 12, borderWidth: 1.5, borderStyle: "dashed",
  },
  newDiaryText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  entriesList: { gap: 10 },
  fab: {
    position: "absolute", right: 24,
    width: 56, height: 56, borderRadius: 28,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#2C1810", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 6,
  },
});
