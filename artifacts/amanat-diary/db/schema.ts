export const DATABASE_VERSION = 1;

export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS diaries (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  category TEXT,
  coverStyle TEXT,
  accentColor TEXT,
  isLocked INTEGER DEFAULT 0,
  defaultMood TEXT DEFAULT 'Neutral',
  entryCount INTEGER DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  deletedAt TEXT,
  syncStatus TEXT DEFAULT 'local',
  lastSyncedAt TEXT
);

CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY NOT NULL,
  diaryId TEXT NOT NULL,
  pageNumber INTEGER NOT NULL,
  title TEXT,
  bodyOriginal TEXT,
  bodyPolished TEXT,
  mood TEXT,
  themeId TEXT,
  aiDetectedTheme TEXT,
  userOverriddenTheme INTEGER DEFAULT 0,
  tagsJson TEXT,
  date TEXT,
  day TEXT,
  time TEXT,
  isFavorite INTEGER DEFAULT 0,
  isLocked INTEGER DEFAULT 0,
  hasVoice INTEGER DEFAULT 0,
  hasMedia INTEGER DEFAULT 0,
  voiceUri TEXT,
  voiceDuration INTEGER,
  voiceTranscript TEXT,
  voiceLanguage TEXT,
  photosJson TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  deletedAt TEXT,
  syncStatus TEXT DEFAULT 'local',
  lastSyncedAt TEXT,
  FOREIGN KEY (diaryId) REFERENCES diaries(id)
);

CREATE TABLE IF NOT EXISTS voice_notes (
  id TEXT PRIMARY KEY NOT NULL,
  entryId TEXT NOT NULL,
  localPath TEXT,
  duration INTEGER,
  transcript TEXT,
  language TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (entryId) REFERENCES entries(id)
);

CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY NOT NULL,
  entryId TEXT NOT NULL,
  type TEXT,
  localPath TEXT,
  thumbnailPath TEXT,
  width INTEGER,
  height INTEGER,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (entryId) REFERENCES entries(id)
);

CREATE TABLE IF NOT EXISTS future_messages (
  id TEXT PRIMARY KEY NOT NULL,
  entryId TEXT,
  diaryId TEXT,
  title TEXT,
  body TEXT,
  voiceNoteId TEXT,
  recipientName TEXT,
  recipientEmail TEXT,
  deliveryDate TEXT,
  deliveryType TEXT,
  status TEXT DEFAULT 'scheduled',
  notificationId TEXT,
  unlockDate TEXT,
  emailDeliveryId TEXT,
  emailDeliveryStatus TEXT,
  emailDeliveryMode TEXT,
  consentConfirmed INTEGER DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  entryIdsJson TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT,
  updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entries_diary ON entries(diaryId);
CREATE INDEX IF NOT EXISTS idx_entries_diary_page ON entries(diaryId, pageNumber);
CREATE INDEX IF NOT EXISTS idx_entries_created ON entries(createdAt);
CREATE INDEX IF NOT EXISTS idx_entries_mood ON entries(mood);
CREATE INDEX IF NOT EXISTS idx_entries_updated ON entries(updatedAt);
CREATE INDEX IF NOT EXISTS idx_diaries_updated ON diaries(updatedAt);
CREATE INDEX IF NOT EXISTS idx_voice_entry ON voice_notes(entryId);
CREATE INDEX IF NOT EXISTS idx_media_entry ON media(entryId);
CREATE INDEX IF NOT EXISTS idx_future_delivery ON future_messages(deliveryDate);
CREATE INDEX IF NOT EXISTS idx_future_entry ON future_messages(entryId);
`;
