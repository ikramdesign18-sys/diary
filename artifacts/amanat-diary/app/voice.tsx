import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDiary } from "@/context/DiaryContext";
import { useColors } from "@/hooks/useColors";
import type { Mood } from "@/types";

export default function VoiceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { diaries, createEntry } = useDiary();
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [suggestedTitle, setSuggestedTitle] = useState("");
  const [detectedMood, setDetectedMood] = useState<Mood>("Neutral");
  const [phase, setPhase] = useState<"idle" | "recording" | "review">("idle");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wave1 = useRef(new Animated.Value(1)).current;
  const wave2 = useRef(new Animated.Value(1)).current;
  const wave3 = useRef(new Animated.Value(1)).current;
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    if (isRecording) {
      const loop = (v: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(v, { toValue: 1.4, duration: 400, useNativeDriver: true }),
            Animated.timing(v, { toValue: 1, duration: 400, useNativeDriver: true }),
          ])
        ).start();
      loop(wave1, 0);
      loop(wave2, 150);
      loop(wave3, 300);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } else {
      wave1.setValue(1); wave2.setValue(1); wave3.setValue(1);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  const formatTime = (s: number) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  const handleRecord = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!isRecording) {
      setIsRecording(true);
      setPhase("recording");
      setSeconds(0);
    } else {
      setIsRecording(false);
      setPhase("review");
      setTranscript("Your voice entry will appear here after transcription. For now, type what you'd like to say or use your keyboard.");
      setSuggestedTitle("Voice Entry — " + new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }));
    }
  };

  const handleSave = async () => {
    if (!diaries[0]) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await createEntry({
      diaryId: diaries[0].id,
      title: suggestedTitle,
      body: transcript,
      mood: detectedMood,
      tags: [],
      isFavorite: false,
      isLocked: false,
      hasVoice: true,
      photos: [],
      date: new Date().toISOString(),
    });
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={22} color={colors.mutedForeground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Voice Diary</Text>
        <View style={{ width: 44 }} />
      </View>

      {phase !== "review" ? (
        <View style={styles.recordArea}>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            {phase === "idle" ? "Tap the mic to start recording" : "Recording... speak freely"}
          </Text>

          {/* Waveform */}
          <View style={styles.waveWrap}>
            {isRecording && (
              <>
                <Animated.View style={[styles.wave, { backgroundColor: colors.primary + "20", transform: [{ scale: wave1 }] }]} />
                <Animated.View style={[styles.wave, styles.wave2, { backgroundColor: colors.primary + "15", transform: [{ scale: wave2 }] }]} />
                <Animated.View style={[styles.wave, styles.wave3, { backgroundColor: colors.primary + "10", transform: [{ scale: wave3 }] }]} />
              </>
            )}
            <TouchableOpacity
              onPress={handleRecord}
              style={[styles.micBtn, { backgroundColor: isRecording ? colors.destructive : colors.primary }]}
              activeOpacity={0.85}
            >
              <Feather name={isRecording ? "square" : "mic"} size={32} color={colors.primaryForeground} />
            </TouchableOpacity>
          </View>

          {isRecording && (
            <Text style={[styles.timer, { color: colors.foreground }]}>{formatTime(seconds)}</Text>
          )}
          {!isRecording && seconds > 0 && (
            <Text style={[styles.timer, { color: colors.mutedForeground }]}>Stopped</Text>
          )}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.review, { paddingBottom: botPad + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.reviewCard, { backgroundColor: colors.moodCalm }]}>
            <Text style={[styles.reviewLabel, { color: colors.mutedForeground }]}>AI SUGGESTED TITLE</Text>
            <TextInput
              value={suggestedTitle}
              onChangeText={setSuggestedTitle}
              style={[styles.reviewTitle, { color: colors.foreground }]}
            />
          </View>

          <View style={styles.reviewSection}>
            <Text style={[styles.reviewLabel, { color: colors.mutedForeground }]}>TRANSCRIPT</Text>
            <TextInput
              value={transcript}
              onChangeText={setTranscript}
              style={[styles.reviewBody, { color: colors.foreground, borderColor: colors.border }]}
              multiline
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            onPress={handleRecord}
            style={[styles.reRecordBtn, { borderColor: colors.border }]}
          >
            <Feather name="refresh-cw" size={16} color={colors.mutedForeground} />
            <Text style={[styles.reRecordText, { color: colors.mutedForeground }]}>Record Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSave}
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="save" size={18} color={colors.primaryForeground} />
            <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Save Voice Entry</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 16,
  },
  closeBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  recordArea: { flex: 1, alignItems: "center", justifyContent: "center", gap: 32 },
  hint: { fontSize: 16, fontFamily: "Inter_400Regular", textAlign: "center" },
  waveWrap: { width: 180, height: 180, alignItems: "center", justifyContent: "center" },
  wave: {
    position: "absolute", width: 160, height: 160, borderRadius: 80,
  },
  wave2: { width: 130, height: 130, borderRadius: 65 },
  wave3: { width: 100, height: 100, borderRadius: 50 },
  micBtn: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#2C1810", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 6,
  },
  timer: { fontSize: 36, fontFamily: "Inter_700Bold", letterSpacing: -1 },
  review: { padding: 24, gap: 20 },
  reviewCard: { borderRadius: 16, padding: 16, gap: 8 },
  reviewSection: { gap: 8 },
  reviewLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  reviewTitle: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  reviewBody: {
    fontSize: 16, fontFamily: "Inter_400Regular", lineHeight: 24,
    borderWidth: 1, borderRadius: 12, padding: 16, minHeight: 150,
  },
  reRecordBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, height: 48, borderRadius: 24, borderWidth: 1,
  },
  reRecordText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, height: 56, borderRadius: 28,
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
