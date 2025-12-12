import { useVerification } from "@/hooks/useVerification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Shield,
  Star,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
} from "lucide-react";
import VerificationStatusGrid from "./VerificationStatusGrid";
import TrustScore from "./TrustScore";
import {
  getTrustScoreColor,
  getTrustScoreLabel,
  formatVerificationDate,
} from "@/lib/verification";
import { cn } from "@/lib/utils";

type RenterScreeningProps = {
  renterId: string;
  className?: string;
};

const RenterScreening = ({ renterId, className }: RenterScreeningProps) => {
  const { profile, loading } = useVerification({ userId: renterId });

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 mx-auto mb-3 text-muted-foreground animate-spin" />
          <p className="text-sm text-muted-foreground">Loading renter profile...</p>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Unable to load renter information
          </p>
        </CardContent>
      </Card>
    );
  }

  const isHighlyTrusted = profile.trustScore.overall >= 80;
  const isTrusted = profile.trustScore.overall >= 60;

  const getRecommendationConfig = () => {
    if (isHighlyTrusted) {
      return {
        icon: CheckCircle,
        title: "Highly Recommended",
        description: "This renter has excellent trust metrics and verification status.",
        bgClass: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
        iconClass: "text-green-600 dark:text-green-400",
        textClass: "text-green-900 dark:text-green-200",
        descClass: "text-green-700 dark:text-green-300",
      };
    }
    if (isTrusted) {
      return {
        icon: CheckCircle,
        title: "Recommended",
        description: "This renter meets standard trust requirements.",
        bgClass: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
        iconClass: "text-blue-600 dark:text-blue-400",
        textClass: "text-blue-900 dark:text-blue-200",
        descClass: "text-blue-700 dark:text-blue-300",
      };
    }
    return {
      icon: AlertCircle,
      title: "Building Trust",
      description:
        "This renter is still building their trust profile. Consider requesting additional verification or a security deposit.",
      bgClass: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
      iconClass: "text-amber-600 dark:text-amber-400",
      textClass: "text-amber-900 dark:text-amber-200",
      descClass: "text-amber-700 dark:text-amber-300",
    };
  };

  const recommendation = getRecommendationConfig();
  const RecommendationIcon = recommendation.icon;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Trust Overview Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-primary" />
            Renter Trust Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Score Display */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Trust Score</p>
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    "text-3xl font-bold tabular-nums",
                    getTrustScoreColor(profile.trustScore.overall)
                  )}
                >
                  {profile.trustScore.overall}
                </span>
                <span className="text-xs text-muted-foreground">/100</span>
              </div>
              <p
                className={cn(
                  "text-xs font-medium mt-1",
                  getTrustScoreColor(profile.trustScore.overall)
                )}
              >
                {getTrustScoreLabel(profile.trustScore.overall)}
              </p>
            </div>

            <TrustScore score={profile.trustScore} compact />
          </div>

          {/* Verification Status Grid */}
          <VerificationStatusGrid profile={profile} compact className="mt-4" />

          {profile.verifiedAt && (
            <p className="text-[11px] text-muted-foreground pt-2 border-t">
              {formatVerificationDate(profile.verifiedAt)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Score Breakdown Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Trust Score Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              icon: Shield,
              label: "Verification",
              value: profile.trustScore.components.verification,
              max: 30,
            },
            {
              icon: Star,
              label: "Reviews",
              value: profile.trustScore.components.reviews,
              max: 25,
            },
            {
              icon: CheckCircle,
              label: "Completed Bookings",
              value: profile.trustScore.components.completedBookings,
              max: 20,
            },
            {
              icon: Clock,
              label: "Response Time",
              value: profile.trustScore.components.responseTime,
              max: 15,
            },
            {
              icon: Calendar,
              label: "Account Age",
              value: profile.trustScore.components.accountAge,
              max: 10,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">{item.label}</span>
                </div>
                <span className="font-medium tabular-nums">
                  {item.value}/{item.max}
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Recommendation Card */}
      <Card className={cn("border", recommendation.bgClass)}>
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <RecommendationIcon
              className={cn("h-5 w-5 shrink-0 mt-0.5", recommendation.iconClass)}
            />
            <div>
              <p className={cn("font-semibold text-sm", recommendation.textClass)}>
                {recommendation.title}
              </p>
              <p className={cn("text-xs mt-0.5", recommendation.descClass)}>
                {recommendation.description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RenterScreening;
