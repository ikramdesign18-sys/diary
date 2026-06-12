import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as Linking from "expo-linking";

import { supabase, supabaseConfigured } from "@/lib/supabase";
import type { BackupAccount } from "@/types";

interface AuthResult {
  success: boolean;
  error?: string;
  verificationRequired?: boolean;
}

interface AuthContextType {
  account: BackupAccount | null;
  isLoggedIn: boolean;
  loading: boolean;
  configured: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  resendVerification: () => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const authRedirectUrl = Linking.createURL("auth/callback");

function accountFromUser(user: { email?: string; email_confirmed_at?: string | null } | null): BackupAccount | null {
  if (!user?.email) return null;
  return { email: user.email, isVerified: !!user.email_confirmed_at };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<BackupAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setAccount(accountFromUser(data.session?.user ?? null));
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccount(accountFromUser(session?.user ?? null));
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const notConfigured = (): AuthResult => ({
    success: false,
    error: "Backup accounts are not configured yet. Your local diary is still available.",
  });

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return notConfigured();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.code === "email_not_confirmed") {
        setAccount({ email, isVerified: false });
        return { success: true, verificationRequired: true };
      }
      return { success: false, error: error.message };
    }
    setAccount(accountFromUser(data.user));
    return { success: true, verificationRequired: !data.user.email_confirmed_at };
  }, []);

  const register = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return notConfigured();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: authRedirectUrl },
    });
    if (error) return { success: false, error: error.message };
    setAccount(accountFromUser(data.user));
    return { success: true, verificationRequired: !data.user?.email_confirmed_at };
  }, []);

  const logout = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setAccount(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    // Account deletion requires a trusted server endpoint. Local diary data remains untouched.
    await logout();
  }, [logout]);

  const resendVerification = useCallback(async (): Promise<AuthResult> => {
    if (!supabase) return notConfigured();
    if (!account?.email) return { success: false, error: "No account email is available." };
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: account.email,
      options: { emailRedirectTo: authRedirectUrl },
    });
    return error ? { success: false, error: error.message } : { success: true, verificationRequired: true };
  }, [account]);

  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    if (!supabase) return notConfigured();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl });
    return error ? { success: false, error: error.message } : { success: true };
  }, []);

  return (
    <AuthContext.Provider value={{
      account,
      isLoggedIn: !!account,
      loading,
      configured: supabaseConfigured,
      login,
      register,
      logout,
      deleteAccount,
      resendVerification,
      resetPassword,
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
