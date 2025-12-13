import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, Inbox } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";

type OwnerWelcomeHeroProps = {
  bookingsLoading?: boolean;
  pendingCount: number;
  upcomingCount: number;
  nextStartDate: string | null;
  isVerified?: boolean;
  subtitle?: string;
};

const WelcomeHero = ({
  bookingsLoading = false,
  pendingCount,
  upcomingCount,
  nextStartDate,
  isVerified = false,
  subtitle,
}: OwnerWelcomeHeroProps) => {
  const { user } = useAuth();
  const { t } = useTranslation("dashboard");

  // Get personalized greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t("owner.welcome.greeting_morning");
    if (hour < 17) return t("owner.welcome.greeting_afternoon");
    return t("owner.welcome.greeting_evening");
  };

  // Extract first name from email (fallback to translated "there" if not available)
  const getFirstName = () => {
    if (!user?.email) return t("owner.welcome.fallback_name");
    const emailName = user.email.split("@")[0];
    if (!emailName) return t("owner.welcome.fallback_name");
    const namePart = emailName.split(".")[0];
    return namePart.charAt(0).toUpperCase() + namePart.slice(1);
  };

  const firstName = getFirstName();
  const greeting = getGreeting();

  return (
    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary/10 via-primary/5 to-background shadow-lg">
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
      <CardContent className="relative p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Left: Greeting and Info */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/20 border-2 border-primary/30 shadow-md transition-transform hover:scale-105">
                <span className="text-2xl md:text-3xl font-bold text-primary">
                  {firstName.charAt(0)}
                </span>
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                  {greeting}, {firstName}!
                </h1>
                {subtitle && (
                  <p className="text-sm md:text-base text-muted-foreground mt-2">
                    {subtitle}
                  </p>
                )}
                {isVerified && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300 dark:border-green-700 shadow-sm"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {t("owner.welcome.verified_badge")}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Activity Summary */}
            {!bookingsLoading && (
              <div className="space-y-2 pl-0 md:pl-24">
                {pendingCount > 0 && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Inbox className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm md:text-base">
                      {t(
                        pendingCount === 1
                          ? "owner.welcome.pending_requests"
                          : "owner.welcome.pending_requests_plural",
                        { count: pendingCount }
                      )}
                    </span>
                  </div>
                )}

                {upcomingCount > 0 && nextStartDate ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm md:text-base">
                      {t(
                        upcomingCount === 1
                          ? "owner.welcome.upcoming_rentals"
                          : "owner.welcome.upcoming_rentals_plural",
                        {
                          count: upcomingCount,
                          time: formatDistanceToNow(parseISO(nextStartDate), {
                            addSuffix: true,
                          }),
                        }
                      )}
                    </span>
                  </div>
                ) : pendingCount === 0 ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm md:text-base">
                      {t("owner.welcome.empty_state")}
                    </span>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Right: Visual Element (optional decorative) */}
          <div className="hidden md:block opacity-10">
            <div className="w-32 h-32 rounded-full bg-primary/20 blur-3xl animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WelcomeHero;
