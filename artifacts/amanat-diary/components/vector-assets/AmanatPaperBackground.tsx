import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";

export interface AmanatPaperBackgroundProps {
  id: string;
  accent?: string;
}

function AmanatPaperBackgroundComponent({ id, accent = "#B18C62" }: AmanatPaperBackgroundProps) {
  const pattern = id.includes("lined") || id.includes("blue") ? "lined" : id.includes("dot") || id.includes("travel") || id.includes("birthday") ? "dots" : id.includes("grid") || id.includes("study") ? "grid" : id.includes("love") || id.includes("family") || id.includes("gratitude") ? "corners" : id.includes("night") ? "night" : "minimal";
  if (pattern === "lined") return <View pointerEvents="none" style={styles.lines}>{Array.from({ length: 30 }).map((_, index) => <View key={index} style={[styles.line, { backgroundColor: accent }]} />)}</View>;
  if (pattern === "dots") return <View pointerEvents="none" style={styles.dots}>{Array.from({ length: 96 }).map((_, index) => <View key={index} style={[styles.dot, { backgroundColor: accent }]} />)}</View>;
  if (pattern === "grid") return <View pointerEvents="none" style={StyleSheet.absoluteFill}><View style={styles.lines}>{Array.from({ length: 30 }).map((_, index) => <View key={index} style={[styles.line, { backgroundColor: accent }]} />)}</View><View style={styles.columns}>{Array.from({ length: 15 }).map((_, index) => <View key={index} style={[styles.column, { backgroundColor: accent }]} />)}</View></View>;
  return <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
    {pattern === "corners" && <><Path d="M12 70C18 35 35 18 72 12" fill="none" stroke={accent} strokeWidth="1.5" opacity=".22" /><Circle cx="25" cy="35" r="4" fill={accent} opacity=".16" /><Circle cx="51" cy="22" r="2.5" fill={accent} opacity=".2" /></>}
    {pattern === "night" && <><Circle cx="88%" cy="12%" r="36" fill={accent} opacity=".08" /><Circle cx="82%" cy="10%" r="28" fill="#FFF9F0" opacity=".8" /><Circle cx="14%" cy="22%" r="2" fill={accent} opacity=".3" /><Circle cx="22%" cy="13%" r="1.5" fill={accent} opacity=".3" /></>}
    {pattern === "minimal" && <><Line x1="8%" y1="8%" x2="28%" y2="8%" stroke={accent} opacity=".18" /><Line x1="72%" y1="92%" x2="92%" y2="92%" stroke={accent} opacity=".18" /></>}
  </Svg>;
}

export const AmanatPaperBackground = memo(AmanatPaperBackgroundComponent);

const styles = StyleSheet.create({
  lines: { ...StyleSheet.absoluteFillObject, paddingTop: 116, gap: 29, opacity: 0.18 },
  line: { height: StyleSheet.hairlineWidth },
  dots: { ...StyleSheet.absoluteFillObject, flexDirection: "row", flexWrap: "wrap", gap: 24, padding: 20, opacity: 0.18 },
  dot: { width: 2, height: 2, borderRadius: 1 },
  columns: { ...StyleSheet.absoluteFillObject, flexDirection: "row", gap: 29, opacity: 0.12 },
  column: { width: StyleSheet.hairlineWidth },
});
