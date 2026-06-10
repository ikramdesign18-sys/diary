import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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

import { EntryCard } from "@/components/EntryCard";
import { EmptyState } from "@/components/EmptyState";
import { useDiary } from "@/context/DiaryContext";
import { useColors } from "@/hooks/useColors";
import { MOODS } from "@/constants/moods";
import type { Entry, Mood } from "@/types";

export default function TimelineScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { diaries, getAllEntries } = useDiary();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [filterMood, setFilterMood] = useState<Mood | null>(null);
  const [filterDiary, setFilterDiary] = useState<string | null>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const load = useCallback(async () => {
    const all = await getAllEntries();
    setEntries(all);
  }, [getAllEntries]);

  useEffect(() => { load(); }, [load]);

  const getDiaryTitle = (id: string) => diaries.find(d => d.id === id)?.title;

  const filtered = entries.filter(e => {
    if (filterMood && e.mood !== filterMood) return false;
    if (filterDiary && e.diaryId !== filterDiary) return false;
    return true;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Timeline</Text>
        <Text style={[styles.count, { color: colors.mutedForeground }]}>{filtered.length} memories</Text>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filters}>
        <TouchableOpacity
          onPress={() => setFilterMood(null)}
          style={[styles.filter, { backgroundColor: !filterMood ? colors.primary : colors.secondary }]}
        >
          <Text style={[styles.filterText, { color: !filterMood ? colors.primaryForeground : colors.mutedForeground }]}>All</Text>
        </TouchableOpacity>
        {MOODS.slice(0, 6).map(m => (
          <TouchableOpacity
            key={m.label}
            onPress={() => setFilterMood(filterMood === m.label ? null : m.label)}
            style={[styles.filter, { backgroundColor: filterMood === m.label ? colors.primary : colors.secondary }]}
          >
            <Text style={[styles.filterText, { color: filterMood === m.label ? colors.primaryForeground : colors.mutedForeground }]}>
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={e => e.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: botPad + 88, gap: 10, flexGrow: 1 }}
        renderItem={({ item }) => (
          <EntryCard
            entry={item}
            diaryTitle={getDiaryTitle(item.diaryId)}
            onPress={() => router.push(`/diary/${item.diaryId}/entry/${item.id}`)}
          />
        )}
        ListEmptyComponent={() => (
          <EmptyState
            icon="clock"
            title="No memories yet"
            subtitle="Your diary pages will appear here in chronological order."
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 16 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.6 },
  count: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 4 },
  filtersScroll: { maxHeight: 52 },
  filters: { paddingHorizontal: 24, gap: 8, paddingBottom: 12 },
  filter: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  filterText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
