import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import type { BackupAccount } from "@/types";

const AUTH_KEY = "amanat_auth";
const AUTH_META_KEY = "@amanat/auth_meta";

interface AuthContextType {
  account: BackupAccount | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  resendVerification: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<BackupAccount | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(AUTH_META_KEY);
        if (raw) setAccount(JSON.parse(raw));
      } catch {}
    };
    load();
  }, []);

  const login = useCallback(async (email: string, _password: string) => {
    // Simulated auth — in production this would call the real API
    const acc: BackupAccount = { email, isVerified: false };
    setAccount(acc);
    await AsyncStorage.setItem(AUTH_META_KEY, JSON.stringify(acc));
    await SecureStore.setItemAsync(AUTH_KEY, JSON.stringify({ email }));
    return { success: true };
  }, []);

  const register = useCallback(async (email: string, _password: string) => {
    const acc: BackupAccount = { email, isVerified: false };
    setAccount(acc);
    await AsyncStorage.setItem(AUTH_META_KEY, JSON.stringify(acc));
    await SecureStore.setItemAsync(AUTH_KEY, JSON.stringify({ email }));
    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    setAccount(null);
    await AsyncStorage.removeItem(AUTH_META_KEY);
    await SecureStore.deleteItemAsync(AUTH_KEY);
  }, []);

  const deleteAccount = useCallback(async () => {
    await logout();
  }, [logout]);

  const resendVerification = useCallback(async () => {
    // Would call backend in production
  }, []);

  return (
    <AuthContext.Provider value={{
      account,
      isLoggedIn: !!account,
      login, register, logout, deleteAccount, resendVerification,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
