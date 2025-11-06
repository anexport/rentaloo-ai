import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * Hook to fetch and cache profile data by ID
 */
export const useProfileLookup = (profileIds: string[]) => {
  const [profiles, setProfiles] = useState<Map<string, ProfileRow>>(new Map());
  const [loading, setLoading] = useState(false);

  const fetchProfiles = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("id", ids);

      if (error) throw error;

      const newProfiles = new Map<string, ProfileRow>();
      (data || []).forEach((profile) => {
        newProfiles.set(profile.id, profile);
      });

      setProfiles((prev) => {
        const combined = new Map(prev);
        newProfiles.forEach((value, key) => {
          combined.set(key, value);
        });
        return combined;
      });
    } catch (error) {
      console.error("Error fetching profiles:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch profiles that we don't already have
    // Bail out if loading is true to prevent duplicate fetches
    if (loading) return;

    const missingIds = profileIds.filter((id) => !profiles.has(id));
    if (missingIds.length > 0) {
      void fetchProfiles(missingIds);
    }
  }, [profileIds, profiles, fetchProfiles, loading]);

  const getProfile = useCallback(
    (id: string | null | undefined): ProfileRow | undefined => {
      if (!id) return undefined;
      return profiles.get(id);
    },
    [profiles]
  );

  return { profiles, getProfile, loading };
};

