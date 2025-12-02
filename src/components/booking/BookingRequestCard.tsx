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
  ChevronDown,
  ChevronUp,
  Package,
  MapPin,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import MessagingInterface from "../messaging/MessagingInterface";
import PaymentForm from "../payment/PaymentForm";
import RenterScreening from "../verification/RenterScreening";
import { cn } from "@/lib/utils";
import { format, differenceInDays, isPast, isFuture } from "date-fns";

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
  const [isExpanded, setIsExpanded] = useState(false);

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

  // Get equipment image
  const equipmentImage =
    bookingRequest.equipment.photos && bookingRequest.equipment.photos.length > 0
      ? bookingRequest.equipment.photos.find((p) => p.is_primary)?.photo_url ||
        bookingRequest.equipment.photos[0]?.photo_url
      : null;

  // Calculate booking timeline
  const startDate = new Date(bookingRequest.start_date);
  const endDate = new Date(bookingRequest.end_date);
  const today = new Date();
  const isActive = isPast(startDate) && isFuture(endDate);
  const daysUntilStart = differenceInDays(startDate, today);
  const daysUntilEnd = differenceInDays(endDate, today);
  const totalDays = differenceInDays(endDate, startDate) + 1;

  // Progress indicator for active bookings
  const getProgressPercentage = () => {
    if (!isActive || totalDays <= 0) return 0;
    const elapsed = Math.max(differenceInDays(today, startDate), 0);
    return Math.min((elapsed / totalDays) * 100, 100);
  };

  // Status timeline steps
  const getStatusSteps = () => {
    const steps = [
      { label: "Requested", completed: true },
      {
        label: "Payment",
        completed: hasPayment || bookingRequest.status !== "pending",
      },
      {
        label: "Approved",
        completed: bookingRequest.status === "approved" || bookingRequest.status === "completed",
      },
      {
        label: "Active",
        completed: isActive || isPast(endDate),
      },
    ];
    return steps;
  };

  const statusSteps = getStatusSteps();

  return (
    <Card className="w-full overflow-hidden hover:shadow-lg transition-shadow !p-0">
      <div className="flex flex-col md:flex-row">
        {/* Equipment Image */}
        {equipmentImage && (
          <div className="w-full md:w-48 aspect-[4/3] md:aspect-auto md:min-h-[200px] flex-shrink-0 relative overflow-hidden bg-muted">
            <img
              src={equipmentImage}
              alt={bookingRequest.equipment.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
            {bookingRequest.equipment.category && (
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className="text-xs">
                  {bookingRequest.equipment.category.name}
                </Badge>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 py-4">
          <CardHeader className="pb-3 pt-0">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg md:text-xl mb-1 line-clamp-1">
                  {bookingRequest.equipment.title}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 flex-wrap">
                  {bookingRequest.equipment.location && (
                    <span className="flex items-center gap-1 text-xs">
                      <MapPin className="h-3 w-3" />
                      {bookingRequest.equipment.location}
                    </span>
                  )}
                </CardDescription>
              </div>
              <Badge
                className={cn(
                  "shrink-0",
                  bookingRequest.status === "pending" && !hasPayment
                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    : bookingRequest.status === "approved" && hasPayment
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : getBookingStatusColor(bookingRequest.status || "pending")
                )}
              >
                {bookingRequest.status === "pending" && !hasPayment
                  ? "Awaiting Payment"
                  : bookingRequest.status === "approved" && hasPayment
                  ? "Booking Confirmed"
                  : getBookingStatusText(bookingRequest.status || "pending")}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pb-2">
            {/* Status Timeline */}
            {bookingRequest.status !== "cancelled" && (
              <div className="flex items-start">
                {statusSteps.map((step, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    {/* Circle and connecting lines row */}
                    <div className="flex items-center w-full">
                      {/* Line before circle (except first step) */}
                      <div
                        className={cn(
                          "flex-1 h-0.5 transition-colors",
                          index === 0 ? "bg-transparent" : step.completed ? "bg-primary" : "bg-muted"
                        )}
                      />
                      {/* Circle */}
                      <div
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-colors shrink-0",
                          step.completed
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted text-muted-foreground border-muted-foreground/20"
                        )}
                      >
                        {step.completed ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      {/* Line after circle (except last step) */}
                      <div
                        className={cn(
                          "flex-1 h-0.5 transition-colors",
                          index === statusSteps.length - 1
                            ? "bg-transparent"
                            : step.completed
                            ? "bg-primary"
                            : "bg-muted"
                        )}
                      />
                    </div>
                    {/* Label */}
                    <span
                      className={cn(
                        "text-xs mt-1.5 text-center px-1",
                        step.completed ? "text-foreground font-medium" : "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Prominent Date Display */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">Rental Period</span>
                </div>
                {isActive && (
                  <Badge variant="default" className="text-xs">
                    Active Now
                  </Badge>
                )}
                {isFuture(startDate) && daysUntilStart <= 7 && (
                  <Badge variant="secondary" className="text-xs">
                    {daysUntilStart === 0
                      ? "Starts Today"
                      : daysUntilStart === 1
                      ? "Starts Tomorrow"
                      : `Starts in ${daysUntilStart} days`}
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">
                    {format(startDate, "MMM d, yyyy")} - {format(endDate, "MMM d, yyyy")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBookingDuration(bookingRequest.start_date, bookingRequest.end_date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-primary">
                    ${bookingRequest.total_amount.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ${bookingRequest.equipment.daily_rate}/day
                  </p>
                </div>
              </div>
              {isActive && (
                <div className="pt-2">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${getProgressPercentage()}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round(getProgressPercentage())}% complete
                  </p>
                </div>
              )}
            </div>
            {/* Collapsible Details Section */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full justify-between text-xs text-muted-foreground"
            >
              <span>{isExpanded ? "Hide" : "Show"} Details</span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>

            {isExpanded && (
              <div className="space-y-3 pt-2 border-t">
                {/* User Information */}
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>
                    {isOwner ? "Renter" : "Owner"}:{" "}
                    <span className="font-medium text-foreground">
                      {isOwner ? bookingRequest.renter.email : bookingRequest.owner.email}
                    </span>
                  </span>
                </div>

                {/* Message */}
                {bookingRequest.message && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground mb-1">Message:</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                          {bookingRequest.message}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="text-xs text-muted-foreground pt-2 border-t space-y-1">
                  {bookingRequest.created_at && (
                    <div>
                      Requested:{" "}
                      {(() => {
                        const date = new Date(bookingRequest.created_at);
                        return !isNaN(date.getTime()) ? format(date, "MMM d, yyyy 'at' h:mm a") : "Invalid date";
                      })()}
                    </div>
                  )}
                  {bookingRequest.updated_at && bookingRequest.updated_at !== bookingRequest.created_at && (
                    <div>
                      Updated:{" "}
                      {(() => {
                        const date = new Date(bookingRequest.updated_at);
                        return !isNaN(date.getTime()) ? format(date, "MMM d, yyyy 'at' h:mm a") : "Invalid date";
                      })()}
                    </div>
                  )}
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
              <div className="flex flex-wrap gap-2 pt-4 border-t">
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

                {/* Message Button */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void handleOpenMessaging();
                  }}
                  disabled={isLoadingConversation}
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  {isLoadingConversation ? "Loading..." : "Message"}
                </Button>

                {canCancel && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      void handleStatusUpdate("cancelled");
                    }}
                    disabled={isUpdating}
                    className="ml-auto"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    {isUpdating ? "Cancelling..." : "Cancel"}
                  </Button>
                )}
              </div>
            )}

          </CardContent>
        </div>
      </div>

      {/* Messaging Modal */}
      {showMessaging && conversationId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-xl border">
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6 border shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Complete Payment</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPayment(false)}
                aria-label="Close payment modal"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 border shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                Renter Verification Profile
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRenterScreening(false)}
                aria-label="Close renter screening modal"
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
