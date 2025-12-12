import React, { createContext, useEffect, useState } from "react";
import type { User, Session, AuthError, PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import i18n from "@/i18n/config";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
type UserMetadata = { role: "renter" | "owner" } & Record<string, unknown>;
type UpdateProfileError = AuthError | PostgrestError;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    userData: UserMetadata
  ) => Promise<{ error: AuthError | null }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: AuthError | null; user: User | null }>;
  signInWithOAuth: (
    provider: "google" | "github" | "facebook" | "twitter",
    redirectTo?: string
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  updateProfile: (
    updates: ProfileUpdate
  ) => Promise<{ error: UpdateProfileError | null }>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const syncLanguagePreference = (session: Session | null) => {
    if (!session?.user?.user_metadata?.language_preference) return;

    const userLang = session.user.user_metadata.language_preference;
    if (typeof userLang !== "string") return;

    if (i18n.language === userLang) return;

    try {
      void i18n.changeLanguage(userLang);
      localStorage.setItem("userLanguagePreference", userLang);
    } catch (error) {
      console.error("Failed to sync language preference:", error);
    }
  };

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        syncLanguagePreference(session);

        try {
          supabase.realtime.setAuth(session?.access_token ?? null);
        } catch (realtimeError) {
          console.error("Failed to set realtime auth:", realtimeError);
        }
      } catch (error) {
        console.error("Error getting session:", error);
        setSession(null);
        setUser(null);
        setLoading(false);
      }
    };

    void getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      syncLanguagePreference(session);

      try {
        supabase.realtime.setAuth(session?.access_token ?? null);
      } catch (error) {
        console.error("Failed to set realtime auth:", error);
      }

      // Profile creation is now handled by database trigger
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    userData: UserMetadata
  ) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      });
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error, user: data?.user ?? null };
    } catch (error) {
      return { error: error as AuthError, user: null };
    }
  };

  const signInWithOAuth = async (
    provider: "google" | "github" | "facebook" | "twitter",
    redirectTo?: string
  ) => {
    try {
      const redirectUrl = redirectTo || `${window.location.origin}/`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
        },
      });
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const updateProfile = async (updates: ProfileUpdate) => {
    if (!user?.id) {
      return {
        error: {
          message: "User not authenticated",
          name: "AuthError",
          status: 401,
        } as UpdateProfileError,
      };
    }
    try {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);
      if (error) {
        return { error };
      }
      return { error: null };
    } catch (error) {
      return {
        error: error as UpdateProfileError,
      };
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
