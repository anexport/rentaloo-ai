import { Badge } from "@/components/ui/badge";
import CountUp from "@/components/ui/count-up";
import { TrendingUp, Shield, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

type Props = {
  children: React.ReactNode;
};

const HeroSection = ({ children }: Props) => {
  const { t } = useTranslation("marketing");

  return (
    <div className="relative bg-gradient-to-br from-primary/5 via-background to-accent/5 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="text-center space-y-6 mb-8">
          {/* Main headline */}
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              {t("hero.main_headline")}{" "}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {t("hero.highlight")}
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
              {t("hero.subheading")}{" "}
              <span className="font-semibold text-foreground">
                {t("hero.insurance")}
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
              {t("hero.badge_secure")}
            </Badge>
            <Badge
              variant="secondary"
              className="px-4 py-2 text-sm font-medium flex items-center gap-2"
            >
              <Users className="h-4 w-4 text-primary" />
              {t("hero.badge_verified")}
            </Badge>
            <Badge
              variant="secondary"
              className="px-4 py-2 text-sm font-medium flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4 text-primary" />
              {t("hero.badge_prices")}
            </Badge>
          </div>
        </div>

        {/* Search bar passed as children */}
        <div className="mb-8">{children}</div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 sm:gap-6 max-w-2xl mx-auto">
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-foreground">
              <CountUp end={15000} duration={2000} suffix="+" />
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">
              {t("hero.stat_items")}
            </div>
          </div>
          <div className="text-center border-x border-border">
            <div className="text-2xl sm:text-3xl font-bold text-foreground">
              <CountUp end={5000} duration={2000} suffix="+" />
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">
              {t("hero.stat_renters")}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-foreground">
              <CountUp end={50} duration={1500} suffix="+" />
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">
              {t("hero.stat_cities")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
