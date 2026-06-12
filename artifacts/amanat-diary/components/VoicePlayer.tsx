import { Feather } from "@expo/vector-icons";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export function VoicePlayer({ uri, duration, accent, muted }: { uri?: string; duration?: number; accent: string; muted: string }) {
  const [availableUri, setAvailableUri] = useState<string | null | undefined>(Platform.OS === "web" ? uri : undefined);
  useEffect(() => {
    let active = true;
    if (!uri) {
      setAvailableUri(null);
      return;
    }
    if (Platform.OS === "web") {
      setAvailableUri(uri);
      return;
    }
    setAvailableUri(undefined);
    FileSystem.getInfoAsync(uri).then(info => { if (active) setAvailableUri(info.exists ? uri : null); }).catch(() => { if (active) setAvailableUri(null); });
    return () => { active = false; };
  }, [uri]);
  const player = useAudioPlayer(availableUri ?? null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const total = status.duration || duration || 0;
  const progress = total ? Math.min(1, status.currentTime / total) : 0;
  const toggle = async () => {
    if (!availableUri) return;
    if (status.playing) player.pause();
    else {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
      if (status.didJustFinish) await player.seekTo(0);
      player.play();
    }
  };
  return (
    <View style={[styles.card, { backgroundColor: accent + "12", borderColor: accent + "30" }]}>
      <TouchableOpacity disabled={!availableUri} onPress={toggle} style={[styles.play, { backgroundColor: accent, opacity: availableUri ? 1 : 0.45 }]}>
        <Feather name={status.playing ? "pause" : "play"} size={15} color="#FFFDF9" />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: accent }]}>Original voice memory</Text>
        <View style={[styles.track, { backgroundColor: accent + "25" }]}><View style={[styles.fill, { backgroundColor: accent, width: `${progress * 100}%` }]} /></View>
        <Text style={[styles.meta, { color: muted }]}>
          {availableUri === undefined ? "Checking local recording…" : availableUri ? `${formatTime(status.currentTime)} / ${formatTime(total)}` : "Voice file is not available on this device"}
        </Text>
      </View>
      <Feather name="mic" size={17} color={accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 20 },
  play: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  track: { height: 3, borderRadius: 2, overflow: "hidden", marginTop: 7 },
  fill: { height: 3, borderRadius: 2 },
  meta: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 4 },
});
