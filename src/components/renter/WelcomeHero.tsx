import { useAuth } from "@/hooks/useAuth";
import { useVerification } from "@/hooks/useVerification";
import { useUpcomingBookings } from "@/components/renter/hooks/useUpcomingBookings";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const WelcomeHero = () => {
  const { user } = useAuth();
  const { profile } = useVerification();
  const { data, isLoading } = useUpcomingBookings(user?.id);

  const upcomingCount = data?.count || 0;
  const nextRentalDate = data?.nextDate;

  // Get personalized greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Extract first name from email (fallback to "there" if not available)
  const getFirstName = () => {
    if (!user?.email) return "there";
    const emailName = user.email.split("@")[0];
    // Capitalize first letter
    return emailName.charAt(0).toUpperCase() + emailName.slice(1).split(".")[0];
  };

  const firstName = getFirstName();
  const greeting = getGreeting();
  const isVerified = profile?.identityVerified;

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
                  {firstName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                  {greeting}, {firstName}!
                </h1>
                {isVerified && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300 dark:border-green-700 shadow-sm"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Activity Summary */}
            {!isLoading && (
              <div className="space-y-2 pl-0 md:pl-24">
                {upcomingCount > 0 && nextRentalDate ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm md:text-base">
                      You have{" "}
                      <span className="font-semibold text-foreground">
                        {upcomingCount} {upcomingCount === 1 ? "rental" : "rentals"}
                      </span>{" "}
                      coming up. Next rental starts{" "}
                      <span className="font-semibold text-foreground">
                        {formatDistanceToNow(new Date(nextRentalDate), {
                          addSuffix: true,
                        })}
                      </span>
                      .
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm md:text-base">
                      Ready to rent? Browse equipment and start your next adventure.
                    </span>
                  </div>
                )}
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

