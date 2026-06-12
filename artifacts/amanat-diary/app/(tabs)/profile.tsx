import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PinConfirmModal } from "@/components/PinConfirmModal";
import { useDiary } from "@/context/DiaryContext";
import { useAuth } from "@/context/AuthContext";
import { useAppLock } from "@/context/AppLockContext";
import { useColors } from "@/hooks/useColors";
import {
  getSyncStatus,
  pullRemoteChanges,
  setLastSyncError,
  setCloudSyncEnabled,
  syncNow,
  type CloudSyncStatus,
} from "@/services/cloudSyncService";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { diaries, futureMessages, getAllEntries, reloadLocalData, databaseReady } = useDiary();
  const { account, isLoggedIn, configured, logout, resendVerification } = useAuth();
  const { hasPin } = useAppLock();
  const [totalEntries, setTotalEntries] = useState(0);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [showFirstSyncPin, setShowFirstSyncPin] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    getAllEntries().then(all => setTotalEntries(all.length));
  }, [diaries]);

  const refreshSyncStatus = async () => setSyncStatus(await getSyncStatus());

  useEffect(() => {
    setSyncError("");
    refreshSyncStatus().catch(() => {});
  }, [account?.email, account?.isVerified, databaseReady]);

  const runSync = async (mode: "sync" | "pull") => {
    setSyncing(true);
    setSyncError("");
    try {
      if (mode === "pull") {
        const summary = await pullRemoteChanges();
        await reloadLocalData();
        Alert.alert("Cloud backup pulled", `${summary.pulled} records restored or updated. ${summary.skipped} newer local records kept.`);
      } else {
        const summary = await syncNow();
        await reloadLocalData();
        Alert.alert("Cloud sync complete", `${summary.pushed} records uploaded and ${summary.pulled} records restored or updated.`);
      }
    } catch (error) {
      await setLastSyncError(error);
      setSyncError(error instanceof Error ? error.message : "Cloud sync failed. Your local diary is safe.");
    } finally {
      setSyncing(false);
      await refreshSyncStatus().catch(() => {});
    }
  };

  const requestFirstSync = () => {
    if (!account?.isVerified) {
      Alert.alert("Verify your email", "Cloud sync starts only after you sign in and verify your email.");
      return;
    }
    if (!hasPin) {
      Alert.alert("Create a PIN first", "Cloud backup's first upload requires a PIN confirmation.", [
        { text: "Not now", style: "cancel" },
        { text: "Create PIN", onPress: () => router.push("/(onboarding)/pin-setup?returnTo=home" as any) },
      ]);
      return;
    }
    Alert.alert(
      "Enable Cloud Backup?",
      "First sync will upload your local diary data to your private account. Your diary will continue working offline first.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Continue", onPress: () => setShowFirstSyncPin(true) },
      ],
    );
  };

  const disableSync = () => {
    Alert.alert("Disable Cloud Sync?", "This stops cloud sync on this device. Your local diary and existing cloud backup will not be deleted.", [
      { text: "Cancel", style: "cancel" },
      { text: "Disable", style: "destructive", onPress: async () => {
        await setCloudSyncEnabled(false);
        await refreshSyncStatus();
      } },
    ]);
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: logout },
    ]);
  };

  const stat = (label: string, value: string | number) => (
    <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );

  const row = (icon: keyof typeof Feather.glyphMap, label: string, onPress: () => void, danger?: boolean) => (
    <TouchableOpacity
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      style={[styles.row, { borderBottomColor: colors.border }]}
      activeOpacity={0.7}
    >
      <View style={styles.rowLeft}>
        <Feather name={icon} size={18} color={danger ? colors.destructive : colors.primary} />
        <Text style={[styles.rowLabel, { color: danger ? colors.destructive : colors.foreground }]}>{label}</Text>
      </View>
      {!danger && <Feather name="chevron-right" size={16} color={colors.mutedForeground} />}
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: botPad + 88 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
      </View>

      {/* Account Status */}
      <View style={[styles.accountCard, { backgroundColor: isLoggedIn ? "#E8F0EC" : colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatarWrap, { backgroundColor: isLoggedIn ? "#5A8A6A22" : colors.secondary }]}>
          <Feather name={isLoggedIn ? "cloud" : "user"} size={28} color={isLoggedIn ? "#5A8A6A" : colors.mutedForeground} />
        </View>
        <View style={styles.accountInfo}>
          {isLoggedIn ? (
            <>
              <View style={styles.verifiedRow}>
                <Text style={[styles.accountEmail, { color: colors.foreground }]}>{account?.email}</Text>
                {account?.isVerified && <Feather name="check-circle" size={14} color="#5A8A6A" />}
              </View>
              <Text style={[styles.accountMode, { color: "#5A8A6A" }]}>Backup Account Active</Text>
              {!account?.isVerified && (
                <Text style={[styles.verifyNote, { color: "#C08070" }]}>
                  Please verify your email to enable secure backup.
                </Text>
              )}
            </>
          ) : (
            <>
              <Text style={[styles.accountMode, { color: colors.foreground }]}>Local Mode</Text>
              <Text style={[styles.accountSub, { color: colors.mutedForeground }]}>
                Your diary works privately on this device.{"\n"}Create a secure backup account only if you want cloud backup, restore, sync, or future cloud options.
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {stat("Diaries", diaries.length)}
        {stat("Pages", totalEntries)}
        {stat("Letters", futureMessages.length)}
      </View>

      {/* Account Actions */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>BACKUP ACCOUNT</Text>
        {!isLoggedIn ? (
          <>
            {row("user-plus", "Create Backup Account", () => router.push("/auth/create-account"))}
            {row("log-in", "Login to Existing Account", () => router.push("/auth/login"))}
          </>
        ) : (
          <>
            {!account?.isVerified && row("mail", "Resend Verification Email", () => {
              resendVerification().then(result => Alert.alert(result.success ? "Email sent" : "Unable to resend", result.success ? "Check your inbox for the verification link." : result.error));
            })}
            {account?.isVerified && syncStatus?.available && !syncStatus.enabled && row("upload-cloud", "Enable Cloud Backup", requestFirstSync)}
            {account?.isVerified && syncStatus?.enabled && row("refresh-cw", syncing ? "Syncing..." : "Sync Now", () => { if (!syncing) runSync("sync"); })}
            {account?.isVerified && syncStatus?.enabled && row("download-cloud", "Pull Cloud Backup", () => { if (!syncing) runSync("pull"); })}
            {account?.isVerified && syncStatus?.enabled && row("cloud-off", "Disable Cloud Sync on This Device", disableSync)}
            {row("log-out", "Logout", handleLogout)}
          </>
        )}
      </View>

      <View style={[styles.syncNote, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.syncTitle, { color: colors.foreground }]}>
          {syncing ? "Syncing" : syncStatus?.message ?? "Local Mode"}
        </Text>
        <Text style={[styles.syncCopy, { color: colors.mutedForeground }]}>
          Your diary works offline first. Cloud backup is optional. Cloud sync starts only after you sign in, verify your email, and enable it.
        </Text>
        {!!syncStatus?.lastSyncTime && (
          <Text style={[styles.syncMeta, { color: colors.mutedForeground }]}>Last synced {new Date(syncStatus.lastSyncTime).toLocaleString()}</Text>
        )}
        {!!syncError && <Text style={[styles.syncError, { color: colors.destructive }]}>{syncError}</Text>}
      </View>

      {!configured && !isLoggedIn && (
        <Text style={[styles.configNote, { color: colors.mutedForeground }]}>
          Backup accounts are optional and not configured yet. Local Mode remains fully available.
        </Text>
      )}

      {/* Settings */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>APP</Text>
        {row("lock", "Privacy & Security", () => router.push("/settings/privacy"))}
        {row("archive", "Backup & Export", () => router.push("/settings/backup-export" as any))}
        {row("clock", "Future Letters & Reminders", () => router.push("/future-messages"))}
        {row("settings", "Settings", () => router.push("/settings"))}
      </View>

      {isLoggedIn && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>DANGER ZONE</Text>
          {row("trash-2", "Delete Account", () => {}, true)}
        </View>
      )}

      <PinConfirmModal
        visible={showFirstSyncPin}
        title="Enable cloud backup?"
        subtitle="Enter your PIN to confirm the first upload."
        onCancel={() => setShowFirstSyncPin(false)}
        onConfirmed={async () => {
          setShowFirstSyncPin(false);
          try {
            await setCloudSyncEnabled(true);
            await runSync("sync");
          } catch (error) {
            await setLastSyncError(error);
            setSyncError(error instanceof Error ? error.message : "Cloud sync could not be enabled. Your local diary is safe.");
          }
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingBottom: 16 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.6 },
  accountCard: {
    marginHorizontal: 24, borderRadius: 20, borderWidth: 1, padding: 20,
    flexDirection: "row", gap: 16, alignItems: "flex-start", marginBottom: 16,
  },
  avatarWrap: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  accountInfo: { flex: 1, gap: 4 },
  verifiedRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  accountEmail: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  accountMode: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  accountSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  verifyNote: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16, marginTop: 4 },
  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 24, marginBottom: 24 },
  stat: {
    flex: 1, borderRadius: 14, borderWidth: 1,
    alignItems: "center", paddingVertical: 16, gap: 4,
  },
  statValue: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  section: {
    marginHorizontal: 24, borderRadius: 16, borderWidth: 1, marginBottom: 16, overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8,
  },
  row: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowLabel: { fontSize: 15, fontFamily: "Inter_400Regular" },
  configNote: { marginHorizontal: 30, marginTop: -8, marginBottom: 16, textAlign: "center", fontSize: 10, lineHeight: 15, fontFamily: "Inter_400Regular" },
  syncNote: { marginHorizontal: 24, marginBottom: 16, borderWidth: 1, borderRadius: 16, padding: 16, gap: 6 },
  syncTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  syncCopy: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  syncMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  syncError: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_500Medium" },
});
