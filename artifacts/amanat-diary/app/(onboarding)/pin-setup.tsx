import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PinInput } from "@/components/PinInput";
import { useAppLock } from "@/context/AppLockContext";
import { useColors } from "@/hooks/useColors";

export default function PinSetupScreen() {
  const colors = useColors();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { setupPin, skipPinSetup, biometricAvailable, setBiometricEnabled } = useAppLock();
  const [step, setStep] = useState<"create" | "confirm">("create");
  const [length, setLength] = useState<4 | 6>(4);
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState(false);
  const handleFirst = (pin: string) => {
    setFirstPin(pin);
    setStep("confirm");
  };

  const handleConfirm = async (pin: string) => {
    if (pin === firstPin) {
      await setupPin(pin);
      const finish = () => router.replace(returnTo === "home" ? "/(tabs)" : returnTo === "privacy" ? "/settings/privacy" : "/(onboarding)/backup");
      if (!biometricAvailable) {
        finish();
        return;
      }
      Alert.alert("Faster private access", "Enable Face ID / Fingerprint for faster unlock?", [
        { text: "Not now", style: "cancel", onPress: finish },
        {
          text: "Enable",
          onPress: async () => {
            await setBiometricEnabled(true, pin);
            finish();
          },
        },
      ]);
    } else {
      setError(true);
      setTimeout(() => { setError(false); setStep("create"); setFirstPin(""); }, 800);
    }
  };

  const skip = async () => {
    await skipPinSetup();
    Alert.alert("App lock is off", "You can protect your diary later from Profile.", [
      { text: "Continue", onPress: () => router.replace(returnTo === "home" ? "/(tabs)" : "/(onboarding)/backup") },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        bounces={false}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
            <Feather name="lock" size={23} color={colors.primary} />
          </View>
          <Text style={[styles.heading, { color: colors.foreground }]}>Your diary is private.</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>Create a PIN to protect your memories.</Text>
        </View>

        <View style={styles.pinWrap}>
          {step === "create" && (
            <View style={[styles.lengthPicker, { backgroundColor: colors.secondary }]}>
              {[4, 6].map(option => (
                <TouchableOpacity
                  key={option}
                  onPress={() => setLength(option as 4 | 6)}
                  style={[styles.lengthOption, { backgroundColor: length === option ? colors.card : "transparent" }]}
                >
                  <Text style={[styles.lengthText, { color: length === option ? colors.primary : colors.mutedForeground }]}>{option}-digit</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {step === "create" ? (
            <PinInput
              compact
              onComplete={handleFirst}
              length={length}
              title="Create your PIN"
              subtitle={`Choose a ${length}-digit PIN to lock the app`}
            />
          ) : (
            <PinInput
              compact
              onComplete={handleConfirm}
              length={length}
              title="Confirm your PIN"
              subtitle="Enter the same PIN again"
              error={error}
            />
          )}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.privateNote, { color: colors.mutedForeground }]}>
            Your PIN is hashed and stored securely on this device.
          </Text>
          {returnTo !== "privacy" && step === "create" && (
            <TouchableOpacity onPress={skip} style={[styles.skip, { borderColor: colors.border }]}>
              <Text style={[styles.skipText, { color: colors.primary }]}>Skip for now</Text>
              <Text style={[styles.skipNote, { color: colors.mutedForeground }]}>You can protect your diary later from Profile.</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 18,
  },
  header: {
    alignItems: "center",
    gap: 7,
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  heading: {
    fontSize: 23,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    textAlign: "center",
    lineHeight: 29,
  },
  sub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 19,
  },
  pinWrap: {
    alignItems: "center",
    paddingVertical: 12,
  },
  lengthPicker: { flexDirection: "row", alignSelf: "center", borderRadius: 17, padding: 3, marginBottom: 15 },
  lengthOption: { minWidth: 76, alignItems: "center", paddingHorizontal: 13, paddingVertical: 6, borderRadius: 14 },
  lengthText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  footer: {
    alignItems: "center",
    paddingTop: 12,
    gap: 12,
  },
  privateNote: { maxWidth: 290, fontSize: 10, lineHeight: 15, fontFamily: "Inter_400Regular", textAlign: "center" },
  skip: { width: "100%", borderTopWidth: 1, paddingTop: 11, paddingBottom: 2, alignItems: "center", gap: 4 },
  skipText: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_600SemiBold" },
  skipNote: { fontSize: 9, lineHeight: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
