import React from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import type { Mood } from "@/types";
import { MOODS } from "@/constants/moods";

interface MoodPickerProps {
  visible: boolean;
  current: Mood;
  onSelect: (mood: Mood) => void;
  onClose: () => void;
}

export function MoodPicker({ visible, current, onSelect, onClose }: MoodPickerProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <Text style={[styles.title, { color: colors.foreground }]}>How are you feeling?</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {MOODS.map(mood => {
              const isActive = current === mood.label;
              const bg = (colors as any)[mood.bgKey] as string;
              const accent = (colors as any)[mood.accentKey] as string;
              return (
                <TouchableOpacity
                  key={mood.label}
                  onPress={() => { onSelect(mood.label); onClose(); }}
                  style={[
                    styles.moodBtn,
                    { backgroundColor: isActive ? bg : colors.secondary, borderColor: isActive ? accent : "transparent", borderWidth: isActive ? 2 : 0 },
                  ]}
                >
                  <Text style={[styles.moodLabel, { color: isActive ? accent : colors.mutedForeground }]}>
                    {mood.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: "65%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingBottom: 8,
  },
  moodBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  moodLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
