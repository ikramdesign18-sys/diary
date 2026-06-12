import React, { memo } from "react";
import Svg, { Circle, G, Line, Path, Rect } from "react-native-svg";

export const AmanatIllustration = memo(function AmanatIllustration({ id, width = 220, color = "#765A45", accent = "#D8B89B" }: { id: string; width?: number; color?: string; accent?: string }) {
  const voice = id.includes("voice");
  const letter = id.includes("letter") || id.includes("delivery");
  const cloud = id.includes("cloud");
  const photo = id.includes("photo");
  const lock = id.includes("lock") || id.includes("safe");
  return <Svg width={width} height={width * 0.72} viewBox="0 0 240 174">
    <Circle cx="120" cy="86" r="72" fill={accent} opacity=".18" />
    <G stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      {voice ? <><Rect x="99" y="38" width="42" height="70" rx="21" fill="#FFF9F0" /><Path d="M81 88c0 25 17 39 39 39s39-14 39-39M120 127v22M96 149h48" fill="none" /><Line x1="108" y1="58" x2="132" y2="58" /></>
        : letter ? <><Rect x="56" y="54" width="128" height="82" rx="12" fill="#FFF9F0" /><Path d="m58 62 62 45 62-45" fill={accent} /><Path d="m58 131 44-39M182 131l-44-39" fill="none" /></>
        : cloud ? <><Path d="M62 119c-17-2-21-29-2-36 4-25 35-32 49-13 20-23 58-7 55 23 22 3 19 28 1 30H68z" fill="#FFF9F0" /><Path d="m105 102 15-15 15 15M120 88v31" fill="none" /></>
        : photo ? <><Rect x="62" y="42" width="116" height="100" rx="10" fill="#FFF9F0" /><Circle cx="145" cy="70" r="10" fill={accent} /><Path d="m73 128 35-39 24 25 15-16 20 30z" fill={accent} /></>
        : lock ? <><Rect x="80" y="78" width="80" height="62" rx="14" fill="#FFF9F0" /><Path d="M96 78V62c0-33 48-33 48 0v16" fill="none" /><Circle cx="120" cy="105" r="7" fill={accent} /><Line x1="120" y1="112" x2="120" y2="124" /></>
        : <><Path d="M62 48c25-9 42-2 58 10 16-12 33-19 58-10v91c-25-8-42-2-58 10-16-12-33-18-58-10z" fill="#FFF9F0" /><Line x1="120" y1="58" x2="120" y2="149" /><Path d="M78 76h28M78 91h28M134 76h28M134 91h28" /></>}
    </G>
    <Circle cx="42" cy="45" r="4" fill="#D6A65D" /><Circle cx="199" cy="128" r="5" fill={accent} />
  </Svg>;
});
