import { useEffect, useState, useRef } from "react";
import {
  Calendar,
  DollarSign,
  Heart,
  Star,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Stats {
  activeBookings: number;
  savedItems: number;
  totalSpent: number;
  averageRating: number;
}

interface TrendData {
  current: number;
  previous: number;
  trend: number; // percentage change
}

interface StatCardData {
  title: string;
  value: number | string;
  icon: typeof Calendar;
  description: string;
  badge?: string;
  badgeVariant?: "default" | "secondary";
  href?: string;
  trend?: TrendData;
  sparkline?: number[]; // Simple array of values for sparkline
}

// Animated counter hook
const useAnimatedCounter = (target: number, duration = 1000) => {
  const [count, setCount] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (target === 0) {
      setCount(0);
      return;
    }

    const startTime = performance.now();
    startTimeRef.current = startTime;
    const startValue = 0;

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) return;

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(
        startValue + (target - startValue) * easeOut
      );

      setCount(currentValue);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [target, duration]);

  return count;
};

// Simple sparkline component
const Sparkline = ({
  data,
  className,
}: {
  data: number[];
  className?: string;
}) => {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 60;
  const height = 20;
  const padding = 2;

  const points = data
    .map((value, index) => {
      const x =
        (index / (data.length - 1 || 1)) * (width - padding * 2) + padding;
      const y =
        height - ((value - min) / range) * (height - padding * 2) - padding;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      className={cn("overflow-visible", className)}
      viewBox={`0 0 ${width} ${height}`}
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-primary"
      />
    </svg>
  );
};

const StatsOverview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    activeBookings: 0,
    savedItems: 0,
    totalSpent: 0,
    averageRating: 0,
  });
  const [trends, setTrends] = useState<{
    activeBookings: TrendData;
    savedItems: TrendData;
    totalSpent: TrendData;
    averageRating: TrendData;
  }>({
    activeBookings: { current: 0, previous: 0, trend: 0 },
    savedItems: { current: 0, previous: 0, trend: 0 },
    totalSpent: { current: 0, previous: 0, trend: 0 },
    averageRating: { current: 0, previous: 0, trend: 0 },
  });
  const [sparklines, setSparklines] = useState<{
    activeBookings: number[];
    savedItems: number[];
    totalSpent: number[];
  }>({
    activeBookings: [],
    savedItems: [],
    totalSpent: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      try {
        setLoading(true);

        const now = new Date();
        const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const currentMonthStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        );

        // Fetch all-time stats
        const [
          activeCountResult,
          favoritesCountResult,
          paymentsResult,
          reviewsResult,
        ] = await Promise.all([
          // Active bookings (bookings with status='active', including upcoming ones)
          supabase
            .from("booking_requests")
            .select("*", { count: "exact", head: true })
            .eq("renter_id", user.id)
            .eq("status", "active"),
          // Saved items (favorites, all-time)
          supabase
            .from("user_favorites")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id),
          // Total spent (all-time)
          supabase
            .from("payments")
            .select("total_amount")
            .eq("renter_id", user.id)
            .eq("payment_status", "succeeded"),
          // Average rating (reviews received as renter, all-time)
          supabase.from("reviews").select("rating").eq("reviewee_id", user.id),
        ]);

        // Check for errors in queries
        if (activeCountResult.error) throw activeCountResult.error;
        if (favoritesCountResult.error) throw favoritesCountResult.error;
        if (paymentsResult.error) throw paymentsResult.error;
        if (reviewsResult.error) throw reviewsResult.error;

        // Fetch previous month stats for trends
        const [
          prevActiveCountResult,
          prevFavoritesCountResult,
          prevPaymentsResult,
          prevReviewsResult,
        ] = await Promise.all([
          // Count bookings that became active during the previous month
          // Uses activated_at timestamp to track when rentals actually started
          supabase
            .from("booking_requests")
            .select("*", { count: "exact", head: true })
            .eq("renter_id", user.id)
            .not("activated_at", "is", null)
            .lt("activated_at", currentMonthStart.toISOString())
            .gte("activated_at", oneMonthAgo.toISOString()),
          supabase
            .from("user_favorites")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .lt("created_at", currentMonthStart.toISOString())
            .gte("created_at", oneMonthAgo.toISOString()),
          supabase
            .from("payments")
            .select("total_amount")
            .eq("renter_id", user.id)
            .eq("payment_status", "succeeded")
            .lt("created_at", currentMonthStart.toISOString())
            .gte("created_at", oneMonthAgo.toISOString()),
          supabase
            .from("reviews")
            .select("rating")
            .eq("reviewee_id", user.id)
            .lt("created_at", currentMonthStart.toISOString())
            .gte("created_at", oneMonthAgo.toISOString()),
        ]);

        // Check for errors in previous month queries
        if (prevActiveCountResult.error) throw prevActiveCountResult.error;
        if (prevFavoritesCountResult.error)
          throw prevFavoritesCountResult.error;
        if (prevPaymentsResult.error) throw prevPaymentsResult.error;
        if (prevReviewsResult.error) throw prevReviewsResult.error;

        // Calculate current stats
        const activeCount = activeCountResult.count || 0;
        const savedItemsCount = favoritesCountResult.count || 0;
        const totalSpent =
          paymentsResult.data?.reduce(
            (sum, p) => sum + Number(p.total_amount ?? 0),
            0
          ) ?? 0;

        // Calculate average rating
        const ratings = reviewsResult.data?.map((r) => r.rating) || [];
        const averageRating =
          ratings.length > 0
            ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
            : 0;

        // Calculate previous month stats
        const prevActiveCount = prevActiveCountResult.count || 0;
        const prevSavedItemsCount = prevFavoritesCountResult.count || 0;
        const prevTotalSpent =
          prevPaymentsResult.data?.reduce(
            (sum, p) => sum + Number(p.total_amount ?? 0),
            0
          ) ?? 0;
        const prevRatings = prevReviewsResult.data?.map((r) => r.rating) || [];
        const prevAverageRating =
          prevRatings.length > 0
            ? prevRatings.reduce((sum, r) => sum + r, 0) / prevRatings.length
            : 0;

        // Calculate trends
        const calculateTrend = (current: number, previous: number): number => {
          if (previous === 0) return current > 0 ? 100 : 0;
          return ((current - previous) / previous) * 100;
        };

        setTrends({
          activeBookings: {
            current: activeCount,
            previous: prevActiveCount,
            trend: calculateTrend(activeCount, prevActiveCount),
          },
          savedItems: {
            current: savedItemsCount,
            previous: prevSavedItemsCount,
            trend: calculateTrend(savedItemsCount, prevSavedItemsCount),
          },
          totalSpent: {
            current: totalSpent,
            previous: prevTotalSpent,
            trend: calculateTrend(totalSpent, prevTotalSpent),
          },
          averageRating: {
            current: averageRating,
            previous: prevAverageRating,
            trend: calculateTrend(averageRating, prevAverageRating),
          },
        });

        // Generate sparkline data (last 3 months, monthly buckets)
        const generateSparkline = async (
          queryFn: (start: Date, end: Date) => Promise<number>
        ) => {
          const data: number[] = [];
          for (let i = 2; i >= 0; i--) {
            const monthStart = new Date(
              now.getFullYear(),
              now.getMonth() - i,
              1
            );
            const monthEnd = new Date(
              now.getFullYear(),
              now.getMonth() - i + 1,
              0
            );
            const value = await queryFn(monthStart, monthEnd);
            data.push(value);
          }
          return data;
        };

        const [activeSparkline, savedItemsSparkline, spentSparkline] =
          await Promise.all([
            generateSparkline(async (start, end) => {
              // Count bookings with status='active' created in this period
              const { count, error } = await supabase
                .from("booking_requests")
                .select("*", { count: "exact", head: true })
                .eq("renter_id", user.id)
                .eq("status", "active")
                .gte("created_at", start.toISOString())
                .lt("created_at", end.toISOString());
              if (error) throw error;
              return count || 0;
            }),
            generateSparkline(async (start, end) => {
              const { count, error } = await supabase
                .from("user_favorites")
                .select("*", { count: "exact", head: true })
                .eq("user_id", user.id)
                .gte("created_at", start.toISOString())
                .lt("created_at", end.toISOString());
              if (error) throw error;
              return count || 0;
            }),
            generateSparkline(async (start, end) => {
              const { data, error } = await supabase
                .from("payments")
                .select("total_amount")
                .eq("renter_id", user.id)
                .eq("payment_status", "succeeded")
                .gte("created_at", start.toISOString())
                .lt("created_at", end.toISOString());
              if (error) throw error;
              return (
                data?.reduce(
                  (sum, p) => sum + Number(p.total_amount ?? 0),
                  0
                ) ?? 0
              );
            }),
          ]);

        setSparklines({
          activeBookings: activeSparkline,
          savedItems: savedItemsSparkline,
          totalSpent: spentSparkline,
        });

        setStats({
          activeBookings: activeCount,
          savedItems: savedItemsCount,
          totalSpent,
          averageRating,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
        toast.error("Failed to load statistics", {
          description: "Please try again",
        });
      } finally {
        setLoading(false);
      }
    };

    void fetchStats();
  }, [user]);

  // Animated counters
  const animatedActive = useAnimatedCounter(stats.activeBookings);
  const animatedSaved = useAnimatedCounter(stats.savedItems);
  const animatedSpent = useAnimatedCounter(Math.round(stats.totalSpent));
  const animatedRating =
    useAnimatedCounter(Math.round(stats.averageRating * 10)) / 10;

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatTrend = (trend: number): string => {
    const abs = Math.abs(trend);
    if (abs < 0.1) return "No change";
    const sign = trend > 0 ? "+" : "";
    return `${sign}${abs.toFixed(1)}%`;
  };

  const statCards: StatCardData[] = [
    {
      title: "Active Bookings",
      value: animatedActive,
      icon: Calendar,
      description: "Current rentals",
      badge: stats.activeBookings > 0 ? "Active" : undefined,
      badgeVariant: "default",
      href: "/renter/dashboard?tab=bookings",
      trend: trends.activeBookings,
      sparkline: sparklines.activeBookings,
    },
    {
      title: "Saved Items",
      value: animatedSaved,
      icon: Heart,
      description: "Equipment saved",
      badge: stats.savedItems > 0 ? "Saved" : undefined,
      badgeVariant: "secondary",
      href: "/equipment?favorites=true",
      trend: trends.savedItems,
      sparkline: sparklines.savedItems,
    },
    {
      title: "Total Spent",
      value: `$${animatedSpent.toFixed(0)}`,
      icon: DollarSign,
      description: "All time",
      href: "/renter/dashboard?tab=bookings",
      trend: trends.totalSpent,
      sparkline: sparklines.totalSpent,
    },
    {
      title: "Average Rating",
      value: stats.averageRating > 0 ? animatedRating.toFixed(1) : "N/A",
      icon: Star,
      description: "As renter",
      href: "/renter/dashboard?tab=reviews",
      trend: trends.averageRating,
    },
  ];

  const handleCardClick = (href?: string) => {
    if (href) {
      navigate(href);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        const trend = stat.trend;
        const isPositive = trend ? trend.trend >= 0 : false;
        const hasTrend = trend && Math.abs(trend.trend) > 0.1;

        return (
          <Card
            key={stat.title}
            className={cn(
              "hover:shadow-lg transition-all duration-200 border-muted cursor-pointer",
              stat.href && "hover:scale-[1.02] hover:border-primary/50"
            )}
            onClick={() => handleCardClick(stat.href)}
            role={stat.href ? "button" : undefined}
            tabIndex={stat.href ? 0 : undefined}
            onKeyDown={(e) => {
              if (stat.href && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                handleCardClick(stat.href);
              }
            }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className="rounded-full bg-primary/10 p-2">
                <Icon className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight mb-2">
                {stat.value}
              </div>
              <div className="flex items-center justify-between gap-2 mt-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground truncate">
                    {stat.description}
                  </p>
                  {hasTrend && (
                    <div
                      className={cn(
                        "flex items-center gap-1 mt-1 text-xs",
                        isPositive ? "text-green-600" : "text-red-600"
                      )}
                    >
                      {isPositive ? (
                        <TrendingUp className="h-3 w-3 shrink-0" />
                      ) : (
                        <TrendingDown className="h-3 w-3 shrink-0" />
                      )}
                      <span className="truncate">{formatTrend(trend.trend)} vs last month</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {stat.sparkline && stat.sparkline.length > 0 && (
                    <Sparkline data={stat.sparkline} className="hidden sm:block" />
                  )}
                  {stat.badge && (
                    <Badge variant={stat.badgeVariant} className="text-xs whitespace-nowrap">
                      {stat.badge}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default StatsOverview;
