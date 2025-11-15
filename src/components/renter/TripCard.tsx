import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  DollarSign,
  MapPin,
  MessageSquare,
  XCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BookingRequestWithDetails } from "@/types/booking";
import {
  formatBookingDate,
  getBookingStatusColor,
  getBookingStatusText,
} from "@/lib/booking";
import { format, parseISO, differenceInDays } from "date-fns";

interface TripCardProps {
  booking: BookingRequestWithDetails;
  onMessage?: () => void;
  onCancel?: () => void;
  hasPayment?: boolean;
  isUpdating?: boolean;
}

const TripCard = ({
  booking,
  onMessage,
  onCancel,
  hasPayment = false,
  isUpdating = false,
}: TripCardProps) => {
  const [imageError, setImageError] = useState(false);

  // Calculate days
  const startDate = parseISO(booking.start_date);
  const endDate = parseISO(booking.end_date);
  const days = differenceInDays(endDate, startDate) + 1;

  // Get primary photo or fallback
  const primaryPhoto = booking.equipment.photos?.[0]?.photo_url;
  const hasPhoto = primaryPhoto && !imageError;

  // Determine status display
  const getStatusInfo = () => {
    if (booking.status === "pending" && !hasPayment) {
      return {
        icon: Clock,
        text: "Awaiting Payment",
        color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      };
    }
    if (booking.status === "approved" && hasPayment) {
      return {
        icon: CheckCircle,
        text: "Confirmed",
        color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      };
    }
    if (booking.status === "cancelled") {
      return {
        icon: XCircle,
        text: "Cancelled",
        color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
      };
    }
    if (booking.status === "completed") {
      return {
        icon: CheckCircle,
        text: "Completed",
        color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      };
    }
    return {
      icon: Clock,
      text: getBookingStatusText(booking.status || "pending"),
      color: getBookingStatusColor(booking.status || "pending"),
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;
  const canCancel = ["pending", "approved"].includes(booking.status || "");

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 group">
      <div className="flex flex-col sm:flex-row">
        {/* Equipment Photo */}
        <div className="relative w-full sm:w-48 h-48 sm:h-auto flex-shrink-0 bg-muted">
          {hasPhoto ? (
            <img
              src={primaryPhoto}
              alt={booking.equipment.title}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center p-4">
                <div className="w-16 h-16 rounded-full bg-muted-foreground/10 mx-auto mb-2 flex items-center justify-center">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">No photo</p>
              </div>
            </div>
          )}

          {/* Status Badge Overlay */}
          <div className="absolute top-3 left-3">
            <Badge className={`${statusInfo.color} shadow-sm`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusInfo.text}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-5">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="mb-3">
              <div className="flex items-start justify-between gap-3 mb-1">
                <h3 className="text-lg font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                  {booking.equipment.title}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {booking.equipment.category?.name}
              </p>
            </div>

            {/* Date & Location */}
            <div className="space-y-2 mb-4 flex-1">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-foreground font-medium">
                  {format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}
                </span>
                <span className="text-muted-foreground">
                  · {days} {days === 1 ? "day" : "days"}
                </span>
              </div>

              {booking.equipment.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="line-clamp-1">{booking.equipment.location}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-semibold text-foreground">
                  ${booking.total_amount.toFixed(2)}
                </span>
                <span className="text-muted-foreground text-xs">
                  (${booking.equipment.daily_rate}/day)
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
              <Button
                size="sm"
                variant="outline"
                onClick={onMessage}
                className="hover:bg-primary/10 hover:text-primary hover:border-primary/50"
              >
                <MessageSquare className="h-4 w-4 mr-1.5" />
                Message
              </Button>

              <Link to={`/equipment/${booking.equipment.id}`}>
                <Button size="sm" variant="ghost">
                  View Details
                </Button>
              </Link>

              {canCancel && onCancel && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onCancel}
                  disabled={isUpdating}
                  className="ml-auto text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="h-4 w-4 mr-1.5" />
                  {isUpdating ? "Cancelling..." : "Cancel"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TripCard;
