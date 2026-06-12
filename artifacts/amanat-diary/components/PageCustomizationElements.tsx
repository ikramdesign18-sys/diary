import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AmanatFrame } from "@/components/vector-assets/AmanatFrame";
import { AmanatPaperBackground } from "@/components/vector-assets/AmanatPaperBackground";
import { AmanatSticker } from "@/components/vector-assets/AmanatSticker";
import { getPageBackground, getPhotoFrameKey } from "@/constants/pageCustomization";
import { getVectorAsset } from "@/constants/vectorAssetRegistry";
import type { PageBackgroundKey, PageSticker, PhotoFrameKey } from "@/types";

export function PageBackgroundDecorations({ backgroundKey, accent }: { backgroundKey?: PageBackgroundKey; accent: string }) {
  const background = getPageBackground(backgroundKey);
  return <AmanatPaperBackground id={background.key} accent={accent} />;
}

export function StickerStrip({ stickers, accent, removable, onRemove }: { stickers?: PageSticker[]; accent: string; removable?: boolean; onRemove?: (id: string) => void }) {
  if (!stickers?.length) return null;
  return <View style={styles.stickers}>{stickers.map(sticker => (
    <View key={sticker.id} style={[styles.sticker, { backgroundColor: accent + "16", borderColor: accent + "35" }]}>
      {sticker.assetId || getVectorAsset(sticker.id)
        ? <AmanatSticker id={sticker.assetId ?? sticker.id} size={45} color={getVectorAsset(sticker.assetId ?? sticker.id)?.defaultColors.color} accent={getVectorAsset(sticker.assetId ?? sticker.id)?.defaultColors.accent} />
        : <Text style={styles.stickerEmoji}>{sticker.emoji ?? "✦"}</Text>}
      {removable && <Text onPress={() => onRemove?.(sticker.id)} style={[styles.removeSticker, { color: accent }]}>×</Text>}
    </View>
  ))}</View>;
}

export function FramedPhotos({ photos, frameKey = "rounded", accent, removable, onRemove }: { photos?: string[]; frameKey?: PhotoFrameKey; accent: string; removable?: boolean; onRemove?: (uri: string) => void }) {
  if (!photos?.length) return null;
  return <View style={styles.photos}>{photos.map(photo => (
    <AmanatFrame key={photo} id={getPhotoFrameKey(frameKey)} accent={accent}>
      <Image source={{ uri: photo }} style={styles.photo} contentFit="cover" />
      {removable && <TouchableOpacity onPress={() => onRemove?.(photo)} style={styles.removePhoto}><Feather name="x" size={14} color="#FFFDF9" /></TouchableOpacity>}
    </AmanatFrame>
  ))}</View>;
}

const styles = StyleSheet.create({
  stickers: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 16 },
  sticker: { minWidth: 56, height: 56, borderWidth: 1, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  stickerEmoji: { fontSize: 23 },
  removeSticker: { position: "absolute", top: -7, right: -5, width: 20, height: 20, borderRadius: 10, backgroundColor: "#FFFDF9", textAlign: "center", lineHeight: 18, fontSize: 17, fontWeight: "700" },
  photos: { marginTop: 22, gap: 16 },
  photo: { width: "100%", height: "100%" },
  removePhoto: { position: "absolute", zIndex: 3, top: 7, right: 7, width: 28, height: 28, borderRadius: 14, backgroundColor: "#4A352BCC", alignItems: "center", justifyContent: "center" },
});
