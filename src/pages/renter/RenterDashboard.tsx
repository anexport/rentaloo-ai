import { useAuth } from "@/hooks/useAuth";
import { Calendar, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import BookingRequestCard from "@/components/booking/BookingRequestCard";
import { useBookingRequests } from "@/hooks/useBookingRequests";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatsOverview from "@/components/renter/StatsOverview";
import NotificationsPanel from "@/components/renter/NotificationsPanel";
import WelcomeHero from "@/components/renter/WelcomeHero";
import UpcomingCalendar from "@/components/renter/UpcomingCalendar";
import RecommendationsSection from "@/components/renter/RecommendationsSection";
import { useVerification } from "@/hooks/useVerification";
import { getVerificationProgress } from "@/lib/verification";
import { useToast } from "@/hooks/useToast";
import PendingClaimsList from "@/components/claims/PendingClaimsList";
import { cn } from "@/lib/utils";

const RenterDashboard = () => {
  const { user } = useAuth();
  const { profile, loading: verificationLoading } = useVerification();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const { t } = useTranslation("dashboard");

  // Fetch renter bookings
  const {
    bookingRequests: renterBookings,
    loading: renterLoading,
    error: renterError,
    fetchBookingRequests: fetchRenterBookings,
  } = useBookingRequests("renter");

  const { toast } = useToast();

  // Memoize the status change callback to prevent effect re-runs
  const handleBookingStatusChange = useCallback(async () => {
    try {
      await fetchRenterBookings();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to refresh bookings",
        description:
          err instanceof Error
            ? err.message
            : "An error occurred while refreshing bookings.",
      });
    }
  }, [fetchRenterBookings, toast]);

  // Watch for errors from initial/background fetches
  useEffect(() => {
    if (renterError) {
      toast({
        variant: "destructive",
        title: "Failed to load bookings",
        description: renterError,
      });
    }
  }, [renterError, toast]);

  const progress = profile ? getVerificationProgress(profile) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Welcome Hero Section */}
        <WelcomeHero />

        {/* High-Emphasis Banner for unverified identity */}
        {!verificationLoading &&
          profile &&
          !profile.identityVerified && (
            <Card className="border-destructive/40 bg-destructive/5 ring-1 ring-destructive/20 animate-in slide-in-from-top-4 duration-500">
              <CardContent className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-destructive/10">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-destructive">
                      {t("renter.verification.incomplete_title")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("renter.verification.incomplete_message", { progress })}
                    </p>
                  </div>
                </div>
                <Link to="/verification">
                  <Button
                    variant="default"
                    size="lg"
                    className="font-semibold shadow-lg ring-2 ring-primary/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
                    aria-label={t("renter.verification.verify_button")}
                    data-testid="verify-now-banner"
                  >
                    {t("renter.verification.verify_button")}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

        {/* Notifications Panel */}
        <div className="animate-in slide-in-from-top-4 duration-500 delay-100">
          <NotificationsPanel />
        </div>

        {/* Pending Damage Claims */}
        <div className="animate-in slide-in-from-top-4 duration-500 delay-150">
          <PendingClaimsList />
        </div>

        {/* Stats Overview Section */}
        <div className="space-y-4 animate-in slide-in-from-top-4 duration-500 delay-200">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {t("renter.overview.section_title")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("renter.overview.section_description")}
            </p>
          </div>
          <StatsOverview />
        </div>

        {/* Main Content Grid - Calendar + Bookings */}
        <div className="grid gap-6 lg:grid-cols-3 animate-in slide-in-from-top-4 duration-500 delay-300">
          {/* Left Column - Bookings (takes 2 columns on large screens) */}
          <div className="lg:col-span-2 space-y-6">
            {/* My Rental Bookings Section */}
            <div className="space-y-4">
              {renterBookings.length > 3 && activeTab !== "bookings" && (
                <div className="flex justify-end">
                  <Link to="/renter/dashboard?tab=bookings">
                    <Button variant="outline" size="sm">
                      {t("renter.bookings.view_all")}
                    </Button>
                  </Link>
                </div>
              )}
              {renterLoading ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <div className="text-muted-foreground">
                      {t("renter.bookings.loading")}
                    </div>
                  </CardContent>
                </Card>
              ) : renterBookings.length === 0 ? (
                <Card className="border-dashed h-full">
                  <CardContent className="text-center py-12 h-full flex items-center justify-center">
                    <div className="flex flex-col items-center">
                      <div className="rounded-full bg-muted p-4 mb-4">
                        <Calendar className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-1">
                        {t("renter.bookings.empty_state.title")}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                        {t("renter.bookings.empty_state.description")}
                      </p>
                      <Link to="/equipment">
                        <Button size="lg">{t("renter.bookings.empty_state.button")}</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {(activeTab === "bookings"
                    ? renterBookings
                    : renterBookings.slice(0, 3)
                  ).map((booking, index) => (
                    <div
                      key={booking.id}
                      className="animate-in slide-in-from-left-4 duration-500"
                      style={{
                        animationDelay: `${300 + index * 100}ms`,
                      }}
                    >
                      <BookingRequestCard
                        bookingRequest={booking}
                        onStatusChange={handleBookingStatusChange}
                        showActions={true}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Calendar Sidebar */}
          {activeTab !== "bookings" && (
            <div className="lg:col-span-1 animate-in slide-in-from-right-4 duration-500 delay-300">
              <UpcomingCalendar />
            </div>
          )}
        </div>

        {/* Recommendations Section */}
        {activeTab !== "bookings" && (
          <div className="animate-in slide-in-from-bottom-4 duration-500 delay-400">
            <RecommendationsSection />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default RenterDashboard;
