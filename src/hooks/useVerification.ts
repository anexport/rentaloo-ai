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
    // Step 1: Validate and get targetUserId (all validation happens first)
    let targetUserId = options.userId;
    if (!targetUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }
      targetUserId = user.id;
    }

    // Step 2: Validation passed - set up state for the actual fetch
    setLoading(true);
    setError(null);

    try {
      if (!targetUserId) throw new Error("No user ID available");

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", targetUserId)
        .single();

      if (profileError) throw profileError;

      // Fetch reviews
      const { data: reviews } = await supabase
        .from("reviews")
        .select("rating")
        .eq("reviewee_id", targetUserId);

      // Fetch completed bookings count for the target user
      // User can be either renter or owner, so we need to check both relationships
      // Query from booking_requests and filter by status = 'completed'
      const { count: bookingsCount } = await supabase
        .from("booking_requests")
        .select(
          "id, bookings!inner(return_status), equipment:equipment!inner(owner_id)",
          { count: "exact", head: true }
        )
        .eq("status", "completed")
        .or(`renter_id.eq.${targetUserId},equipment.owner_id.eq.${targetUserId}`);

      // Calculate trust score
      const accountAgeDays = calculateAccountAge(profileData.created_at);
      const averageRating =
        reviews && reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;

      const trustScore: TrustScore = calculateTrustScore({
        identityVerified: profileData.identity_verified || false,
        phoneVerified: profileData.phone_verified || false,
        emailVerified: profileData.email_verified || false,
        completedBookings: bookingsCount || 0,
        averageRating,
        totalReviews: reviews?.length || 0,
        averageResponseTimeHours: 12, // This would come from messaging data
        accountAgeDays,
      });

      const verificationProfile: UserVerificationProfile = {
        userId: targetUserId,
        identityVerified: profileData.identity_verified || false,
        phoneVerified: profileData.phone_verified || false,
        emailVerified: profileData.email_verified || false,
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
