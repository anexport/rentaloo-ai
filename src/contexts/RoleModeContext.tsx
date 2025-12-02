import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
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
  const [activeMode, setActiveModeState] = useState<RoleMode>("renter");

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

  // Initialize mode from localStorage or user's primary role
  useEffect(() => {
    if (!user) {
      setActiveModeState("renter");
      return;
    }

    const storedMode = localStorage.getItem(STORAGE_KEY) as RoleMode | null;
    const primaryRole = (user.user_metadata?.role as RoleMode) || "renter";

    // If user is also an owner, allow stored mode or default to primary role
    if (isAlsoOwner) {
      const initialMode = storedMode && (storedMode === "renter" || storedMode === "owner")
        ? storedMode
        : primaryRole;
      setActiveModeState(initialMode);
    } else {
      // If user is only a renter, always use renter mode
      setActiveModeState("renter");
    }
  }, [user, isAlsoOwner]);

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

