import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDiary } from "@/context/DiaryContext";
import { useColors } from "@/hooks/useColors";
import { COVER_STYLES, DIARY_CATEGORIES, ACCENT_COLORS } from "@/constants/moods";
import type { DiaryCategory, CoverStyle } from "@/types";

export default function CreateDiaryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { createDiary } = useDiary();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [category, setCategory] = useState<DiaryCategory>("Personal");
  const [coverStyle, setCoverStyle] = useState<CoverStyle>("classic");
  const [accentColor, setAccentColor] = useState(ACCENT_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const diary = await createDiary({
      title: name.trim(),
      subtitle: subtitle.trim() || undefined,
      category,
      coverStyle,
      accentColor,
      isLocked: false,
      defaultMood: "Neutral",
    });
    router.replace(`/diary/${diary.id}`);
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: topPad + 20, paddingBottom: botPad + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="x" size={22} color={colors.mutedForeground} />
        </TouchableOpacity>
        <Text style={[styles.heading, { color: colors.foreground }]}>New Diary</Text>
        <TouchableOpacity
          onPress={handleCreate}
          disabled={!name.trim() || saving}
          style={{ opacity: !name.trim() ? 0.4 : 1 }}
        >
          <Text style={[styles.saveText, { color: colors.primary }]}>
            {saving ? "Creating..." : "Create"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>NAME</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
          placeholder="Diary name"
          placeholderTextColor={colors.mutedForeground}
          maxLength={40}
          autoFocus
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>SUBTITLE (OPTIONAL)</Text>
        <TextInput
          value={subtitle}
          onChangeText={setSubtitle}
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
          placeholder="A short description"
          placeholderTextColor={colors.mutedForeground}
          maxLength={60}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>CATEGORY</Text>
        <View style={styles.chips}>
          {DIARY_CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              onPress={() => { setCategory(cat as DiaryCategory); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[styles.chip, { backgroundColor: category === cat ? colors.primary : colors.secondary }]}
            >
              <Text style={[styles.chipText, { color: category === cat ? colors.primaryForeground : colors.mutedForeground }]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>COVER STYLE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.coverRow}>
            {COVER_STYLES.map(cs => (
              <TouchableOpacity
                key={cs.id}
                onPress={() => { setCoverStyle(cs.id as CoverStyle); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[styles.coverOption, { borderColor: coverStyle === cs.id ? colors.primary : colors.border, borderWidth: coverStyle === cs.id ? 2 : 1 }]}
              >
                <View style={[styles.coverPreview, { backgroundColor: cs.colors[0] }]}>
                  <View style={[styles.coverSpine, { backgroundColor: cs.colors[1] }]} />
                  <View style={styles.coverLines}>
                    {[20, 14, 10].map((w, i) => <View key={i} style={[styles.coverLine, { width: w }]} />)}
                  </View>
                </View>
                <Text style={[styles.coverLabel, { color: colors.mutedForeground }]}>{cs.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>ACCENT COLOR</Text>
        <View style={styles.colorRow}>
          {ACCENT_COLORS.map(c => (
            <TouchableOpacity
              key={c}
              onPress={() => { setAccentColor(c); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[styles.colorDot, { backgroundColor: c, borderWidth: accentColor === c ? 3 : 0, borderColor: colors.foreground }]}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, gap: 28 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  heading: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  saveText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  section: { gap: 12 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  input: { height: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 16, fontFamily: "Inter_400Regular" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  coverRow: { flexDirection: "row", gap: 12, paddingVertical: 4 },
  coverOption: { alignItems: "center", gap: 8, borderRadius: 12, padding: 4 },
  coverPreview: { width: 72, height: 90, borderRadius: 8, overflow: "hidden", flexDirection: "row" },
  coverSpine: { width: 8 },
  coverLines: { flex: 1, padding: 8, justifyContent: "flex-end", gap: 5 },
  coverLine: { height: 2, borderRadius: 1, backgroundColor: "#FFF4" },
  coverLabel: { fontSize: 10, fontFamily: "Inter_400Regular", maxWidth: 80, textAlign: "center" },
  colorRow: { flexDirection: "row", gap: 12 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
});
