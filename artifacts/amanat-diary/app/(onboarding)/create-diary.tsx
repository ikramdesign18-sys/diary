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

export default function CreateFirstDiaryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { createDiary, updateSettings } = useDiary();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [name, setName] = useState("My Personal Diary");
  const [category, setCategory] = useState<DiaryCategory>("Personal");
  const [coverStyle, setCoverStyle] = useState<CoverStyle>("classic");
  const [accentColor, setAccentColor] = useState(ACCENT_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await createDiary({
      title: name.trim(),
      category,
      coverStyle,
      accentColor,
      isLocked: false,
      defaultMood: "Neutral",
    });
    await updateSettings({ onboardingComplete: true, firstDiaryCreated: true });
    router.replace("/(tabs)");
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: topPad + 20, paddingBottom: botPad + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.heading, { color: colors.foreground }]}>Create your first diary</Text>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>You can create more diaries anytime.</Text>

      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>DIARY NAME</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
          placeholder="My Personal Diary"
          placeholderTextColor={colors.mutedForeground}
          maxLength={40}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>CATEGORY</Text>
        <View style={styles.chips}>
          {DIARY_CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              onPress={() => { setCategory(cat as DiaryCategory); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[
                styles.chip,
                {
                  backgroundColor: category === cat ? colors.primary : colors.secondary,
                  borderColor: category === cat ? colors.primary : "transparent",
                },
              ]}
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
                    {[0,1,2].map(i => <View key={i} style={[styles.coverLine, { backgroundColor: "#FFF4", width: i === 0 ? 20 : i === 1 ? 14 : 10 }]} />)}
                  </View>
                </View>
                <Text style={[styles.coverLabel, { color: colors.mutedForeground }]} numberOfLines={1}>{cs.label}</Text>
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

      <TouchableOpacity
        onPress={handleCreate}
        disabled={!name.trim() || saving}
        style={[styles.createBtn, { backgroundColor: colors.primary, opacity: !name.trim() ? 0.5 : 1 }]}
        activeOpacity={0.85}
      >
        <Feather name="book-open" size={20} color={colors.primaryForeground} />
        <Text style={[styles.createText, { color: colors.primaryForeground }]}>
          {saving ? "Creating..." : "Start Writing"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, gap: 28 },
  heading: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.6 },
  sub: { fontSize: 15, fontFamily: "Inter_400Regular", marginTop: -16 },
  section: { gap: 12 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  input: {
    height: 52, borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 16, fontSize: 16, fontFamily: "Inter_400Regular",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  coverRow: { flexDirection: "row", gap: 12, paddingVertical: 4 },
  coverOption: { alignItems: "center", gap: 8, borderRadius: 12, padding: 4 },
  coverPreview: {
    width: 72, height: 90, borderRadius: 8, overflow: "hidden",
    flexDirection: "row",
  },
  coverSpine: { width: 8 },
  coverLines: { flex: 1, padding: 8, justifyContent: "flex-end", gap: 5 },
  coverLine: { height: 2, borderRadius: 1, backgroundColor: "#FFF4" },
  coverLabel: { fontSize: 10, fontFamily: "Inter_400Regular", maxWidth: 80, textAlign: "center" },
  colorRow: { flexDirection: "row", gap: 12 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  createBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, height: 56, borderRadius: 28, marginTop: 8,
  },
  createText: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
});
