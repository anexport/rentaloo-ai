import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield, Star, Calendar, Clock, CheckCircle } from "lucide-react";
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-primary" />
          <span>Trust Score</span>
        </CardTitle>
        <CardDescription>
          Build trust by verifying your identity and completing rentals
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Overall Score */}
        <div className="flex items-center justify-center mb-6">
          <div
            className={`rounded-full ${getTrustScoreBgColor(
              score.overall
            )} p-6`}
          >
            <div className="text-center">
              <div
                className={`text-4xl font-bold ${getTrustScoreColor(
                  score.overall
                )}`}
              >
                {score.overall}
              </div>
              <div className="text-sm text-gray-600">out of 100</div>
            </div>
          </div>
        </div>

        <div className="text-center mb-6">
          <span
            className={`text-lg font-semibold ${getTrustScoreColor(
              score.overall
            )}`}
          >
            {getTrustScoreLabel(score.overall)}
          </span>
        </div>

        {/* Score Breakdown */}
        {showBreakdown && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700">
              Score Breakdown
            </h4>
            {components.map((component) => {
              const Icon = component.icon;
              const percentage = (component.value / component.max) * 100;

              return (
                <div key={component.label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <Icon className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-700">{component.label}</span>
                    </div>
                    <span className="font-medium text-gray-900">
                      {component.value}/{component.max}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        percentage >= 80
                          ? "bg-green-500"
                          : percentage >= 60
                          ? "bg-blue-500"
                          : percentage >= 40
                          ? "bg-yellow-500"
                          : "bg-orange-500"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrustScore;
