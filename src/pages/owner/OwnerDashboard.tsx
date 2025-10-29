import { useAuth } from "@/hooks/useAuth";
import {
  Mountain,
  Plus,
  BarChart3,
  Calendar,
  Star,
  Settings,
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
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "../../lib/database.types";
import EquipmentManagement from "@/components/EquipmentManagement";
import BookingRequestCard from "@/components/booking/BookingRequestCard";
import { useBookingRequests } from "@/hooks/useBookingRequests";
import MessagingInterface from "@/components/messaging/MessagingInterface";
import ReviewList from "@/components/reviews/ReviewList";
import EscrowDashboard from "@/components/payment/EscrowDashboard";
import TransactionHistory from "@/components/payment/TransactionHistory";
import UserMenu from "@/components/UserMenu";

const OwnerDashboard = () => {
  const { user, signOut } = useAuth();
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

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  useEffect(() => {
    if (bookingRequests.length > 0) {
      const bookingStats = {
        pending: bookingRequests.filter((r) => r.status === "pending").length,
        approved: bookingRequests.filter((r) => r.status === "approved").length,
        total: bookingRequests.length,
      };

      setStats((prev) => ({
        ...prev,
        pendingRequests: bookingStats.pending,
      }));
    }
  }, [bookingRequests]);

  const fetchStats = async () => {
    if (!user) return;

    try {
      // Fetch equipment count
      const { count: equipmentCount } = await supabase
        .from("equipment")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", user.id);

      // Fetch pending booking requests
      const { count: pendingCount } = await supabase
        .from("booking_requests")
        .select("*", { count: "exact", head: true })
        .eq("equipment.owner_id", user.id)
        .eq("status", "pending");

      // Fetch total earnings (this would need to be calculated from completed bookings)
      const { data: earningsData } = await supabase
        .from("owner_profiles")
        .select("earnings_total")
        .eq("profile_id", user.id)
        .single();

      setStats({
        totalListings: equipmentCount || 0,
        pendingRequests: pendingCount || 0,
        totalEarnings: earningsData?.earnings_total || 0,
        averageRating: 0, // This would need to be calculated from reviews
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Mountain className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-bold text-foreground">RentAloo</h1>
            </div>
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
            Owner Dashboard
          </h2>
          <p className="text-muted-foreground">
            Manage your equipment listings and track your earnings
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Listings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalListings}</div>
              <p className="text-xs text-muted-foreground">Active equipment</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingRequests}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.totalEarnings.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Average Rating
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : "-"}
              </div>
              <p className="text-xs text-muted-foreground">Based on reviews</p>
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
              Overview
            </button>
            <button
              onClick={() => setActiveTab("equipment")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "equipment"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
              }`}
            >
              Equipment Management
            </button>
            <button
              onClick={() => setActiveTab("bookings")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "bookings"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
              }`}
            >
              Booking Requests
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
              Messages
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
              Reviews
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
              Payments & Escrow
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
                    <span>Add Equipment</span>
                  </CardTitle>
                  <CardDescription>List new equipment for rent</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    onClick={() => setActiveTab("equipment")}
                  >
                    Add Equipment
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <span>Manage Listings</span>
                  </CardTitle>
                  <CardDescription>
                    View and edit your equipment listings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setActiveTab("equipment")}
                  >
                    Manage Listings
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <span>Analytics</span>
                  </CardTitle>
                  <CardDescription>
                    Track performance and earnings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" disabled>
                    Coming Soon
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Your latest equipment listings and booking requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Plus className="h-12 w-12 mx-auto mb-4 text-muted" />
                  <p>No recent activity</p>
                  <p className="text-sm">
                    Start by adding your first piece of equipment
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
                  Booking Requests
                </h2>
                <p className="text-muted-foreground">
                  Manage rental requests for your equipment
                </p>
              </div>
            </div>

            {bookingsLoading ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground">
                  Loading booking requests...
                </div>
              </div>
            ) : bookingRequests.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <div className="text-muted-foreground">
                    <p className="text-lg mb-2">No booking requests yet</p>
                    <p className="text-sm">
                      Booking requests will appear here when renters request
                      your equipment
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
                    onStatusChange={fetchBookingRequests}
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
                <h2 className="text-2xl font-bold text-foreground">Messages</h2>
                <p className="text-muted-foreground">
                  Communicate with renters about bookings
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
                  Customer Reviews
                </h2>
                <p className="text-muted-foreground">
                  Reviews and ratings from renters who used your equipment
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
                  Payments & Escrow
                </h2>
                <p className="text-muted-foreground">
                  Manage your earnings and escrow funds
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
