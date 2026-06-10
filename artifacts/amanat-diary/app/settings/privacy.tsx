import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
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

import { PinInput } from "@/components/PinInput";
import { useAppLock } from "@/context/AppLockContext";
import { useDiary } from "@/context/DiaryContext";
import { useColors } from "@/hooks/useColors";

export default function PrivacyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { hasPin, isLocked, setupPin, clearPin, biometricAvailable } = useAppLock();
  const { settings, updateSettings } = useDiary();
  const [showPinSetup, setShowPinSetup] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: botPad + 24 }}
    >
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Privacy & Security</Text>
        <View style={{ width: 44 }} />
      </View>

      <Text style={[styles.quote, { color: colors.mutedForeground }]}>
        "Your diary belongs only to you."
      </Text>

      {showPinSetup ? (
        <View style={styles.pinWrap}>
          <PinInput
            onComplete={async (pin) => {
              await setupPin(pin);
              setShowPinSetup(false);
            }}
            title="Create your PIN"
            subtitle="Choose a 4-digit PIN"
          />
          <TouchableOpacity onPress={() => setShowPinSetup(false)} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>APP LOCK</Text>
            <View style={[styles.row, { borderBottomColor: colors.border }]}>
              <View style={styles.rowLeft}>
                <Feather name="lock" size={18} color={colors.primary} />
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>App PIN / Passcode</Text>
              </View>
              {hasPin ? (
                <TouchableOpacity onPress={() => Alert.alert("Remove PIN", "Remove app lock?", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Remove", style: "destructive", onPress: clearPin },
                ])}>
                  <Text style={[styles.actionText, { color: colors.destructive }]}>Remove</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => setShowPinSetup(true)}>
                  <Text style={[styles.actionText, { color: colors.primary }]}>Set PIN</Text>
                </TouchableOpacity>
              )}
            </View>
            {biometricAvailable && (
              <View style={[styles.row, { borderBottomColor: colors.border }]}>
                <View style={styles.rowLeft}>
                  <Feather name="cpu" size={18} color={colors.primary} />
                  <Text style={[styles.rowLabel, { color: colors.foreground }]}>Biometric Unlock</Text>
                </View>
                <Switch
                  value={settings.biometricEnabled}
                  onValueChange={v => updateSettings({ biometricEnabled: v })}
                  trackColor={{ false: colors.border, true: colors.primary + "80" }}
                  thumbColor={settings.biometricEnabled ? colors.primary : colors.muted}
                />
              </View>
            )}
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>AUTO-LOCK</Text>
            {[1, 5, 10, 30].map(min => (
              <TouchableOpacity
                key={min}
                onPress={() => updateSettings({ autoLockMinutes: min })}
                style={[styles.row, { borderBottomColor: colors.border }]}
              >
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>After {min} minute{min > 1 ? "s" : ""}</Text>
                {settings.autoLockMinutes === min && (
                  <Feather name="check" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingBottom: 8 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  quote: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 40, paddingVertical: 20, fontStyle: "italic" },
  pinWrap: { alignItems: "center", paddingTop: 40, gap: 24 },
  cancelBtn: { paddingVertical: 12 },
  cancelText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  section: { marginHorizontal: 24, borderRadius: 16, borderWidth: 1, marginBottom: 16, overflow: "hidden" },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1 },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowLabel: { fontSize: 15, fontFamily: "Inter_400Regular" },
  actionText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
