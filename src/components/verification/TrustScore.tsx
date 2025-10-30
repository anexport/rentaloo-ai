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
} from "lucide-react";
import type { TrustScore as TrustScoreType } from "../../types/verification";
import {
  getTrustScoreColor,
  getTrustScoreBgColor,
  getTrustScoreLabel,
} from "../../lib/verification";

interface TrustScoreProps {
  score: TrustScoreType;
  showBreakdown?: boolean;
}

const TrustScore = ({ score, showBreakdown = true }: TrustScoreProps) => {
  const components = [
    {
      label: "Verification",
      value: score.components.verification,
      icon: Shield,
      max: 30,
    },
    {
      label: "Reviews",
      value: score.components.reviews,
      icon: Star,
      max: 25,
    },
    {
      label: "Completed Bookings",
      value: score.components.completedBookings,
      icon: CheckCircle,
      max: 20,
    },
    {
      label: "Response Time",
      value: score.components.responseTime,
      icon: Clock,
      max: 15,
    },
    {
      label: "Account Age",
      value: score.components.accountAge,
      icon: Calendar,
      max: 10,
    },
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Trust Score</CardTitle>
              <CardDescription>
                Build trust by verifying your identity and completing rentals
              </CardDescription>
            </div>
          </div>
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="flex flex-col items-center justify-center">
          <div
            className={`relative rounded-full ${getTrustScoreBgColor(
              score.overall
            )} p-8 mb-4 transition-all duration-300 hover:scale-105`}
          >
            <div className="text-center">
              <div
                className={`text-5xl font-bold ${getTrustScoreColor(
                  score.overall
                )} mb-1 transition-colors`}
              >
                {score.overall}
              </div>
              <div className="text-xs text-muted-foreground font-medium">
                out of 100
              </div>
            </div>
          </div>

          <div className="text-center">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${getTrustScoreColor(
                score.overall
              )} ${getTrustScoreBgColor(score.overall)}`}
            >
              {getTrustScoreLabel(score.overall)}
            </span>
          </div>
        </div>

        {/* Score Breakdown */}
        {showBreakdown && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">
                Score Breakdown
              </h4>
              <span className="text-xs text-muted-foreground">
                {components.reduce((acc, c) => acc + c.value, 0)}/
                {components.reduce((acc, c) => acc + c.max, 0)} points
              </span>
            </div>
            {components.map((component) => {
              const Icon = component.icon;
              const percentage = (component.value / component.max) * 100;

              return (
                <div key={component.label} className="space-y-2 group">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-foreground font-medium">
                        {component.label}
                      </span>
                    </div>
                    <span className="font-semibold text-foreground tabular-nums">
                      {component.value}/{component.max}
                    </span>
                  </div>
                  <Progress
                    value={percentage}
                    className={`h-2 transition-transform duration-300 group-hover:scale-x-[1.02] ${
                      percentage >= 80
                        ? "[&>div]:bg-chart-4"
                        : percentage >= 60
                        ? "[&>div]:bg-chart-2"
                        : percentage >= 40
                        ? "[&>div]:bg-chart-5"
                        : "[&>div]:bg-chart-1"
                    }`}
                  />
                  {percentage < 100 && (
                    <p className="text-xs text-muted-foreground">
                      {component.max - component.value} points remaining
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tips Section */}
        <div className="pt-4 border-t">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Pro tip:</strong> Complete
              identity verification to gain +30 points instantly!
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrustScore;
