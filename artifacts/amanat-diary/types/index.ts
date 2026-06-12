export type DiaryCategory =
  | "Personal"
  | "School"
  | "Work"
  | "Dream"
  | "Gratitude"
  | "Travel"
  | "Relationship"
  | "Family"
  | "Future Letters"
  | "Custom";

export type CoverStyle =
  | "classic"
  | "leather"
  | "pastel"
  | "minimal"
  | "floral"
  | "school"
  | "work"
  | "travel";

export type Mood =
  | "Happy"
  | "Sad"
  | "Emotional"
  | "Calm"
  | "Grateful"
  | "Romantic"
  | "Motivated"
  | "Angry"
  | "Reflective"
  | "Hopeful"
  | "Dreamy"
  | "Neutral";

export type DiaryThemePattern = "plain" | "lines" | "notebook" | "dots" | "letter" | "postcard" | "chapter" | "floral" | "watermark";

export interface DiaryTheme {
  id: string;
  name: string;
  category: string;
  moodTags: string[];
  description: string;
  backgroundColor: string;
  paperColor: string;
  textColor: string;
  secondaryTextColor: string;
  accentColor: string;
  borderColor: string;
  shadowColor: string;
  patternType: DiaryThemePattern;
  typographyStyle: "classic" | "modern" | "letter" | "poetry" | "academic" | "chapter";
  headerStyle: "minimal" | "ruled" | "letter" | "chapter" | "planner";
  decorationStyle: "none" | "corners" | "margin" | "stamp" | "seal" | "floral" | "halo";
  lineStyle: "none" | "solid" | "dotted" | "notebook";
}

export interface ThemeDetectionResult {
  mood: Mood;
  tone: string;
  themeId: string;
  tags: string[];
  confidence: number;
  source: "groq" | "fallback";
}

export type PageFontKey = "clean" | "serif" | "handwriting" | "rounded" | "elegant";
export type PageBackgroundKey = string;
export type PhotoFrameKey = string;
export type PageTextStyleKey = "classic" | "spacious" | "compact" | "centered";

export interface PageSticker {
  id: string;
  assetId?: string;
  emoji?: string;
  category: string;
}

export interface Diary {
  id: string;
  title: string;
  subtitle?: string;
  category: DiaryCategory;
  coverStyle: CoverStyle;
  accentColor: string;
  isLocked: boolean;
  lockPin?: string;
  defaultMood: Mood;
  createdAt: string;
  updatedAt: string;
  entryCount: number;
}

export interface Entry {
  id: string;
  diaryId: string;
  pageNumber: number;
  title: string;
  body: string;
  bodyPolished?: string;
  mood: Mood;
  tags: string[];
  themeId?: string;
  aiDetectedTheme?: string;
  userOverriddenTheme?: boolean;
  fontKey?: PageFontKey;
  backgroundKey?: PageBackgroundKey;
  stickers?: PageSticker[];
  photoFrameKey?: PhotoFrameKey;
  textStyleKey?: PageTextStyleKey;
  isFavorite: boolean;
  isLocked: boolean;
  hasVoice: boolean;
  voiceUri?: string;
  voiceDuration?: number;
  voiceTranscript?: string;
  voiceLanguage?: string;
  photos: string[];
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface FutureMessage {
  id: string;
  entryId?: string;
  diaryId?: string;
  title: string;
  body: string;
  voiceNoteId?: string;
  recipientName: string;
  recipientEmail?: string;
  deliveryDate: string;
  deliveryType: "future-self" | "loved-one" | "unlock-later" | "reminder-only" | "text" | "voice" | "page" | "pdf";
  status: "scheduled" | "unlocked" | "delivered" | "failed" | "canceled";
  notificationId?: string;
  unlockDate?: string;
  emailDeliveryId?: string;
  emailDeliveryStatus?: "scheduled" | "processing" | "delivered" | "failed" | "cancelled";
  emailDeliveryMode?: "local" | "email" | "manual";
  consentConfirmed?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AppSettings {
  appLockEnabled: boolean;
  biometricEnabled: boolean;
  autoLockMinutes: number;
  moodThemesEnabled: boolean;
  onboardingComplete: boolean;
  firstDiaryCreated: boolean;
  reminderEnabled: boolean;
  reminderTime: string;
  transcriptionLanguage: string;
}

export interface BackupAccount {
  email: string;
  isVerified: boolean;
  token?: string;
}
