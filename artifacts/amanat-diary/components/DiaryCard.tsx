import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { Diary } from "@/types";
import { COVER_STYLES } from "@/constants/moods";

interface DiaryCardProps {
  diary: Diary;
  onPress: () => void;
  onLongPress?: () => void;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 86400) return "today";
  if (diff < 172800) return "yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function DiaryCard({ diary, onPress, onLongPress }: DiaryCardProps) {
  const colors = useColors();
  const coverStyle = COVER_STYLES.find(c => c.id === diary.coverStyle) || COVER_STYLES[0];

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onLongPress?.(); }}
      activeOpacity={0.85}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={[styles.spine, { backgroundColor: coverStyle.colors[0] }]} />
      <View style={styles.body}>
        <View style={styles.top}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
              {diary.title}
            </Text>
            {diary.isLocked && (
              <Feather name="lock" size={13} color={colors.mutedForeground} />
            )}
          </View>
          <Text style={[styles.category, { color: colors.mutedForeground }]}>{diary.category}</Text>
        </View>
        <View style={styles.bottom}>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {diary.entryCount === 0
              ? "No pages yet"
              : `${diary.entryCount} ${diary.entryCount === 1 ? "page" : "pages"}`}
          </Text>
          {diary.updatedAt && (
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {formatDate(diary.updatedAt)}
            </Text>
          )}
        </View>
      </View>
      <View style={[styles.coverRight, { backgroundColor: coverStyle.colors[1] + "22" }]}>
        <View style={[styles.bindingLine, { backgroundColor: coverStyle.colors[0] + "44" }]} />
        <View style={[styles.bindingLine, { backgroundColor: coverStyle.colors[0] + "44" }]} />
        <View style={[styles.bindingLine, { backgroundColor: coverStyle.colors[0] + "44" }]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    height: 104,
    shadowColor: "#2C1810",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  spine: {
    width: 7,
  },
  body: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 15,
    justifyContent: "space-between",
  },
  top: {
    gap: 3,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: -0.3,
    flex: 1,
  },
  category: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  bottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  meta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  coverRight: {
    width: 44,
    paddingVertical: 13,
    justifyContent: "space-around",
    alignItems: "center",
  },
  bindingLine: {
    width: 23,
    height: 1.5,
    borderRadius: 1,
  },
});
