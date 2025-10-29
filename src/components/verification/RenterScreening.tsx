import { useVerification } from "@/hooks/useVerification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Star, Calendar, CheckCircle, AlertCircle } from "lucide-react";
import VerificationBadge from "./VerificationBadge";
import {
  getTrustScoreColor,
  formatVerificationDate,
} from "../../lib/verification";

interface RenterScreeningProps {
  renterId: string;
  renterName: string;
  renterEmail: string;
}

const RenterScreening = ({
  renterId,
  renterName,
  renterEmail,
}: RenterScreeningProps) => {
  const { profile, loading } = useVerification({ userId: renterId });

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-gray-500">Loading renter information...</p>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">Unable to load renter information</p>
        </CardContent>
      </Card>
    );
  }

  const isHighlyTrusted = profile.trustScore.overall >= 80;
  const isTrusted = profile.trustScore.overall >= 60;

  return (
    <div className="space-y-6">
      {/* Trust Score Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-primary" />
            <span>Renter Trust Profile</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Trust Score</p>
              <p
                className={`text-4xl font-bold ${getTrustScoreColor(
                  profile.trustScore.overall
                )}`}
              >
                {profile.trustScore.overall}
              </p>
              <p className="text-sm text-gray-500">out of 100</p>
            </div>
            <div className="text-right">
              {isHighlyTrusted && (
                <Badge className="bg-green-100 text-green-800 mb-2">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Highly Trusted
                </Badge>
              )}
              {isTrusted && !isHighlyTrusted && (
                <Badge className="bg-blue-100 text-blue-800 mb-2">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Trusted Renter
                </Badge>
              )}
              {!isTrusted && (
                <Badge className="bg-yellow-100 text-yellow-800 mb-2">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Building Trust
                </Badge>
              )}
            </div>
          </div>

          {/* Verification Status */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Identity</span>
              <VerificationBadge
                status={profile.identityVerified ? "verified" : "unverified"}
                showLabel={false}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Email</span>
              <VerificationBadge
                status={profile.emailVerified ? "verified" : "unverified"}
                showLabel={false}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Phone</span>
              <VerificationBadge
                status={profile.phoneVerified ? "verified" : "unverified"}
                showLabel={false}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Address</span>
              <VerificationBadge
                status={profile.addressVerified ? "verified" : "unverified"}
                showLabel={false}
              />
            </div>
          </div>

          {profile.verifiedAt && (
            <p className="text-xs text-gray-500 mt-4">
              {formatVerificationDate(profile.verifiedAt)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Trust Score Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trust Score Components</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-700">Verification</span>
            </div>
            <span className="text-sm font-medium">
              {profile.trustScore.components.verification}/30
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Star className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-700">Reviews</span>
            </div>
            <span className="text-sm font-medium">
              {profile.trustScore.components.reviews}/25
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-700">Completed Bookings</span>
            </div>
            <span className="text-sm font-medium">
              {profile.trustScore.components.completedBookings}/20
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-700">Account Age</span>
            </div>
            <span className="text-sm font-medium">
              {profile.trustScore.components.accountAge}/10
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Recommendation */}
      <Card
        className={
          isHighlyTrusted
            ? "border-green-200 bg-green-50"
            : isTrusted
            ? "border-blue-200 bg-blue-50"
            : "border-yellow-200 bg-yellow-50"
        }
      >
        <CardContent className="py-4">
          <div className="flex items-start space-x-3">
            {isHighlyTrusted ? (
              <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
            ) : isTrusted ? (
              <CheckCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p
                className={`font-semibold text-sm ${
                  isHighlyTrusted
                    ? "text-green-900"
                    : isTrusted
                    ? "text-blue-900"
                    : "text-yellow-900"
                }`}
              >
                {isHighlyTrusted
                  ? "Highly Recommended"
                  : isTrusted
                  ? "Recommended"
                  : "Proceed with Caution"}
              </p>
              <p
                className={`text-xs ${
                  isHighlyTrusted
                    ? "text-green-700"
                    : isTrusted
                    ? "text-blue-700"
                    : "text-yellow-700"
                }`}
              >
                {isHighlyTrusted
                  ? "This renter has excellent trust metrics and verification status."
                  : isTrusted
                  ? "This renter meets standard trust requirements."
                  : "This renter is still building their trust profile. Consider requesting additional verification or a security deposit."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RenterScreening;
