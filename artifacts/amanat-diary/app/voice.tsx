import { Feather } from "@expo/vector-icons";
import {
  Audio,
  InterruptionModeAndroid,
  InterruptionModeIOS,
  type AudioMode,
} from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, BackHandler, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { VoicePlayer } from "@/components/VoicePlayer";
import { useDiary } from "@/context/DiaryContext";
import { useColors } from "@/hooks/useColors";
import { polishVoiceTranscript, transcribeVoice, type PolishStyle, type VoiceLanguage } from "@/services/voiceAIService";
import { detectThemeForEntry } from "@/services/themeDetectionService";
import type { Mood } from "@/types";

type Phase = "idle" | "recording" | "paused" | "processing" | "review";
const languages: Array<[VoiceLanguage, string]> = [["auto", "Auto"], ["en", "English"], ["ur", "Urdu"], ["hi", "Hindi"], ["roman-ur", "Roman Urdu"]];
const stylesList: Array<[PolishStyle, string]> = [["light", "Fix grammar"], ["diary", "Diary style"], ["concise", "Concise"]];
const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
const VOICE_RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: false,
  android: {
    extension: ".m4a",
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
    extension: ".m4a",
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  web: Audio.RecordingOptionsPresets.HIGH_QUALITY.web,
};
const RECORDING_AUDIO_MODE: Partial<AudioMode> = {
  allowsRecordingIOS: true,
  playsInSilentModeIOS: true,
  interruptionModeIOS: InterruptionModeIOS.DoNotMix,
  interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
  shouldDuckAndroid: true,
  playThroughEarpieceAndroid: false,
  staysActiveInBackground: false,
};
const PLAYBACK_AUDIO_MODE: Partial<AudioMode> = {
  allowsRecordingIOS: false,
  playsInSilentModeIOS: true,
  interruptionModeIOS: InterruptionModeIOS.DoNotMix,
  interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
  shouldDuckAndroid: true,
  playThroughEarpieceAndroid: false,
  staysActiveInBackground: false,
};

function recordingError(stage: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (__DEV__) console.warn(`[voice-recording] ${stage} failed:`, error);
  return message;
}

export default function VoiceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { diaryId: paramDiaryId } = useLocalSearchParams<{ diaryId?: string }>();
  const { diaries, createEntry } = useDiary();
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [diaryId, setDiaryId] = useState(paramDiaryId ?? diaries[0]?.id ?? "");
  const [voiceUri, setVoiceUri] = useState<string>();
  const [duration, setDuration] = useState(0);
  const [language, setLanguage] = useState<VoiceLanguage>("auto");
  const [transcript, setTranscript] = useState("");
  const [polishedText, setPolishedText] = useState("");
  const [title, setTitle] = useState("");
  const [mood, setMood] = useState<Mood>("Neutral");
  const [tags, setTags] = useState<string[]>([]);
  const [themeId, setThemeId] = useState<string>();
  const [statusMessage, setStatusMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [recordingDurationMillis, setRecordingDurationMillis] = useState(0);
  const topPad = Platform.OS === "web" ? 42 : insets.top;
  const botPad = Platform.OS === "web" ? 24 : insets.bottom;

  useEffect(() => {
    if (diaries[0] && !diaries.some(diary => diary.id === diaryId)) setDiaryId(diaries[0].id);
  }, [diaries, diaryId]);

  const persistRecording = async (uri: string) => {
    if (!FileSystem.documentDirectory) return uri;
    const folder = `${FileSystem.documentDirectory}voice-notes`;
    await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
    const target = `${folder}/voice-${Date.now()}.m4a`;
    await FileSystem.copyAsync({ from: uri, to: target });
    if (FileSystem.cacheDirectory && uri.startsWith(FileSystem.cacheDirectory)) {
      await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
    }
    return target;
  };

  const validateRecordingFile = async (uri: string) => {
    if (Platform.OS === "web") return;
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists || !info.size) throw new Error("The finalized recording file is empty.");
  };

  const deleteRecording = async (uri?: string | null) => {
    if (!uri || Platform.OS === "web") return;
    await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
  };

  const cleanupActiveRecording = async (removeFile = false) => {
    const recording = recordingRef.current;
    recordingRef.current = null;
    if (!recording) return;
    const uri = recording.getURI();
    recording.setOnRecordingStatusUpdate(null);
    try {
      const status = await recording.getStatusAsync();
      if (status.canRecord) await recording.stopAndUnloadAsync();
    } catch (error) {
      recordingError("cleanup", error);
    }
    if (removeFile) await deleteRecording(uri);
  };

  const exitVoice = () => {
    if (phase === "processing") {
      Alert.alert("Please wait", "Your recording is still being prepared.");
      return;
    }
    if (phase === "recording" || phase === "paused") {
      Alert.alert("Discard active recording?", "Leaving now will stop and remove this unsaved recording.", [
        { text: "Keep Recording", style: "cancel" },
        {
          text: "Discard", style: "destructive", onPress: async () => {
            await cleanupActiveRecording(true);
            await Audio.setAudioModeAsync(PLAYBACK_AUDIO_MODE).catch(() => {});
            router.back();
          },
        },
      ]);
      return;
    }
    if (voiceUri) {
      Alert.alert("Discard voice page?", "Leaving now will remove this unsaved local recording.", [
        { text: "Keep Editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: async () => { await deleteRecording(voiceUri); router.back(); } },
      ]);
      return;
    }
    router.back();
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      exitVoice();
      return true;
    });
    return () => subscription.remove();
  }, [phase, voiceUri]);

  useEffect(() => () => {
    const recording = recordingRef.current;
    recordingRef.current = null;
    recording?.setOnRecordingStatusUpdate(null);
    recording?.stopAndUnloadAsync().catch(error => recordingError("unmount cleanup", error));
  }, []);

  const startRecording = async () => {
    if (phase === "recording" || phase === "paused" || recordingRef.current) {
      Alert.alert("Recording already active", "Stop the current recording before starting another.");
      return;
    }
    try {
      await cleanupActiveRecording(true);
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Microphone permission needed", "Allow microphone access in Settings to record a voice memory.");
        return;
      }
      await Audio.setAudioModeAsync(RECORDING_AUDIO_MODE);
      const recording = new Audio.Recording();
      recordingRef.current = recording;
      setRecordingDurationMillis(0);
      recording.setProgressUpdateInterval(250);
      recording.setOnRecordingStatusUpdate(status => {
        if (status.isRecording || status.canRecord) setRecordingDurationMillis(status.durationMillis);
      });
      await recording.prepareToRecordAsync(VOICE_RECORDING_OPTIONS);
      const started = await recording.startAsync();
      if (!started.isRecording) throw new Error("Recorder did not enter recording state.");
      setPhase("recording");
      setStatusMessage("");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      recordingError("prepare/start", error);
      await cleanupActiveRecording(true);
      await Audio.setAudioModeAsync(PLAYBACK_AUDIO_MODE).catch(() => {});
      setPhase("idle");
      Alert.alert("Unable to record", "Recording could not start on this device. Please try again.");
    }
  };

  const stopRecording = async () => {
    const recording = recordingRef.current;
    if (!recording) {
      setPhase("idle");
      return;
    }
    let savedUri: string;
    let seconds = recordingDurationMillis / 1000;
    try {
      const finalStatus = await recording.stopAndUnloadAsync();
      recording.setOnRecordingStatusUpdate(null);
      recordingRef.current = null;
      seconds = Math.max(seconds, finalStatus.durationMillis / 1000);
      await Audio.setAudioModeAsync(PLAYBACK_AUDIO_MODE);
      const uri = recording.getURI();
      if (!uri) throw new Error("Recording path unavailable after stop.");
      savedUri = await persistRecording(uri);
      await validateRecordingFile(savedUri);
    } catch (error) {
      recordingError("stop/save", error);
      await cleanupActiveRecording(true);
      await Audio.setAudioModeAsync(PLAYBACK_AUDIO_MODE).catch(() => {});
      setPhase("idle");
      Alert.alert("Recording could not be saved", "The local audio file could not be finalized. Please record again.");
      return;
    }

    setVoiceUri(savedUri);
    setDuration(seconds);
    setPhase("processing");
    setStatusMessage("Transcribing your voice…");
    try {
      const result = await transcribeVoice(savedUri, language);
      setTranscript(result.transcript);
      if (!result.transcript) setStatusMessage("We couldn’t transcribe automatically. Your recording is safe; you can type or paste the transcript.");
      else setStatusMessage("Auto-transcribed — you can edit before saving.");
    } catch (error) {
      recordingError("transcription", error);
      setStatusMessage("We couldn’t transcribe automatically. Your recording is safe; you can type or paste the transcript.");
    } finally {
      setPhase("review");
    }
  };

  const togglePause = async () => {
    const recording = recordingRef.current;
    if (!recording) return;
    try {
      if (phase === "paused") {
        await recording.startAsync();
        setPhase("recording");
      } else {
        await recording.pauseAsync();
        setPhase("paused");
      }
    } catch (error) {
      recordingError("pause/resume", error);
      Alert.alert("Recording is still safe", "Pause is unavailable on this device. You can continue recording or stop now.");
    }
  };

  const discard = () => {
    Alert.alert("Discard recording?", "This removes the unsaved local recording.", [
      { text: "Keep", style: "cancel" },
      {
        text: "Discard", style: "destructive", onPress: async () => {
          await deleteRecording(voiceUri);
          setVoiceUri(undefined); setDuration(0); setRecordingDurationMillis(0); setTranscript(""); setPolishedText(""); setTitle(""); setPhase("idle"); setStatusMessage("");
        },
      },
    ]);
  };

  const polish = async (style: PolishStyle) => {
    if (!transcript.trim()) return Alert.alert("Transcript needed", "Type or transcribe your voice memory first.");
    setPhase("processing");
    setStatusMessage("Polishing without changing your meaning…");
    const result = await polishVoiceTranscript(transcript, style);
    setPolishedText(result.polishedText);
    setTitle(result.title);
    setMood(result.mood);
    setTags(result.tags);
    setThemeId(result.themeId);
    setStatusMessage(result.source === "groq" ? "Polished draft ready. Your original transcript is preserved." : "AI polish is unavailable. Your original transcript is preserved.");
    setPhase("review");
  };

  const save = async () => {
    if (!diaries.some(diary => diary.id === diaryId)) return Alert.alert("No diary selected", "Create or select a diary before saving.");
    if (!voiceUri) return Alert.alert("No recording", "Record a voice memory first.");
    setSaving(true);
    try {
      const detection = themeId ? null : await detectThemeForEntry({ transcript });
      const fallbackTitle = transcript.trim().replace(/\s+/g, " ").split(" ").slice(0, 8).join(" ");
      const created = await createEntry({
        diaryId,
        title: title.trim() || fallbackTitle || `Voice Memory · ${new Date().toLocaleDateString()}`,
        body: transcript.trim(),
        bodyPolished: polishedText.trim() || undefined,
        mood: themeId ? mood : detection?.mood ?? mood,
        tags: tags.length ? tags : detection?.tags ?? [],
        themeId: themeId ?? detection?.themeId,
        aiDetectedTheme: themeId ?? detection?.themeId,
        userOverriddenTheme: false,
        isFavorite: false,
        isLocked: false,
        hasVoice: true,
        voiceUri,
        voiceDuration: duration,
        voiceTranscript: transcript.trim(),
        voiceLanguage: language,
        photos: [],
        date: new Date().toISOString(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/diary/${diaryId}/view?entryId=${created.id}` as any);
    } catch {
      Alert.alert("Could not save voice page", "Your recording remains on this device. Please try saving again.");
      setSaving(false);
    }
  };

  return (
    <View style={[screen.container, { backgroundColor: colors.background }]}>
      <View style={[screen.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={exitVoice} style={screen.iconBtn}><Feather name="x" size={22} color={colors.foreground} /></TouchableOpacity>
        <Text style={[screen.headerTitle, { color: colors.foreground }]}>Voice Diary</Text>
        <View style={screen.iconBtn} />
      </View>
      <ScrollView contentContainerStyle={[screen.content, { paddingBottom: botPad + 28 }]} keyboardShouldPersistTaps="handled">
        <Text style={[screen.label, { color: colors.mutedForeground }]}>SAVE TO DIARY</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={screen.chips}>
          {diaries.map(diary => <TouchableOpacity key={diary.id} onPress={() => setDiaryId(diary.id)} style={[screen.chip, { backgroundColor: diaryId === diary.id ? colors.primary : colors.card, borderColor: diaryId === diary.id ? colors.primary : colors.border }]}><Text style={[screen.chipText, { color: diaryId === diary.id ? colors.primaryForeground : colors.foreground }]}>{diary.title}</Text></TouchableOpacity>)}
        </ScrollView>
        <Text style={[screen.label, { color: colors.mutedForeground }]}>TRANSCRIPTION LANGUAGE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={screen.chips}>
          {languages.map(([value, label]) => <TouchableOpacity disabled={phase === "recording" || phase === "paused" || phase === "processing"} key={value} onPress={() => setLanguage(value)} style={[screen.chip, { backgroundColor: language === value ? colors.primary : colors.card, borderColor: language === value ? colors.primary : colors.border, opacity: phase === "recording" || phase === "paused" || phase === "processing" ? 0.65 : 1 }]}><Text style={[screen.chipText, { color: language === value ? colors.primaryForeground : colors.foreground }]}>{label}</Text></TouchableOpacity>)}
        </ScrollView>

        {(phase === "idle" || phase === "recording" || phase === "paused") && (
          <View style={screen.recordArea}>
            <Text style={[screen.hint, { color: colors.mutedForeground }]}>{phase === "idle" ? "Your recording stays local unless Groq transcription is configured." : phase === "paused" ? "Recording paused" : "Recording… speak freely"}</Text>
            <Text style={[screen.timer, { color: colors.foreground }]}>{formatTime(recordingDurationMillis / 1000)}</Text>
            <View style={screen.recordControls}>
              {phase === "idle" ? <TouchableOpacity onPress={startRecording} style={[screen.micBtn, { backgroundColor: colors.primary }]}><Feather name="mic" size={32} color={colors.primaryForeground} /></TouchableOpacity> : <>
                {Platform.OS !== "android" && <TouchableOpacity onPress={togglePause} style={[screen.roundBtn, { borderColor: colors.border }]}><Feather name={phase === "paused" ? "play" : "pause"} size={21} color={colors.foreground} /></TouchableOpacity>}
                <TouchableOpacity onPress={stopRecording} style={[screen.micBtn, { backgroundColor: colors.destructive }]}><Feather name="square" size={27} color="#FFFDF9" /></TouchableOpacity>
              </>}
            </View>
          </View>
        )}

        {(phase === "processing" || phase === "review") && (
          <View style={screen.review}>
            {phase === "processing" && <View style={[screen.notice, { backgroundColor: colors.card, borderColor: colors.border }]}><ActivityIndicator size="small" color={colors.primary} /><Text style={[screen.noticeText, { color: colors.foreground }]}>{statusMessage}</Text></View>}
            {voiceUri && <VoicePlayer uri={voiceUri} duration={duration} accent={colors.primary} muted={colors.mutedForeground} />}
            {!!statusMessage && phase === "review" && <Text style={[screen.status, { color: colors.mutedForeground }]}>{statusMessage}</Text>}

            <Text style={[screen.label, { color: colors.mutedForeground }]}>ORIGINAL TRANSCRIPT</Text>
            <TextInput value={transcript} onChangeText={setTranscript} placeholder="Type or edit the transcript…" placeholderTextColor={colors.mutedForeground} multiline textAlignVertical="top" style={[screen.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]} />
            <Text style={[screen.label, { color: colors.mutedForeground }]}>OPTIONAL POLISH</Text>
            <View style={screen.polishRow}>{stylesList.map(([value, label]) => <TouchableOpacity disabled={phase === "processing"} key={value} onPress={() => polish(value)} style={[screen.polishBtn, { borderColor: colors.border }]}><Text style={[screen.polishText, { color: colors.foreground }]}>{label}</Text></TouchableOpacity>)}</View>
            {!!polishedText && <><Text style={[screen.label, { color: colors.mutedForeground }]}>POLISHED DIARY TEXT</Text><TextInput value={polishedText} onChangeText={setPolishedText} multiline textAlignVertical="top" style={[screen.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]} /><TouchableOpacity onPress={() => setPolishedText("")}><Text style={[screen.keepOriginal, { color: colors.primary }]}>Keep original transcript as diary text</Text></TouchableOpacity></>}
            <TextInput value={title} onChangeText={setTitle} placeholder="Title (auto-created when saved)" placeholderTextColor={colors.mutedForeground} style={[screen.titleInput, { color: colors.foreground, borderColor: colors.border }]} />
            <View style={screen.actions}><TouchableOpacity onPress={discard} style={[screen.secondaryBtn, { borderColor: colors.border }]}><Text style={[screen.secondaryText, { color: colors.foreground }]}>Discard</Text></TouchableOpacity><TouchableOpacity disabled={saving || phase === "processing"} onPress={save} style={[screen.saveBtn, { backgroundColor: colors.primary, opacity: saving || phase === "processing" ? 0.5 : 1 }]}><Feather name="save" size={17} color={colors.primaryForeground} /><Text style={[screen.saveText, { color: colors.primaryForeground }]}>{saving ? "Saving…" : "Save Voice Page"}</Text></TouchableOpacity></View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const screen = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  content: { paddingHorizontal: 20, gap: 12, flexGrow: 1 },
  label: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1, marginTop: 5 },
  chips: { gap: 7, paddingRight: 12 },
  chip: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 13, paddingVertical: 8 },
  chipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  recordArea: { flex: 1, minHeight: 430, alignItems: "center", justifyContent: "center", gap: 28 },
  hint: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 300, lineHeight: 21 },
  timer: { fontSize: 40, fontFamily: "Inter_700Bold", letterSpacing: -1 },
  recordControls: { flexDirection: "row", alignItems: "center", gap: 20 },
  micBtn: { width: 82, height: 82, borderRadius: 41, alignItems: "center", justifyContent: "center" },
  roundBtn: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  review: { gap: 13, marginTop: 8 },
  notice: { flexDirection: "row", alignItems: "center", gap: 9, borderWidth: 1, borderRadius: 12, padding: 12 },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 18, fontFamily: "Inter_500Medium" },
  status: { fontSize: 11, lineHeight: 17, fontFamily: "Inter_400Regular" },
  input: { minHeight: 135, borderWidth: 1, borderRadius: 12, padding: 13, fontSize: 15, lineHeight: 23, fontFamily: "Inter_400Regular" },
  titleInput: { height: 48, borderBottomWidth: 1, fontSize: 17, fontFamily: "Inter_600SemiBold" },
  polishRow: { flexDirection: "row", gap: 7 },
  polishBtn: { flex: 1, borderWidth: 1, borderRadius: 18, alignItems: "center", paddingVertical: 9 },
  polishText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  keepOriginal: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: -5 },
  actions: { flexDirection: "row", gap: 9, marginTop: 8 },
  secondaryBtn: { height: 52, borderWidth: 1, borderRadius: 26, paddingHorizontal: 20, alignItems: "center", justifyContent: "center" },
  secondaryText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  saveBtn: { flex: 1, height: 52, borderRadius: 26, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center" },
  saveText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
