import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  MessageSquare,
  X,
  Shield,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useVerification } from "@/hooks/useVerification";
import { getVerificationProgress } from "@/lib/verification";
import { supabase } from "@/lib/supabase";
import { formatDateForStorage } from "@/lib/utils";

interface Notification {
  id: string;
  type: "critical" | "info" | "success" | "warning";
  icon: React.ElementType;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
  dismissible: boolean;
}

const SmartNotifications = () => {
  const { user } = useAuth();
  const { profile } = useVerification();
  const verificationProgress = profile ? getVerificationProgress(profile) : 0;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadNotifications = async () => {
      if (!user) return;

      try {
        const newNotifications: Notification[] = [];

        // Run all queries in parallel
        const [
          pendingPaymentsResult,
          upcomingBookingsResult,
          unreadMessagesResult,
        ] = await Promise.allSettled([
          // Critical: Pending payments
          supabase
            .from("payments")
            .select("id")
            .eq("renter_id", user.id)
            .eq("payment_status", "pending")
            .limit(1),
          // Info: Upcoming approved bookings
          supabase
            .from("booking_requests")
            .select("id, start_date, equipment(title)")
            .eq("renter_id", user.id)
            .eq("status", "approved")
            .gte("start_date", formatDateForStorage(new Date()))
            .order("start_date", { ascending: true })
            .limit(1),
          // Info: Unread messages
          supabase.rpc("get_unread_messages_count"),
        ]);

        // Critical: Payment required
        if (pendingPaymentsResult.status === "fulfilled") {
          const pendingPayments = pendingPaymentsResult.value.data ?? [];
          if (pendingPayments.length > 0) {
            newNotifications.push({
              id: "payment-required",
              type: "critical",
              icon: DollarSign,
              title: "Payment required",
              description: "Complete your payment to confirm your booking",
              action: {
                label: "Pay now",
                href: "/renter/dashboard?tab=bookings",
              },
              dismissible: false,
            });
          }
        }

        // Warning: Low verification (only if 0% and no verifications at all)
        const hasAnyVerification =
          profile &&
          (profile.identityVerified ||
            profile.phoneVerified ||
            profile.emailVerified ||
            profile.addressVerified);

        if (verificationProgress === 0 && !hasAnyVerification) {
          newNotifications.push({
            id: "verification-needed",
            type: "warning",
            icon: Shield,
            title: "Verify your account",
            description:
              "Complete verification to build trust and increase booking approvals",
            action: {
              label: "Get verified",
              href: "/verification",
            },
            dismissible: true,
          });
        }

        // Info: Upcoming trip
        if (upcomingBookingsResult.status === "fulfilled") {
          const upcomingBookings = upcomingBookingsResult.value.data ?? [];
          if (upcomingBookings.length > 0) {
            const booking = upcomingBookings[0];
            const equipmentTitle =
              (booking.equipment as { title: string })?.title || "equipment";
            newNotifications.push({
              id: "upcoming-trip",
              type: "success",
              icon: CheckCircle,
              title: "Your next rental is coming up",
              description: `${equipmentTitle} on ${new Date(
                booking.start_date
              ).toLocaleDateString()}`,
              action: {
                label: "View details",
                href: "/renter/dashboard?tab=bookings",
              },
              dismissible: true,
            });
          }
        }

        // Info: Unread messages (only if > 0)
        if (unreadMessagesResult.status === "fulfilled") {
          const unreadCount = unreadMessagesResult.value.data ?? 0;
          if (unreadCount > 0) {
            newNotifications.push({
              id: "unread-messages",
              type: "info",
              icon: MessageSquare,
              title: `${unreadCount} unread ${
                unreadCount === 1 ? "message" : "messages"
              }`,
              description: "You have new messages from equipment owners",
              action: {
                label: "View messages",
                href: "/messages",
              },
              dismissible: true,
            });
          }
        }

        if (isMounted) {
          setNotifications(newNotifications);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading notifications:", error);
        if (isMounted) {
          setNotifications([]);
          setLoading(false);
        }
      }
    };

    void loadNotifications();

    return () => {
      isMounted = false;
    };
  }, [user, verificationProgress, profile]);

  const handleDismiss = (id: string) => {
    setDismissedIds([...dismissedIds, id]);
  };

  const visibleNotifications = notifications.filter(
    (notification) => !dismissedIds.includes(notification.id)
  );

  if (loading || visibleNotifications.length === 0) {
    return null;
  }

  const getAlertVariant = (type: Notification["type"]) => {
    if (type === "critical") return "destructive";
    return "default";
  };

  const getAlertStyles = (type: Notification["type"]) => {
    switch (type) {
      case "critical":
        return "border-l-4 border-l-destructive";
      case "warning":
        return "border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950";
      case "success":
        return "border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950";
      case "info":
        return "border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950";
      default:
        return "border-l-4";
    }
  };

  return (
    <div className="space-y-3">
      {visibleNotifications.map((notification) => {
        const Icon = notification.icon;
        return (
          <Alert
            key={notification.id}
            variant={getAlertVariant(notification.type)}
            className={`${getAlertStyles(notification.type)} shadow-sm`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold mb-1">{notification.title}</div>
                  <AlertDescription className="text-sm mb-3">
                    {notification.description}
                  </AlertDescription>
                  {notification.action && (
                    <Link to={notification.action.href}>
                      <Button
                        size="sm"
                        variant={
                          notification.type === "critical" ? "default" : "outline"
                        }
                        className={
                          notification.type === "critical"
                            ? "shadow-sm"
                            : "hover:bg-primary/10 hover:text-primary hover:border-primary/50"
                        }
                      >
                        {notification.action.label}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
              {notification.dismissible && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0 hover:bg-muted/50"
                  onClick={() => handleDismiss(notification.id)}
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </Alert>
        );
      })}
    </div>
  );
};

export default SmartNotifications;
