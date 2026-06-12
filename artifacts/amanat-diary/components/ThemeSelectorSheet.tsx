import { Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemePreviewCard } from "@/components/ThemePreviewCard";
import { DIARY_THEMES, THEME_CATEGORIES } from "@/constants/diaryThemes";
import { useColors } from "@/hooks/useColors";

export function ThemeSelectorSheet({
  visible,
  currentThemeId,
  autoTheme,
  onApply,
  onClose,
}: {
  visible: boolean;
  currentThemeId: string;
  autoTheme: boolean;
  onApply: (themeId: string) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState(currentThemeId);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => { if (visible) setSelected(currentThemeId); }, [currentThemeId, visible]);

  const themes = useMemo(() => DIARY_THEMES.filter(theme =>
    (category === "All" || theme.category === category || theme.moodTags.some(tag => tag.toLowerCase() === category.toLowerCase())) &&
    (!query.trim() || `${theme.name} ${theme.category} ${theme.moodTags.join(" ")}`.toLowerCase().includes(query.toLowerCase()))
  ), [category, query]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === "web" ? 32 : insets.top + 8 }]}>
        <View style={styles.header}>
          <View>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.foreground }]}>Choose Page Theme</Text>
              {autoTheme && <View style={[styles.autoBadge, { backgroundColor: colors.moodCalm }]}><Feather name="zap" size={10} color={colors.moodCalmAccent} /><Text style={[styles.autoText, { color: colors.moodCalmAccent }]}>AUTO</Text></View>}
            </View>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>A different paper for every part of your story.</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.close}><Feather name="x" size={21} color={colors.foreground} /></TouchableOpacity>
        </View>
        <View style={[styles.search, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={17} color={colors.mutedForeground} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Search themes…" placeholderTextColor={colors.mutedForeground} style={[styles.searchInput, { color: colors.foreground }]} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
          {THEME_CATEGORIES.map(item => (
            <TouchableOpacity key={item} onPress={() => setCategory(item)} style={[styles.category, { backgroundColor: category === item ? colors.primary : colors.card, borderColor: category === item ? colors.primary : colors.border }]}>
              <Text style={[styles.categoryText, { color: category === item ? colors.primaryForeground : colors.mutedForeground }]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <FlatList
          data={themes}
          numColumns={2}
          keyExtractor={theme => theme.id}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <ThemePreviewCard theme={item} selected={selected === item.id} onPress={() => setSelected(item.id)} />}
        />
        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <TouchableOpacity onPress={() => onApply(selected)} style={[styles.apply, { backgroundColor: colors.primary }]}>
            <Text style={[styles.applyText, { color: colors.primaryForeground }]}>Apply Theme</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 21, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  subtitle: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 3 },
  autoBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 },
  autoText: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  close: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  search: { marginHorizontal: 20, height: 44, borderRadius: 22, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  categories: { paddingHorizontal: 20, paddingVertical: 13, gap: 7 },
  category: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 7 },
  categoryText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  list: { paddingHorizontal: 20, paddingBottom: 90, gap: 10 },
  row: { justifyContent: "space-between", marginBottom: 10 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, borderTopWidth: 1, padding: 14 },
  apply: { height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  applyText: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
