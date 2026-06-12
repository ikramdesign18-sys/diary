import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { Entry } from "@/types";
import { MOODS } from "@/constants/moods";
import { getDiaryTheme } from "@/constants/diaryThemes";

interface EntryCardProps {
  entry: Entry;
  diaryTitle?: string;
  onPress: () => void;
  onLongPress?: () => void;
  onShare?: () => void;
  onMore?: () => void;
  selected?: boolean;
  lockedUntil?: string;
}

export function EntryCard({ entry, diaryTitle, onPress, onLongPress, onShare, onMore, selected, lockedUntil }: EntryCardProps) {
  const colors = useColors();
  const moodConfig = MOODS.find(m => m.label === entry.mood);
  const theme = getDiaryTheme(entry.themeId);
  const bg = lockedUntil ? colors.card : entry.themeId ? theme.paperColor : moodConfig ? (colors as any)[moodConfig.bgKey] as string : colors.card;
  const accent = lockedUntil ? colors.primary : entry.themeId ? theme.accentColor : moodConfig ? (colors as any)[moodConfig.accentKey] as string : colors.mutedForeground;

  const dateStr = new Date(entry.date).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.85}
      style={[styles.card, { backgroundColor: bg, borderColor: selected ? colors.primary : colors.border, borderWidth: selected ? 2 : 1 }]}
    >
      <View style={styles.top}>
        {lockedUntil ? (
          <View style={styles.dateMood}>
            <Feather name="lock" size={13} color={accent} />
            <Text style={[styles.pageNumber, { color: accent }]}>SEALED MEMORY</Text>
          </View>
        ) : <View style={styles.dateMood}>
          <Text style={[styles.pageNumber, { color: accent }]}>PAGE {entry.pageNumber}</Text>
          <Text style={[styles.date, { color: colors.mutedForeground }]}>{dateStr}</Text>
          <View style={[styles.moodTag, { backgroundColor: accent + "22" }]}>
            <Text style={[styles.moodText, { color: accent }]}>{entry.mood}</Text>
          </View>
        </View>}
        <View style={styles.icons}>
          {!lockedUntil && entry.isFavorite && <Feather name="heart" size={13} color={accent} />}
          {!lockedUntil && entry.hasVoice && <Feather name="mic" size={13} color={colors.mutedForeground} />}
          {!lockedUntil && !!entry.photos?.length && <Feather name="image" size={13} color={colors.mutedForeground} />}
          {onShare && !lockedUntil && (
            <TouchableOpacity
              onPress={event => {
                event.stopPropagation();
                onShare();
              }}
              hitSlop={10}
            >
              <Feather name="share-2" size={15} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
          {selected && <Feather name="check-circle" size={16} color={colors.primary} />}
          {onMore ? (
            <TouchableOpacity onPress={event => { event.stopPropagation(); onMore(); }} hitSlop={10}>
              <Feather name="more-horizontal" size={15} color={colors.mutedForeground} />
            </TouchableOpacity>
          ) : <Feather name="more-horizontal" size={15} color={colors.mutedForeground} />}
        </View>
      </View>
      {lockedUntil ? (
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>This memory is sealed</Text>
      ) : entry.title ? (
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>{entry.title}</Text>
      ) : null}
      <Text style={[styles.body, { color: colors.mutedForeground }]} numberOfLines={2}>
        {lockedUntil ? `This memory will open on ${new Date(lockedUntil).toLocaleDateString()}.` : entry.body || "No text written yet."}
      </Text>
      {diaryTitle && !lockedUntil && (
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
  pageNumber: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.7,
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
