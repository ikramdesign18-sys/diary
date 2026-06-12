export function getDatabase(): null {
  return null;
}

export function isDatabaseReady(): boolean {
  return false;
}

export function disableDatabase(): void {
  // Web keeps the existing AsyncStorage fallback.
}

export async function initializeDatabase(): Promise<boolean> {
  return false;
}

export async function setMeta(_key: string, _value: string): Promise<void> {
  // Metadata remains in AsyncStorage on web.
}

export async function getMeta(_key: string): Promise<string | null> {
  return null;
}
