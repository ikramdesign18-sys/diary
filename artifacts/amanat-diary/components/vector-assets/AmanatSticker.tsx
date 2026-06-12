import React, { memo } from "react";
import Svg, { Circle, G, Line, Path, Polygon, Rect } from "react-native-svg";

export interface AmanatStickerProps {
  id: string;
  size?: number;
  color?: string;
  accent?: string;
}

const categoryOf = (id: string) => id.split("-")[0];
const variantOf = (id: string) => {
  const indexed = Number(id.split("-")[1]);
  return Number.isFinite(indexed) && indexed > 0 ? (indexed - 1) % 8 : [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 8;
};

function Motif({ category, color, accent }: { category: string; color: string; accent: string }) {
  if (category === "love") return <><Path d="M32 53C13 39 12 19 25 15c8-3 13 2 16 8 4-6 9-11 17-8 13 4 12 24-7 38l-10 8z" fill={accent} stroke={color} strokeWidth="3" /><Path d="M28 25c3-4 7-5 11-1" fill="none" stroke="#FFF9F0" strokeWidth="3" strokeLinecap="round" /></>;
  if (category === "birthday") return <><Rect x="18" y="32" width="46" height="28" rx="6" fill={accent} stroke={color} strokeWidth="3" /><Path d="M18 43c8 7 15-7 23 0s15-7 23 0" fill="none" stroke="#FFF9F0" strokeWidth="3" /><Line x1="41" y1="31" x2="41" y2="19" stroke={color} strokeWidth="3" /><Path d="M41 18c-5-5 0-9 0-9s5 4 0 9z" fill="#D6A65D" /></>;
  if (category === "family") return <><Path d="M13 39 41 15l28 24v28H13z" fill={accent} stroke={color} strokeWidth="3" strokeLinejoin="round" /><Path d="M31 66V48h20v18" fill="#FFF9F0" stroke={color} strokeWidth="3" /><Path d="M41 42c-7-6-14-1-11 6 2 5 11 10 11 10s9-5 11-10c3-7-4-12-11-6z" fill="#C98986" /></>;
  if (category === "travel") return <><Path d="m12 43 57-22-18 22 13 12-8 5-17-10-12 15-5-3 6-19-16 4z" fill={accent} stroke={color} strokeWidth="3" strokeLinejoin="round" /><Circle cx="61" cy="19" r="4" fill="#D6A65D" /></>;
  if (category === "mood") return <><Circle cx="41" cy="41" r="27" fill={accent} stroke={color} strokeWidth="3" /><Circle cx="32" cy="36" r="3" fill={color} /><Circle cx="50" cy="36" r="3" fill={color} /><Path d="M29 49c7 7 17 7 24 0" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" /></>;
  if (category === "nature") return <><Path d="M42 68C28 51 28 27 43 12c15 16 14 40-1 56z" fill={accent} stroke={color} strokeWidth="3" /><Path d="M42 64V22M42 43l13-10M42 51 29 39" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" /></>;
  if (category === "gratitude") return <><Path d="M41 65c-18-8-22-24-9-32 2-14 16-18 23-7 14 1 18 16 8 24-3 10-12 16-22 15z" fill={accent} stroke={color} strokeWidth="3" /><Circle cx="42" cy="41" r="7" fill="#FFF9F0" /><Path d="M42 13v8M17 27l7 4M65 27l-7 4" stroke="#D6A65D" strokeWidth="3" strokeLinecap="round" /></>;
  if (category === "study") return <><Rect x="15" y="18" width="52" height="47" rx="7" fill={accent} stroke={color} strokeWidth="3" /><Line x1="27" y1="18" x2="27" y2="65" stroke={color} strokeWidth="3" /><Path d="M36 31h20M36 41h20M36 51h14" stroke="#FFF9F0" strokeWidth="3" strokeLinecap="round" /></>;
  if (category === "memory") return <><Rect x="17" y="21" width="48" height="43" rx="5" fill={accent} stroke={color} strokeWidth="3" /><Circle cx="41" cy="42" r="10" fill="#FFF9F0" stroke={color} strokeWidth="3" /><Path d="M28 21v-7h26v7" fill="none" stroke={color} strokeWidth="3" /><Circle cx="57" cy="29" r="3" fill="#D6A65D" /></>;
  return <><Path d="m41 12 6 20 20-6-15 15 15 15-20-6-6 20-6-20-20 6 15-15-15-15 20 6z" fill={accent} stroke={color} strokeWidth="2.5" strokeLinejoin="round" /><Circle cx="41" cy="41" r="5" fill="#FFF9F0" /></>;
}

function AmanatStickerComponent({ id, size = 56, color = "#765A45", accent = "#E7C9B1" }: AmanatStickerProps) {
  const variant = variantOf(id);
  return <Svg width={size} height={size} viewBox="0 0 82 82">
    <G rotation={(variant - 3) * 1.2} origin="41, 41">
      <Motif category={categoryOf(id)} color={color} accent={accent} />
      {variant % 2 === 0 && <><Circle cx="70" cy="15" r="2.5" fill="#D6A65D" /><Circle cx="13" cy="66" r="2" fill={accent} /></>}
      {variant % 3 === 0 && <Path d="m65 62 2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#D6A65D" />}
      {variant === 1 && <Path d="M17 72c13 4 35 4 48 0" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" />}
      {variant === 2 && <Circle cx="41" cy="41" r="35" fill="none" stroke={accent} strokeWidth="2" strokeDasharray="3 6" opacity=".7" />}
      {variant === 4 && <Path d="m13 18 3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill={accent} />}
      {variant === 5 && <><Circle cx="14" cy="20" r="3" fill={accent} /><Circle cx="69" cy="65" r="3" fill="#D6A65D" /></>}
      {variant === 7 && <Path d="M12 58c8 9 12 10 20 12M70 58c-8 9-12 10-20 12" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" />}
    </G>
  </Svg>;
}

export const AmanatSticker = memo(AmanatStickerComponent);
