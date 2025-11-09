import { Link } from "react-router-dom";
import { Search, MessageSquare, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { supabase } from "@/lib/supabase";
import { formatDateForStorage } from "@/lib/utils";

const QuickActions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [upcomingBookings, setUpcomingBookings] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      if (!user) return;

      // Prepare both fetch promises
      const messagesPromise = supabase.rpc("get_unread_messages_count");

      const today = formatDateForStorage(new Date());
      const bookingsPromise = supabase
        .from("booking_requests")
        .select("*", { count: "exact", head: true })
        .eq("renter_id", user.id)
        .eq("status", "approved")
        .gte("start_date", today);

      // Run both fetches in parallel
      const results = await Promise.allSettled([
        messagesPromise,
        bookingsPromise,
      ]);

      // Handle messages result independently
      const messagesResult = results[0];
      if (messagesResult.status === "fulfilled") {
        const { data: messagesCount, error: messagesError } =
          messagesResult.value;
        if (messagesError) {
          console.error("Failed to fetch messages count:", messagesError);
          toast({
            title: "Failed to load messages count",
            description:
              "Unable to fetch unread messages. Please try again later.",
            variant: "destructive",
          });
        } else {
          setUnreadMessages(messagesCount || 0);
        }
      } else {
        console.error("Messages fetch rejected:", messagesResult.reason);
        toast({
          title: "Failed to load messages count",
          description:
            "Unable to fetch unread messages. Please try again later.",
          variant: "destructive",
        });
      }

      // Handle bookings result independently
      const bookingsResult = results[1];
      if (bookingsResult.status === "fulfilled") {
        const { count: bookingsCount, error: bookingsError } =
          bookingsResult.value;
        if (bookingsError) {
          console.error("Failed to fetch bookings count:", bookingsError);
          toast({
            title: "Failed to load bookings count",
            description:
              "Unable to fetch upcoming bookings. Please try again later.",
            variant: "destructive",
          });
        } else {
          setUpcomingBookings(bookingsCount || 0);
        }
      } else {
        console.error("Bookings fetch rejected:", bookingsResult.reason);
        toast({
          title: "Failed to load bookings count",
          description:
            "Unable to fetch upcoming bookings. Please try again later.",
          variant: "destructive",
        });
      }
    };

    void fetchCounts();
  }, [user, toast]);

  const actions = [
    {
      title: "Browse Equipment",
      description: "Discover outdoor gear available for rent",
      icon: Search,
      href: "/equipment",
      variant: "default" as const,
      badge: null,
    },
    {
      title: "My Bookings",
      description: "View and manage your rental bookings",
      icon: Calendar,
      href: "/renter/dashboard?tab=bookings",
      variant: "outline" as const,
      badge: upcomingBookings > 0 ? `${upcomingBookings} upcoming` : null,
    },
    {
      title: "Messages",
      description: "Chat with equipment owners",
      icon: MessageSquare,
      href: "/messages",
      variant: "outline" as const,
      badge: unreadMessages > 0 ? `${unreadMessages} unread` : null,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {actions.map((action) => {
        const Icon = action.icon;
        const isPrimary = action.variant === "default";
        return (
          <Card
            key={action.title}
            className={`h-full hover:shadow-lg transition-all duration-200 ${
              isPrimary
                ? "border-primary/40 bg-primary/5"
                : "hover:border-primary/30"
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`rounded-lg p-2.5 ${
                    isPrimary ? "bg-primary/15" : "bg-muted"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${
                      isPrimary ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                </div>
                {action.badge && (
                  <Badge variant="secondary" className="text-xs">
                    {action.badge}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg font-semibold">
                {action.title}
              </CardTitle>
              <CardDescription className="text-sm">
                {action.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                asChild
                variant={action.variant}
                className={`w-full group-hover:translate-x-0.5 transition-transform ${
                  isPrimary ? "shadow-sm" : ""
                }`}
              >
                <Link to={action.href} className="group">
                  {action.variant === "default" ? "Browse Now" : "View"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default QuickActions;
