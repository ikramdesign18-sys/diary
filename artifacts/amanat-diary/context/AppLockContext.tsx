import * as Haptics from "expo-haptics";
import * as LocalAuthentication from "expo-local-authentication";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";

import {
  getAutoLockMinutes,
  getBiometricPreference,
  getPinLength,
  getPinSetupComplete,
  hasStoredPin,
  removePin,
  savePin,
  markPinSetupSkipped,
  setBiometricPreference,
  setStoredAutoLockMinutes,
  verifyStoredPin,
} from "@/services/securityService";

interface AppLockContextType {
  initialized: boolean;
  hasPin: boolean;
  pinSetupComplete: boolean;
  pinLength: 4 | 6;
  isLocked: boolean;
  setupPin: (pin: string) => Promise<void>;
  skipPinSetup: () => Promise<void>;
  changePin: (currentPin: string, newPin: string) => Promise<boolean>;
  verifyPin: (pin: string) => Promise<boolean>;
  clearPin: (currentPin: string) => Promise<boolean>;
  unlock: () => void;
  lock: () => void;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  setBiometricEnabled: (enabled: boolean, currentPin: string) => Promise<boolean>;
  tryBiometric: () => Promise<boolean>;
  autoLockMinutes: number;
  setAutoLockMinutes: (minutes: number) => Promise<void>;
}

const AppLockContext = createContext<AppLockContextType | null>(null);

export function AppLockProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [pinSetupComplete, setPinSetupComplete] = useState(false);
  const [pinLength, setPinLength] = useState<4 | 6>(4);
  const [isLocked, setIsLocked] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [autoLockMinutes, setAutoLockMinutesState] = useState(5);
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const pinExists = await hasStoredPin();
        const [length, bioPreference, lockMinutes, setupComplete] = await Promise.all([
          getPinLength(),
          getBiometricPreference(),
          getAutoLockMinutes(),
          getPinSetupComplete(),
        ]);
        setHasPin(pinExists);
        setPinSetupComplete(pinExists || setupComplete);
        setPinLength(length);
        setIsLocked(pinExists);
        setAutoLockMinutesState(lockMinutes);

        if (Platform.OS !== "web") {
          const [hardware, enrolled] = await Promise.all([
            LocalAuthentication.hasHardwareAsync(),
            LocalAuthentication.isEnrolledAsync(),
          ]);
          const available = hardware && enrolled;
          setBiometricAvailable(available);
          setBiometricEnabledState(available && bioPreference);
        }
      } finally {
        setInitialized(true);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => {
      if (state === "background" || state === "inactive") {
        backgroundedAt.current = Date.now();
        if (hasPin && autoLockMinutes === 0) setIsLocked(true);
      } else if (state === "active" && hasPin && backgroundedAt.current) {
        const elapsed = Date.now() - backgroundedAt.current;
        if (elapsed >= autoLockMinutes * 60_000) setIsLocked(true);
        backgroundedAt.current = null;
      }
    });
    return () => subscription.remove();
  }, [autoLockMinutes, hasPin]);

  const setupPin = useCallback(async (pin: string) => {
    await savePin(pin);
    setHasPin(true);
    setPinSetupComplete(true);
    setPinLength(pin.length as 4 | 6);
    setIsLocked(false);
  }, []);

  const skipPinSetup = useCallback(async () => {
    await markPinSetupSkipped();
    setPinSetupComplete(true);
    setHasPin(false);
    setIsLocked(false);
  }, []);

  const verifyPin = useCallback(async (pin: string) => {
    const correct = await verifyStoredPin(pin);
    await Haptics.notificationAsync(correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => {});
    return correct;
  }, []);

  const changePin = useCallback(async (currentPin: string, newPin: string) => {
    if (!(await verifyStoredPin(currentPin))) return false;
    await savePin(newPin);
    setPinLength(newPin.length as 4 | 6);
    return true;
  }, []);

  const clearPin = useCallback(async (currentPin: string) => {
    if (!(await verifyStoredPin(currentPin))) return false;
    await removePin();
    await setBiometricPreference(false);
    setHasPin(false);
    setIsLocked(false);
    setBiometricEnabledState(false);
    return true;
  }, []);

  const unlock = useCallback(() => setIsLocked(false), []);
  const lock = useCallback(() => { if (hasPin) setIsLocked(true); }, [hasPin]);

  const setBiometricEnabled = useCallback(async (enabled: boolean, currentPin: string) => {
    if (!(await verifyStoredPin(currentPin))) return false;
    if (enabled && !biometricAvailable) return false;
    await setBiometricPreference(enabled);
    setBiometricEnabledState(enabled);
    return true;
  }, [biometricAvailable]);

  const tryBiometric = useCallback(async () => {
    if (Platform.OS === "web" || !biometricAvailable || !biometricEnabled) return false;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Open your private diary",
        cancelLabel: "Use PIN",
        disableDeviceFallback: true,
      });
      if (!result.success) return false;
      unlock();
      return true;
    } catch {
      return false;
    }
  }, [biometricAvailable, biometricEnabled, unlock]);

  const setAutoLockMinutes = useCallback(async (minutes: number) => {
    await setStoredAutoLockMinutes(minutes);
    setAutoLockMinutesState(minutes);
  }, []);

  return (
    <AppLockContext.Provider value={{
      initialized, hasPin, pinSetupComplete, pinLength, isLocked,
      setupPin, skipPinSetup, changePin, verifyPin, clearPin, unlock, lock,
      biometricAvailable, biometricEnabled, setBiometricEnabled, tryBiometric,
      autoLockMinutes, setAutoLockMinutes,
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
