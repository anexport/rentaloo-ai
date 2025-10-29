import { useAuth } from "@/hooks/useAuth";
import {
  Mountain,
  Search,
  Calendar,
  Star,
  MessageSquare,
  Shield,
  Package,
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
import TransactionHistory from "@/components/payment/TransactionHistory";
import ReviewList from "@/components/reviews/ReviewList";
import { useVerification } from "@/hooks/useVerification";
import VerificationBadge from "@/components/verification/VerificationBadge";
import { getVerificationProgress } from "../../lib/verification";
import UserMenu from "@/components/UserMenu";
import BookingRequestCard from "@/components/booking/BookingRequestCard";
import { useBookingRequests } from "@/hooks/useBookingRequests";

const RenterDashboard = () => {
  const { user } = useAuth();
  const { profile } = useVerification();
  const [hasEquipment, setHasEquipment] = useState(false);
  const [pendingOwnerRequests, setPendingOwnerRequests] = useState(0);

  // Fetch renter bookings
  const {
    bookingRequests: renterBookings,
    loading: renterLoading,
    fetchBookingRequests: fetchRenterBookings,
  } = useBookingRequests("renter");

  const verificationProgress = profile ? getVerificationProgress(profile) : 0;

  // Check if user has equipment listings and pending requests
  useEffect(() => {
    const checkEquipment = async () => {
      if (!user) return;

      const { count } = await supabase
        .from("equipment")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", user.id);

      setHasEquipment((count || 0) > 0);

      // If they have equipment, check for pending requests
      if (count && count > 0) {
        const { data: equipment } = await supabase
          .from("equipment")
          .select("id")
          .eq("owner_id", user.id);

        if (equipment && equipment.length > 0) {
          const equipmentIds = equipment.map((eq) => eq.id);

          const { count: pendingCount } = await supabase
            .from("booking_requests")
            .select("*", { count: "exact", head: true })
            .in("equipment_id", equipmentIds)
            .eq("status", "pending");

          setPendingOwnerRequests(pendingCount || 0);
        }
      }
    };

    checkEquipment();
  }, [user]);

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
            Renter Dashboard
          </h2>
          <p className="text-muted-foreground">
            Find and rent outdoor equipment for your next adventure
          </p>
        </div>

        {/* Verification Prompt */}
        {profile && verificationProgress < 100 && (
          <Card className="border-primary/50 bg-primary/5 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-primary" />
                <span>Increase Your Trust Score</span>
              </CardTitle>
              <CardDescription>
                Complete verification to access more equipment and get priority
                bookings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1 mr-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-foreground">
                      Verification Progress
                    </span>
                    <span className="font-semibold">
                      {verificationProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${verificationProgress}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {profile.identityVerified && (
                    <VerificationBadge status="verified" showLabel={false} />
                  )}
                  {profile.emailVerified && (
                    <VerificationBadge status="verified" showLabel={false} />
                  )}
                </div>
              </div>
              <Link to="/verification">
                <Button className="w-full">Complete Verification</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5 text-primary" />
                <span>Browse Equipment</span>
              </CardTitle>
              <CardDescription>
                Discover available outdoor equipment in your area
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/equipment">
                <Button className="w-full">Start Browsing</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span>My Bookings</span>
              </CardTitle>
              <CardDescription>
                View and manage your current and past bookings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {renterBookings.length}
                </div>
                <p className="text-sm text-muted-foreground">Active bookings</p>
              </div>
            </CardContent>
          </Card>

          {hasEquipment && (
            <Card
              className={
                pendingOwnerRequests > 0 ? "border-primary/50 bg-primary/5" : ""
              }
            >
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-primary" />
                  <span>My Equipment</span>
                  {pendingOwnerRequests > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                      {pendingOwnerRequests}
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  {pendingOwnerRequests > 0
                    ? `${pendingOwnerRequests} pending booking ${
                        pendingOwnerRequests === 1 ? "request" : "requests"
                      }`
                    : "No pending requests"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/owner/dashboard">
                  <Button className="w-full">
                    {pendingOwnerRequests > 0
                      ? "Review Requests"
                      : "Manage Equipment"}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <span>Messages</span>
              </CardTitle>
              <CardDescription>
                Communicate with equipment owners
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/messages">
                <Button className="w-full">View Messages</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* My Rental Bookings Section */}
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4">My Rental Bookings</h3>
          {renterLoading ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">Loading bookings...</div>
            </div>
          ) : renterBookings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted" />
                <p className="text-muted-foreground">No bookings yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Start by browsing available equipment
                </p>
                <Link to="/equipment">
                  <Button>Browse Equipment</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {renterBookings.map((booking) => (
                <BookingRequestCard
                  key={booking.id}
                  bookingRequest={booking}
                  onStatusChange={fetchRenterBookings}
                  showActions={true}
                />
              ))}
            </div>
          )}
        </div>

        {/* Transaction History */}
        <div className="mb-8">
          <TransactionHistory userType="renter" />
        </div>

        {/* My Reviews Given */}
        {user && (
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="h-5 w-5 text-primary" />
                  <span>My Reviews</span>
                </CardTitle>
                <CardDescription>
                  Reviews you have written for equipment owners
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ReviewList
                  reviewerId={user.id}
                  showSummary={false}
                  showEquipment={true}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your latest equipment rentals and interactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted" />
              <p>No recent activity</p>
              <p className="text-sm">Start by browsing available equipment</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default RenterDashboard;
