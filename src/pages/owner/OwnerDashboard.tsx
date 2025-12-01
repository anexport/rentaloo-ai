import { useAuth } from "@/hooks/useAuth";
import {
  Mountain,
  Plus,
  BarChart3,
  Calendar,
  Star,
  MessageSquare,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import EquipmentManagement from "@/components/EquipmentManagement";
import BookingRequestCard from "@/components/booking/BookingRequestCard";
import { useBookingRequests } from "@/hooks/useBookingRequests";
import MessagingInterface from "@/components/messaging/MessagingInterface";
import ReviewList from "@/components/reviews/ReviewList";
import EscrowDashboard from "@/components/payment/EscrowDashboard";
import TransactionHistory from "@/components/payment/TransactionHistory";
import UserMenu from "@/components/UserMenu";
import { Link } from "react-router-dom";

const OwnerDashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation("dashboard");
  const [stats, setStats] = useState({
    totalListings: 0,
    pendingRequests: 0,
    totalEarnings: 0,
    averageRating: 0,
  });
  const [activeTab, setActiveTab] = useState<
    "overview" | "equipment" | "bookings" | "messages" | "reviews" | "payments"
  >("overview");
  const {
    bookingRequests,
    loading: bookingsLoading,
    fetchBookingRequests,
  } = useBookingRequests("owner");

  // Memoize the status change callback to prevent effect re-runs
  const handleBookingStatusChange = useCallback(() => {
    void fetchBookingRequests();
  }, [fetchBookingRequests]);

  const fetchStats = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch equipment count
      const { count: equipmentCount } = await supabase
        .from("equipment")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", user.id);

      // Fetch booking requests to ensure they're loaded before the effect runs
      await fetchBookingRequests();

      // Fetch total earnings (this would need to be calculated from completed bookings)
      const { data: earningsData } = await supabase
        .from("owner_profiles")
        .select("earnings_total")
        .eq("profile_id", user.id)
        .single();

      setStats((prev) => ({
        ...prev,
        totalListings: equipmentCount || 0,
        totalEarnings: earningsData?.earnings_total || 0,
        averageRating: 0, // This would need to be calculated from reviews
        // pendingRequests is not set here - it's derived from bookingRequests in useEffect
      }));
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, [user, fetchBookingRequests]);

  useEffect(() => {
    if (user) {
      void fetchStats();
    }
  }, [user, fetchStats]);

  useEffect(() => {
    // Always update pendingRequests based on bookingRequests, even when empty
    const pendingCount = bookingRequests.filter(
      (r) => r.status === "pending"
    ).length;

    setStats((prev) => ({
      ...prev,
      pendingRequests: pendingCount,
    }));
  }, [bookingRequests]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link
              to="/"
              className="flex items-center space-x-2 hover:opacity-90"
            >
              <Mountain className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-bold text-foreground">RentAloo</h1>
            </Link>
            <div className="flex items-center space-x-4">
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            {t("owner.header.title")}
          </h2>
          <p className="text-muted-foreground">
            {t("owner.header.description")}
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("owner.stats.total_listings.label")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalListings}</div>
              <p className="text-xs text-muted-foreground">{t("owner.stats.total_listings.description")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("owner.stats.pending_requests.label")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingRequests}</div>
              <p className="text-xs text-muted-foreground">{t("owner.stats.pending_requests.description")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("owner.stats.total_earnings.label")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.totalEarnings.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">{t("owner.stats.total_earnings.description")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("owner.stats.average_rating.label")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : "-"}
              </div>
              <p className="text-xs text-muted-foreground">{t("owner.stats.average_rating.description")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-border mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("overview")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "overview"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
              }`}
            >
              {t("owner.tabs.overview")}
            </button>
            <button
              onClick={() => setActiveTab("equipment")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "equipment"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
              }`}
            >
              {t("owner.tabs.equipment")}
            </button>
            <button
              onClick={() => setActiveTab("bookings")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "bookings"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
              }`}
            >
              {t("owner.tabs.bookings")}
              {stats.pendingRequests > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                  {stats.pendingRequests}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("messages")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "messages"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
              }`}
            >
              <MessageSquare className="h-4 w-4 mr-1 inline" />
              {t("owner.tabs.messages")}
            </button>
            <button
              onClick={() => setActiveTab("reviews")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "reviews"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
              }`}
            >
              <Star className="h-4 w-4 mr-1 inline" />
              {t("owner.tabs.reviews")}
            </button>
            <button
              onClick={() => setActiveTab("payments")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "payments"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
              }`}
            >
              <Shield className="h-4 w-4 mr-1 inline" />
              {t("owner.tabs.payments")}
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Quick Actions */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Plus className="h-5 w-5 text-primary" />
                    <span>{t("owner.overview.quick_actions.add_equipment.title")}</span>
                  </CardTitle>
                  <CardDescription>{t("owner.overview.quick_actions.add_equipment.description")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    onClick={() => setActiveTab("equipment")}
                  >
                    {t("owner.overview.quick_actions.add_equipment.button")}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <span>{t("owner.overview.quick_actions.manage_listings.title")}</span>
                  </CardTitle>
                  <CardDescription>
                    {t("owner.overview.quick_actions.manage_listings.description")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setActiveTab("equipment")}
                  >
                    {t("owner.overview.quick_actions.manage_listings.button")}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <span>{t("owner.overview.quick_actions.analytics.title")}</span>
                  </CardTitle>
                  <CardDescription>
                    {t("owner.overview.quick_actions.analytics.description")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" disabled>
                    {t("owner.overview.quick_actions.analytics.button")}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>{t("owner.overview.recent_activity.title")}</CardTitle>
                <CardDescription>
                  {t("owner.overview.recent_activity.description")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Plus className="h-12 w-12 mx-auto mb-4 text-muted" />
                  <p>{t("owner.overview.recent_activity.empty_state.title")}</p>
                  <p className="text-sm">
                    {t("owner.overview.recent_activity.empty_state.description")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "equipment" && <EquipmentManagement />}

        {activeTab === "bookings" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {t("owner.bookings.section_title")}
                </h2>
                <p className="text-muted-foreground">
                  {t("owner.bookings.section_description")}
                </p>
              </div>
            </div>

            {bookingsLoading ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground">
                  {t("owner.bookings.loading")}
                </div>
              </div>
            ) : bookingRequests.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <div className="text-muted-foreground">
                    <p className="text-lg mb-2">{t("owner.bookings.empty_state.title")}</p>
                    <p className="text-sm">
                      {t("owner.bookings.empty_state.description")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {bookingRequests.map((request) => (
                  <BookingRequestCard
                    key={request.id}
                    bookingRequest={request}
                    onStatusChange={handleBookingStatusChange}
                    showActions={true}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "messages" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-foreground">{t("owner.messages.section_title")}</h2>
                <p className="text-muted-foreground">
                  {t("owner.messages.section_description")}
                </p>
              </div>
            </div>
            <MessagingInterface />
          </div>
        )}

        {activeTab === "reviews" && user && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {t("owner.reviews.section_title")}
                </h2>
                <p className="text-muted-foreground">
                  {t("owner.reviews.section_description")}
                </p>
              </div>
            </div>
            <ReviewList
              revieweeId={user.id}
              showSummary={true}
              showEquipment={true}
            />
          </div>
        )}

        {activeTab === "payments" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {t("owner.payments.section_title")}
                </h2>
                <p className="text-muted-foreground">
                  {t("owner.payments.section_description")}
                </p>
              </div>
            </div>

            {/* Escrow Dashboard */}
            <EscrowDashboard />

            {/* Transaction History */}
            <div className="mt-8">
              <TransactionHistory userType="owner" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default OwnerDashboard;
