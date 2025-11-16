import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export type UserRole = "renter" | "owner" | "admin" | null;

interface UseUserRoleReturn {
  role: UserRole;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  hasRole: (requiredRole: UserRole) => boolean;
  hasAnyRole: (requiredRoles: UserRole[]) => boolean;
}

/**
 * Hook to fetch and manage user role from the database
 * This is more secure than using user_metadata which is client-accessible
 */
export const useUserRole = (): UseUserRoleReturn => {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRole = async () => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Option 1: Use RPC function (more secure, uses SECURITY DEFINER)
      const { data: roleData, error: roleError } = await supabase.rpc(
        "get_my_role"
      );

      if (roleError) {
        // Fallback: Query profiles table directly (RLS protected)
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profileError) {
          throw new Error(
            `Failed to fetch user role: ${profileError.message}`
          );
        }

        setRole((profileData?.role as UserRole) || null);
      } else {
        setRole((roleData as UserRole) || null);
      }
    } catch (err) {
      console.error("Error fetching user role:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRole();
  }, [user?.id]); // Re-fetch when user changes

  const hasRole = (requiredRole: UserRole): boolean => {
    if (!role || !requiredRole) return false;
    return role === requiredRole;
  };

  const hasAnyRole = (requiredRoles: UserRole[]): boolean => {
    if (!role) return false;
    return requiredRoles.includes(role);
  };

  return {
    role,
    loading,
    error,
    refetch: fetchRole,
    hasRole,
    hasAnyRole,
  };
};
