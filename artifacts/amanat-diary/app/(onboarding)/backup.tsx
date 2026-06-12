import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export default function BackupPromptScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad, paddingBottom: botPad + 24 }]}>
      <View style={[styles.iconWrap, { backgroundColor: "#E8F0EC" }]}>
        <Feather name="shield" size={40} color="#5A8A6A" />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>
        Want to keep your diary safe if your phone is lost?
      </Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Your diary works fully without an account. Create one only if you want backup, sync, restore, or future cloud options.
      </Text>

      <View style={styles.feature}>
        {["Cloud backup & restore", "Sync across devices", "Local future reminders", "Export & share"].map(f => (
          <View key={f} style={styles.featureRow}>
            <Feather name="check" size={15} color="#5A8A6A" />
            <Text style={[styles.featureText, { color: colors.mutedForeground }]}>{f}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.note, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <Feather name="lock" size={14} color={colors.mutedForeground} />
        <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
          Account is NOT required for writing, reading, or locking your diary.
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={() => router.replace("/(onboarding)/create-diary")}
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
        >
          <Text style={[styles.primaryText, { color: colors.primaryForeground }]}>Continue Privately</Text>
        </TouchableOpacity>
        <Text style={[styles.profileNote, { color: colors.mutedForeground }]}>You can create an optional backup account later from Profile.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 28,
    gap: 20,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  feature: {
    gap: 10,
    width: "100%",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    width: "100%",
  },
  noteText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    width: "100%",
    gap: 12,
    marginTop: "auto",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 56,
    borderRadius: 28,
  },
  primaryText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  secondaryBtn: {
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  profileNote: { fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular", textAlign: "center" },
});
