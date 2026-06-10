import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EntryCard } from "@/components/EntryCard";
import { EmptyState } from "@/components/EmptyState";
import { useDiary } from "@/context/DiaryContext";
import { useColors } from "@/hooks/useColors";
import type { Entry } from "@/types";

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { diaries, getAllEntries } = useDiary();
  const [query, setQuery] = useState("");
  const [allEntries, setAllEntries] = useState<Entry[]>([]);
  const [results, setResults] = useState<Entry[]>([]);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    getAllEntries().then(setAllEntries);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.toLowerCase();
    setResults(allEntries.filter(e =>
      e.title?.toLowerCase().includes(q) ||
      e.body?.toLowerCase().includes(q) ||
      e.mood?.toLowerCase().includes(q) ||
      e.tags?.some(t => t.toLowerCase().includes(q))
    ));
  }, [query, allEntries]);

  const getDiaryTitle = (id: string) => diaries.find(d => d.id === id)?.title;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search memories, moods, tags..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn}>
          <Text style={[styles.cancel, { color: colors.primary }]}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={results}
        keyExtractor={e => e.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: botPad + 24, gap: 10, flexGrow: 1 }}
        renderItem={({ item }) => (
          <EntryCard
            entry={item}
            diaryTitle={getDiaryTitle(item.diaryId)}
            onPress={() => { router.back(); setTimeout(() => router.push(`/diary/${item.diaryId}/entry/${item.id}`), 100); }}
          />
        )}
        ListEmptyComponent={() =>
          query.trim() ? (
            <EmptyState icon="search" title="No memories found" subtitle="Try another keyword, mood, or date." />
          ) : (
            <View style={styles.suggestions}>
              <Text style={[styles.suggestTitle, { color: colors.mutedForeground }]}>SEARCH BY</Text>
              {["Keyword or phrase", "Mood (Happy, Calm, Sad...)", "Tag name", "Diary name"].map(s => (
                <View key={s} style={[styles.suggestionRow, { borderBottomColor: colors.border }]}>
                  <Feather name="search" size={14} color={colors.border} />
                  <Text style={[styles.suggestionText, { color: colors.mutedForeground }]}>{s}</Text>
                </View>
              ))}
            </View>
          )
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingBottom: 16,
  },
  searchBar: {
    flex: 1, flexDirection: "row", alignItems: "center",
    gap: 10, height: 48, borderRadius: 24, paddingHorizontal: 14, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular" },
  cancelBtn: { paddingHorizontal: 4, paddingVertical: 8 },
  cancel: { fontSize: 16, fontFamily: "Inter_500Medium" },
  suggestions: { paddingTop: 8 },
  suggestTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginBottom: 12 },
  suggestionRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 14, borderBottomWidth: 1,
  },
  suggestionText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
