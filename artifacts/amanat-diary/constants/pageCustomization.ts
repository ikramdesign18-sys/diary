import type {
  Entry,
  Mood,
  PageBackgroundKey,
  PageFontKey,
  PageSticker,
  PageTextStyleKey,
  PhotoFrameKey,
} from "@/types";
import { VECTOR_BACKGROUNDS, VECTOR_FRAMES, VECTOR_STICKERS } from "@/constants/vectorAssetRegistry";

export const PAGE_FONTS: Array<{ key: PageFontKey; label: string; body: string; title: string }> = [
  { key: "clean", label: "Clean", body: "Inter_400Regular", title: "Inter_700Bold" },
  { key: "serif", label: "Diary Serif", body: "serif", title: "serif" },
  { key: "handwriting", label: "Handwritten", body: "cursive", title: "cursive" },
  { key: "rounded", label: "Soft Rounded", body: "sans-serif", title: "Inter_600SemiBold" },
  { key: "elegant", label: "Elegant", body: "serif", title: "Inter_500Medium" },
];

export const PAGE_BACKGROUNDS: Array<{
  key: PageBackgroundKey;
  label: string;
  paper: string;
  accent: string;
  pattern: "plain" | "lined" | "dots" | "grid" | "corners" | "night";
}> = VECTOR_BACKGROUNDS.map(item => ({
  key: item.id,
  label: item.name,
  paper: item.defaultColors.paper ?? "#FFF9ED",
  accent: item.defaultColors.accent,
  pattern: item.pattern ?? "plain",
}));

export const PHOTO_FRAMES: Array<{ key: PhotoFrameKey; label: string; accent: string }> = VECTOR_FRAMES.map(item => ({ key: item.id, label: item.name, accent: item.defaultColors.accent }));

export const TEXT_STYLES: Array<{ key: PageTextStyleKey; label: string; size: number; lineHeight: number; align: "left" | "center" }> = [
  { key: "classic", label: "Classic", size: 17, lineHeight: 29, align: "left" },
  { key: "spacious", label: "Spacious", size: 18, lineHeight: 34, align: "left" },
  { key: "compact", label: "Compact", size: 15, lineHeight: 24, align: "left" },
  { key: "centered", label: "Centered", size: 17, lineHeight: 30, align: "center" },
];

export const STICKER_CATEGORIES = [...new Set(VECTOR_STICKERS.map(item => item.category))];
export const STICKERS: PageSticker[] = VECTOR_STICKERS.map(item => ({ id: item.id, assetId: item.id, category: item.category }));

export function createPlacedSticker(sticker: PageSticker, index: number): PageSticker {
  const assetId = sticker.assetId ?? sticker.id;
  const x = 18 + (index % 3) * 88;
  const y = 150 + Math.floor(index / 3) * 88;
  const width = 70;
  const height = 70;
  return {
    id: `${assetId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    assetId,
    emoji: sticker.emoji,
    category: sticker.category,
    x,
    y,
    width,
    height,
    xPercent: x / 320,
    yPercent: y / 600,
    widthPercent: width / 320,
    heightPercent: height / 600,
    rotation: 0,
    zIndex: index + 1,
  };
}

const backgroundAliases: Record<string, string> = {
  cream: "cream-blank", ruled: "cream-lined", pink: "soft-pink", blue: "soft-blue",
  gratitude: "gratitude-paper", love: "love-paper", travel: "travel-paper",
  birthday: "birthday-paper", calm: "calm-paper",
};
const frameAliases: Record<string, string> = {
  rounded: "rounded-classic", polaroid: "polaroid-classic", tape: "tape-corners", scrapbook: "scrapbook-card",
};

export function getPageFont(key?: PageFontKey) {
  return PAGE_FONTS.find(item => item.key === key) ?? PAGE_FONTS[0];
}

export function getPageBackground(key?: PageBackgroundKey) {
  return PAGE_BACKGROUNDS.find(item => item.key === (key ? backgroundAliases[key] ?? key : "theme")) ?? PAGE_BACKGROUNDS[0];
}

export function getPhotoFrameKey(key?: PhotoFrameKey) {
  return key ? frameAliases[key] ?? key : "rounded-classic";
}

export function getTextStyle(key?: PageTextStyleKey) {
  return TEXT_STYLES.find(item => item.key === key) ?? TEXT_STYLES[0];
}

export function getMoodStyleSuggestion(mood: Mood) {
  const suggestions: Record<Mood, Pick<Entry, "fontKey" | "backgroundKey" | "photoFrameKey" | "textStyleKey"> & { stickerCategory: string }> = {
    Happy: { fontKey: "rounded", backgroundKey: "birthday-paper", photoFrameKey: "polaroid-warm", textStyleKey: "spacious", stickerCategory: "Birthday" },
    Sad: { fontKey: "serif", backgroundKey: "sad-paper", photoFrameKey: "rounded-soft", textStyleKey: "spacious", stickerCategory: "Mood" },
    Emotional: { fontKey: "serif", backgroundKey: "soft-pink", photoFrameKey: "scrapbook-card", textStyleKey: "spacious", stickerCategory: "Mood" },
    Calm: { fontKey: "clean", backgroundKey: "calm-paper", photoFrameKey: "rounded-sage", textStyleKey: "spacious", stickerCategory: "Nature" },
    Grateful: { fontKey: "elegant", backgroundKey: "gratitude-paper", photoFrameKey: "polaroid-warm", textStyleKey: "classic", stickerCategory: "Gratitude" },
    Romantic: { fontKey: "handwriting", backgroundKey: "love-paper", photoFrameKey: "polaroid-rose", textStyleKey: "spacious", stickerCategory: "Love" },
    Motivated: { fontKey: "clean", backgroundKey: "study-grid", photoFrameKey: "scrapbook-card", textStyleKey: "compact", stickerCategory: "Study/Work" },
    Angry: { fontKey: "clean", backgroundKey: "soft-pink", photoFrameKey: "rounded-classic", textStyleKey: "compact", stickerCategory: "Minimal" },
    Reflective: { fontKey: "serif", backgroundKey: "cream-blank", photoFrameKey: "scrapbook-vintage", textStyleKey: "spacious", stickerCategory: "Memory" },
    Hopeful: { fontKey: "rounded", backgroundKey: "soft-blue", photoFrameKey: "polaroid-classic", textStyleKey: "spacious", stickerCategory: "Nature" },
    Dreamy: { fontKey: "handwriting", backgroundKey: "lavender-paper", photoFrameKey: "washi-pink", textStyleKey: "centered", stickerCategory: "Mood" },
    Neutral: { fontKey: "clean", backgroundKey: "theme", photoFrameKey: "rounded-classic", textStyleKey: "classic", stickerCategory: "Minimal" },
  };
  return suggestions[mood];
}
