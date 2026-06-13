import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDiary } from "@/context/DiaryContext";
import { useColors } from "@/hooks/useColors";
import { MOODS } from "@/constants/moods";
import type { Entry } from "@/types";
import { activeEntryLock } from "@/lib/futureMemories";
import { VoicePlayer } from "@/components/VoicePlayer";
import { FramedPhotos, PageBackgroundDecorations } from "@/components/PageCustomizationElements";
import { PageStickerCanvas } from "@/components/PageStickerCanvas";
import { getDiaryTheme } from "@/constants/diaryThemes";
import { getPageBackground, getPageFont, getTextStyle } from "@/constants/pageCustomization";

export default function EntryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id: diaryId, entryId } = useLocalSearchParams<{ id: string; entryId: string }>();
  const { diaries, futureMessages, getEntries, updateEntry, deleteEntry } = useDiary();
  const [entry, setEntry] = useState<Entry | null>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const diary = diaries.find(d => d.id === diaryId);
  const moodConfig = entry ? MOODS.find(m => m.label === entry.mood) : null;
  const theme = getDiaryTheme(entry?.themeId);
  const customBackground = getPageBackground(entry?.backgroundKey);
  const customFont = getPageFont(entry?.fontKey);
  const customText = getTextStyle(entry?.textStyleKey);
  const pageBg = entry?.backgroundKey && entry.backgroundKey !== "theme" ? customBackground.paper : moodConfig ? (colors as any)[moodConfig.bgKey] as string : theme.paperColor;
  const accent = entry?.backgroundKey && entry.backgroundKey !== "theme" ? customBackground.accent : moodConfig ? (colors as any)[moodConfig.accentKey] as string : theme.accentColor;

  useEffect(() => {
    if (!diaryId || !entryId) return;
    getEntries(diaryId).then(entries => {
      const found = entries.find(e => e.id === entryId);
      if (!found) return;
      if (activeEntryLock(futureMessages, found.id)) {
        router.replace(`/diary/${diaryId}/view?entryId=${found.id}` as any);
        return;
      }
      setEntry(found);
    });
  }, [diaryId, entryId, futureMessages, getEntries]);

  if (!entry) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  const dateStr = new Date(entry.date).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  const timeStr = new Date(entry.createdAt).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });

  const handleFavorite = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = { ...entry, isFavorite: !entry.isFavorite };
    setEntry(updated);
    await updateEntry(diaryId!, entryId!, { isFavorite: updated.isFavorite });
  };

  const handleDelete = () => {
    Alert.alert("Delete Entry", "This memory will be permanently deleted.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await deleteEntry(diaryId!, entryId!);
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: pageBg }]}>
      {entry.backgroundKey && entry.backgroundKey !== "theme" && <PageBackgroundDecorations backgroundKey={entry.backgroundKey} accent={accent} />}
      {/* Toolbar */}
      <View style={[styles.toolbar, { paddingTop: topPad + 12, borderBottomColor: colors.border + "40" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="arrow-left" size={22} color={colors.mutedForeground} />
        </TouchableOpacity>
        <Text style={[styles.diaryName, { color: colors.mutedForeground }]} numberOfLines={1}>
          {diary?.title}
        </Text>
        <View style={styles.toolbarRight}>
          <TouchableOpacity onPress={handleFavorite} style={styles.iconBtn}>
            <Feather name="heart" size={20} color={entry.isFavorite ? "#C08070" : colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
            <Feather name="trash-2" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        nestedScrollEnabled
        directionalLockEnabled
        style={styles.pageScroll}
        contentContainerStyle={[styles.page, { paddingBottom: botPad + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <PageStickerCanvas stickers={entry.stickers} accent={accent} />
        {/* Page Header */}
        <View style={[styles.pageHeader, { borderBottomColor: accent + "40" }]}>
          <Text style={[styles.pageDate, { color: accent }]}>{dateStr}</Text>
          <View style={styles.pageHeaderRight}>
            <Text style={[styles.pageTime, { color: colors.mutedForeground }]}>{timeStr}</Text>
            <View style={[styles.moodTag, { backgroundColor: accent + "20" }]}>
              <Text style={[styles.moodText, { color: accent }]}>{entry.mood}</Text>
            </View>
          </View>
          <Text style={[styles.pageNum, { color: colors.border }]}>Page {entry.pageNumber}</Text>
        </View>

        {entry.title ? (
          <Text style={[styles.title, { color: colors.foreground, fontFamily: customFont.title }]}>{entry.title}</Text>
        ) : null}

        {entry.hasVoice && <VoicePlayer uri={entry.voiceUri} duration={entry.voiceDuration} accent={accent} muted={colors.mutedForeground} />}

        <Text style={[styles.body, { color: colors.foreground, fontFamily: customFont.body, fontSize: customText.size, lineHeight: customText.lineHeight, textAlign: customText.align }]}>{entry.bodyPolished || entry.body || entry.voiceTranscript || "No text written."}</Text>

        <FramedPhotos photos={entry.photos} frameKey={entry.photoFrameKey} accent={accent} />

        {entry.tags.length > 0 && (
          <View style={styles.tags}>
            {entry.tags.map(tag => (
              <View key={tag} style={[styles.tag, { backgroundColor: accent + "15" }]}>
                <Text style={[styles.tagText, { color: accent }]}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.footer, { color: colors.border }]}>
          Page {entry.pageNumber} of {diary?.entryCount ?? "?"}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  toolbar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  diaryName: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  toolbarRight: { flexDirection: "row" },
  pageScroll: { flex: 1 },
  page: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 4, position: "relative", minHeight: 620 },
  pageHeader: { paddingVertical: 18, borderBottomWidth: 1, marginBottom: 24, gap: 6 },
  pageDate: { fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  pageHeaderRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  pageTime: { fontSize: 12, fontFamily: "Inter_400Regular" },
  moodTag: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  moodText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  pageNum: { fontSize: 11, fontFamily: "Inter_400Regular" },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.6, marginBottom: 20, lineHeight: 34 },
  voiceCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 20,
  },
  voiceText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  playBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  body: { fontSize: 18, fontFamily: "Inter_400Regular", lineHeight: 30 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 24 },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16 },
  tagText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  footer: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 40 },
});
