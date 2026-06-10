import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { Entry } from "@/types";
import { MOODS } from "@/constants/moods";

interface EntryCardProps {
  entry: Entry;
  diaryTitle?: string;
  onPress: () => void;
}

export function EntryCard({ entry, diaryTitle, onPress }: EntryCardProps) {
  const colors = useColors();
  const moodConfig = MOODS.find(m => m.label === entry.mood);
  const bg = moodConfig ? (colors as any)[moodConfig.bgKey] as string : colors.card;
  const accent = moodConfig ? (colors as any)[moodConfig.accentKey] as string : colors.mutedForeground;

  const dateStr = new Date(entry.date).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.card, { backgroundColor: bg, borderColor: colors.border }]}
    >
      <View style={styles.top}>
        <View style={styles.dateMood}>
          <Text style={[styles.date, { color: colors.mutedForeground }]}>{dateStr}</Text>
          <View style={[styles.moodTag, { backgroundColor: accent + "22" }]}>
            <Text style={[styles.moodText, { color: accent }]}>{entry.mood}</Text>
          </View>
        </View>
        <View style={styles.icons}>
          {entry.isFavorite && <Feather name="heart" size={13} color={accent} />}
          {entry.hasVoice && <Feather name="mic" size={13} color={colors.mutedForeground} />}
          {entry.photos.length > 0 && <Feather name="image" size={13} color={colors.mutedForeground} />}
        </View>
      </View>
      {entry.title ? (
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>{entry.title}</Text>
      ) : null}
      <Text style={[styles.body, { color: colors.mutedForeground }]} numberOfLines={2}>
        {entry.body || "No text written yet."}
      </Text>
      {diaryTitle && (
        <Text style={[styles.diary, { color: colors.mutedForeground }]}>{diaryTitle}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 6,
    shadowColor: "#2C1810",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateMood: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  date: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  moodTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  moodText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  icons: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  title: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  diary: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
});
