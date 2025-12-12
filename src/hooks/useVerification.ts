import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type {
  UserVerificationProfile,
  TrustScore,
  VerificationType,
} from "../types/verification";
import { calculateTrustScore, calculateAccountAge } from "../lib/verification";

interface UseVerificationOptions {
  userId?: string;
}

export const useVerification = (options: UseVerificationOptions = {}) => {
  const [profile, setProfile] = useState<UserVerificationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchVerificationProfile = useCallback(async () => {
    // Step 1: Validate and get targetUserId and auth user data
    let targetUserId = options.userId;
    let authUser: { email_confirmed_at?: string | null } | null = null;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!targetUserId) {
      if (!user) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }
      targetUserId = user.id;
    }

    // If viewing own profile, use auth user data for email verification status
    if (user && user.id === targetUserId) {
      authUser = user;
    }

    // Step 2: Validation passed - set up state for the actual fetch
    setLoading(true);
    setError(null);

    try {
      // Fetch profile, reviews, renter bookings, and equipment IDs in parallel
      const [
        { data: profileData, error: profileError },
        { data: reviews, error: reviewsError },
        { count: renterCount, error: renterCountError },
        { data: equipmentData, error: equipmentError },
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", targetUserId).maybeSingle(),
        supabase.from("reviews").select("rating").eq("reviewee_id", targetUserId),
        supabase
          .from("booking_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "completed")
          .eq("renter_id", targetUserId),
        supabase
          .from("equipment")
          .select("id")
          .eq("owner_id", targetUserId),
      ]);

      // Profile error is fatal - we cannot proceed without profile data
      if (profileError) throw profileError;

      // If profile doesn't exist, throw a more descriptive error
      if (!profileData) {
        throw new Error("Profile not found. Please ensure your account is properly set up.");
      }

      // Non-critical errors: log warnings and default to safe values
      if (reviewsError) {
        console.warn("Failed to load reviews for trust score:", reviewsError);
      }
      if (renterCountError) {
        console.warn("Failed to load renter bookings count:", renterCountError);
      }
      if (equipmentError) {
        console.warn("Failed to load equipment list:", equipmentError);
      }

      // Default to safe values for non-critical data
      const safeReviews = reviewsError ? [] : reviews || [];
      const safeRenterCount = renterCountError ? 0 : renterCount || 0;
      const safeEquipmentData = equipmentError ? [] : equipmentData || [];

      const equipmentIds = safeEquipmentData.map((eq) => eq.id);
      let ownerCount = 0;

      if (equipmentIds.length > 0) {
        const { count, error: ownerCountError } = await supabase
          .from("booking_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "completed")
          .in("equipment_id", equipmentIds);

        if (ownerCountError) {
          console.warn("Failed to load owner bookings count:", ownerCountError);
        } else {
          ownerCount = count || 0;
        }
      }

      const bookingsCount = safeRenterCount + ownerCount;

      // Calculate trust score
      const accountAgeDays = calculateAccountAge(profileData.created_at);
      const averageRating =
        safeReviews.length > 0
          ? safeReviews.reduce((sum, r) => sum + r.rating, 0) / safeReviews.length
          : 0;

      // Determine email verification status:
      // - For own profile: use Supabase Auth's email_confirmed_at (source of truth)
      // - For other profiles: fall back to profiles.email_verified
      const emailVerified = authUser
        ? !!authUser.email_confirmed_at
        : profileData.email_verified || false;

      const trustScore: TrustScore = calculateTrustScore({
        identityVerified: profileData.identity_verified || false,
        phoneVerified: profileData.phone_verified || false,
        emailVerified,
        completedBookings: bookingsCount,
        averageRating,
        totalReviews: safeReviews.length,
        averageResponseTimeHours: profileData.average_response_time_hours ?? 12,
        accountAgeDays,
      });

      const verificationProfile: UserVerificationProfile = {
        userId: targetUserId,
        identityVerified: profileData.identity_verified || false,
        phoneVerified: profileData.phone_verified || false,
        emailVerified,
        addressVerified: profileData.address_verified || false,
        trustScore,
        verifiedAt: profileData.verified_at,
      };

      setProfile(verificationProfile);
    } catch (err) {
      console.error("Error fetching verification profile:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch verification profile"
      );
    } finally {
      setLoading(false);
    }
  }, [options.userId]);

  useEffect(() => {
    void fetchVerificationProfile();
  }, [fetchVerificationProfile]);

  // Subscribe to trust score updates via Supabase Realtime
  useEffect(() => {
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupRealtimeSubscription = async () => {
      let targetUserId = options.userId;
      if (!targetUserId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || !isMounted) return;
        targetUserId = user.id;
      }

      if (!isMounted) return;

      channel = supabase
        .channel(`profile-trust-${targetUserId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${targetUserId}`,
          },
          (payload) => {
            if (!isMounted) return;
            // Trust score was updated, refresh profile
            const newData = payload.new as { trust_score?: number };
            const oldData = payload.old as { trust_score?: number };
            if (newData.trust_score !== oldData?.trust_score) {
              void fetchVerificationProfile();
            }
          }
        )
        .subscribe();
    };

    void setupRealtimeSubscription();

    return () => {
      isMounted = false;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [options.userId, fetchVerificationProfile]);

  const uploadVerificationDocument = useCallback(
    async (file: File, type: VerificationType): Promise<void> => {
      setUploading(true);
      setError(null);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // Upload file to Supabase Storage
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${type}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("verification-documents")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage
          .from("verification-documents")
          .getPublicUrl(fileName);

        // Update profile with verification status
        const updateField = `${type}_verification_status`;
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            [updateField]: "pending",
            [`${type}_verification_url`]: publicUrl,
          })
          .eq("id", user.id);

        if (updateError) throw updateError;

        // Refresh profile
        await fetchVerificationProfile();
      } catch (err) {
        console.error("Error uploading document:", err);
        setError(
          err instanceof Error ? err.message : "Failed to upload document"
        );
        throw err;
      } finally {
        setUploading(false);
      }
    },
    [fetchVerificationProfile]
  );

  const requestPhoneVerification = useCallback(
    async (phoneNumber: string) => {
      setError(null);
      try {
        // This would integrate with a phone verification service like Twilio
        // For now, we'll just update the profile
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            phone: phoneNumber,
            phone_verification_status: "pending",
          })
          .eq("id", user.id);

        if (updateError) throw updateError;

        await fetchVerificationProfile();
        return { success: true };
      } catch (err) {
        console.error("Error requesting phone verification:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to request phone verification"
        );
        return {
          success: false,
          error: err instanceof Error ? err.message : "Failed",
        };
      }
    },
    [fetchVerificationProfile]
  );

  return {
    profile,
    loading,
    error,
    uploading,
    fetchVerificationProfile,
    uploadVerificationDocument,
    requestPhoneVerification,
  };
};
