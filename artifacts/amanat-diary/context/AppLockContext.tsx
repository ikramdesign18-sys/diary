import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

const PIN_KEY = "amanat_pin";

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(key);
  }
  try {
    const SecureStore = await import("expo-secure-store");
    return SecureStore.getItemAsync(key);
  } catch {
    return AsyncStorage.getItem(key);
  }
}

async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    return AsyncStorage.setItem(key, value);
  }
  try {
    const SecureStore = await import("expo-secure-store");
    return SecureStore.setItemAsync(key, value);
  } catch {
    return AsyncStorage.setItem(key, value);
  }
}

async function secureDelete(key: string): Promise<void> {
  if (Platform.OS === "web") {
    return AsyncStorage.removeItem(key);
  }
  try {
    const SecureStore = await import("expo-secure-store");
    return SecureStore.deleteItemAsync(key);
  } catch {
    return AsyncStorage.removeItem(key);
  }
}

interface AppLockContextType {
  hasPin: boolean;
  isLocked: boolean;
  setupPin: (pin: string) => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  clearPin: () => Promise<void>;
  unlock: () => void;
  lock: () => void;
  biometricAvailable: boolean;
  tryBiometric: () => Promise<boolean>;
}

const AppLockContext = createContext<AppLockContextType | null>(null);

export function AppLockProvider({ children }: { children: React.ReactNode }) {
  const [hasPin, setHasPin] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const pin = await secureGet(PIN_KEY);
        if (pin) {
          setHasPin(true);
          setIsLocked(true);
        }
      } catch {}
      if (Platform.OS !== "web") {
        try {
          const LocalAuth = require("expo-local-authentication");
          const available = await LocalAuth.hasHardwareAsync();
          const enrolled = await LocalAuth.isEnrolledAsync();
          setBiometricAvailable(available && enrolled);
        } catch {}
      }
    };
    init();
  }, []);

  const setupPin = useCallback(async (pin: string) => {
    await secureSet(PIN_KEY, pin);
    setHasPin(true);
    setIsLocked(false);
  }, []);

  const verifyPin = useCallback(async (pin: string): Promise<boolean> => {
    const stored = await secureGet(PIN_KEY);
    const correct = stored === pin;
    try {
      if (correct) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {}
    return correct;
  }, []);

  const clearPin = useCallback(async () => {
    await secureDelete(PIN_KEY);
    setHasPin(false);
    setIsLocked(false);
  }, []);

  const unlock = useCallback(() => setIsLocked(false), []);
  const lock = useCallback(() => { if (hasPin) setIsLocked(true); }, [hasPin]);

  const tryBiometric = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === "web" || !biometricAvailable) return false;
    try {
      const LocalAuth = require("expo-local-authentication");
      const result = await LocalAuth.authenticateAsync({
        promptMessage: "Unlock Amanat Diary",
        cancelLabel: "Use PIN",
      });
      if (result.success) {
        unlock();
        return true;
      }
    } catch {}
    return false;
  }, [biometricAvailable, unlock]);

  return (
    <AppLockContext.Provider value={{
      hasPin, isLocked,
      setupPin, verifyPin, clearPin,
      unlock, lock,
      biometricAvailable,
      tryBiometric,
    }}>
      {children}
    </AppLockContext.Provider>
  );
}

export function useAppLock() {
  const ctx = useContext(AppLockContext);
  if (!ctx) throw new Error("useAppLock must be used within AppLockProvider");
  return ctx;
}
