import { Badge } from "@/components/ui/badge";
import { TrendingUp, Shield, Users } from "lucide-react";

type Props = {
  children: React.ReactNode;
};

const HeroSection = ({ children }: Props) => {
  return (
    <div className="relative bg-gradient-to-br from-primary/5 via-background to-accent/5 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="text-center space-y-6 mb-8">
          {/* Main headline */}
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              Rent outdoor gear from{" "}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                locals nearby
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
              Save 50-80% vs. buying. Access thousands of items with{" "}
              <span className="font-semibold text-foreground">
                $1M insurance coverage
              </span>
              .
            </p>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <Badge
              variant="secondary"
              className="px-4 py-2 text-sm font-medium flex items-center gap-2"
            >
              <Shield className="h-4 w-4 text-primary" />
              Secure payments
            </Badge>
            <Badge
              variant="secondary"
              className="px-4 py-2 text-sm font-medium flex items-center gap-2"
            >
              <Users className="h-4 w-4 text-primary" />
              Verified owners
            </Badge>
            <Badge
              variant="secondary"
              className="px-4 py-2 text-sm font-medium flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4 text-primary" />
              Best prices
            </Badge>
          </div>
        </div>

        {/* Search bar passed as children */}
        <div className="mb-8">{children}</div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 sm:gap-6 max-w-2xl mx-auto">
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-foreground">
              15,000+
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">
              Items available
            </div>
          </div>
          <div className="text-center border-x border-border">
            <div className="text-2xl sm:text-3xl font-bold text-foreground">
              5,000+
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">
              Happy renters
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-foreground">
              50+
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">
              Cities
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
