import type { SQLiteDatabase } from "expo-sqlite";

export function getDatabase(): SQLiteDatabase | null;
export function isDatabaseReady(): boolean;
export function disableDatabase(): void;
export function initializeDatabase(): Promise<boolean>;
export function setMeta(key: string, value: string): Promise<void>;
export function getMeta(key: string): Promise<string | null>;
