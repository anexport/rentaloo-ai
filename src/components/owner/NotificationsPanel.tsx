import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Clock, DollarSign, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

type NotificationType = "pending_booking" | "payout";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
  dismissible: boolean;
}

const OwnerNotificationsPanel = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadNotifications = async () => {
      if (!user) {
        if (isMounted) setNotifications([]);
        return;
      }

      try {
        const newNotifications: Notification[] = [];

        const [pendingBookingsResult, pendingPayoutsResult] =
          await Promise.allSettled([
            supabase
              .from("booking_requests")
              .select("id, equipment:equipment_id!inner(owner_id)", {
                count: "exact",
                head: true,
              })
              .eq("equipment.owner_id", user.id)
              .eq("status", "pending"),
            supabase
              .from("payments")
              .select("id", { count: "exact", head: true })
              .eq("owner_id", user.id)
              .or("payout_status.eq.pending,payout_status.is.null"),
          ]);

        if (pendingBookingsResult.status === "fulfilled") {
          if (pendingBookingsResult.value.error) {
            console.error(
              "Failed to fetch pending bookings:",
              pendingBookingsResult.value.error
            );
          } else {
            const pendingCount = pendingBookingsResult.value.count ?? 0;
            if (pendingCount > 0) {
              newNotifications.push({
                id: "pending-bookings",
                type: "pending_booking",
                title: `${pendingCount} Booking ${
                  pendingCount === 1 ? "Request" : "Requests"
                } to Review`,
                description: `You have ${pendingCount} booking ${
                  pendingCount === 1 ? "request" : "requests"
                } awaiting your approval.`,
                action: {
                  label: "Review Bookings",
                  href: "/owner/dashboard?tab=bookings",
                },
                dismissible: true,
              });
            }
          }
        } else {
          console.error(
            "Failed to fetch pending bookings:",
            pendingBookingsResult.reason
          );
        }

        if (pendingPayoutsResult.status === "fulfilled") {
          if (pendingPayoutsResult.value.error) {
            console.error(
              "Failed to fetch pending payouts:",
              pendingPayoutsResult.value.error
            );
          } else {
            const pendingCount = pendingPayoutsResult.value.count ?? 0;
            if (pendingCount > 0) {
              newNotifications.push({
                id: "pending-payouts",
                type: "payout",
                title: `${pendingCount} Pending ${
                  pendingCount === 1 ? "Payout" : "Payouts"
                }`,
                description:
                  "You have payouts pending processing. Check your payouts for details.",
                action: {
                  label: "View Payouts",
                  href: "/owner/dashboard?tab=payments",
                },
                dismissible: false,
              });
            }
          }
        } else {
          console.error(
            "Failed to fetch pending payouts:",
            pendingPayoutsResult.reason
          );
        }

        if (isMounted) {
          setNotifications(newNotifications);
        }
      } catch (error) {
        console.error("Error loading owner notifications:", error);
        if (isMounted) {
          setNotifications([]);
        }
      }
    };

    void loadNotifications();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => [...prev, id]);
  };

  const visibleNotifications = notifications.filter(
    (notification) => !dismissedIds.includes(notification.id)
  );

  if (visibleNotifications.length === 0) {
    return null;
  }

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "pending_booking":
        return <Clock className="h-4 w-4" />;
      case "payout":
        return <DollarSign className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-3">
      {visibleNotifications.map((notification) => (
        <Alert key={notification.id} className="border-l-4 shadow-sm">
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
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="hover:bg-primary/10 hover:text-primary hover:border-primary/50"
                    >
                      <Link to={notification.action.href}>
                        {notification.action.label}
                      </Link>
                    </Button>
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

export default OwnerNotificationsPanel;

