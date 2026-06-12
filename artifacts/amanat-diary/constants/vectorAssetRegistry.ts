import type { ComponentType } from "react";

import { AmanatFrame } from "@/components/vector-assets/AmanatFrame";
import { AmanatIllustration } from "@/components/vector-assets/AmanatIllustration";
import { AmanatPaperBackground } from "@/components/vector-assets/AmanatPaperBackground";
import { AmanatSticker } from "@/components/vector-assets/AmanatSticker";

export type VectorAssetType = "sticker" | "background" | "frame" | "illustration";
export interface VectorAsset {
  id: string;
  name: string;
  category: string;
  type: VectorAssetType;
  moodTags: string[];
  component: ComponentType<any>;
  defaultColors: { color: string; accent: string; paper?: string };
  pattern?: "plain" | "lined" | "dots" | "grid" | "corners" | "night";
}

const palette: Record<string, { color: string; accent: string }> = {
  Love: { color: "#76524D", accent: "#E7C1C1" },
  Birthday: { color: "#76593C", accent: "#EBCB9C" },
  Family: { color: "#695847", accent: "#DCC7AA" },
  Travel: { color: "#635442", accent: "#C7D5C3" },
  Mood: { color: "#5C6170", accent: "#D8D4E7" },
  Nature: { color: "#52664A", accent: "#C7D8BD" },
  Gratitude: { color: "#715B35", accent: "#E5D29C" },
  "Study/Work": { color: "#40564F", accent: "#BDD2CE" },
  Memory: { color: "#614E42", accent: "#D8C4B2" },
  Minimal: { color: "#62594F", accent: "#DDD5CA" },
};

const stickerNames: Record<string, string[]> = {
  Love: ["Tender Heart", "Love Letter", "Soft Rose", "Care Hands", "Two Hearts", "Keepsake Ribbon", "Warm Embrace", "Golden Affection"],
  Birthday: ["Birthday Cake", "Single Candle", "Soft Balloon", "Wrapped Gift", "Quiet Confetti", "Party Crown", "Birthday Wish", "Golden Celebration"],
  Family: ["Memory Home", "Little One", "Family Heart", "Parent and Child", "Family Portrait", "Warm Kitchen", "Home Key", "Together Always"],
  Travel: ["Paper Plane", "Weekend Suitcase", "Map Pin", "Mountain Path", "Travel Camera", "Passport Mark", "Quiet Beach", "Journey Compass"],
  Mood: ["Happy Sun", "Rain Cloud", "Calm Moon", "Angry Spark", "Grateful Bloom", "Hopeful Star", "Deep Thought", "Gentle Rest"],
  Nature: ["Pressed Flower", "Sage Leaf", "Soft Butterfly", "Passing Cloud", "Spring Rain", "Night Moon", "Small Stars", "Memory Tree"],
  Gratitude: ["Quiet Candle", "Prayer Hands", "Gratitude Jar", "Peaceful Light", "Soft Lotus", "Golden Sparkle", "Thankful Heart", "Blessing Bloom"],
  "Study/Work": ["Daily Notebook", "Fountain Pen", "Warm Coffee", "Calm Laptop", "Gentle Checklist", "Desk Clock", "Focus Page", "Small Achievement"],
  Memory: ["Private Lock", "Keepsake Key", "Sealed Envelope", "Diary Book", "Silk Bookmark", "Photo Card", "Memory Box", "Time Capsule"],
  Minimal: ["Soft Dots", "Four Stars", "Fine Divider", "Small Sparkles", "Corner Flourish", "Quiet Diamond", "Golden Point", "Simple Halo"],
};

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const VECTOR_STICKERS: VectorAsset[] = Object.entries(stickerNames).flatMap(([category, names]) =>
  names.map((name, index) => ({
    id: `${category === "Study/Work" ? "study" : slug(category)}-${index + 1}-${slug(name)}`,
    name,
    category,
    type: "sticker" as const,
    moodTags: [slug(category), slug(name).split("-")[0]],
    component: AmanatSticker,
    defaultColors: palette[category],
  })),
);

const papers: Array<[string, string, string, string, string, VectorAsset["pattern"]]> = [
  ["theme", "Page Theme", "Minimal", "#B18C62", "#FFF9ED", "plain"],
  ["cream-blank", "Blank Cream", "Minimal", "#B18C62", "#FFF9ED", "plain"],
  ["cream-lined", "Warm Lined Paper", "Memory", "#B18C62", "#FFF9ED", "lined"],
  ["premium-dotted", "Premium Dotted Paper", "Minimal", "#A99680", "#FFFCF5", "dots"],
  ["study-grid", "Study Grid Paper", "Study/Work", "#829B9B", "#FBFDFB", "grid"],
  ["soft-pink", "Soft Pink Paper", "Love", "#C58F92", "#FFF5F5", "plain"],
  ["soft-blue", "Soft Blue Paper", "Mood", "#86A9B8", "#F4FAFC", "lined"],
  ["love-paper", "Love Letter Paper", "Love", "#B87886", "#FFF4F5", "corners"],
  ["birthday-paper", "Birthday Memory Paper", "Birthday", "#C7925E", "#FFF8ED", "dots"],
  ["travel-paper", "Travel Journal Paper", "Travel", "#B28255", "#FFF8E9", "dots"],
  ["gratitude-paper", "Gratitude Glow Paper", "Gratitude", "#C49C4B", "#FFF9E8", "corners"],
  ["calm-paper", "Calm Sage Paper", "Nature", "#82977F", "#F6F8F2", "plain"],
  ["sad-paper", "Quiet Blue Paper", "Mood", "#879BA7", "#F5F7F7", "plain"],
  ["happy-paper", "Morning Light Paper", "Birthday", "#E3A75B", "#FFF8E6", "corners"],
  ["family-paper", "Family Memory Paper", "Family", "#A88662", "#FCF7EF", "corners"],
  ["night-paper", "Night Reflection Paper", "Mood", "#77788B", "#F4F2F7", "night"],
  ["scrapbook-paper", "Scrapbook Paper", "Memory", "#A17A4E", "#F7ECD6", "corners"],
  ["lavender-paper", "Lavender Thought Paper", "Mood", "#9A89B0", "#F9F6FB", "plain"],
  ["peach-paper", "Peach Memory Paper", "Birthday", "#C98F68", "#FFF5ED", "dots"],
  ["minimal-premium", "Minimal Premium Paper", "Minimal", "#899092", "#FFFFFF", "plain"],
];

export const VECTOR_BACKGROUNDS: VectorAsset[] = papers.map(([id, name, category, accent, paper, pattern]) => ({
  id, name, category, type: "background", moodTags: [slug(category)], component: AmanatPaperBackground,
  defaultColors: { color: palette[category]?.color ?? "#62594F", accent, paper }, pattern,
}));

const frameNames = [
  "rounded-classic", "rounded-soft", "rounded-gold", "rounded-sage", "rounded-rose",
  "polaroid-classic", "polaroid-caption", "polaroid-warm", "polaroid-rose", "polaroid-travel",
  "tape-center", "tape-corners", "washi-gold", "washi-sage", "washi-pink",
  "scrapbook-card", "scrapbook-tilt", "scrapbook-vintage", "torn-paper", "torn-label",
  "paper-clip", "gold-clip", "memory-clip", "bookmark-tab", "date-label",
  "memory-tag", "soft-divider", "corner-tape", "photo-label", "quiet-border",
];

export const VECTOR_FRAMES: VectorAsset[] = frameNames.map((id, index) => ({
  id, name: id.split("-").map(word => word[0].toUpperCase() + word.slice(1)).join(" "), category: index < 10 ? "Photo Frames" : index < 20 ? "Scrapbook" : "Decorations",
  type: "frame", moodTags: ["memory", index % 2 ? "warm" : "minimal"], component: AmanatFrame,
  defaultColors: { color: "#6D513C", accent: index % 3 === 0 ? "#CFAF83" : index % 3 === 1 ? "#BFA8A3" : "#A8B7A0" },
}));

const illustrationNames = ["private-diary-lock", "write-first-memory", "voice-diary", "future-letter", "cloud-backup", "loved-one-delivery", "safe-memories", "diary-book-pages", "photo-memories", "peaceful-journaling"];
export const VECTOR_ILLUSTRATIONS: VectorAsset[] = illustrationNames.map(id => ({
  id, name: id.split("-").map(word => word[0].toUpperCase() + word.slice(1)).join(" "), category: "Amanat",
  type: "illustration", moodTags: ["calm", "premium"], component: AmanatIllustration,
  defaultColors: { color: "#765A45", accent: "#D8B89B" },
}));

export const VECTOR_ASSET_REGISTRY = [...VECTOR_STICKERS, ...VECTOR_BACKGROUNDS, ...VECTOR_FRAMES, ...VECTOR_ILLUSTRATIONS];
export const getVectorAsset = (id?: string) => VECTOR_ASSET_REGISTRY.find(asset => asset.id === id);
export const getVectorAssetsByType = (type: VectorAssetType) => VECTOR_ASSET_REGISTRY.filter(asset => asset.type === type);
