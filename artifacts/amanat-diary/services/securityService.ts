import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const PIN_RECORD_KEY = "amanat_pin_record_v2";
const LEGACY_PIN_KEY = "amanat_pin";
const BIOMETRIC_KEY = "amanat_biometric_enabled";
const AUTO_LOCK_KEY = "amanat_auto_lock_minutes";
const PIN_SETUP_COMPLETE_KEY = "@amanat/pin_setup_complete";

interface PinRecord {
  salt: string;
  hash: string;
  length: 4 | 6;
}

const webSessionStore = new Map<string, string>();

async function getSecureValue(key: string) {
  if (Platform.OS === "web") return webSessionStore.get(key) ?? null;
  return SecureStore.getItemAsync(key);
}

async function setSecureValue(key: string, value: string) {
  if (Platform.OS === "web") {
    webSessionStore.set(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

async function deleteSecureValue(key: string) {
  if (Platform.OS === "web") {
    webSessionStore.delete(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

async function hashPin(pin: string, salt: string) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}:amanat-diary-pin-v2`,
  );
}

export async function savePin(pin: string) {
  if (!/^\d{4}$|^\d{6}$/.test(pin)) throw new Error("PIN must contain 4 or 6 digits.");
  const salt = bytesToHex(await Crypto.getRandomBytesAsync(24));
  const record: PinRecord = {
    salt,
    hash: await hashPin(pin, salt),
    length: pin.length as 4 | 6,
  };
  await setSecureValue(PIN_RECORD_KEY, JSON.stringify(record));
  await AsyncStorage.setItem(PIN_SETUP_COMPLETE_KEY, "true");
  await deleteSecureValue(LEGACY_PIN_KEY);
}

export async function hasStoredPin() {
  if (await getSecureValue(PIN_RECORD_KEY)) return true;
  const legacyPin = await getSecureValue(LEGACY_PIN_KEY);
  if (!legacyPin) return false;
  await savePin(legacyPin);
  return true;
}

export async function getPinLength(): Promise<4 | 6> {
  const raw = await getSecureValue(PIN_RECORD_KEY);
  if (!raw) return 4;
  try {
    return JSON.parse(raw).length === 6 ? 6 : 4;
  } catch {
    return 4;
  }
}

export async function verifyStoredPin(pin: string) {
  const raw = await getSecureValue(PIN_RECORD_KEY);
  if (raw) {
    try {
      const record: PinRecord = JSON.parse(raw);
      return (await hashPin(pin, record.salt)) === record.hash;
    } catch {
      return false;
    }
  }

  // One-time migration for PINs previously stored in native SecureStore as plaintext.
  const legacyPin = await getSecureValue(LEGACY_PIN_KEY);
  if (legacyPin !== pin) return false;
  await savePin(pin);
  return true;
}

export async function removePin() {
  await Promise.all([deleteSecureValue(PIN_RECORD_KEY), deleteSecureValue(LEGACY_PIN_KEY)]);
  await AsyncStorage.setItem(PIN_SETUP_COMPLETE_KEY, "true");
}

export async function getPinSetupComplete() {
  return (await AsyncStorage.getItem(PIN_SETUP_COMPLETE_KEY)) === "true";
}

export async function markPinSetupSkipped() {
  await AsyncStorage.setItem(PIN_SETUP_COMPLETE_KEY, "true");
}

export async function getBiometricPreference() {
  return (await getSecureValue(BIOMETRIC_KEY)) === "true";
}

export async function setBiometricPreference(enabled: boolean) {
  await setSecureValue(BIOMETRIC_KEY, enabled ? "true" : "false");
}

export async function getAutoLockMinutes() {
  const value = Number(await getSecureValue(AUTO_LOCK_KEY));
  return [0, 1, 5, 15].includes(value) ? value : 5;
}

export async function setStoredAutoLockMinutes(minutes: number) {
  if (![0, 1, 5, 15].includes(minutes)) throw new Error("Invalid auto-lock interval.");
  await setSecureValue(AUTO_LOCK_KEY, String(minutes));
}
