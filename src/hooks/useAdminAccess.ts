import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export const useAdminAccess = () => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-access", userId],
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      if (!userId) return false;
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;
      return data?.role === "admin";
    },
  });

  if (!userId) {
    return { isAdmin: false, loading: false, error: null, refetch } as const;
  }

  return {
    isAdmin: Boolean(data),
    loading: isLoading,
    error: error ? error.message : null,
    refetch,
  } as const;
};
