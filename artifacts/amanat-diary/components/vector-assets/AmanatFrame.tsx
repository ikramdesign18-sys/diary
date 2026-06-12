import React, { memo, type ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

export function AmanatFrame({ id, accent = "#B18C62", children, style }: { id: string; accent?: string; children?: ReactNode; style?: ViewStyle }) {
  const kind = id.includes("polaroid") ? "polaroid" : id.includes("tape") || id.includes("washi") ? "tape" : id.includes("scrap") || id.includes("torn") ? "scrapbook" : id.includes("clip") ? "clip" : id.includes("tab") || id.includes("label") || id.includes("tag") ? "label" : "rounded";
  const variant = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 5;
  return <View style={[styles.base, kind === "polaroid" && styles.polaroid, kind === "scrapbook" && [styles.scrapbook, { borderColor: accent }], kind === "tape" && styles.tapeFrame, kind === "label" && [styles.label, { borderColor: accent }], style]}>
    {kind === "tape" && <><View style={[styles.tape, { backgroundColor: accent + "70", transform: [{ rotate: `${variant - 4}deg` }] }]} /><View style={[styles.tape, styles.tapeRight, { backgroundColor: accent + "55" }]} /></>}
    {kind === "clip" && <View style={[styles.clip, { borderColor: accent }]} />}
    {children}
  </View>;
}

export const AmanatFramePreview = memo(function AmanatFramePreview({ id, accent = "#B18C62" }: { id: string; accent?: string }) {
  return <AmanatFrame id={id} accent={accent} style={styles.preview}><View style={[styles.previewInner, { backgroundColor: accent + "24" }]} /></AmanatFrame>;
});

const styles = StyleSheet.create({
  base: { width: "100%", height: 230, borderRadius: 15, overflow: "hidden", backgroundColor: "#FFFDF9" },
  polaroid: { height: 270, padding: 10, paddingBottom: 34, borderRadius: 4, shadowColor: "#3A2718", shadowOpacity: 0.16, shadowRadius: 7, elevation: 3 },
  scrapbook: { height: 250, padding: 8, borderWidth: 2, borderRadius: 5, transform: [{ rotate: "-0.6deg" }] },
  tapeFrame: { overflow: "visible", marginTop: 8 },
  label: { padding: 7, borderWidth: 1, borderRadius: 10 },
  tape: { position: "absolute", zIndex: 2, width: 76, height: 22, top: -10, left: "37%", opacity: 0.88 },
  tapeRight: { width: 52, right: 8, left: undefined, top: 8, transform: [{ rotate: "38deg" }] },
  clip: { position: "absolute", zIndex: 2, width: 18, height: 48, right: 16, top: -12, borderWidth: 3, borderRadius: 10, transform: [{ rotate: "8deg" }] },
  preview: { width: 72, height: 54, padding: 6 },
  previewInner: { flex: 1, borderRadius: 5 },
});
