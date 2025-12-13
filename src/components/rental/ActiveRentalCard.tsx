import { Link } from "react-router-dom";
import { ArrowRight, Package, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import RentalCountdown from "@/components/rental/RentalCountdown";
import type { BookingRequestWithDetails } from "@/types/booking";

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

interface ActiveRentalCardProps {
  booking: BookingRequestWithDetails;
  className?: string;
  compact?: boolean;
  viewerRole?: "renter" | "owner";
}

export default function ActiveRentalCard({
  booking,
  className,
  compact = false,
  viewerRole = "renter",
}: ActiveRentalCardProps) {
  if (!booking.equipment) return null;

  const equipment = booking.equipment;
  const primaryPhoto = equipment.equipment_photos?.find((p) => p.is_primary);
  const photoUrl = primaryPhoto?.photo_url || equipment.equipment_photos?.[0]?.photo_url;
  const counterparty =
    viewerRole === "owner" ? booking.renter : equipment.owner;
  const counterpartyLabel =
    viewerRole === "owner" ? "Rented by" : "Renting from";

  if (compact) {
    return (
      <Card className={cn("overflow-hidden hover:shadow-md transition-shadow", className)}>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            {/* Thumbnail */}
            <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={equipment.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{equipment.title}</p>
              <RentalCountdown
                startDate={booking.start_date}
                endDate={booking.end_date}
                compact
                className="mt-1"
              />
            </div>

            {/* Action */}
            <Link to={`/rental/${booking.id}`}>
              <Button size="sm" variant="ghost" className="px-2" aria-label="View rental details">
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col", className)}>
      <CardContent className="p-0 flex flex-col flex-1">
        {/* Equipment Image */}
        <div className="relative h-36 bg-muted flex-shrink-0">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={equipment.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <Package className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          <Badge className="absolute top-3 left-3 bg-emerald-500 text-white">
            Active Rental
          </Badge>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1">
          <div className="h-14 mb-4">
            <h3 className="font-semibold text-lg truncate">{equipment.title}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              {counterparty ? (
                <>
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={counterparty.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(getDisplayName(counterparty))}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">
                    {counterpartyLabel} {getDisplayName(counterparty)}
                  </span>
                </>
              ) : (
                <span>&nbsp;</span>
              )}
            </div>
          </div>

          {/* Countdown */}
          <RentalCountdown
            startDate={booking.start_date}
            endDate={booking.end_date}
            compact
          />

          {/* Action - pushed to bottom */}
          <Link to={`/rental/${booking.id}`} className="block mt-auto pt-4">
            <Button className="w-full gap-2">
              View Rental
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
