import { useAuth } from "@/hooks/useAuth";
import { Calendar, AlertTriangle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import BookingRequestCard from "@/components/booking/BookingRequestCard";
import { useBookingRequests } from "@/hooks/useBookingRequests";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatsOverview from "@/components/renter/StatsOverview";
import NotificationsPanel from "@/components/renter/NotificationsPanel";
import WelcomeHero from "@/components/renter/WelcomeHero";
import UpcomingCalendar from "@/components/renter/UpcomingCalendar";
import SavedEquipmentTab from "@/components/renter/SavedEquipmentTab";
import { useVerification } from "@/hooks/useVerification";
import { getVerificationProgress } from "@/lib/verification";
import { useToast } from "@/hooks/useToast";
import PendingClaimsList from "@/components/claims/PendingClaimsList";
import { MobileInspectionCTA } from "@/components/booking/inspection-flow";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { supabase } from "@/lib/supabase";
import { differenceInDays, isPast, isFuture } from "date-fns";
import type { BookingRequestWithDetails } from "@/types/booking";
import { useActiveRentals } from "@/hooks/useActiveRental";
import ActiveRentalCard from "@/components/rental/ActiveRentalCard";

interface InspectionStatus {
  bookingId: string;
  hasPickup: boolean;
  hasReturn: boolean;
}

type InspectionCandidate = {
  booking: BookingRequestWithDetails;
  status: InspectionStatus | undefined;
  urgencyScore: number;
};

const RenterDashboard = () => {
  const { user } = useAuth();
  const { profile, loading: verificationLoading } = useVerification();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const { t } = useTranslation("dashboard");
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Track inspection status for finding urgent bookings
  const [inspectionStatuses, setInspectionStatuses] = useState<Map<string, InspectionStatus>>(new Map());

  // Fetch renter bookings
  const {
    bookingRequests: renterBookings,
    loading: renterLoading,
    error: renterError,
    fetchBookingRequests: fetchRenterBookings,
  } = useBookingRequests("renter");

  // Fetch active rentals (only where user is renter)
  const {
    rentals: activeRentals,
    isLoading: activeRentalsLoading,
    error: activeRentalsError,
  } = useActiveRentals("renter");

  const { toast } = useToast();

  // Fetch inspection statuses for all approved bookings (for mobile CTA)
  useEffect(() => {
    const fetchInspectionStatuses = async () => {
      if (!user) return;

      const approvedBookings = renterBookings.filter(b => b.status === "approved");
      if (approvedBookings.length === 0) return;

      const bookingIds = approvedBookings.map(b => b.id);
      
      try {
        const { data, error } = await supabase
          .from("equipment_inspections")
          .select("booking_id, inspection_type")
          .in("booking_id", bookingIds);

        if (error) {
          console.error("Error fetching inspection statuses:", error);
          toast({
            variant: "destructive",
            title: "Failed to load inspection statuses",
            description:
              error instanceof Error
                ? error.message
                : "An error occurred while loading inspection statuses.",
          });
          return;
        }

        const statusMap = new Map<string, InspectionStatus>();
        
        // Initialize all bookings
        bookingIds.forEach(id => {
          statusMap.set(id, { bookingId: id, hasPickup: false, hasReturn: false });
        });

        // Update with actual inspection data
        data?.forEach(inspection => {
          const current = statusMap.get(inspection.booking_id);
          if (current) {
            if (inspection.inspection_type === "pickup") {
              current.hasPickup = true;
            } else if (inspection.inspection_type === "return") {
              current.hasReturn = true;
            }
          }
        });

        setInspectionStatuses(statusMap);
      } catch (err) {
        console.error("Error fetching inspection statuses:", err);
        toast({
          variant: "destructive",
          title: "Failed to load inspection statuses",
          description:
            err instanceof Error
              ? err.message
              : "An error occurred while loading inspection statuses.",
        });
      }
    };

    void fetchInspectionStatuses();
  }, [renterBookings, toast, user]);

  // Find the most urgent booking that needs inspection (for mobile CTA)
  const urgentInspectionBooking = useMemo(() => {
    if (!isMobile) return null;
    
    const today = new Date();
    
    // Filter to approved bookings only
    const approvedBookings = renterBookings.filter(b => b.status === "approved");
    
    // Find bookings that need inspection, sorted by urgency
    const bookingsNeedingInspection = approvedBookings
      .map<InspectionCandidate | null>(booking => {
        const status = inspectionStatuses.get(booking.id);
        const startDate = new Date(booking.start_date);
        const endDate = new Date(booking.end_date);
        const daysUntilStart = differenceInDays(startDate, today);
        const daysUntilEnd = differenceInDays(endDate, today);

        // Determine what inspection is needed
        const needsPickup = !status?.hasPickup;
        const needsReturn = status?.hasPickup && !status?.hasReturn && (daysUntilEnd <= 2 || isPast(endDate));

        if (!needsPickup && !needsReturn) return null;

        // Calculate urgency score (lower = more urgent)
        let urgencyScore = 100;
        if (needsPickup) {
          if (isPast(startDate)) urgencyScore = 0;
          else if (daysUntilStart === 0) urgencyScore = 1;
          else if (daysUntilStart <= 2) urgencyScore = 2 + daysUntilStart;
          else urgencyScore = 10 + daysUntilStart;
        } else if (needsReturn) {
          if (isPast(endDate)) urgencyScore = 0;
          else if (daysUntilEnd === 0) urgencyScore = 1;
          else if (daysUntilEnd <= 2) urgencyScore = 2 + daysUntilEnd;
          else urgencyScore = 10 + daysUntilEnd;
        }

        return {
          booking,
          status,
          urgencyScore,
        };
      })
      .filter(
        (candidate): candidate is InspectionCandidate => candidate !== null
      )
      .sort((a, b) => a.urgencyScore - b.urgencyScore);

    return bookingsNeedingInspection[0]?.booking || null;
  }, [renterBookings, inspectionStatuses, isMobile]);

  // Get inspection status for urgent booking
  const urgentBookingStatus = urgentInspectionBooking 
    ? inspectionStatuses.get(urgentInspectionBooking.id)
    : null;

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
    if (activeRentalsError) {
      toast({
        variant: "destructive",
        title: "Failed to load active rentals",
        description: activeRentalsError,
      });
    }
  }, [renterError, activeRentalsError, toast]);

  const progress = profile ? getVerificationProgress(profile) : 0;

  // Render saved equipment tab
  if (activeTab === "saved") {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-in fade-in duration-500">
          <SavedEquipmentTab />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Add bottom padding on mobile when CTA is visible */}
      <div className={`space-y-6 animate-in fade-in duration-500 ${isMobile && urgentInspectionBooking ? "pb-24" : ""}`}>
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

        {/* Active Rentals Section */}
        {!activeRentalsLoading && activeRentals.length > 0 && (
          <div className="space-y-4 animate-in slide-in-from-top-4 duration-500 delay-175">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <Package className="h-6 w-6 text-emerald-500" />
                  {t("renter.active_rentals.title")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("renter.active_rentals.description")}
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeRentals.map((rental, index) => (
                <div
                  key={rental.id}
                  className="animate-in slide-in-from-bottom-4 duration-500"
                  style={{ animationDelay: `${175 + index * 50}ms` }}
                >
                  <ActiveRentalCard booking={rental} />
                </div>
              ))}
            </div>
          </div>
        )}

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

      </div>

      {/* Mobile Inspection CTA - Sticky bottom bar */}
      {isMobile && urgentInspectionBooking && (
        <MobileInspectionCTA
          bookingId={urgentInspectionBooking.id}
          equipmentTitle={urgentInspectionBooking.equipment.title}
          equipmentLocation={urgentInspectionBooking.equipment.location}
          startDate={new Date(urgentInspectionBooking.start_date)}
          endDate={new Date(urgentInspectionBooking.end_date)}
          hasPickupInspection={urgentBookingStatus?.hasPickup || false}
          hasReturnInspection={urgentBookingStatus?.hasReturn || false}
          isOwner={false}
        />
      )}
    </DashboardLayout>
  );
};

export default RenterDashboard;
