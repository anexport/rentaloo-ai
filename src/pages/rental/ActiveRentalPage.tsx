import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Package,
  AlertTriangle,
  Camera,
  Calendar,
  MapPin,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useActiveRental } from "@/hooks/useActiveRental";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import RentalCountdown from "@/components/rental/RentalCountdown";
import RentalQuickActions from "@/components/rental/RentalQuickActions";
import { calculateRentalCountdown } from "@/types/rental";
import { format, differenceInHours } from "date-fns";

// Helper to get display name from profile
const getDisplayName = (profile: { full_name?: string | null; username?: string | null; email?: string | null } | null): string => {
  if (!profile) return "User";
  return profile.full_name || profile.username || profile.email?.split("@")[0] || "User";
};

// Helper to get initials for avatar fallback
const getInitials = (name: string): string => {
  if (!name.trim()) return "U";
  return name
    .split(" ")
    .filter((n) => n.length > 0)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export default function ActiveRentalPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { booking, pickupInspection, returnInspection, isLoading, error } =
    useActiveRental(bookingId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !booking) {
    const errorMessage = error instanceof Error ? error.message : error || "This rental doesn't exist or you don't have access to it.";
    const dashboardPath = user?.user_metadata?.role === "owner" ? "/owner/dashboard" : "/renter/dashboard";

    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Rental Not Found</h2>
            <p className="text-muted-foreground mb-6">
              {errorMessage}
            </p>
            <Button onClick={() => navigate(dashboardPath)}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const equipment = booking.equipment;
  const primaryPhoto = equipment.equipment_photos?.find((p) => p.is_primary);
  const photoUrl =
    primaryPhoto?.photo_url || equipment.equipment_photos?.[0]?.photo_url;

  const isRenter = booking.renter_id === user?.id;
  const countdown = calculateRentalCountdown(booking.start_date, booking.end_date);
  const hoursUntilEnd = differenceInHours(new Date(booking.end_date), new Date());
  const isEndingSoon = hoursUntilEnd <= 24 && hoursUntilEnd > 0;
  const isOverdue = countdown.isOverdue;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Badge variant={booking.status === "active" ? "default" : "secondary"}>
            {booking.status === "active" ? "Active Rental" : booking.status}
          </Badge>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Return Reminder Banner */}
        {isEndingSoon && !returnInspection && (
          <Alert className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/30">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <AlertTitle className="text-orange-700 dark:text-orange-400">
              Return Reminder
            </AlertTitle>
            <AlertDescription className="text-orange-600 dark:text-orange-300">
              Your rental ends in less than 24 hours. Please prepare to return the
              equipment and complete the return inspection.
            </AlertDescription>
          </Alert>
        )}

        {/* Overdue Alert */}
        {isOverdue && !returnInspection && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Rental Overdue</AlertTitle>
            <AlertDescription>
              Your rental period has ended. Please return the equipment immediately
              and complete the return inspection to avoid additional charges.
            </AlertDescription>
          </Alert>
        )}

        {/* Equipment Hero */}
        <Card className="overflow-hidden">
          <div className="relative h-48 sm:h-64 bg-muted">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={equipment.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <Package className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <h1 className="text-2xl font-bold">{equipment.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Avatar className="h-6 w-6 border border-white/30">
                  <AvatarImage 
                    src={isRenter 
                      ? equipment.owner?.avatar_url || undefined 
                      : booking.renter?.avatar_url || undefined
                    } 
                  />
                  <AvatarFallback className="text-[10px] bg-white/20">
                    {getInitials(getDisplayName(isRenter ? equipment.owner : booking.renter))}
                  </AvatarFallback>
                </Avatar>
                <p className="text-white/90">
                  {isRenter
                    ? `Renting from ${getDisplayName(equipment.owner)}`
                    : `Rented by ${getDisplayName(booking.renter)}`}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Countdown Timer */}
        <RentalCountdown startDate={booking.start_date} endDate={booking.end_date} />

        {/* Rental Details */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rental Period</p>
                  <p className="font-medium">
                    {format(new Date(booking.start_date), "MMM d")} -{" "}
                    {format(new Date(booking.end_date), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="font-medium">${(booking.total_amount ?? 0).toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {equipment.location && (
            <Card className="sm:col-span-2">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      Equipment Location
                    </p>
                    <p className="font-medium">{equipment.location}</p>
                  </div>
                  <a
                    href={`https://maps.google.com/maps?q=${encodeURIComponent(equipment.location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm">
                      Directions
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <RentalQuickActions
              bookingId={booking.id}
              ownerId={equipment.owner?.id}
              equipmentLocation={equipment.location}
              hasPickupInspection={!!pickupInspection}
              showReturnAction={isEndingSoon || isOverdue}
            />
          </CardContent>
        </Card>

        {/* Inspection Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Inspection Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Camera className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="font-medium">Pickup Inspection</p>
                  <p className="text-sm text-muted-foreground">
                    {pickupInspection?.completed_at
                      ? `Completed ${format(new Date(pickupInspection.completed_at), "MMM d, h:mm a")}`
                      : "Not completed"}
                  </p>
                </div>
              </div>
              {pickupInspection ? (
                <Link to={`/inspection/${booking.id}/view/pickup`}>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </Link>
              ) : (
                <Badge variant="secondary">Pending</Badge>
              )}
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Camera
                  className={cn("h-5 w-5", returnInspection ? "text-emerald-500" : "text-muted-foreground")}
                />
                <div>
                  <p className="font-medium">Return Inspection</p>
                  <p className="text-sm text-muted-foreground">
                    {returnInspection?.completed_at
                      ? `Completed ${format(new Date(returnInspection.completed_at), "MMM d, h:mm a")}`
                      : "Not started"}
                  </p>
                </div>
              </div>
              {returnInspection ? (
                <Link to={`/inspection/${booking.id}/view/return`}>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </Link>
              ) : (
                <Link to={`/inspection/${booking.id}/return`}>
                  <Button
                    variant={isEndingSoon || isOverdue ? "default" : "outline"}
                    size="sm"
                  >
                    Start
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Return CTA */}
        {!returnInspection && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-6 text-center">
              <Camera className="h-10 w-10 text-primary mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-2">
                {isOverdue
                  ? "Return Required"
                  : isEndingSoon
                    ? "Rental Ending Soon"
                    : "Ready to Return?"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {isOverdue
                  ? "Your rental has ended. Complete the return inspection to finalize."
                  : isEndingSoon
                    ? "Your rental ends soon. Complete the return inspection when ready."
                    : "When you're done with the equipment, start the return inspection."}
              </p>
              <Link to={`/inspection/${booking.id}/return`}>
                <Button size="lg" className="gap-2">
                  <Camera className="h-5 w-5" />
                  Start Return Inspection
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Help Link */}
        <div className="text-center">
          <Link
            to="/support"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Need help with your rental? Contact Support
          </Link>
        </div>
      </main>
    </div>
  );
}

