import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Shield,
  Star,
  Calendar,
  Clock,
  CheckCircle,
  TrendingUp,
  Sparkles,
  Award,
  Target,
  Zap,
} from "lucide-react";
import type { TrustScore as TrustScoreType } from "@/types/verification";
import {
  getTrustScoreColor,
  getTrustScoreLabel,
} from "@/lib/verification";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

type TrustScoreProps = {
  score: TrustScoreType;
  showBreakdown?: boolean;
  compact?: boolean;
  className?: string;
};

const SCORE_COMPONENTS = [
  {
    key: "verification" as const,
    label: "Verifications",
    icon: Shield,
    max: 30,
    description: "Identity, email, phone verification",
  },
  {
    key: "reviews" as const,
    label: "Reviews",
    icon: Star,
    max: 25,
    description: "Average rating from past rentals",
  },
  {
    key: "completedBookings" as const,
    label: "Completed",
    icon: CheckCircle,
    max: 20,
    description: "Successfully completed rentals",
  },
  {
    key: "responseTime" as const,
    label: "Response",
    icon: Clock,
    max: 15,
    description: "Average response to messages",
  },
  {
    key: "accountAge" as const,
    label: "Account Age",
    icon: Calendar,
    max: 10,
    description: "Time since account creation",
  },
];

// Badge configurations based on score
const BADGES = [
  { min: 0, max: 24, label: "Newcomer", color: "text-slate-500", bg: "bg-slate-100 dark:bg-slate-800", icon: "🌱" },
  { min: 25, max: 49, label: "Bronze", color: "text-amber-700", bg: "bg-amber-100 dark:bg-amber-900/30", icon: "🥉" },
  { min: 50, max: 74, label: "Silver", color: "text-slate-600", bg: "bg-slate-200 dark:bg-slate-700", icon: "🥈" },
  { min: 75, max: 89, label: "Gold", color: "text-yellow-600", bg: "bg-yellow-100 dark:bg-yellow-900/30", icon: "🥇" },
  { min: 90, max: 100, label: "Platinum", color: "text-purple-600", bg: "bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30", icon: "💎" },
];

const getBadge = (score: number) => BADGES.find(b => score >= b.min && score <= b.max) || BADGES[0];

// Circular progress component
const CircularProgress = ({
  value,
  potentialValue,
  size = 160,
  strokeWidth = 12,
  className,
}: {
  value: number;
  potentialValue?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  const potentialOffset = potentialValue ? circumference - (potentialValue / 100) * circumference : offset;
  const prefersReducedMotion = usePrefersReducedMotion();

  // Color based on score
  const getProgressColor = (score: number) => {
    if (score >= 90) return "stroke-purple-500 dark:stroke-purple-400";
    if (score >= 75) return "stroke-yellow-500 dark:stroke-yellow-400";
    if (score >= 50) return "stroke-blue-500 dark:stroke-blue-400";
    if (score >= 25) return "stroke-amber-500 dark:stroke-amber-400";
    return "stroke-slate-400 dark:stroke-slate-500";
  };

  return (
    <svg
      width={size}
      height={size}
      className={cn("transform -rotate-90", className)}
    >
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        className="stroke-muted"
      />
      {/* Potential progress circle (faded) */}
      {potentialValue && potentialValue > value && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={potentialOffset}
          className={cn(
            getProgressColor(potentialValue),
            "opacity-20",
            !prefersReducedMotion && "transition-all duration-700 ease-out"
          )}
        />
      )}
      {/* Current progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className={cn(
          getProgressColor(value),
          !prefersReducedMotion && "transition-all duration-700 ease-out"
        )}
      />
    </svg>
  );
};

const TrustScore = ({
  score,
  showBreakdown = true,
  compact = false,
  className,
}: TrustScoreProps) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const isZeroScore = score.overall === 0;
  const badge = getBadge(score.overall);

  // Calculate potential score (if all verifications were complete)
  const verificationMax = 30;
  const currentVerification = score.components.verification;
  const potentialBoost = verificationMax - currentVerification;
  const potentialScore = Math.min(100, score.overall + potentialBoost);

  // Next milestone
  const nextBadge = BADGES.find(b => b.min > score.overall);
  const pointsToNext = nextBadge ? nextBadge.min - score.overall : 0;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div className="relative">
          <CircularProgress value={score.overall} size={48} strokeWidth={5} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn("text-sm font-bold", getTrustScoreColor(score.overall))}>
              {score.overall}
            </span>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-foreground">Trust Score</p>
            <span className="text-xs">{badge.icon}</span>
          </div>
          <p className={cn("text-xs font-medium", badge.color)}>
            {badge.label}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <Award className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Trust Score</CardTitle>
              <CardDescription className="text-xs">
                Your reputation in the community
              </CardDescription>
            </div>
          </div>
          {/* Badge Display */}
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold",
            badge.bg,
            badge.color
          )}>
            <span className="text-sm">{badge.icon}</span>
            {badge.label}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Circular Score Display */}
        <div
          className={cn(
            "relative flex flex-col items-center justify-center py-6 rounded-2xl transition-colors",
            "bg-gradient-to-br from-muted/50 to-muted/20",
            isZeroScore && !prefersReducedMotion && "animate-pulse"
          )}
        >
          <div className="relative">
            <CircularProgress 
              value={score.overall} 
              potentialValue={potentialScore}
              size={140} 
              strokeWidth={10} 
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={cn(
                  "text-4xl font-bold tabular-nums",
                  getTrustScoreColor(score.overall)
                )}
              >
                {score.overall}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">
                out of 100
              </span>
            </div>
          </div>

          {/* Status and Next Milestone */}
          <div className="mt-4 flex flex-col items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold",
                getTrustScoreColor(score.overall),
                "bg-background border"
              )}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              {getTrustScoreLabel(score.overall)}
            </span>
            
            {/* Next milestone indicator */}
            {nextBadge && pointsToNext > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Target className="h-3 w-3" />
                <span>
                  <strong className="text-foreground">{pointsToNext}</strong> points to {nextBadge.icon} {nextBadge.label}
                </span>
              </div>
            )}
          </div>

          {/* Potential Score Indicator */}
          {potentialBoost > 0 && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10 flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">
                Complete verification for up to <strong className="text-primary">{potentialScore}</strong> points
              </span>
            </div>
          )}
        </div>

        {/* Score Breakdown */}
        {showBreakdown && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Score Breakdown
              </h4>
              <span className="text-xs text-muted-foreground tabular-nums">
                {SCORE_COMPONENTS.reduce((acc, c) => acc + score.components[c.key], 0)}/
                {SCORE_COMPONENTS.reduce((acc, c) => acc + c.max, 0)} pts
              </span>
            </div>

            <div className="space-y-2.5">
              {SCORE_COMPONENTS.map((component) => {
                const Icon = component.icon;
                const value = score.components[component.key];
                const percentage = (value / component.max) * 100;

                const getBarColor = (pct: number) => {
                  if (pct >= 80) return "[&>div]:bg-green-500 dark:[&>div]:bg-green-400";
                  if (pct >= 60) return "[&>div]:bg-blue-500 dark:[&>div]:bg-blue-400";
                  if (pct >= 40) return "[&>div]:bg-amber-500 dark:[&>div]:bg-amber-400";
                  if (pct > 0) return "[&>div]:bg-orange-500 dark:[&>div]:bg-orange-400";
                  return "[&>div]:bg-muted-foreground/30";
                };

                return (
                  <div key={component.key} className="group">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className={cn(
                          "p-1 rounded-md transition-colors",
                          value > 0 ? "bg-primary/10" : "bg-muted"
                        )}
                      >
                        <Icon className={cn(
                          "h-3 w-3 transition-colors",
                          value > 0 ? "text-primary" : "text-muted-foreground/50"
                        )} />
                      </div>
                      <span className="flex-1 text-xs font-medium text-foreground">
                        {component.label}
                      </span>
                      <span className={cn(
                        "text-xs font-semibold tabular-nums",
                        value > 0 ? "text-foreground" : "text-muted-foreground/50"
                      )}>
                        {value}/{component.max}
                      </span>
                    </div>
                    <Progress
                      value={percentage}
                      className={cn("h-1.5", getBarColor(percentage))}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Action */}
        {score.components.verification < 30 && (
          <div className="p-3 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-primary/20">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Quick boost available!
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Complete verification to instantly gain up to <strong className="text-primary">+{30 - score.components.verification}</strong> points.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrustScore;
