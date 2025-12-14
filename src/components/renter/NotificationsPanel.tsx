import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X, AlertCircle, Clock, DollarSign } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

interface Notification {
  id: string;
  type: "pending_booking" | "payment";
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
  dismissible: boolean;
}

const NotificationsPanel = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadNotifications = async () => {
      if (!user) return;

      try {
        const newNotifications: Notification[] = [];

        // Run all independent queries in parallel
        const [
          pendingBookingsResult,
          pendingPaymentsResult,
        ] = await Promise.allSettled([
          // Check for pending booking requests
          supabase
            .from("booking_requests")
            .select("*", { count: "exact", head: true })
            .eq("renter_id", user.id)
            .eq("status", "pending"),
          // Check for payment actions required
          supabase
            .from("payments")
            .select("id, payment_status")
            .eq("renter_id", user.id)
            .eq("payment_status", "pending")
            .limit(1),
        ]);

        // Process pending booking requests
        if (pendingBookingsResult.status === "fulfilled") {
          const pendingCount = pendingBookingsResult.value.count ?? 0;
          if (pendingCount > 0) {
            newNotifications.push({
              id: "pending-bookings",
              type: "pending_booking",
              title: `${pendingCount} Pending ${
                pendingCount === 1 ? "Request" : "Requests"
              }`,
              description: `You have ${pendingCount} booking ${
                pendingCount === 1 ? "request" : "requests"
              } awaiting payment.`,
              action: {
                label: "View Bookings",
                href: "/renter/dashboard?tab=bookings",
              },
              dismissible: true,
            });
          }
        } else {
          console.error(
            "Failed to fetch pending bookings:",
            pendingBookingsResult.reason
          );
        }

        // Process pending payments
        if (pendingPaymentsResult.status === "fulfilled") {
          const paymentActions = pendingPaymentsResult.value.data ?? [];
          if (paymentActions.length > 0) {
            newNotifications.push({
              id: "payment-required",
              type: "payment",
              title: "Payment Action Required",
              description: "You have pending payments that need attention.",
              action: {
                label: "View Payments",
                href: "/renter/dashboard?tab=payments",
              },
              dismissible: false,
            });
          }
        } else {
          console.error(
            "Failed to fetch pending payments:",
            pendingPaymentsResult.reason
          );
        }

        // Only update state if component is still mounted
        if (isMounted) {
          setNotifications(newNotifications);
        }
      } catch (error) {
        console.error("Error loading notifications:", error);
        // Optionally set empty notifications on error if mounted
        if (isMounted) {
          setNotifications([]);
        }
      }
    };

    void loadNotifications();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleDismiss = (id: string) => {
    setDismissedIds([...dismissedIds, id]);
  };

  const visibleNotifications = notifications.filter(
    (notification) => !dismissedIds.includes(notification.id)
  );

  if (visibleNotifications.length === 0) {
    return null;
  }

  const getAlertVariant = (type: Notification["type"]) => {
    switch (type) {
      case "payment":
        return "destructive";
      default:
        return "default";
    }
  };

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "pending_booking":
        return <Clock className="h-4 w-4" />;
      case "payment":
        return <DollarSign className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-3">
      {visibleNotifications.map((notification) => (
        <Alert
          key={notification.id}
          variant={getAlertVariant(notification.type)}
          className="border-l-4 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <div className="mt-0.5">{getIcon(notification.type)}</div>
              <div className="flex-1 min-w-0">
                <AlertTitle className="text-base font-semibold">
                  {notification.title}
                </AlertTitle>
                <AlertDescription className="mt-1.5 text-sm">
                  {notification.description}
                </AlertDescription>
                {notification.action && (
                  <div className="mt-3">
                    <Link to={notification.action.href}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="hover:bg-primary/10 hover:text-primary hover:border-primary/50"
                      >
                        {notification.action.label}
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
            {notification.dismissible && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 hover:bg-muted/50"
                onClick={() => handleDismiss(notification.id)}
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Alert>
      ))}
    </div>
  );
};

export default NotificationsPanel;
