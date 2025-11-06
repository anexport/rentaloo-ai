import React, { createContext, useEffect, useState } from "react";
import type { User, Session, AuthError, PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

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
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
