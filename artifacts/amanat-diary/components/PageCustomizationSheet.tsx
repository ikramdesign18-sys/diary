import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AmanatFramePreview } from "@/components/vector-assets/AmanatFrame";
import { AmanatPaperBackground } from "@/components/vector-assets/AmanatPaperBackground";
import { AmanatSticker } from "@/components/vector-assets/AmanatSticker";
import {
  PAGE_BACKGROUNDS,
  PAGE_FONTS,
  PHOTO_FRAMES,
  STICKER_CATEGORIES,
  STICKERS,
  TEXT_STYLES,
  createPlacedSticker,
  getPageBackground,
  getPhotoFrameKey,
} from "@/constants/pageCustomization";
import { getVectorAsset } from "@/constants/vectorAssetRegistry";
import { useColors } from "@/hooks/useColors";
import type { Entry, PageSticker } from "@/types";

type Tab = "font" | "background" | "stickers" | "frame" | "text" | "theme";
type Customization = Pick<Entry, "fontKey" | "backgroundKey" | "stickers" | "photoFrameKey" | "textStyleKey">;

export function PageCustomizationSheet({
  visible,
  value,
  onChange,
  onOpenTheme,
  onClose,
}: {
  visible: boolean;
  value: Customization;
  onChange: (value: Customization) => void;
  onOpenTheme: () => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("background");
  const [stickerCategory, setStickerCategory] = useState("Love");
  const update = (next: Partial<Customization>) => onChange({ ...value, ...next });
  const selectedStickers = value.stickers ?? [];

  const addSticker = (sticker: PageSticker) => {
    if (selectedStickers.length >= 8) return;
    update({ stickers: [...selectedStickers, createPlacedSticker(sticker, selectedStickers.length)] });
  };

  const tabs: Array<{ key: Tab; label: string; icon: React.ComponentProps<typeof Feather>["name"] }> = [
    { key: "font", label: "Font", icon: "type" },
    { key: "background", label: "Paper", icon: "square" },
    { key: "stickers", label: "Stickers", icon: "star" },
    { key: "frame", label: "Frames", icon: "image" },
    { key: "text", label: "Text", icon: "align-left" },
    { key: "theme", label: "Theme", icon: "layers" },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === "web" ? 28 : insets.top + 6 }]}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Make this page yours</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Lightweight styles stay with this memory.</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.close}><Feather name="x" size={21} color={colors.foreground} /></TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {tabs.map(item => <TouchableOpacity key={item.key} onPress={() => item.key === "theme" ? onOpenTheme() : setTab(item.key)} style={[styles.tab, { backgroundColor: tab === item.key ? colors.primary : colors.card, borderColor: tab === item.key ? colors.primary : colors.border }]}>
            <Feather name={item.icon} size={14} color={tab === item.key ? colors.primaryForeground : colors.primary} />
            <Text style={[styles.tabText, { color: tab === item.key ? colors.primaryForeground : colors.primary }]}>{item.label}</Text>
          </TouchableOpacity>)}
        </ScrollView>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }]}>
          {tab === "font" && <View style={styles.grid}>{PAGE_FONTS.map(item => <Option key={item.key} label={item.label} selected={(value.fontKey ?? "clean") === item.key} colors={colors} previewStyle={{ fontFamily: item.body, fontSize: 18 }} onPress={() => update({ fontKey: item.key })} />)}</View>}
          {tab === "background" && <View style={styles.grid}>{PAGE_BACKGROUNDS.map(item => <Option key={item.key} label={item.label} selected={getPageBackground(value.backgroundKey).key === item.key} colors={colors} onPress={() => update({ backgroundKey: item.key })}><View style={[styles.paperPreview, { backgroundColor: item.paper, borderColor: item.accent }]}><AmanatPaperBackground id={item.key} accent={item.accent} /></View></Option>)}</View>}
          {tab === "frame" && <View style={styles.grid}>{PHOTO_FRAMES.map(item => <Option key={item.key} label={item.label} selected={getPhotoFrameKey(value.photoFrameKey) === item.key} colors={colors} onPress={() => update({ photoFrameKey: item.key })}><AmanatFramePreview id={item.key} accent={item.accent} /></Option>)}</View>}
          {tab === "text" && <View style={styles.grid}>{TEXT_STYLES.map(item => <Option key={item.key} label={item.label} selected={(value.textStyleKey ?? "classic") === item.key} colors={colors} icon={item.key === "centered" ? "align-center" : "align-left"} onPress={() => update({ textStyleKey: item.key })} />)}</View>}
          {tab === "stickers" && <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
              {STICKER_CATEGORIES.map(category => <TouchableOpacity key={category} onPress={() => setStickerCategory(category)} style={[styles.category, { backgroundColor: stickerCategory === category ? colors.secondary : colors.card, borderColor: stickerCategory === category ? colors.primary : colors.border }]}><Text style={[styles.categoryText, { color: colors.foreground }]}>{category}</Text></TouchableOpacity>)}
            </ScrollView>
            <Text style={[styles.stickerHint, { color: colors.mutedForeground }]}>Tap to place on the page. Move, resize, rotate, or remove it there. {selectedStickers.length}/8 placed.</Text>
            <View style={styles.stickerGrid}>{STICKERS.filter(item => item.category === stickerCategory).map(sticker => {
              const asset = getVectorAsset(sticker.assetId ?? sticker.id);
              return <TouchableOpacity disabled={selectedStickers.length >= 8} key={sticker.id} onPress={() => addSticker(sticker)} style={[styles.sticker, { backgroundColor: colors.card, borderColor: colors.border, opacity: selectedStickers.length >= 8 ? 0.45 : 1 }]}><AmanatSticker id={sticker.assetId ?? sticker.id} size={50} color={asset?.defaultColors.color} accent={asset?.defaultColors.accent} /><Feather name="plus-circle" size={14} color={colors.primary} style={styles.stickerCheck} /></TouchableOpacity>;
            })}</View>
          </>}
        </ScrollView>
        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <TouchableOpacity onPress={onClose} style={[styles.done, { backgroundColor: colors.primary }]}><Text style={[styles.doneText, { color: colors.primaryForeground }]}>Done</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Option({ label, selected, colors, onPress, icon, previewStyle, children }: any) {
  return <TouchableOpacity onPress={onPress} style={[styles.option, { backgroundColor: selected ? colors.secondary : colors.card, borderColor: selected ? colors.primary : colors.border }]}>
    {children ?? (icon ? <Feather name={icon} size={22} color={colors.primary} /> : <Text style={[styles.preview, previewStyle, { color: colors.foreground }]}>Aa</Text>)}
    <Text style={[styles.optionText, { color: colors.foreground }]}>{label}</Text>
    {selected && <Feather name="check-circle" size={15} color={colors.primary} />}
  </TouchableOpacity>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 21, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  subtitle: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 3 },
  close: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  tabs: { paddingHorizontal: 16, gap: 7, paddingBottom: 14 },
  tab: { height: 38, paddingHorizontal: 12, borderRadius: 19, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 5 },
  tabText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  content: { paddingHorizontal: 18, paddingTop: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  option: { width: "48%", minHeight: 92, flexGrow: 1, borderWidth: 1.5, borderRadius: 16, padding: 12, gap: 8, justifyContent: "center" },
  optionText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  preview: { fontSize: 18 },
  paperPreview: { width: 72, height: 54, borderRadius: 7, borderWidth: 1, overflow: "hidden" },
  categories: { gap: 7, paddingBottom: 12 },
  category: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 7 },
  categoryText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  stickerHint: { fontSize: 10, marginBottom: 12 },
  stickerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  sticker: { width: 68, height: 68, borderWidth: 1.5, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  stickerCheck: { position: "absolute", right: 6, top: 6 },
  footer: { borderTopWidth: 1, padding: 12 },
  done: { height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  doneText: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
