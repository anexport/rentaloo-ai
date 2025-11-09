import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Search,
  Calendar,
  MessageSquare,
  User,
  Shield,
  Mountain,
  ChevronLeft,
  ChevronRight,
  Package,
  ArrowRight,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import VerificationBadge from "@/components/verification/VerificationBadge";
import { useVerification } from "@/hooks/useVerification";
import { getVerificationProgress } from "@/lib/verification";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
}

const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const location = useLocation();
  const { profile } = useVerification();
  const verificationProgress = profile ? getVerificationProgress(profile) : 0;
  const { user } = useAuth();
  const [hasEquipment, setHasEquipment] = useState(false);
  const [pendingOwnerRequests, setPendingOwnerRequests] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Check if user has equipment listings and pending requests
  useEffect(() => {
    const checkEquipment = async () => {
      if (!user) return;

      try {
        const { count, error: countError } = await supabase
          .from("equipment")
          .select("*", { count: "exact", head: true })
          .eq("owner_id", user.id);

        if (countError) throw countError;

        setHasEquipment((count || 0) > 0);

        // If they have equipment, check for pending requests
        if (count && count > 0) {
          const { data: equipment, error: equipmentError } = await supabase
            .from("equipment")
            .select("id")
            .eq("owner_id", user.id);

          if (equipmentError) throw equipmentError;

          if (equipment && equipment.length > 0) {
            const equipmentIds = equipment.map((eq) => eq.id);

            const { count: pendingCount, error: pendingError } = await supabase
              .from("booking_requests")
              .select("*", { count: "exact", head: true })
              .in("equipment_id", equipmentIds)
              .eq("status", "pending");

            if (pendingError) throw pendingError;

            setPendingOwnerRequests(pendingCount || 0);
          }
        }
      } catch (err) {
        console.error("Failed to check equipment:", err);
        // Reset to safe defaults on error
        setHasEquipment(false);
        setPendingOwnerRequests(0);
      }
    };

    void checkEquipment();
  }, [user]);

  // Check for unread messages
  useEffect(() => {
    if (!user) {
      setUnreadMessages(0);
      return;
    }

    const checkUnreadMessages = async () => {
      try {
        // Get all conversations for the user
        const { data: participants, error: participantsError } = await supabase
          .from("conversation_participants")
          .select("conversation_id, last_read_at")
          .eq("profile_id", user.id);

        if (participantsError) throw participantsError;

        if (!participants || participants.length === 0) {
          setUnreadMessages(0);
          return;
        }

        // For each conversation, check for unread messages
        let totalUnread = 0;
        for (const participant of participants) {
          const { count, error: countError } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", participant.conversation_id)
            .neq("sender_id", user.id)
            .gt("created_at", participant.last_read_at || "1970-01-01");

          if (countError) {
            console.error("Failed to count unread messages:", countError);
            continue;
          }

          totalUnread += count || 0;
        }

        setUnreadMessages(totalUnread);
      } catch (err) {
        console.error("Failed to check unread messages:", err);
        setUnreadMessages(0);
      }
    };

    // Initial check
    void checkUnreadMessages();

    // Set up scoped realtime subscriptions for user's conversations
    const setupSubscriptions = async () => {
      // Fetch user's conversation IDs
      const { data: participants, error: participantsError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("profile_id", user.id);

      if (participantsError) {
        console.error("Failed to fetch conversations:", participantsError);
        return null;
      }

      if (!participants || participants.length === 0) {
        // No conversations to watch
        return null;
      }

      const conversationIds = participants.map((p) => p.conversation_id);

      // Create a channel with filtered subscriptions for each conversation
      // This ensures we only listen to messages in the user's conversations
      // Channel name includes user ID to ensure uniqueness
      const channel = supabase.channel(`sidebar-messages-${user.id}`);

      // Subscribe to each conversation individually for precise filtering
      conversationIds.forEach((conversationId) => {
        channel.on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            if (payload.new?.sender_id === user.id) {
              return;
            }
            void checkUnreadMessages();
          }
        );
      });

      channel.subscribe();

      return channel;
    };

    // Clean up any existing channel before setting up new one
    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    void setupSubscriptions().then((ch) => {
      channelRef.current = ch;
    });

    return () => {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user]);

  // Navigation items grouped by section
  const mainNavItems: NavItem[] = [
    { label: "Dashboard", icon: Home, href: "/renter/dashboard" },
    { label: "Browse Equipment", icon: Search, href: "/equipment" },
  ];

  const activityNavItems: NavItem[] = [
    {
      label: "My Bookings",
      icon: Calendar,
      href: "/renter/dashboard?tab=bookings",
    },
    {
      label: "Messages",
      icon: MessageSquare,
      href: "/messages",
      ...(unreadMessages > 0 && { badge: unreadMessages }),
    },
    { label: "Payments", icon: CreditCard, href: "/renter/payments" },
  ];

  const accountNavItems: NavItem[] = [
    { label: "Settings", icon: User, href: "/settings" },
  ];

  const isActive = (href: string) => {
    if (href === "/renter/dashboard") {
      return location.pathname === href && !location.search;
    }
    return (
      location.pathname === href || location.pathname + location.search === href
    );
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-border bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {!collapsed && (
            <Link
              to="/"
              className="flex items-center space-x-2 rounded-sm hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <Mountain className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold text-foreground">
                RentAloo
              </span>
            </Link>
          )}
          {collapsed && (
            <Link
              to="/"
              className="mx-auto flex rounded-sm hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <Mountain className="h-6 w-6 text-primary" />
            </Link>
          )}
        </div>

        {/* Toggle Button */}
        <div className="flex justify-end p-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-8 w-8"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        <Separator className="mb-4" />

        {/* Navigation */}
        <nav className="flex-1 px-2">
          {/* Main Section */}
          {!collapsed && (
            <div className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Main
            </div>
          )}
          <div className="space-y-1 mb-6">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "group flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:shadow-sm"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-transform duration-200",
                      !active && "group-hover:scale-110"
                    )}
                  />
                  {!collapsed && <span>{item.label}</span>}
                  {!collapsed && item.badge && item.badge > 0 && (
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Activity Section */}
          {!collapsed && (
            <div className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Activity
            </div>
          )}
          <div className="space-y-1 mb-6">
            {activityNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "group flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:shadow-sm"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-transform duration-200",
                      !active && "group-hover:scale-110"
                    )}
                  />
                  {!collapsed && <span>{item.label}</span>}
                  {!collapsed && item.badge && item.badge > 0 && (
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Account Section */}
          {!collapsed && (
            <div className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Account
            </div>
          )}
          <div className="space-y-1">
            {accountNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "group flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:shadow-sm"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-transform duration-200",
                      !active && "group-hover:scale-110"
                    )}
                  />
                  {!collapsed && <span>{item.label}</span>}
                  {!collapsed && item.badge && item.badge > 0 && (
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        <Separator className="my-4" />

        {/* My Equipment Listings - Above Trust Score */}
        {hasEquipment && (
          <div className="px-2 py-4 flex items-center justify-center">
            <Link
              to="/owner/dashboard"
              className={cn(
                "group flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive("/owner/dashboard")
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:shadow-sm"
              )}
              title={collapsed ? "My Equipment Listings" : undefined}
            >
              <Package
                className={cn(
                  "h-5 w-5 shrink-0 transition-transform duration-200",
                  !isActive("/owner/dashboard") && "group-hover:scale-110"
                )}
              />
              {!collapsed && <span>My Equipment Listings</span>}
              {!collapsed && (
                <div className="ml-auto flex items-center gap-2">
                  {pendingOwnerRequests > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white animate-pulse">
                      {pendingOwnerRequests}
                    </span>
                  )}
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </Link>
          </div>
        )}

        <Separator className="my-4" />

        {/* Verification Status */}
        {profile && (
          <div className="px-2 pb-4">
            <Link
              to="/verification"
              className={cn(
                "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent",
                collapsed ? "justify-center" : ""
              )}
              title={collapsed ? "Verification" : undefined}
            >
              <Shield className="h-5 w-5 shrink-0 text-primary" />
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground">
                      Trust Score
                    </span>
                    <span className="text-xs font-semibold text-primary">
                      {verificationProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all"
                      style={{ width: `${verificationProgress}%` }}
                    />
                  </div>
                  {verificationProgress === 100 && (
                    <div className="mt-1">
                      <VerificationBadge status="verified" showLabel={false} />
                    </div>
                  )}
                </div>
              )}
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
