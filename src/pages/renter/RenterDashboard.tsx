import { useAuth } from "@/hooks/useAuth";
import { Calendar, Star, Package, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link, useSearchParams } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import TransactionHistory from "@/components/payment/TransactionHistory";
import ReviewList from "@/components/reviews/ReviewList";
import BookingRequestCard from "@/components/booking/BookingRequestCard";
import { useBookingRequests } from "@/hooks/useBookingRequests";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageHeader from "@/components/layout/PageHeader";
import StatsOverview from "@/components/renter/StatsOverview";
import QuickActions from "@/components/renter/QuickActions";
import NotificationsPanel from "@/components/renter/NotificationsPanel";
import { Separator } from "@/components/ui/separator";
import { useVerification } from "@/hooks/useVerification";
import { getVerificationProgress } from "@/lib/verification";
import { useToast } from "@/hooks/useToast";

const RenterDashboard = () => {
  const { user } = useAuth();
  const { profile, loading: verificationLoading } = useVerification();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const [hasEquipment, setHasEquipment] = useState(false);
  const [pendingOwnerRequests, setPendingOwnerRequests] = useState(0);

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

  // Check if user has equipment listings and pending requests
  useEffect(() => {
    const checkEquipment = async () => {
      if (!user) return;

      try {
        const { count, error: countError } = await supabase
        .from("equipment")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", user.id);

        if (countError) throw countError;

      setHasEquipment((count || 0) > 0);

      // If they have equipment, check for pending requests
      if (count && count > 0) {
          const { data: equipment, error: equipmentError } = await supabase
          .from("equipment")
          .select("id")
          .eq("owner_id", user.id);

          if (equipmentError) throw equipmentError;

        if (equipment && equipment.length > 0) {
          const equipmentIds = equipment.map((eq) => eq.id);

            const { count: pendingCount, error: pendingError } = await supabase
            .from("booking_requests")
            .select("*", { count: "exact", head: true })
            .in("equipment_id", equipmentIds)
            .eq("status", "pending");

            if (pendingError) throw pendingError;

          setPendingOwnerRequests(pendingCount || 0);
        }
        }
      } catch (err) {
        console.error("Failed to check equipment:", err);
        toast({
          variant: "destructive",
          title: "Failed to load equipment information",
          description:
            err instanceof Error
              ? err.message
              : "An error occurred while checking your equipment listings.",
        });
        // Reset to safe defaults on error
        setHasEquipment(false);
        setPendingOwnerRequests(0);
      }
    };

    void checkEquipment();
  }, [user, toast]);

  const progress = profile ? getVerificationProgress(profile) : 0;
  const hasAnyVerification =
    !!profile &&
    (profile.identityVerified ||
      profile.phoneVerified ||
      profile.emailVerified ||
      profile.addressVerified);

  return (
    <DashboardLayout>
      <PageHeader
        title="Dashboard Overview"
        description="Welcome back! Here's what's happening with your rentals."
      />

      {/* High-Emphasis Banner for 0% progress and no uploads */}
      {!verificationLoading &&
        profile &&
        progress === 0 &&
        !hasAnyVerification && (
          <div className="mb-8">
            <Card className="border-destructive/40 bg-destructive/5 ring-1 ring-destructive/20">
              <CardContent className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-destructive/10">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-destructive">
                      Complete your verification
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Your account is unverified (0%). Verify now to start
                      renting safely.
                    </p>
                  </div>
                </div>
                <Link to="/verification">
                  <Button
                    variant="default"
                    size="lg"
                    className="font-semibold shadow-lg ring-2 ring-primary/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
                    aria-label="Verify now"
                    data-testid="verify-now-banner"
                  >
                    Verify now
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}

      {/* Notifications Panel */}
      <div className="mb-6">
        <NotificationsPanel />
      </div>

      {/* Stats Overview */}
      <div className="mb-8">
        <StatsOverview />
      </div>

      {/* Quick Actions */}
      {activeTab !== "bookings" && (
        <>
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Quick Actions
            </h2>
            <QuickActions />
          </div>

          <Separator className="my-8" />
        </>
      )}

      {/* Owner Equipment Card (if applicable) */}
      {hasEquipment && (
        <div className="mb-8">
          <Card
            className={
              pendingOwnerRequests > 0 ? "border-primary/50 bg-primary/5" : ""
            }
          >
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-primary" />
                <span>My Equipment Listings</span>
                {pendingOwnerRequests > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                    {pendingOwnerRequests}
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                {pendingOwnerRequests > 0
                  ? `You have ${pendingOwnerRequests} pending booking ${
                      pendingOwnerRequests === 1 ? "request" : "requests"
                    } for your equipment`
                  : "Manage your equipment listings"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/owner/dashboard">
                <Button
                  className="w-full"
                  variant={pendingOwnerRequests > 0 ? "default" : "outline"}
                >
                  {pendingOwnerRequests > 0
                    ? "Review Requests"
                    : "Go to Owner Dashboard"}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {/* My Rental Bookings Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">My Bookings</h2>
          {renterBookings.length > 3 && (
            <Link to="/renter/dashboard?tab=bookings">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          )}
        </div>
        {renterLoading ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground">Loading bookings...</div>
          </div>
        ) : renterBookings.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted" />
              <p className="text-muted-foreground mb-2">No bookings yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Start by browsing available equipment
              </p>
              <Link to="/equipment">
                <Button>Browse Equipment</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {renterBookings.slice(0, 3).map((booking) => (
              <BookingRequestCard
                key={booking.id}
                bookingRequest={booking}
                onStatusChange={handleBookingStatusChange}
                showActions={true}
              />
            ))}
          </div>
        )}
      </div>

      {activeTab !== "bookings" && (
        <>
          <Separator className="my-8" />

          {/* Transaction History */}
          <div className="mb-8">
            <TransactionHistory userType="renter" />
          </div>

          <Separator className="my-8" />

          {/* My Reviews Given */}
          {user && (
            <div className="mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Star className="h-5 w-5 text-primary" />
                    <span>My Reviews</span>
                  </CardTitle>
                  <CardDescription>
                    Reviews you have written for equipment owners
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ReviewList
                    reviewerId={user.id}
                    showSummary={false}
                    showEquipment={true}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
};

export default RenterDashboard;
