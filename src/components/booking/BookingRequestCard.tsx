import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
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
} from "lucide-react";
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
  const [isUpdating, setIsUpdating] = useState(false);
  const [showMessaging, setShowMessaging] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [hasPayment, setHasPayment] = useState(false);
  const [showRenterScreening, setShowRenterScreening] = useState(false);

  // Check if payment exists for this booking
  useEffect(() => {
    const checkPayment = async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id")
        .eq("booking_request_id", bookingRequest.id)
        .eq("payment_status", "succeeded")
        .single();

      setHasPayment(!!data && !error);
    };

    checkPayment();
  }, [bookingRequest.id]);

  const handleStatusUpdate = async (
    newStatus: "approved" | "declined" | "cancelled"
  ) => {
    if (!user) return;

    // Confirmation for cancellation
    if (newStatus === "cancelled") {
      const confirmed = window.confirm(
        "Are you sure you want to cancel this booking request? This action cannot be undone."
      );
      if (!confirmed) return;
    }

    setIsUpdating(true);

    try {
      const { error } = await supabase
        .from("booking_requests")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingRequest.id);

      if (error) throw error;

      onStatusChange?.();
    } catch (error) {
      console.error("Error updating booking status:", error);
      alert(`Failed to ${newStatus} booking request. Please try again.`);
    } finally {
      setIsUpdating(false);
    }
  };

  const isOwner = user?.id === bookingRequest.owner.id;
  const isRenter = user?.id === bookingRequest.renter.id;
  const canApprove = isOwner && bookingRequest.status === "pending";
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
            className={getBookingStatusColor(
              bookingRequest.status || "pending"
            )}
          >
            {getBookingStatusText(bookingRequest.status || "pending")}
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
        {bookingRequest.status === "pending" && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              {isOwner
                ? "This booking request is waiting for your approval."
                : "Your booking request is waiting for owner approval."}
            </AlertDescription>
          </Alert>
        )}

        {bookingRequest.status === "approved" && !hasPayment && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              {isOwner
                ? "You have approved this booking request. Waiting for renter payment."
                : "Your booking request has been approved! Payment is required to confirm."}
            </AlertDescription>
          </Alert>
        )}

        {bookingRequest.status === "approved" && hasPayment && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Payment received! Rental is confirmed.
            </AlertDescription>
          </Alert>
        )}

        {bookingRequest.status === "declined" && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              {isOwner
                ? "You have declined this booking request."
                : "Your booking request has been declined."}
            </AlertDescription>
          </Alert>
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

            {canApprove && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleStatusUpdate("approved")}
                  disabled={isUpdating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  {isUpdating ? "Approving..." : "Approve"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleStatusUpdate("declined")}
                  disabled={isUpdating}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  {isUpdating ? "Declining..." : "Decline"}
                </Button>
              </>
            )}

            {canCancel && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleStatusUpdate("cancelled")}
                disabled={isUpdating}
              >
                <XCircle className="h-4 w-4 mr-1" />
                {isUpdating ? "Cancelling..." : "Cancel Booking"}
              </Button>
            )}

            {/* Payment Button - Only for renters with approved bookings */}
            {isRenter &&
              bookingRequest.status === "approved" &&
              !hasPayment && (
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => setShowPayment(true)}
                >
                  <CreditCard className="h-4 w-4 mr-1" />
                  Pay Now
                </Button>
              )}

            {/* Message Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowMessaging(true)}
              className="ml-auto"
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              Message
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
      {showMessaging && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <MessagingInterface onClose={() => setShowMessaging(false)} />
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6">
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
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
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
            <RenterScreening
              renterId={bookingRequest.renter_id}
              renterName={bookingRequest.renter.email}
              renterEmail={bookingRequest.renter.email}
            />
          </div>
        </div>
      )}
    </Card>
  );
};

export default BookingRequestCard;
