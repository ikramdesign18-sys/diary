import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { DiaryTheme } from "@/types";

export function ThemePreviewCard({ theme, selected, onPress }: { theme: DiaryTheme; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.84} style={[styles.card, { borderColor: selected ? theme.accentColor : theme.borderColor, backgroundColor: theme.backgroundColor }]}>
      <View style={[styles.preview, { backgroundColor: theme.paperColor, borderColor: theme.borderColor, shadowColor: theme.shadowColor }]}>
        {theme.lineStyle !== "none" && (
          <View style={styles.lines}>
            {[0, 1, 2, 3].map(line => <View key={line} style={[styles.line, { backgroundColor: theme.borderColor }]} />)}
          </View>
        )}
        {theme.decorationStyle !== "none" && <View style={[styles.decoration, { borderColor: theme.accentColor }]} />}
        <View style={[styles.miniDate, { backgroundColor: theme.accentColor }]} />
        <View style={[styles.miniTitle, { backgroundColor: theme.textColor }]} />
        <View style={[styles.miniBody, { backgroundColor: theme.secondaryTextColor }]} />
        <View style={[styles.miniBody, { width: "64%", backgroundColor: theme.secondaryTextColor }]} />
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: theme.textColor }]} numberOfLines={1}>{theme.name}</Text>
          {selected && <Feather name="check-circle" size={16} color={theme.accentColor} />}
        </View>
        <Text style={[styles.category, { color: theme.secondaryTextColor }]}>{theme.category}</Text>
        <View style={styles.dots}>
          {[theme.paperColor, theme.accentColor, theme.textColor].map(color => <View key={color} style={[styles.dot, { backgroundColor: color, borderColor: theme.borderColor }]} />)}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { width: "48%", borderWidth: 1.5, borderRadius: 17, padding: 9, gap: 9 },
  preview: { height: 128, borderRadius: 10, borderWidth: 1, padding: 13, overflow: "hidden", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 5 },
  lines: { ...StyleSheet.absoluteFillObject, paddingTop: 50, gap: 16 },
  line: { height: 1, opacity: 0.6 },
  decoration: { position: "absolute", width: 36, height: 36, borderWidth: 1, borderRadius: 18, right: -18, top: -18, opacity: 0.5 },
  miniDate: { width: 30, height: 3, borderRadius: 2, opacity: 0.7, marginBottom: 14 },
  miniTitle: { width: "70%", height: 7, borderRadius: 3, opacity: 0.82, marginBottom: 13 },
  miniBody: { width: "88%", height: 3, borderRadius: 2, opacity: 0.45, marginBottom: 7 },
  info: { gap: 3 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  name: { flex: 1, fontSize: 11, fontFamily: "Inter_700Bold" },
  category: { fontSize: 9, fontFamily: "Inter_500Medium" },
  dots: { flexDirection: "row", gap: 4, marginTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1 },
});
