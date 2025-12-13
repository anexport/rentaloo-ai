import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

type RoleMode = "renter" | "owner";

interface RoleModeContextType {
  activeMode: RoleMode;
  setActiveMode: (mode: RoleMode, navigate?: (path: string) => void) => void;
  isAlsoOwner: boolean;
  isLoading: boolean;
}

const RoleModeContext = createContext<RoleModeContextType | undefined>(undefined);

const STORAGE_KEY = "rentaloo_active_role_mode";

interface RoleModeProviderProps {
  children: React.ReactNode;
}

export const RoleModeProvider: React.FC<RoleModeProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [activeMode, setActiveModeState] = useState<RoleMode>("renter");

  // Detect role mode from current URL path
  const getModeFromUrl = useCallback((): RoleMode | null => {
    if (location.pathname.startsWith("/owner")) return "owner";
    if (location.pathname.startsWith("/renter")) return "renter";
    return null;
  }, [location.pathname]);

  // Check if user has owner_profiles record
  const { data: hasOwnerProfile, isLoading: isLoadingOwnerCheck } = useQuery({
    queryKey: ["owner-profile-exists", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase
        .from("owner_profiles")
        .select("profile_id")
        .eq("profile_id", user.id)
        .maybeSingle();
      if (error) {
        console.error("Error checking owner profile:", error);
        return false;
      }
      return !!data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const isAlsoOwner = hasOwnerProfile ?? false;

  // Initialize mode from URL, localStorage, or user's primary role
  useEffect(() => {
    if (!user) {
      setActiveModeState("renter");
      return;
    }

    // Wait for owner check to complete before setting mode
    // This prevents the race condition where mode is set to "renter"
    // before we know if the user is also an owner
    if (isLoadingOwnerCheck) {
      return;
    }

    const storedMode = localStorage.getItem(STORAGE_KEY) as RoleMode | null;
    const primaryRole = (user.user_metadata?.role as RoleMode) || "renter";
    const urlMode = getModeFromUrl();

    // If user is also an owner, use URL mode (highest priority), stored mode, or primary role
    if (isAlsoOwner) {
      const initialMode = urlMode ?? storedMode ?? primaryRole;
      setActiveModeState(initialMode);
      // Persist URL-based mode to localStorage
      if (urlMode && urlMode !== storedMode) {
        localStorage.setItem(STORAGE_KEY, urlMode);
      }
    } else {
      // If user is only a renter, always use renter mode
      setActiveModeState("renter");
    }
  }, [user, isAlsoOwner, isLoadingOwnerCheck, getModeFromUrl]);

  const setActiveMode = useCallback(
    (mode: RoleMode, navigate?: (path: string) => void) => {
      setActiveModeState(mode);
      localStorage.setItem(STORAGE_KEY, mode);

      // Navigate to appropriate dashboard if navigate function is provided
      if (navigate) {
        if (mode === "renter") {
          navigate("/renter/dashboard");
        } else {
          navigate("/owner/dashboard");
        }
      }
    },
    []
  );

  const value: RoleModeContextType = {
    activeMode,
    setActiveMode,
    isAlsoOwner,
    isLoading: isLoadingOwnerCheck,
  };

  return <RoleModeContext.Provider value={value}>{children}</RoleModeContext.Provider>;
};

export const useRoleMode = (): RoleModeContextType => {
  const context = useContext(RoleModeContext);
  if (context === undefined) {
    throw new Error("useRoleMode must be used within a RoleModeProvider");
  }
  return context;
};

