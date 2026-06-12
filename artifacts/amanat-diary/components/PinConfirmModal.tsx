import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PinInput } from "@/components/PinInput";
import { useAppLock } from "@/context/AppLockContext";
import { useColors } from "@/hooks/useColors";

export function PinConfirmModal({ visible, title, subtitle, onCancel, onConfirmed }: {
  visible: boolean;
  title: string;
  subtitle: string;
  onCancel: () => void;
  onConfirmed: () => void | Promise<void>;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { pinLength, verifyPin } = useAppLock();
  const [error, setError] = useState(false);
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: Platform.OS === "web" ? 40 : insets.top + 12 }]}>
        <TouchableOpacity onPress={onCancel} style={styles.close}><Feather name="x" size={22} color={colors.foreground} /></TouchableOpacity>
        <Text style={[styles.privacy, { color: colors.mutedForeground }]}>A private confirmation before this memory travels through time.</Text>
        <PinInput
          key={`${visible}-${error}`}
          length={pinLength}
          title={title}
          subtitle={error ? "Incorrect PIN. Try again." : subtitle}
          error={error}
          onComplete={async pin => {
            if (!(await verifyPin(pin))) {
              setError(true);
              setTimeout(() => setError(false), 650);
              return;
            }
            setError(false);
            await onConfirmed();
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  close: { position: "absolute", top: 50, left: 18, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  privacy: { maxWidth: 320, textAlign: "center", fontSize: 11, lineHeight: 17, marginBottom: 30, fontFamily: "Inter_400Regular" },
});
