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
  isFavorite: boolean;
  isLocked: boolean;
  hasVoice: boolean;
  voiceUri?: string;
  voiceDuration?: number;
  voiceTranscript?: string;
  photos: string[];
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface FutureMessage {
  id: string;
  entryId?: string;
  title: string;
  body: string;
  recipientName: string;
  recipientEmail?: string;
  deliveryDate: string;
  deliveryType: "text" | "voice" | "page" | "pdf";
  status: "scheduled" | "delivered" | "failed" | "canceled";
  createdAt: string;
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
