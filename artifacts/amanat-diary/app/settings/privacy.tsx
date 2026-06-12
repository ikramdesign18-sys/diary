import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PinInput } from "@/components/PinInput";
import { useAppLock } from "@/context/AppLockContext";
import { useColors } from "@/hooks/useColors";

type PinFlow = "confirm-biometric" | "change-current" | "change-new" | "change-confirm" | null;

export default function PrivacyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    hasPin, pinLength, changePin, verifyPin, lock,
    biometricAvailable, biometricEnabled, setBiometricEnabled,
    autoLockMinutes, setAutoLockMinutes,
  } = useAppLock();
  const [flow, setFlow] = useState<PinFlow>(null);
  const [error, setError] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pendingBiometric, setPendingBiometric] = useState(false);
  const [newPinLength, setNewPinLength] = useState<4 | 6>(pinLength);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const fail = () => {
    setError(true);
    setTimeout(() => setError(false), 650);
  };

  const closeFlow = () => {
    setFlow(null);
    setCurrentPin("");
    setNewPin("");
    setError(false);
  };

  const handlePin = async (pin: string) => {
    if (flow === "confirm-biometric") {
      const ok = await setBiometricEnabled(pendingBiometric, pin);
      if (!ok) return fail();
      closeFlow();
      return;
    }
    if (flow === "change-current") {
      if (!(await verifyPin(pin))) return fail();
      setCurrentPin(pin);
      setFlow("change-new");
      return;
    }
    if (flow === "change-new") {
      setNewPin(pin);
      setFlow("change-confirm");
      return;
    }
    if (flow === "change-confirm") {
      if (pin !== newPin || !(await changePin(currentPin, newPin))) return fail();
      Alert.alert("PIN updated", "Your new diary PIN is ready.");
      closeFlow();
    }
  };

  const flowCopy = {
    "confirm-biometric": ["Confirm your PIN", `Confirm before ${pendingBiometric ? "enabling" : "disabling"} biometric unlock.`],
    "change-current": ["Enter current PIN", "Confirm your identity before choosing a new PIN."],
    "change-new": ["Create new PIN", `Choose a new ${newPinLength}-digit PIN.`],
    "change-confirm": ["Confirm new PIN", "Enter your new PIN again."],
  } as const;

  if (flow) {
    const [title, subtitle] = flowCopy[flow];
    const length = flow === "change-new" || flow === "change-confirm" ? newPinLength : pinLength;
    return (
      <View style={[styles.flowScreen, { backgroundColor: colors.background, paddingTop: topPad + 20, paddingBottom: botPad + 18 }]}>
        <TouchableOpacity onPress={closeFlow} style={styles.flowClose}><Feather name="x" size={22} color={colors.foreground} /></TouchableOpacity>
        {flow === "change-new" && (
          <View style={[styles.lengthPicker, { backgroundColor: colors.secondary }]}>
            {[4, 6].map(option => (
              <TouchableOpacity key={option} onPress={() => setNewPinLength(option as 4 | 6)} style={[styles.lengthOption, { backgroundColor: newPinLength === option ? colors.card : "transparent" }]}>
                <Text style={[styles.lengthText, { color: newPinLength === option ? colors.primary : colors.mutedForeground }]}>{option}-digit</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <PinInput key={`${flow}-${length}`} length={length} onComplete={handlePin} title={title} subtitle={error ? "Incorrect PIN. Try again." : subtitle} error={error} />
      </View>
    );
  }

  const row = (icon: keyof typeof Feather.glyphMap, label: string, detail?: string, onPress?: () => void) => (
    <TouchableOpacity disabled={!onPress} onPress={onPress} style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={styles.rowLeft}>
        <Feather name={icon} size={18} color={colors.primary} />
        <View>
          <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
          {!!detail && <Text style={[styles.rowDetail, { color: colors.mutedForeground }]}>{detail}</Text>}
        </View>
      </View>
      {!!onPress && <Feather name="chevron-right" size={16} color={colors.mutedForeground} />}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: botPad + 24 }}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <TouchableOpacity onPress={() => router.back()}><Feather name="arrow-left" size={22} color={colors.foreground} /></TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Privacy & Security</Text>
        <View style={{ width: 22 }} />
      </View>
      <Text style={[styles.quote, { color: colors.mutedForeground }]}>"Your diary belongs only to you."</Text>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>APP LOCK</Text>
        {row("lock", "App Lock", hasPin ? "Enabled · PIN stored securely" : "Off")}
        {hasPin
          ? row("key", "Change PIN", `${pinLength}-digit PIN`, () => setFlow("change-current"))
          : row("key", "Create PIN", "Protect this diary with a PIN", () => router.push("/(onboarding)/pin-setup?returnTo=privacy" as any))}
        {hasPin && biometricAvailable && (
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <View style={styles.rowLeft}>
              <Feather name="cpu" size={18} color={colors.primary} />
              <View>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>Biometric Unlock</Text>
                <Text style={[styles.rowDetail, { color: colors.mutedForeground }]}>Face ID / Fingerprint</Text>
              </View>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={value => {
                setPendingBiometric(value);
                setFlow("confirm-biometric");
              }}
              trackColor={{ false: colors.border, true: colors.primary + "80" }}
              thumbColor={biometricEnabled ? colors.primary : colors.muted}
            />
          </View>
        )}
        {hasPin && row("shield", "Lock Now", "Return to the lock screen", () => { lock(); router.replace("/lock"); })}
      </View>

      {hasPin && <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>AUTO-LOCK</Text>
        {[
          [0, "Immediately"],
          [1, "After 1 minute"],
          [5, "After 5 minutes"],
          [15, "After 15 minutes"],
        ].map(([minutes, label]) => (
          <TouchableOpacity key={minutes} onPress={() => setAutoLockMinutes(minutes as number)} style={[styles.row, { borderBottomColor: colors.border }]}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
            {autoLockMinutes === minutes && <Feather name="check" size={18} color={colors.primary} />}
          </TouchableOpacity>
        ))}
      </View>}

      <View style={[styles.privacyNote, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <Feather name="info" size={15} color={colors.mutedForeground} />
        <Text style={[styles.privacyText, { color: colors.mutedForeground }]}>For privacy, your PIN cannot be recovered. Resetting it requires resetting app data.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingBottom: 8 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  quote: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 40, paddingVertical: 20, fontStyle: "italic" },
  section: { marginHorizontal: 24, borderRadius: 16, borderWidth: 1, marginBottom: 16, overflow: "hidden" },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  row: { minHeight: 62, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  rowDetail: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  flowScreen: { flex: 1, alignItems: "center", justifyContent: "center" },
  flowClose: { position: "absolute", left: 18, top: 64, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  lengthPicker: { flexDirection: "row", borderRadius: 18, padding: 3, marginBottom: 24 },
  lengthOption: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 15 },
  lengthText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  privacyNote: { marginHorizontal: 24, borderWidth: 1, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  privacyText: { flex: 1, fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular" },
});
