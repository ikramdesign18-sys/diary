import type { DiaryTheme, DiaryThemePattern } from "@/types";

type ThemeSeed = [string, string, string, string[], string, string, string, string, DiaryThemePattern?, DiaryTheme["typographyStyle"]?, DiaryTheme["decorationStyle"]?];

const seeds: ThemeSeed[] = [
  ["classic-cream-diary", "Classic Cream Diary", "Emotional", ["neutral", "reflective"], "#F4EBDD", "#FFF9ED", "#6D513C", "#B18C62", "lines", "classic", "margin"],
  ["morning-sunshine", "Morning Sunshine", "Happy", ["happy", "joy", "morning"], "#F9EACB", "#FFF8E6", "#745236", "#E3A75B", "watermark", "modern", "halo"],
  ["soft-sad-letter", "Soft Sad Letter", "Sad", ["sad", "miss", "emotional"], "#E3E8EC", "#F5F7F7", "#526675", "#879BA7", "letter", "letter", "corners"],
  ["rose-memory", "Rose Memory", "Love", ["romantic", "memory", "emotional"], "#EFE1DE", "#FBF2EF", "#76524D", "#B77B74", "watermark", "classic", "corners"],
  ["calm-sage-journal", "Calm Sage Journal", "Calm", ["calm", "healing", "peace"], "#E4EAE1", "#F6F8F2", "#4F6657", "#82977F", "plain", "modern", "none"],
  ["golden-gratitude", "Golden Gratitude", "Gratitude", ["grateful", "blessing", "family"], "#F1E5C8", "#FFF9E8", "#6C5735", "#C49C4B", "watermark", "classic", "halo"],
  ["school-notebook", "School Notebook", "School", ["school", "class", "homework"], "#E8EDF2", "#FBFCFC", "#415A70", "#7192AD", "notebook", "academic", "margin"],
  ["work-planner", "Work Planner", "Work", ["work", "meeting", "project"], "#E9E9E5", "#FCFCF8", "#3F4A4E", "#7A8788", "dots", "modern", "margin"],
  ["dream-mist", "Dream Mist", "Emotional", ["dreamy", "sleep", "imagination"], "#EAE5EF", "#F9F6FB", "#635B78", "#9A89B0", "watermark", "poetry", "halo"],
  ["travel-postcard", "Travel Postcard", "Travel", ["travel", "trip", "journey"], "#EDE3D1", "#FFF8E9", "#6D5942", "#B28255", "postcard", "letter", "stamp"],
  ["family-memory-book", "Family Memory Book", "Emotional", ["family", "memory", "home"], "#EDE4D7", "#FCF7EF", "#695847", "#A88662", "floral", "classic", "corners"],
  ["love-letter", "Love Letter", "Love", ["love", "romantic", "relationship"], "#F0E1E4", "#FFF4F5", "#754D58", "#B87886", "letter", "letter", "seal"],
  ["rainy-day-thoughts", "Rainy Day Thoughts", "Sad", ["rain", "sad", "calm"], "#E2E8EA", "#F4F7F7", "#4F626A", "#8299A0", "lines", "poetry", "halo"],
  ["hopeful-sky", "Hopeful Sky", "Happy", ["hopeful", "positive", "future"], "#E1ECF0", "#F6FBFC", "#486879", "#78A7B8", "watermark", "modern", "halo"],
  ["quiet-night-reflection", "Quiet Night Reflection", "Emotional", ["reflective", "quiet", "night"], "#E9E7E0", "#F9F7F0", "#575A60", "#888A8F", "watermark", "poetry", "halo"],
  ["vintage-paper", "Vintage Paper", "Emotional", ["vintage", "memory", "reflective"], "#E6D5B9", "#F7ECD6", "#684D32", "#A17A4E", "lines", "classic", "corners"],
  ["minimal-white-journal", "Minimal White Journal", "Calm", ["minimal", "neutral", "clear"], "#F2F2EF", "#FFFFFF", "#303536", "#899092", "plain", "modern", "none"],
  ["poetry-page", "Poetry Page", "Emotional", ["poetry", "emotional", "reflective"], "#EEE8DE", "#FFFDF7", "#514C47", "#9B8370", "plain", "poetry", "corners"],
  ["emotional-rose-ink", "Emotional Rose Ink", "Emotional", ["emotional", "heart", "confession"], "#ECDDDD", "#FAF0F0", "#704F50", "#A87576", "lines", "letter", "corners"],
  ["focus-study-page", "Focus Study Page", "School", ["study", "exam", "focus"], "#E7EBE8", "#FCFDFB", "#40564F", "#6D9185", "notebook", "academic", "margin"],
  ["achievement-page", "Achievement Page", "Happy", ["proud", "achievement", "motivated"], "#F0E5CC", "#FFFAEC", "#685231", "#BE964E", "chapter", "chapter", "halo"],
  ["healing-page", "Healing Page", "Calm", ["healing", "recovery", "gentle"], "#E3E9DF", "#F8FAF5", "#4E6756", "#81A087", "floral", "poetry", "floral"],
  ["memory-capsule", "Memory Capsule", "Future", ["future", "memory", "years"], "#E9E0D2", "#FFF9EE", "#645344", "#A88B6F", "letter", "letter", "seal"],
  ["future-letter", "Future Letter", "Future", ["future", "message", "later"], "#E8E4D9", "#FFFCF4", "#5C574A", "#978F70", "letter", "letter", "seal"],
  ["childhood-memory", "Childhood Memory", "Emotional", ["childhood", "nostalgia", "family"], "#EFE6DA", "#FFF8EF", "#6E5B4E", "#B1957B", "dots", "classic", "corners"],
  ["calm-ocean", "Calm Ocean", "Calm", ["calm", "ocean", "peace"], "#E1EAEC", "#F5FAFA", "#49636A", "#78A0A8", "watermark", "modern", "halo"],
  ["mountain-travel", "Mountain Travel", "Travel", ["travel", "adventure", "mountain"], "#E5E1D5", "#F8F6ED", "#55614D", "#8B9872", "watermark", "classic", "stamp"],
  ["soft-floral-diary", "Soft Floral Diary", "Love", ["floral", "soft", "romantic"], "#EEE5E0", "#FFF9F5", "#695A55", "#A9897D", "floral", "classic", "floral"],
  ["clean-academic-notes", "Clean Academic Notes", "School", ["university", "notes", "study"], "#E8ECEB", "#FFFFFF", "#3D5052", "#748F91", "notebook", "academic", "margin"],
  ["private-confession", "Private Confession", "Emotional", ["private", "secret", "confession"], "#EAE1D8", "#FCF6ED", "#614E42", "#987969", "letter", "letter", "seal"],
  ["gratitude-glow", "Gratitude Glow", "Gratitude", ["thankful", "peace", "grateful"], "#F2E7CB", "#FFFAE9", "#715B35", "#CAA758", "watermark", "poetry", "halo"],
  ["angry-release", "Angry Release", "Emotional", ["angry", "stress", "release"], "#EDDFDC", "#FAF1EF", "#714D47", "#AB746B", "lines", "modern", "margin"],
  ["deep-reflection", "Deep Reflection", "Emotional", ["reflective", "mature", "thoughts"], "#E5E2DC", "#F7F5F0", "#514F4A", "#858078", "plain", "poetry", "none"],
  ["festival-memory", "Festival Memory", "Happy", ["festival", "celebration", "happy"], "#F1E4D2", "#FFF8ED", "#745739", "#C88E58", "watermark", "classic", "corners"],
  ["spiritual-reflection", "Prayer / Spiritual Reflection", "Gratitude", ["prayer", "peace", "spiritual"], "#EEE7D6", "#FFFDF4", "#655A43", "#B29B68", "watermark", "poetry", "halo"],
  ["best-day-ever", "Best Day Ever", "Happy", ["best", "amazing", "joy"], "#F6E4C8", "#FFF8E8", "#795238", "#E19A5E", "watermark", "modern", "halo"],
  ["lonely-evening", "Lonely Evening", "Sad", ["lonely", "evening", "miss"], "#E2E6E7", "#F5F7F6", "#536168", "#87969B", "lines", "poetry", "corners"],
  ["fresh-start", "Fresh Start", "Calm", ["new", "beginning", "hope"], "#E5EBDF", "#FAFCF6", "#52664A", "#88A17D", "plain", "modern", "halo"],
  ["secret-diary", "Secret Diary", "Emotional", ["secret", "private", "locked"], "#E5D9C8", "#F9F0E0", "#61472F", "#96714B", "letter", "classic", "seal"],
  ["life-story-chapter", "Life Story Chapter", "Emotional", ["life", "chapter", "important"], "#E9E1D3", "#FFFAEF", "#574A3B", "#987D5D", "chapter", "chapter", "corners"],
  ["wedding-memory", "Wedding Memory", "Love", ["wedding", "love", "memory"], "#F0E6E1", "#FFFAF6", "#765D55", "#B69284", "floral", "letter", "floral"],
  ["birthday-memory", "Birthday Memory", "Happy", ["birthday", "celebration", "family"], "#F3E6D4", "#FFF9EE", "#76593C", "#C7925E", "dots", "modern", "halo"],
  ["parent-memory", "Mother / Father Memory", "Emotional", ["mother", "father", "family"], "#EDE4D7", "#FCF8F0", "#685847", "#A48567", "floral", "classic", "corners"],
  ["friendship-memory", "Friendship Memory", "Happy", ["friendship", "friends", "memory"], "#E8E8DD", "#FBFCF5", "#59624F", "#929F7E", "dots", "modern", "corners"],
  ["goal-tracker-journal", "Goal Tracker Journal", "Work", ["goal", "motivated", "progress"], "#E8E8E2", "#FDFDF9", "#46514E", "#7B918A", "dots", "academic", "margin"],
];

export const DIARY_THEMES: DiaryTheme[] = seeds.map(([id, name, category, moodTags, backgroundColor, paperColor, textColor, accentColor, patternType = "plain", typographyStyle = "classic", decorationStyle = "none"]) => ({
  id, name, category, moodTags,
  description: `${name} is a refined ${category.toLowerCase()} page with calm, real-paper character.`,
  backgroundColor, paperColor, textColor,
  secondaryTextColor: textColor + "B8",
  accentColor,
  borderColor: accentColor + "42",
  shadowColor: "#4A382A",
  patternType,
  typographyStyle,
  headerStyle: typographyStyle === "chapter" ? "chapter" : typographyStyle === "academic" ? "planner" : patternType === "letter" ? "letter" : patternType === "lines" || patternType === "notebook" ? "ruled" : "minimal",
  decorationStyle,
  lineStyle: patternType === "notebook" ? "notebook" : patternType === "lines" ? "solid" : patternType === "dots" ? "dotted" : "none",
}));

export const DEFAULT_THEME_ID = "classic-cream-diary";
export const THEME_CATEGORIES = ["All", "Happy", "Sad", "Calm", "Love", "Work", "School", "Travel", "Future", "Gratitude", "Emotional"];

export function getDiaryTheme(themeId?: string) {
  return DIARY_THEMES.find(theme => theme.id === themeId) ?? DIARY_THEMES[0];
}

export function getThemeForMood(mood?: string) {
  const map: Record<string, string> = {
    Happy: "morning-sunshine", Sad: "soft-sad-letter", Emotional: "emotional-rose-ink",
    Calm: "calm-sage-journal", Grateful: "golden-gratitude", Romantic: "love-letter",
    Motivated: "achievement-page", Angry: "angry-release", Reflective: "deep-reflection",
    Hopeful: "hopeful-sky", Dreamy: "dream-mist", Neutral: DEFAULT_THEME_ID,
  };
  return getDiaryTheme(map[mood ?? "Neutral"]);
}
