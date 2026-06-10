import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDiary } from "@/context/DiaryContext";
import { useColors } from "@/hooks/useColors";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useDiary();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const settingRow = (icon: keyof typeof Feather.glyphMap, label: string, onPress: () => void) => (
    <TouchableOpacity
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      style={[styles.row, { borderBottomColor: colors.border }]}
    >
      <View style={styles.rowLeft}>
        <Feather name={icon} size={18} color={colors.primary} />
        <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
      </View>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );

  const toggleRow = (icon: keyof typeof Feather.glyphMap, label: string, value: boolean, onChange: (v: boolean) => void) => (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={styles.rowLeft}>
        <Feather name={icon} size={18} color={colors.primary} />
        <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primary + "80" }}
        thumbColor={value ? colors.primary : colors.muted}
      />
    </View>
  );

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: botPad + 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>PRIVACY</Text>
        {settingRow("lock", "Privacy & Security", () => router.push("/settings/privacy"))}
        {toggleRow("eye-off", "Mood Themes", settings.moodThemesEnabled, v => updateSettings({ moodThemesEnabled: v }))}
        {toggleRow("bell", "Daily Reminder", settings.reminderEnabled, v => updateSettings({ reminderEnabled: v }))}
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>CONTENT</Text>
        {settingRow("clock", "Future Messages", () => router.push("/future-messages"))}
        {settingRow("mic", "Voice Settings", () => {})}
        {settingRow("tag", "Tags & Collections", () => {})}
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>BACKUP & EXPORT</Text>
        {settingRow("upload-cloud", "Backup & Sync", () => {})}
        {settingRow("download", "Export Data", () => {})}
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ABOUT</Text>
        {settingRow("help-circle", "Help & Support", () => {})}
        {settingRow("info", "About Amanat Diary", () => {})}
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>DANGER ZONE</Text>
        <TouchableOpacity
          onPress={() => Alert.alert("Delete All Data", "This will permanently delete all diaries and entries.", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete Everything", style: "destructive", onPress: () => {} },
          ])}
          style={[styles.row, { borderBottomColor: "transparent" }]}
        >
          <View style={styles.rowLeft}>
            <Feather name="trash-2" size={18} color={colors.destructive} />
            <Text style={[styles.rowLabel, { color: colors.destructive }]}>Delete All Data</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 24, paddingBottom: 16,
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  section: { marginHorizontal: 24, borderRadius: 16, borderWidth: 1, marginBottom: 16, overflow: "hidden" },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1 },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowLabel: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
