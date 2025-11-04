export type VerificationStatus =
  | "unverified"
  | "pending"
  | "verified"
  | "rejected";

export type VerificationType = "identity" | "phone" | "email" | "address";

export interface VerificationDocument {
  id: string;
  userId: string;
  type: VerificationType;
  status: VerificationStatus;
  documentUrl?: string;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface TrustScore {
  overall: number; // 0-100
  components: {
    verification: number;
    reviews: number;
    completedBookings: number;
    responseTime: number;
    accountAge: number;
  };
}

export interface UserVerificationProfile {
  userId: string;
  identityVerified: boolean;
  phoneVerified: boolean;
  emailVerified: boolean;
  addressVerified: boolean;
  trustScore: TrustScore;
  verifiedAt?: string;
}

export interface VerificationBadgeProps {
  type: VerificationType;
  verified: boolean;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export interface DocumentUploadData {
  type: VerificationType;
  file: File;
  metadata?: {
    documentType?: string;
    expiryDate?: string;
    documentNumber?: string;
  };
}

export interface RenterScreeningData {
  userId: string;
  fullName: string;
  email: string;
  trustScore: TrustScore;
  verificationStatus: UserVerificationProfile;
  completedBookings: number;
  averageRating: number;
  memberSince: string;
  recentReviews: Array<{
    rating: number;
    comment: string;
    date: string;
  }>;
}
