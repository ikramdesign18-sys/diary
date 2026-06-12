import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDiary } from "@/context/DiaryContext";
import { useColors } from "@/hooks/useColors";
import { exportFullBackup, pickBackupFile, restoreBackup, type BackupPreview } from "@/services/backupService";
import { exportEntriesPdf } from "@/services/pdfExportService";
import { activeEntryLock } from "@/lib/futureMemories";

export default function BackupExportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { diaries, futureMessages, getAllEntries, getEntries, reloadLocalData } = useDiary();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const topPad = Platform.OS === "web" ? 44 : insets.top;

  const run = async (work: () => Promise<unknown>, success?: string) => {
    try {
      setBusy(true);
      await work();
      if (success) Alert.alert("Done", success);
    } catch (error) {
      Alert.alert("Unable to complete export", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const exportBackup = () => run(async () => {
    const entries = await getAllEntries();
    await exportFullBackup({ diaries, entries, futureMessages });
  }, "Your backup was created. Keep it somewhere private and safe.");

  const chooseImport = () => run(async () => {
    const selected = await pickBackupFile();
    if (selected) setPreview(selected);
  });

  const confirmImport = () => Alert.alert(
    "Merge this backup?",
    "Importing will merge this backup with your current diary. Existing newer entries will not be overwritten.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Import & Merge",
        onPress: () => run(async () => {
          if (!preview) return;
          const result = await restoreBackup(preview);
          await reloadLocalData();
          setPreview(null);
          Alert.alert("Import complete", `${result.diaries} diaries and ${result.entries} entries imported or updated.\n${result.skipped} newer or duplicate records skipped.\n${result.failed} records could not be imported.`);
        }),
      },
    ],
  );

  const chooseDiaryPdf = () => {
    if (!diaries.length) return Alert.alert("No diaries yet", "Create a diary before exporting a life book.");
    Alert.alert("Export diary as PDF", "Choose a diary.", [
      ...diaries.slice(0, 8).map(diary => ({
        text: diary.title,
        onPress: () => run(async () => exportEntriesPdf(diary, (await getEntries(diary.id)).filter(entry => !activeEntryLock(futureMessages, entry.id)), true)),
      })),
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const row = (icon: keyof typeof Feather.glyphMap, title: string, subtitle: string, onPress: () => void) => (
    <TouchableOpacity disabled={busy} onPress={onPress} style={[styles.row, { borderBottomColor: colors.border }]} activeOpacity={0.75}>
      <View style={[styles.icon, { backgroundColor: colors.secondary }]}><Feather name={icon} size={19} color={colors.primary} /></View>
      <View style={styles.rowText}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.rowSubtitle, { color: colors.mutedForeground }]}>{subtitle}</Text></View>
      <Feather name="chevron-right" size={17} color={colors.mutedForeground} />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}><Feather name="arrow-left" size={22} color={colors.foreground} /></TouchableOpacity>
        <View><Text style={[styles.title, { color: colors.foreground }]}>Backup & Export</Text><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{busy ? "Preparing your memories…" : "Private, local, and in your control."}</Text></View>
      </View>

      <View style={[styles.trustCard, { backgroundColor: "#F7EEDC", borderColor: "#E5D2AF" }]}>
        <Feather name="shield" size={22} color="#8A6847" />
        <Text style={styles.trustText}>Your backup does not include your PIN or security keys. Keep the file safe: anyone with it may be able to read your diary content.</Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {row("download", "Export Full Backup", "Save and share every local diary record as JSON.", exportBackup)}
        {row("upload", "Import Backup", "Preview and safely merge a previous backup.", chooseImport)}
        {row("book-open", "Export Diary as PDF", "Create a warm, printable life book.", chooseDiaryPdf)}
      </View>

      {preview && (
        <View style={[styles.preview, { backgroundColor: colors.card, borderColor: colors.primary }]}>
          <Text style={[styles.previewTitle, { color: colors.foreground }]}>Ready to import</Text>
          <Text style={[styles.fileName, { color: colors.mutedForeground }]}>{preview.fileName}</Text>
          <View style={styles.counts}>
            <Text style={[styles.count, { color: colors.foreground }]}>{preview.counts.diaries} diaries</Text>
            <Text style={[styles.count, { color: colors.foreground }]}>{preview.counts.entries} entries</Text>
            <Text style={[styles.count, { color: colors.foreground }]}>{preview.counts.voiceNotes} voice notes</Text>
            <Text style={[styles.count, { color: colors.foreground }]}>{preview.counts.media} media</Text>
            <Text style={[styles.count, { color: colors.foreground }]}>{preview.counts.futureMessages} future messages</Text>
          </View>
          <Text style={[styles.mergeCopy, { color: colors.mutedForeground }]}>Import will merge memories. It will not delete your current diary.</Text>
          <TouchableOpacity onPress={confirmImport} style={[styles.importButton, { backgroundColor: colors.primary }]}><Text style={[styles.importText, { color: colors.primaryForeground }]}>Import & Merge Safely</Text></TouchableOpacity>
        </View>
      )}

      <Text style={[styles.cloudNote, { color: colors.mutedForeground }]}>Cloud sync is optional and not enabled yet. These exports stay local until you choose to share them.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 18, flexDirection: "row", gap: 12, alignItems: "center" },
  back: { width: 40, height: 40, justifyContent: "center" }, title: { fontSize: 24, fontFamily: "Inter_700Bold" }, subtitle: { fontSize: 12, marginTop: 2, fontFamily: "Inter_400Regular" },
  trustCard: { marginHorizontal: 20, borderWidth: 1, borderRadius: 18, padding: 17, flexDirection: "row", gap: 12, marginBottom: 18 },
  trustText: { flex: 1, color: "#694F37", fontSize: 12, lineHeight: 19, fontFamily: "Inter_400Regular" },
  section: { marginHorizontal: 20, borderWidth: 1, borderRadius: 18, overflow: "hidden" },
  row: { padding: 15, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }, rowText: { flex: 1 }, rowTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" }, rowSubtitle: { marginTop: 3, fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular" },
  preview: { margin: 20, padding: 18, borderWidth: 1, borderRadius: 18 }, previewTitle: { fontSize: 18, fontFamily: "Inter_700Bold" }, fileName: { fontSize: 11, marginTop: 4 }, counts: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 16 }, count: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  mergeCopy: { fontSize: 11, lineHeight: 17 }, importButton: { height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginTop: 16 }, importText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  cloudNote: { marginHorizontal: 30, marginTop: 20, textAlign: "center", fontSize: 11, lineHeight: 17, fontFamily: "Inter_400Regular" },
});
