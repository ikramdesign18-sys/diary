import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { AmanatFrame } from "@/components/vector-assets/AmanatFrame";
import { AmanatPaperBackground } from "@/components/vector-assets/AmanatPaperBackground";
import { getPageBackground, getPhotoFrameKey } from "@/constants/pageCustomization";
import type { PageBackgroundKey, PhotoFrameKey } from "@/types";

export function PageBackgroundDecorations({ backgroundKey, accent }: { backgroundKey?: PageBackgroundKey; accent: string }) {
  const background = getPageBackground(backgroundKey);
  return <AmanatPaperBackground id={background.key} accent={accent} />;
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
  photos: { marginTop: 22, gap: 16 },
  photo: { width: "100%", height: "100%" },
  removePhoto: { position: "absolute", zIndex: 3, top: 7, right: 7, width: 28, height: 28, borderRadius: 14, backgroundColor: "#4A352BCC", alignItems: "center", justifyContent: "center" },
});
