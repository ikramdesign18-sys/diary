import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MoodPicker } from "@/components/MoodPicker";
import { useDiary } from "@/context/DiaryContext";
import { useColors } from "@/hooks/useColors";
import { MOODS } from "@/constants/moods";
import type { Mood } from "@/types";

function formatDate() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
function formatTime() {
  return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export default function WriteScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { diaryId: paramDiaryId } = useLocalSearchParams<{ diaryId?: string }>();
  const { diaries, createEntry } = useDiary();
  const [diaryId, setDiaryId] = useState(paramDiaryId ?? diaries[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mood, setMood] = useState<Mood>("Neutral");
  const [moodPickerVisible, setMoodPickerVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const moodConfig = MOODS.find(m => m.label === mood);
  const pageBg = moodConfig ? (colors as any)[moodConfig.bgKey] as string : colors.paper;
  const accentColor = moodConfig ? (colors as any)[moodConfig.accentKey] as string : colors.mutedForeground;
  const selectedDiary = diaries.find(d => d.id === diaryId);

  useEffect(() => {
    if (!diaryId && diaries.length > 0) setDiaryId(diaries[0].id);
  }, [diaries]);

  useEffect(() => {
    if (body.length > 0 || title.length > 0) {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
      autoSaveRef.current = setTimeout(() => setSavedAt(new Date()), 3000);
    }
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, [body, title]);

  const handleSave = async () => {
    if (!diaryId) {
      Alert.alert("No diary selected", "Please create a diary first.");
      return;
    }
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await createEntry({
      diaryId,
      title: title.trim(),
      body: body.trim(),
      mood,
      tags: [],
      isFavorite: false,
      isLocked: false,
      hasVoice: false,
      photos: [],
      date: new Date().toISOString(),
    });
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: pageBg }}>
      <KeyboardAvoidingView
        behavior="padding"
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={[styles.topBar, { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 8, borderBottomColor: colors.border + "40" }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Feather name="x" size={22} color={colors.mutedForeground} />
          </TouchableOpacity>

          {/* Diary Selector */}
          {selectedDiary && (
            <View style={[styles.diaryPill, { backgroundColor: colors.border + "60" }]}>
              <Feather name="book-open" size={13} color={colors.mutedForeground} />
              <Text style={[styles.diaryName, { color: colors.mutedForeground }]} numberOfLines={1}>
                {selectedDiary.title}
              </Text>
            </View>
          )}

          <View style={styles.headerRight}>
            {savedAt && (
              <Text style={[styles.savedText, { color: accentColor }]}>Saved</Text>
            )}
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving || (!body.trim() && !title.trim())}
              style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: (!body.trim() && !title.trim()) ? 0.4 : 1 }]}
            >
              <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.page, { paddingBottom: botPad + 100 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Page Header */}
          <View style={[styles.pageHeader, { borderBottomColor: colors.border + "40" }]}>
            <Text style={[styles.pageDate, { color: accentColor }]}>{formatDate()}</Text>
            <Text style={[styles.pageTime, { color: colors.mutedForeground }]}>{formatTime()}</Text>
          </View>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Title (optional)"
            placeholderTextColor={colors.border}
            style={[styles.titleInput, { color: colors.foreground }]}
            multiline
            maxLength={80}
          />

          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Write your thoughts here..."
            placeholderTextColor={colors.border}
            style={[styles.bodyInput, { color: colors.foreground }]}
            multiline
            textAlignVertical="top"
            autoFocus
          />
        </ScrollView>

        {/* Bottom Toolbar */}
        <View style={[styles.toolbar, { backgroundColor: pageBg + "F0", borderTopColor: colors.border + "40", paddingBottom: botPad + 8 }]}>
          <TouchableOpacity onPress={() => setMoodPickerVisible(true)} style={styles.toolBtn}>
            <Feather name="smile" size={20} color={accentColor} />
            <Text style={[styles.toolLabel, { color: accentColor }]}>{mood}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/voice")} style={styles.toolBtn}>
            <Feather name="mic" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn}>
            <Feather name="image" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn}>
            <Feather name="tag" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn}>
            <Feather name="lock" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <MoodPicker
        visible={moodPickerVisible}
        current={mood}
        onSelect={m => { setMood(m); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        onClose={() => setMoodPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  diaryPill: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
  },
  diaryName: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  savedText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  saveBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
  saveBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  page: { paddingHorizontal: 28, paddingTop: 4 },
  pageHeader: { paddingVertical: 16, borderBottomWidth: 1, marginBottom: 16 },
  pageDate: { fontSize: 13, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 },
  pageTime: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  titleInput: {
    fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5,
    marginBottom: 16, minHeight: 36,
  },
  bodyInput: {
    fontSize: 17, fontFamily: "Inter_400Regular", lineHeight: 28,
    minHeight: 300,
  },
  toolbar: {
    flexDirection: "row", paddingHorizontal: 20, paddingTop: 10,
    borderTopWidth: 1, gap: 4,
  },
  toolBtn: {
    flex: 1, height: 44, alignItems: "center", justifyContent: "center",
    flexDirection: "row", gap: 4,
  },
  toolLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
