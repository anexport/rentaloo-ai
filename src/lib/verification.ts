import type {
  TrustScore,
  UserVerificationProfile,
} from "../types/verification";

/**
 * Calculate trust score based on multiple factors
 */
export const calculateTrustScore = (data: {
  identityVerified: boolean;
  phoneVerified: boolean;
  emailVerified: boolean;
  completedBookings: number;
  averageRating: number;
  totalReviews: number;
  averageResponseTimeHours: number;
  accountAgeDays: number;
}): TrustScore => {
  // Verification score (0-30 points)
  let verificationScore = 0;
  if (data.identityVerified) verificationScore += 15;
  if (data.phoneVerified) verificationScore += 8;
  if (data.emailVerified) verificationScore += 7;

  // Reviews score (0-25 points)
  let reviewsScore = 0;
  if (data.totalReviews > 0) {
    const ratingScore = (data.averageRating / 5) * 20; // Max 20 points
    const volumeBonus = Math.min(data.totalReviews / 10, 5); // Max 5 bonus points
    reviewsScore = ratingScore + volumeBonus;
  }

  // Completed bookings score (0-20 points)
  const bookingsScore = Math.min(data.completedBookings * 2, 20);

  // Response time score (0-15 points)
  let responseTimeScore = 15;
  if (data.averageResponseTimeHours > 24) responseTimeScore = 5;
  else if (data.averageResponseTimeHours > 12) responseTimeScore = 10;
  else if (data.averageResponseTimeHours > 6) responseTimeScore = 12;

  // Account age score (0-10 points)
  const accountAgeScore = Math.min((data.accountAgeDays / 365) * 10, 10);

  const overall = Math.round(
    verificationScore +
      reviewsScore +
      bookingsScore +
      responseTimeScore +
      accountAgeScore
  );

  return {
    overall,
    components: {
      verification: Math.round(verificationScore),
      reviews: Math.round(reviewsScore),
      completedBookings: Math.round(bookingsScore),
      responseTime: Math.round(responseTimeScore),
      accountAge: Math.round(accountAgeScore),
    },
  };
};

/**
 * Get trust score color based on score value
 */
export const getTrustScoreColor = (score: number): string => {
  if (score >= 80) return "text-chart-4";
  if (score >= 60) return "text-chart-2";
  if (score >= 40) return "text-chart-5";
  return "text-chart-1";
};

/**
 * Get trust score background color
 */
export const getTrustScoreBgColor = (score: number): string => {
  if (score >= 80) return "bg-chart-4/10";
  if (score >= 60) return "bg-chart-2/10";
  if (score >= 40) return "bg-chart-5/10";
  return "bg-chart-1/10";
};

/**
 * Get trust score label
 */
export const getTrustScoreLabel = (score: number): string => {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Building Trust";
};

/**
 * Get verification progress percentage
 */
export const getVerificationProgress = (
  profile: UserVerificationProfile
): number => {
  let completed = 0;
  let total = 4; // identity, phone, email, address

  if (profile.identityVerified) completed++;
  if (profile.phoneVerified) completed++;
  if (profile.emailVerified) completed++;
  if (profile.addressVerified) completed++;

  return Math.round((completed / total) * 100);
};

/**
 * Check if user meets minimum verification requirements
 */
export const meetsMinimumVerification = (
  profile: UserVerificationProfile
): boolean => {
  return profile.emailVerified && profile.identityVerified;
};

/**
 * Get verification status message
 */
export const getVerificationStatusMessage = (
  profile: UserVerificationProfile
): string => {
  if (
    profile.identityVerified &&
    profile.phoneVerified &&
    profile.emailVerified &&
    profile.addressVerified
  ) {
    return "Fully verified";
  }

  const missing: string[] = [];
  if (!profile.identityVerified) missing.push("identity");
  if (!profile.phoneVerified) missing.push("phone");
  if (!profile.emailVerified) missing.push("email");
  if (!profile.addressVerified) missing.push("address");

  return `Complete ${missing.join(", ")} verification`;
};

/**
 * Validate document for upload
 */
export const validateDocument = (
  file: File
): {
  valid: boolean;
  error?: string;
} => {
  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: "File size must be less than 5MB" };
  }

  // Check file type
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: "File must be a JPEG, PNG, WebP, or PDF",
    };
  }

  return { valid: true };
};

/**
 * Format verification date
 */
export const formatVerificationDate = (dateString?: string): string => {
  if (!dateString) return "Not verified";

  const date = new Date(dateString);
  return `Verified ${date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  })}`;
};

/**
 * Calculate account age in days
 */
export const calculateAccountAge = (createdAt: string): number => {
  const created = new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - created.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};
