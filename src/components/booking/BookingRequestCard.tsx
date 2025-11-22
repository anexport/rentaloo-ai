import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useMessaging } from "@/hooks/useMessaging";
import { usePayment } from "@/hooks/usePayment";
import type { BookingRequestWithDetails } from "../../types/booking";
import {
  formatBookingDate,
  formatBookingDuration,
  getBookingStatusColor,
  getBookingStatusText,
} from "../../lib/booking";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Calendar,
  User,
  DollarSign,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  Shield,
  ClipboardCheck,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import MessagingInterface from "../messaging/MessagingInterface";
import PaymentForm from "../payment/PaymentForm";
import RenterScreening from "../verification/RenterScreening";

interface BookingRequestCardProps {
  bookingRequest: BookingRequestWithDetails;
  onStatusChange?: () => void;
  showActions?: boolean;
}

const BookingRequestCard = ({
  bookingRequest,
  onStatusChange,
  showActions = true,
}: BookingRequestCardProps) => {
  const { user } = useAuth();
  const { getOrCreateConversation } = useMessaging();
  const { processRefund } = usePayment();
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showMessaging, setShowMessaging] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [hasPayment, setHasPayment] = useState(false);
  const [showRenterScreening, setShowRenterScreening] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [pickupInspectionId, setPickupInspectionId] = useState<string | null>(null);
  const [returnInspectionId, setReturnInspectionId] = useState<string | null>(null);

  // Check if inspections exist for this booking
  useEffect(() => {
    const checkInspections = async () => {
      try {
        // Check for pickup inspection
        const { data: pickupData, error: pickupError } = await supabase
          .from("equipment_inspections")
          .select("id")
          .eq("booking_id", bookingRequest.id)
          .eq("inspection_type", "pickup")
          .maybeSingle();

        if (pickupError) {
          console.error("Error checking pickup inspection:", pickupError);
        } else {
          setPickupInspectionId(pickupData?.id || null);
        }

        // Check for return inspection
        const { data: returnData, error: returnError } = await supabase
          .from("equipment_inspections")
          .select("id")
          .eq("booking_id", bookingRequest.id)
          .eq("inspection_type", "return")
          .maybeSingle();

        if (returnError) {
          console.error("Error checking return inspection:", returnError);
        } else {
          setReturnInspectionId(returnData?.id || null);
        }
      } catch (error) {
        console.error("Error checking inspection status:", error);
      }
    };

    void checkInspections();

    // Subscribe to real-time inspection updates
    const inspectionChannel = supabase
      .channel(`inspections-${bookingRequest.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "equipment_inspections",
          filter: `booking_id=eq.${bookingRequest.id}`,
        },
        (payload) => {
          // Update inspection status when new inspection is added
          const newInspection = payload.new as { id: string; inspection_type: string };
          if (newInspection.inspection_type === "pickup") {
            setPickupInspectionId(newInspection.id);
          } else if (newInspection.inspection_type === "return") {
            setReturnInspectionId(newInspection.id);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(inspectionChannel);
    };
  }, [bookingRequest.id]);

  // Check if payment exists for this booking and subscribe to real-time updates
  useEffect(() => {
    const checkPayment = async () => {
      try {
        const { data, error } = await supabase
          .from("payments")
          .select("id")
          .eq("booking_request_id", bookingRequest.id)
          .eq("payment_status", "succeeded")
          .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 results

        if (error) {
          console.error("Error checking payment status:", error);
          setHasPayment(false);
          return;
        }

        setHasPayment(!!data);
      } catch (error) {
        console.error("Error checking payment status:", error);
        setHasPayment(false);
      }
    };

    void checkPayment();

    // Subscribe to real-time payment updates
    const paymentChannel = supabase
      .channel(`payment-${bookingRequest.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payments",
          filter: `booking_request_id=eq.${bookingRequest.id}`,
        },
        (payload) => {
          // Update payment status if payment succeeded
          if (
            payload.new &&
            (payload.new as { payment_status: string }).payment_status ===
              "succeeded"
          ) {
            setHasPayment(true);
            onStatusChange?.();
          } else if (
            payload.new &&
            (payload.new as { payment_status: string }).payment_status ===
              "failed"
          ) {
            setHasPayment(false);
          }
        }
      )
      .subscribe();

    // Subscribe to real-time booking request status updates
    const bookingChannel = supabase
      .channel(`booking-${bookingRequest.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "booking_requests",
          filter: `id=eq.${bookingRequest.id}`,
        },
        () => {
          // Refresh booking status when webhook updates it
          onStatusChange?.();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(paymentChannel);
      void supabase.removeChannel(bookingChannel);
    };
  }, [bookingRequest.id, onStatusChange]);

  const handleStatusUpdate = async (newStatus: "cancelled") => {
    if (!user) return;

    const confirmed = window.confirm(
      isOwner
        ? "Are you sure you want to cancel this booking? The renter will receive a full refund."
        : "Are you sure you want to cancel this booking? You will receive a full refund."
    );
    if (!confirmed) return;

    setIsUpdating(true);

    try {
      // If there's a successful payment, process refund
      if (hasPayment) {
        const { data: payment } = await supabase
          .from("payments")
          .select("id, stripe_payment_intent_id")
          .eq("booking_request_id", bookingRequest.id)
          .eq("payment_status", "succeeded")
          .single();

        if (payment) {
          // Call refund function
          const refundSuccess = await processRefund({
            paymentId: payment.id,
            reason: isOwner
              ? "Booking cancelled by owner"
              : "Booking cancelled by renter",
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
        .eq("id", bookingRequest.id);

      if (error) throw error;

      // Send cancellation message
      try {
        const otherUserId = isOwner
          ? bookingRequest.renter_id
          : bookingRequest.owner.id;

        const conversation = await getOrCreateConversation(
          [otherUserId],
          bookingRequest.id
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
        // Don't fail the status update if message fails
      }

      onStatusChange?.();
    } catch (error) {
      console.error("Error cancelling booking:", error);
      alert("Failed to cancel booking. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenMessaging = async () => {
    if (!user) return;

    setIsLoadingConversation(true);

    try {
      // Determine the other participant (owner or renter)
      const otherUserId = isOwner
        ? bookingRequest.renter_id
        : bookingRequest.owner.id;

      // Get or create conversation for this booking
      const conversation = await getOrCreateConversation(
        [otherUserId],
        bookingRequest.id
      );

      if (conversation) {
        setConversationId(conversation.id);
        setShowMessaging(true);
      } else {
        alert("Failed to start conversation. Please try again.");
      }
    } catch (error) {
      console.error("Error opening messaging:", error);
      alert("Failed to start conversation. Please try again.");
    } finally {
      setIsLoadingConversation(false);
    }
  };

  const isOwner = user?.id === bookingRequest.owner.id;
  const isRenter = user?.id === bookingRequest.renter.id;
  const canCancel =
    (isOwner || isRenter) &&
    ["pending", "approved"].includes(bookingRequest.status || "");

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">
              {bookingRequest.equipment.title}
            </CardTitle>
            <CardDescription>
              {bookingRequest.equipment.category.name}
            </CardDescription>
          </div>
          <Badge
            className={
              bookingRequest.status === "pending" && !hasPayment
                ? "bg-yellow-100 text-yellow-800"
                : bookingRequest.status === "approved" && hasPayment
                ? "bg-green-100 text-green-800"
                : getBookingStatusColor(bookingRequest.status || "pending")
            }
          >
            {bookingRequest.status === "pending" && !hasPayment
              ? "Awaiting Payment"
              : bookingRequest.status === "approved" && hasPayment
              ? "Booking Confirmed"
              : getBookingStatusText(bookingRequest.status || "pending")}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Rental Period */}
        <div className="flex items-center space-x-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            {formatBookingDate(bookingRequest.start_date)} -{" "}
            {formatBookingDate(bookingRequest.end_date)}
          </span>
          <span className="text-sm">
            (
            {formatBookingDuration(
              bookingRequest.start_date,
              bookingRequest.end_date
            )}
            )
          </span>
        </div>

        {/* User Information */}
        <div className="flex items-center space-x-2 text-muted-foreground">
          <User className="h-4 w-4" />
          <span>
            {isOwner ? "Renter" : "Owner"}:{" "}
            {isOwner ? bookingRequest.renter.email : bookingRequest.owner.email}
          </span>
        </div>

        {/* Pricing */}
        <div className="flex items-center space-x-2 text-muted-foreground">
          <DollarSign className="h-4 w-4" />
          <span className="font-semibold">
            ${bookingRequest.total_amount.toFixed(2)}
          </span>
          <span className="text-sm text-muted-foreground">
            (${bookingRequest.equipment.daily_rate}/day)
          </span>
        </div>

        {/* Message */}
        {bookingRequest.message && (
          <div className="bg-muted p-3 rounded-lg">
            <div className="flex items-start space-x-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Message:</p>
                <p className="text-sm text-muted-foreground">
                  {bookingRequest.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Status-specific information */}
        {bookingRequest.status === "pending" && !hasPayment && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              {isOwner
                ? "This booking request is awaiting payment from the renter."
                : "Your booking request is awaiting payment. Complete payment to confirm your booking."}
            </AlertDescription>
          </Alert>
        )}

        {bookingRequest.status === "approved" && hasPayment && (
          <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Payment received! Booking is confirmed.
            </AlertDescription>
          </Alert>
        )}

        {/* Inspection Buttons - Show when booking is approved and paid */}
        {bookingRequest.status === "approved" && hasPayment && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={pickupInspectionId ? "secondary" : "outline"}
              onClick={() =>
                pickupInspectionId
                  ? navigate(`/inspection/${bookingRequest.id}/view/pickup`)
                  : navigate(`/inspection/${bookingRequest.id}/pickup`)
              }
            >
              {pickupInspectionId ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                  View Pickup Inspection
                </>
              ) : (
                <>
                  <ClipboardCheck className="h-4 w-4 mr-1" />
                  Pickup Inspection
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant={returnInspectionId ? "secondary" : "outline"}
              onClick={() =>
                returnInspectionId
                  ? navigate(`/inspection/${bookingRequest.id}/view/return`)
                  : navigate(`/inspection/${bookingRequest.id}/return`)
              }
            >
              {returnInspectionId ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                  View Return Inspection
                </>
              ) : (
                <>
                  <ClipboardCheck className="h-4 w-4 mr-1" />
                  Return Inspection
                </>
              )}
            </Button>
            {isOwner && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => navigate(`/claims/file/${bookingRequest.id}`)}
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                File Damage Claim
              </Button>
            )}
          </div>
        )}

        {bookingRequest.status === "cancelled" && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              {isRenter
                ? "You have cancelled this booking request."
                : "This booking request has been cancelled by the renter."}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        {showActions && (
          <div className="flex space-x-2 pt-2">
            {isOwner && bookingRequest.status === "pending" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowRenterScreening(!showRenterScreening)}
              >
                <Shield className="h-4 w-4 mr-1" />
                {showRenterScreening ? "Hide" : "View"} Renter Info
              </Button>
            )}

            {canCancel && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  void handleStatusUpdate("cancelled");
                }}
                disabled={isUpdating}
              >
                <XCircle className="h-4 w-4 mr-1" />
                {isUpdating ? "Cancelling..." : "Cancel Booking"}
              </Button>
            )}

            {/* Message Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void handleOpenMessaging();
              }}
              disabled={isLoadingConversation}
              className="ml-auto"
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              {isLoadingConversation ? "Loading..." : "Message"}
            </Button>
          </div>
        )}

        {/* Timestamps */}
        <div className="text-xs text-muted-foreground pt-2 border-t border-border">
          <div>
            Requested: {formatBookingDate(bookingRequest.created_at || "")}
          </div>
          {bookingRequest.updated_at !== bookingRequest.created_at && (
            <div>
              Updated: {formatBookingDate(bookingRequest.updated_at || "")}
            </div>
          )}
        </div>
      </CardContent>

      {/* Messaging Modal */}
      {showMessaging && conversationId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
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

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6 border border-border shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Complete Payment</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPayment(false)}
              >
                ✕
              </Button>
            </div>
            <PaymentForm
              bookingRequestId={bookingRequest.id}
              ownerId={bookingRequest.owner.id}
              totalAmount={bookingRequest.total_amount}
              onSuccess={() => {
                setShowPayment(false);
                setHasPayment(true);
                onStatusChange?.();
              }}
              onCancel={() => setShowPayment(false)}
            />
          </div>
        </div>
      )}

      {/* Renter Screening Modal */}
      {showRenterScreening && isOwner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 border border-border shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                Renter Verification Profile
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRenterScreening(false)}
              >
                ✕
              </Button>
            </div>
            <RenterScreening renterId={bookingRequest.renter_id} />
          </div>
        </div>
      )}
    </Card>
  );
};

export default BookingRequestCard;
