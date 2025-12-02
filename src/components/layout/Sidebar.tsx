import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  Heart,
  LifeBuoy,
  CalendarClock,
  Plus,
  Sparkles,
  PiggyBank,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import VerificationBadge from "@/components/verification/VerificationBadge";
import { useVerification } from "@/hooks/useVerification";
import { getVerificationProgress } from "@/lib/verification";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/payment";
import { formatDateLabel, formatDateRange } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";

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
  const { t } = useTranslation("navigation");
  const location = useLocation();
  const { profile } = useVerification();
  const verificationProgress = profile ? getVerificationProgress(profile) : 0;
  const { user } = useAuth();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const userId = user?.id;

  const { data: equipmentStatus } = useQuery({
    queryKey: ["sidebar", "equipment-status", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count, error: countError } = await supabase
        .from("equipment")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", userId as string);
      if (countError) throw countError;

      const hasEquipment = (count || 0) > 0;
      return { hasEquipment };
    },
    staleTime: 1000 * 60, // 1 minute
  });

  const { data: pendingOwnerRequestsData } = useQuery({
    queryKey: ["sidebar", "pending-owner-requests", userId],
    enabled: !!userId && !!equipmentStatus?.hasEquipment,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("booking_requests")
        .select("id, equipment:equipment_id!inner(owner_id)", {
          count: "exact",
          head: true,
        })
        .eq("equipment.owner_id", userId as string)
        .eq("status", "pending");
      if (error) throw error;
      return count || 0;
    },
    staleTime: 1000 * 60, // 1 minute
  });

  const { data: unreadMessagesData, refetch: refetchUnreadMessages } = useQuery(
    {
      queryKey: ["sidebar", "unread-messages", userId],
      enabled: !!userId,
      queryFn: async () => {
        const { data: participants, error: participantsError } = await supabase
          .from("conversation_participants")
          .select("conversation_id, last_read_at")
          .eq("profile_id", userId as string);
        if (participantsError) {
          console.error("Failed to fetch participants:", participantsError);
          return 0;
        }
        if (!participants || participants.length === 0) return 0;

        const results = await Promise.allSettled(
          participants.map((participant) =>
            supabase
              .from("messages")
              .select("*", { count: "exact", head: true })
              .eq("conversation_id", participant.conversation_id)
              .neq("sender_id", userId as string)
              .gt("created_at", participant.last_read_at || "1970-01-01")
          )
        );

        let totalUnread = 0;
        results.forEach((result) => {
          if (result.status === "fulfilled") {
            const { count, error } = result.value;
            if (!error) totalUnread += count || 0;
          }
        });
        return totalUnread;
      },
      staleTime: 1000 * 30, // 30 seconds
    }
  );

  const { data: nextBooking, isLoading: isNextBookingLoading } = useQuery({
    queryKey: ["sidebar", "next-booking", userId],
    enabled: !!userId,
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("booking_requests")
        .select(
          `
            id,
            start_date,
            end_date,
            total_amount,
            status,
            equipment:equipment_id (title)
          `
        )
        .eq("renter_id", userId as string)
        .in("status", ["approved", "pending"])
        .gte("start_date", today)
        .order("start_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        startDate: data.start_date,
        endDate: data.end_date,
        totalAmount: Number(data.total_amount),
        equipmentName:
          data.equipment?.title ?? t("sidebar.upcoming_rental_fallback"),
      };
    },
    staleTime: 1000 * 60, // 1 minute
  });

  const { data: supportTickets } = useQuery({
    queryKey: ["sidebar", "support-tickets", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("damage_claims")
        .select("*", { count: "exact", head: true })
        .eq("filed_by", userId as string)
        .in("status", ["pending", "disputed", "escalated"]);
      if (error) throw error;
      return count || 0;
    },
    staleTime: 1000 * 60, // 1 minute
  });

  const { data: payoutInfo } = useQuery({
    queryKey: ["sidebar", "payout-info", userId],
    enabled: !!userId && !!equipmentStatus?.hasEquipment,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("payments")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", userId as string)
        .or("payout_status.eq.pending,payout_status.is.null");
      if (error) throw error;

      const { data: latestPayout, error: payoutError } = await supabase
        .from("payments")
        .select("payout_processed_at")
        .eq("owner_id", userId as string)
        .not("payout_processed_at", "is", null)
        .order("payout_processed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (payoutError) throw payoutError;

      return {
        pendingPayouts: count || 0,
        lastPayoutAt: latestPayout?.payout_processed_at ?? null,
      };
    },
    staleTime: 1000 * 60, // 1 minute
  });

  // Realtime subscription for unread messages to trigger refetch
  useEffect(() => {
    if (!userId) {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const setupSubscriptions = async () => {
      const { data: participants, error: participantsError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("profile_id", userId);

      if (participantsError) {
        console.error("Failed to fetch conversations:", participantsError);
        return null;
      }

      if (!participants || participants.length === 0) {
        return null;
      }

      const conversationIds = participants.map((p) => p.conversation_id);
      const channel = supabase.channel(`sidebar-messages-${userId}`);

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
            if (payload.new?.sender_id === userId) return;
            void refetchUnreadMessages();
          }
        );
      });

      channel.subscribe();
      return channel;
    };

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
  }, [userId, refetchUnreadMessages]);

  const isActive = (href: string) => {
    if (href === "/renter/dashboard") {
      return location.pathname === href && !location.search;
    }
    return (
      location.pathname === href || location.pathname + location.search === href
    );
  };

  const hasEquipment = equipmentStatus?.hasEquipment ?? false;
  const pendingOwnerRequests = pendingOwnerRequestsData ?? 0;
  const unreadMessages = unreadMessagesData ?? 0;
  const openSupportTickets = supportTickets ?? 0;
  const pendingPayouts = payoutInfo?.pendingPayouts ?? 0;
  const lastPayoutAt = payoutInfo?.lastPayoutAt ?? null;

  // Navigation items grouped by section
  const mainNavItems: NavItem[] = [
    { label: t("sidebar.dashboard"), icon: Home, href: "/renter/dashboard" },
    { label: t("sidebar.browse_equipment"), icon: Search, href: "/equipment" },
    {
      label: t("sidebar.watchlist"),
      icon: Heart,
      href: "/renter/dashboard?tab=saved",
    },
  ];

  const activityNavItems: NavItem[] = [
    {
      label: t("sidebar.my_bookings"),
      icon: Calendar,
      href: "/renter/dashboard?tab=bookings",
    },
    {
      label: t("sidebar.messages"),
      icon: MessageSquare,
      href: "/messages",
      ...(unreadMessages > 0 && { badge: unreadMessages }),
    },
    {
      label: t("sidebar.payments"),
      icon: CreditCard,
      href: "/renter/payments",
    },
    {
      label: t("sidebar.support"),
      icon: LifeBuoy,
      href: "/support",
      ...(openSupportTickets > 0 && { badge: openSupportTickets }),
    },
  ];

  const accountNavItems: NavItem[] = [
    { label: t("sidebar.settings"), icon: User, href: "/settings" },
  ];

  const ownerNavItems: NavItem[] = [
    {
      label: t("sidebar.payouts"),
      icon: PiggyBank,
      href: "/owner/dashboard?tab=payments",
      ...(pendingPayouts > 0 && { badge: pendingPayouts }),
    },
  ];

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
            aria-label={
              collapsed ? t("aria.expand_sidebar") : t("aria.collapse_sidebar")
            }
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        <Separator className="mb-4" />

        {/* Owner quick action */}
        <div className="px-2 pb-2">
          {hasEquipment ? (
            <Link
              to="/owner/dashboard?tab=equipment"
              className={cn(
                "flex items-center gap-3 rounded-lg border border-dashed border-primary/40 px-3 py-2.5 text-sm font-medium text-primary transition hover:border-primary hover:bg-primary/10",
                collapsed ? "justify-center" : ""
              )}
              title={collapsed ? t("sidebar.add_new_listing") : undefined}
            >
              <Plus className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{t("sidebar.add_new_listing")}</span>}
              {!collapsed && (
                <span className="ml-auto text-xs text-primary/80">
                  {t("sidebar.add_new_listing_subtitle")}
                </span>
              )}
            </Link>
          ) : (
            <Link
              to={
                user
                  ? user?.user_metadata?.role === "owner"
                    ? "/owner/dashboard?tab=equipment"
                    : "/owner/become-owner"
                  : "/register/owner"
              }
              className={cn(
                "flex items-center gap-3 rounded-lg border border-dashed border-muted px-3 py-2.5 text-sm font-medium transition hover:border-primary hover:bg-primary/5",
                collapsed ? "justify-center" : ""
              )}
              title={collapsed ? t("sidebar.list_equipment") : undefined}
            >
              <Sparkles className="h-4 w-4 shrink-0 text-primary" />
              {!collapsed && (
                <div className="flex flex-col">
                  <span>{t("sidebar.list_equipment")}</span>
                  <span className="text-xs text-muted-foreground">
                    {t("sidebar.list_equipment_subtitle")}
                  </span>
                </div>
              )}
            </Link>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2">
          {/* Main Section */}
          {!collapsed && (
            <div className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              {t("sidebar.main")}
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
              {t("sidebar.activity")}
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

          {/* Owner Section */}
          {hasEquipment && (
            <>
              {!collapsed && (
                <div className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {t("sidebar.owner")}
                </div>
              )}
              <div className="space-y-1 mb-6">
                {ownerNavItems.map((item) => {
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
            </>
          )}

          {/* Account Section */}
          {!collapsed && (
            <div className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              {t("sidebar.account")}
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

        {isNextBookingLoading && !nextBooking && (
          <div className="px-2 pb-4">
            <div className="rounded-lg border bg-muted/60 p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
                  {!collapsed && <Skeleton className="h-4 w-24" />}
                </div>
                {!collapsed && <Skeleton className="h-5 w-24 shrink-0" />}
              </div>
              {!collapsed && (
                <>
                  <Skeleton className="mt-2 h-5 w-40" />
                  <div className="mt-2 flex items-center justify-between">
                    <Skeleton className="h-4 w-10" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="mt-3 h-4 w-24" />
                </>
              )}
            </div>
          </div>
        )}

        {nextBooking && (
          <div className="px-2 pb-4">
            <div className="rounded-lg border bg-muted/60 p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2 text-xs font-semibold text-foreground">
                  <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
                  {!collapsed && (
                    <span className="truncate">
                      {t("sidebar.upcoming_booking")}
                    </span>
                  )}
                </div>
                {!collapsed && (
                  <span className="shrink-0 whitespace-nowrap rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    {formatDateRange(
                      nextBooking.startDate,
                      nextBooking.endDate
                    )}
                  </span>
                )}
              </div>
              {!collapsed && (
                <>
                  <div className="mt-2 truncate text-sm font-semibold text-foreground">
                    {nextBooking.equipmentName}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{t("sidebar.total")}</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(nextBooking.totalAmount)}
                    </span>
                  </div>
                  <Link
                    to="/renter/dashboard?tab=bookings"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    {t("sidebar.view_details")}{" "}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </>
              )}
            </div>
          </div>
        )}

        <Separator className="my-4" />

        {/* Owner payout glance */}
        {hasEquipment && (
          <div className="px-2 pb-2">
            <div className="rounded-lg border bg-card/60 p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2 text-xs font-semibold text-foreground">
                  <PiggyBank className="h-4 w-4 shrink-0 text-primary" />
                  {!collapsed && (
                    <span className="truncate">
                      {t("sidebar.payout_glance_title")}
                    </span>
                  )}
                </div>
                {!collapsed && pendingPayouts > 0 && (
                  <span className="shrink-0 whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                    {t("sidebar.payout_glance_pending", {
                      count: pendingPayouts,
                    })}
                  </span>
                )}
              </div>
              {!collapsed && (
                <>
                  <div className="mt-2 text-sm font-semibold text-foreground">
                    {t("sidebar.track_earnings")}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("sidebar.last_payout", {
                      date: formatDateLabel(lastPayoutAt),
                    })}
                  </p>
                  <Link
                    to="/owner/dashboard?tab=payments"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    {t("sidebar.view_payouts")}{" "}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </>
              )}
            </div>
          </div>
        )}

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
              title={collapsed ? t("sidebar.my_equipment_listings") : undefined}
            >
              <Package
                className={cn(
                  "h-5 w-5 shrink-0 transition-transform duration-200",
                  !isActive("/owner/dashboard") && "group-hover:scale-110"
                )}
              />
              {!collapsed && <span>{t("sidebar.my_equipment_listings")}</span>}
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

        {/* Announcements */}
        <div className="px-2 pb-4">
          <Link
            to="/explore"
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-accent",
              collapsed ? "justify-center" : "justify-between"
            )}
            title={collapsed ? t("sidebar.whats_new") : undefined}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {!collapsed && <span>{t("sidebar.whats_new")}</span>}
            </div>
            {!collapsed && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                {t("sidebar.updates")}
              </span>
            )}
          </Link>
        </div>

        {/* Verification Status */}
        {profile && (
          <div className="px-2 pb-4">
            <Link
              to="/verification"
              className={cn(
                "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent",
                collapsed ? "justify-center" : ""
              )}
              title={collapsed ? t("sidebar.verification") : undefined}
            >
              <Shield className="h-5 w-5 shrink-0 text-primary" />
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground">
                      {t("sidebar.trust_score")}
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
