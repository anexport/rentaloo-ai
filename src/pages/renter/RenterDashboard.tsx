import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useCallback } from "react";
import { Calendar, Search, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useSearchParams } from "react-router-dom";
import { useBookingRequests } from "@/hooks/useBookingRequests";
import { useMessaging } from "@/hooks/useMessaging";
import { usePayment } from "@/hooks/usePayment";
import DashboardLayout from "@/components/layout/DashboardLayout";
import TripCard from "@/components/renter/TripCard";
import SmartNotifications from "@/components/renter/SmartNotifications";
import DiscoverSection from "@/components/renter/DiscoverSection";
import MessagingInterface from "@/components/messaging/MessagingInterface";
import { useToast } from "@/hooks/useToast";
import { supabase } from "@/lib/supabase";
import { formatDateForStorage } from "@/lib/utils";
import { parseISO, isBefore, isAfter, startOfDay } from "date-fns";

const RenterDashboard = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const [hasPaymentMap, setHasPaymentMap] = useState<Record<string, boolean>>({});
  const [showMessaging, setShowMessaging] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({});

  const { getOrCreateConversation } = useMessaging();
  const { processRefund } = usePayment();
  const { toast } = useToast();

  // Fetch renter bookings
  const {
    bookingRequests: renterBookings,
    loading: renterLoading,
    error: renterError,
    fetchBookingRequests: fetchRenterBookings,
  } = useBookingRequests("renter");

  // Memoize the status change callback
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

  // Check payment status for all bookings
  useEffect(() => {
    const checkPayments = async () => {
      if (renterBookings.length === 0) return;

      const bookingIds = renterBookings.map((b) => b.id);
      const { data: payments } = await supabase
        .from("payments")
        .select("booking_request_id")
        .in("booking_request_id", bookingIds)
        .eq("payment_status", "succeeded");

      const paymentMap: Record<string, boolean> = {};
      payments?.forEach((p) => {
        paymentMap[p.booking_request_id] = true;
      });
      setHasPaymentMap(paymentMap);
    };

    void checkPayments();
  }, [renterBookings]);

  // Handle opening messaging for a booking
  const handleOpenMessaging = async (booking: typeof renterBookings[0]) => {
    if (!user) return;

    setIsLoadingConversation(true);

    try {
      const conversation = await getOrCreateConversation(
        [booking.owner.id],
        booking.id
      );

      if (conversation) {
        setConversationId(conversation.id);
        setShowMessaging(true);
      } else {
        toast({
          variant: "destructive",
          title: "Failed to start conversation",
          description: "Please try again.",
        });
      }
    } catch (error) {
      console.error("Error opening messaging:", error);
      toast({
        variant: "destructive",
        title: "Failed to start conversation",
        description: "Please try again.",
      });
    } finally {
      setIsLoadingConversation(false);
    }
  };

  // Handle cancelling a booking
  const handleCancelBooking = async (booking: typeof renterBookings[0]) => {
    if (!user) return;

    const confirmed = window.confirm(
      "Are you sure you want to cancel this booking? You will receive a full refund."
    );
    if (!confirmed) return;

    setIsUpdating({ ...isUpdating, [booking.id]: true });

    try {
      const hasPayment = hasPaymentMap[booking.id];

      // If there's a successful payment, process refund
      if (hasPayment) {
        const { data: payment } = await supabase
          .from("payments")
          .select("id, stripe_payment_intent_id")
          .eq("booking_request_id", booking.id)
          .eq("payment_status", "succeeded")
          .single();

        if (payment) {
          const refundSuccess = await processRefund({
            paymentId: payment.id,
            reason: "Booking cancelled by renter",
          });

          if (!refundSuccess) {
            throw new Error(
              "Refund processing failed. Please contact support to cancel this booking."
            );
          }
        }
      }

      // Update booking status to cancelled
      const { error } = await supabase
        .from("booking_requests")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id);

      if (error) throw error;

      // Send cancellation message
      try {
        const conversation = await getOrCreateConversation(
          [booking.owner.id],
          booking.id
        );

        if (conversation) {
          await supabase.from("messages").insert({
            conversation_id: conversation.id,
            sender_id: user.id,
            content: `Booking has been cancelled. ${
              hasPayment ? "A full refund will be processed." : ""
            }`,
            message_type: "booking_cancelled",
          });
        }
      } catch (msgError) {
        console.error("Error sending cancellation message:", msgError);
      }

      toast({
        title: "Booking cancelled",
        description: hasPayment
          ? "Your refund will be processed within 5-10 business days."
          : "Your booking request has been cancelled.",
      });

      await handleBookingStatusChange();
    } catch (error) {
      console.error("Error cancelling booking:", error);
      toast({
        variant: "destructive",
        title: "Failed to cancel booking",
        description: "Please try again.",
      });
    } finally {
      setIsUpdating({ ...isUpdating, [booking.id]: false });
    }
  };

  // Separate bookings by status
  const today = startOfDay(new Date());
  const upcomingBookings = renterBookings.filter((b) => {
    const startDate = parseISO(b.start_date);
    return (
      ["approved", "pending"].includes(b.status || "") &&
      (isAfter(startDate, today) || startDate.getTime() === today.getTime())
    );
  });
  const pastBookings = renterBookings.filter((b) => {
    const endDate = parseISO(b.end_date);
    return (
      b.status === "completed" ||
      b.status === "cancelled" ||
      isBefore(endDate, today)
    );
  });

  // Get user's first name from email
  const firstName = user?.email?.split("@")[0] || "there";

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Hero Section - Personalized */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {firstName}
          </h1>

          {upcomingBookings.length > 0 ? (
            <div className="flex items-center gap-3">
              <p className="text-lg text-muted-foreground">
                You have {upcomingBookings.length} upcoming{" "}
                {upcomingBookings.length === 1 ? "rental" : "rentals"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <p className="text-lg text-muted-foreground">
                Where to next? Find gear for your adventure
              </p>
              <Link to="/equipment">
                <Button size="lg" className="gap-2">
                  <Search className="h-4 w-4" />
                  Browse equipment
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Smart Notifications */}
        <SmartNotifications />

        {/* Upcoming Trips */}
        {upcomingBookings.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight">
                {activeTab === "bookings" ? "All bookings" : "Upcoming trips"}
              </h2>
              {upcomingBookings.length > 3 && activeTab !== "bookings" && (
                <Link to="/renter/dashboard?tab=bookings">
                  <Button variant="outline" size="sm">
                    View all
                  </Button>
                </Link>
              )}
            </div>

            <div className="grid gap-4">
              {(activeTab === "bookings"
                ? upcomingBookings
                : upcomingBookings.slice(0, 3)
              ).map((booking) => (
                <TripCard
                  key={booking.id}
                  booking={booking}
                  hasPayment={hasPaymentMap[booking.id]}
                  isUpdating={isUpdating[booking.id]}
                  onMessage={() => handleOpenMessaging(booking)}
                  onCancel={() => handleCancelBooking(booking)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {renterLoading && (
          <div className="space-y-4">
            <div className="text-lg text-muted-foreground">
              Loading your bookings...
            </div>
          </div>
        )}

        {/* Empty State */}
        {!renterLoading && renterBookings.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="text-center py-16">
              <div className="flex flex-col items-center max-w-md mx-auto">
                <div className="rounded-full bg-primary/10 p-6 mb-6">
                  <Calendar className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold mb-2">
                  No trips yet
                </h3>
                <p className="text-muted-foreground mb-8">
                  Time to dust off your bucket list and start planning your next adventure
                </p>
                <Link to="/equipment">
                  <Button size="lg" className="gap-2">
                    <Search className="h-5 w-5" />
                    Start exploring
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Discover Section */}
        <DiscoverSection />

        {/* Past Trips (if viewing all bookings) */}
        {activeTab === "bookings" && pastBookings.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">Past trips</h2>
            <div className="grid gap-4">
              {pastBookings.map((booking) => (
                <TripCard
                  key={booking.id}
                  booking={booking}
                  hasPayment={hasPaymentMap[booking.id]}
                  onMessage={() => handleOpenMessaging(booking)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Messaging Modal */}
      {showMessaging && conversationId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <MessagingInterface
              initialConversationId={conversationId}
              onClose={() => {
                setShowMessaging(false);
                setConversationId(null);
              }}
            />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default RenterDashboard;
