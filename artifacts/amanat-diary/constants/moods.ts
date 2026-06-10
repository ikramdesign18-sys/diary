import type { Mood } from "@/types";

export interface MoodConfig {
  label: Mood;
  emoji: string;
  bgKey: string;
  accentKey: string;
  icon: string;
}

export const MOODS: MoodConfig[] = [
  { label: "Happy", emoji: "☀", bgKey: "moodHappy", accentKey: "moodHappyAccent", icon: "sun" },
  { label: "Grateful", emoji: "✦", bgKey: "moodGrateful", accentKey: "moodGratefulAccent", icon: "heart" },
  { label: "Calm", emoji: "~", bgKey: "moodCalm", accentKey: "moodCalmAccent", icon: "wind" },
  { label: "Hopeful", emoji: "↑", bgKey: "moodHopeful", accentKey: "moodHopefulAccent", icon: "trending-up" },
  { label: "Motivated", emoji: "→", bgKey: "moodMotivated", accentKey: "moodMotivatedAccent", icon: "zap" },
  { label: "Dreamy", emoji: "◌", bgKey: "moodDreamy", accentKey: "moodDreamyAccent", icon: "moon" },
  { label: "Romantic", emoji: "♡", bgKey: "moodRomantic", accentKey: "moodRomanticAccent", icon: "feather" },
  { label: "Reflective", emoji: "○", bgKey: "moodReflective", accentKey: "moodReflectiveAccent", icon: "coffee" },
  { label: "Emotional", emoji: "~", bgKey: "moodEmotional", accentKey: "moodEmotionalAccent", icon: "droplet" },
  { label: "Sad", emoji: "·", bgKey: "moodSad", accentKey: "moodSadAccent", icon: "cloud" },
  { label: "Angry", emoji: "!", bgKey: "moodAngry", accentKey: "moodAngryAccent", icon: "alert-circle" },
  { label: "Neutral", emoji: "—", bgKey: "moodNeutral", accentKey: "moodNeutralAccent", icon: "minus" },
];

export const DIARY_CATEGORIES = [
  "Personal", "School", "Work", "Dream", "Gratitude",
  "Travel", "Relationship", "Family", "Future Letters", "Custom",
];

export const COVER_STYLES = [
  { id: "classic", label: "Classic Paper", colors: ["#C4A55A", "#8B7355"] },
  { id: "leather", label: "Leather Journal", colors: ["#5A3E28", "#2C1810"] },
  { id: "pastel", label: "Soft Pastel", colors: ["#E8C4D8", "#C8D8E8"] },
  { id: "minimal", label: "Minimal Premium", colors: ["#FFFDF9", "#E8DFD0"] },
  { id: "floral", label: "Floral Diary", colors: ["#E8D0D8", "#C8E8D0"] },
  { id: "school", label: "School Notebook", colors: ["#D0D8F0", "#A8B8D8"] },
  { id: "work", label: "Work Planner", colors: ["#C8D0D8", "#8890A0"] },
  { id: "travel", label: "Travel Book", colors: ["#D8C8A8", "#A89070"] },
];

export const ACCENT_COLORS = [
  "#C4A55A", "#8B7355", "#7C5C3E", "#A07890",
  "#7090A0", "#709080", "#C08070", "#9070A0",
];
