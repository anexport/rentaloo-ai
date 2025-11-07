import { useEffect, useState } from "react";
import { Calendar, DollarSign, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

interface Stats {
  activeBookings: number;
  pendingRequests: number;
  totalSpent: number;
}

const StatsOverview = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    activeBookings: 0,
    pendingRequests: 0,
    totalSpent: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Fetch active bookings count (approved status only - in_progress doesn't exist)
        const { count: activeCount } = await supabase
          .from("booking_requests")
          .select("*", { count: "exact", head: true })
          .eq("renter_id", user.id)
          .eq("status", "approved");

        // Fetch pending requests count
        const { count: pendingCount } = await supabase
          .from("booking_requests")
          .select("*", { count: "exact", head: true })
          .eq("renter_id", user.id)
          .eq("status", "pending");

        // Fetch total spent from payments table (not transactions)
        const { data: payments } = await supabase
          .from("payments")
          .select("total_amount")
          .eq("renter_id", user.id)
          .eq("payment_status", "succeeded");

        const totalSpent =
          payments?.reduce(
            (sum, p) => sum + Number(p.total_amount ?? 0),
            0
          ) ?? 0;

        setStats({
          activeBookings: activeCount || 0,
          pendingRequests: pendingCount || 0,
          totalSpent,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchStats();
  }, [user]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
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

  const statCards = [
    {
      title: "Active Bookings",
      value: stats.activeBookings,
      icon: Calendar,
      description: "Current rentals",
      badge: stats.activeBookings > 0 ? "Active" : undefined,
      badgeVariant: "default" as const,
    },
    {
      title: "Pending Requests",
      value: stats.pendingRequests,
      icon: Package,
      description: "Awaiting payment",
      badge: stats.pendingRequests > 0 ? "Pending" : undefined,
      badgeVariant: "secondary" as const,
    },
    {
      title: "Total Spent",
      value: `$${stats.totalSpent.toFixed(2)}`,
      icon: DollarSign,
      description: "All time",
      badge: undefined,
      badgeVariant: undefined,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">{stat.description}</p>
                {stat.badge && (
                  <Badge variant={stat.badgeVariant} className="text-xs">
                    {stat.badge}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default StatsOverview;

