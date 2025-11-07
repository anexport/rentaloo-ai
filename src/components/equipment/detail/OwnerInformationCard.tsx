import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Separator } from "@/components/ui/separator";
import { Star, CheckCircle2 } from "lucide-react";

interface Owner {
  id: string;
  name?: string;
  email: string;
  avatar_url?: string;
  // Additional owner stats (you may need to fetch these separately)
  joinedDate?: string;
  totalRentals?: number;
  responseRate?: number;
  rating?: number;
  isVerified?: boolean;
}

interface OwnerInformationCardProps {
  owner: Owner;
}

export const OwnerInformationCard = ({ owner }: OwnerInformationCardProps) => {
  // Generate initials from email if no name
  const getInitials = (email: string, name?: string) => {
    if (name) {
      const parts = name.split(" ");
      return parts.length > 1
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : name.slice(0, 2).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  };

  const initials = getInitials(owner.email, owner.name);
  const displayName = owner.name || owner.email.split("@")[0];

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
      <HoverCard>
        <HoverCardTrigger asChild>
          <div className="flex items-center gap-3 cursor-pointer group">
            <Avatar className="h-12 w-12 border-2 border-primary/20 group-hover:border-primary/40 transition-colors">
              <AvatarImage src={owner.avatar_url} alt={displayName} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                Owned by {displayName}
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {owner.rating !== undefined && owner.rating > 0 && (
                  <>
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span>{owner.rating.toFixed(1)} rating</span>
                  </>
                )}
                {owner.totalRentals !== undefined && owner.totalRentals > 0 && (
                  <>
                    <span>·</span>
                    <span>{owner.totalRentals} rentals</span>
                  </>
                )}
                {owner.isVerified && (
                  <>
                    <span>·</span>
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span>Verified</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-80" align="start">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-16 w-16">
                <AvatarImage src={owner.avatar_url} alt={displayName} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-semibold text-lg">{displayName}</h4>
                {owner.joinedDate && (
                  <p className="text-sm text-muted-foreground">
                    Member since {owner.joinedDate}
                  </p>
                )}
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
              {owner.totalRentals !== undefined && (
                <div>
                  <p className="text-muted-foreground">Total Rentals</p>
                  <p className="font-semibold">{owner.totalRentals}</p>
                </div>
              )}
              {owner.responseRate !== undefined && (
                <div>
                  <p className="text-muted-foreground">Response Rate</p>
                  <p className="font-semibold">{owner.responseRate}%</p>
                </div>
              )}
              {owner.rating !== undefined && (
                <div>
                  <p className="text-muted-foreground">Avg. Rating</p>
                  <p className="font-semibold flex items-center gap-1">
                    {owner.rating.toFixed(1)}
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  </p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Verified</p>
                <p className="font-semibold flex items-center gap-1">
                  {owner.isVerified ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Yes</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">No</span>
                  )}
                </p>
              </div>
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground">
              Hover over features for more details about this owner
            </p>
          </div>
        </HoverCardContent>
      </HoverCard>
    </div>
  );
};

