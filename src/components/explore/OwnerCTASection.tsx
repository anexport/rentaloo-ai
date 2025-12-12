import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Calendar, Shield, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

const OwnerCTASection = () => {
  const { t } = useTranslation("marketing");

  const benefits = [
    {
      id: "benefit_1",
      icon: DollarSign,
      text: t("owner_cta.benefit_1"),
    },
    {
      id: "benefit_2",
      icon: Calendar,
      text: t("owner_cta.benefit_2"),
    },
    {
      id: "benefit_3",
      icon: Shield,
      text: t("owner_cta.benefit_3"),
    },
    {
      id: "benefit_4",
      icon: TrendingUp,
      text: t("owner_cta.benefit_4"),
    },
  ];

  return (
    <section className="py-16 sm:py-20 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div className="space-y-6">
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit">
                {t("owner_cta.badge_text")}
              </Badge>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
                {t("owner_cta.headline_part_1")}{" "}
                <span className="text-primary">{t("owner_cta.headline_part_2")}</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                {t("owner_cta.subheading")}
              </p>
            </div>

            {/* Benefits grid */}
            <div className="grid sm:grid-cols-2 gap-4">
              {benefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <div
                    key={benefit.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border"
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium">{benefit.text}</span>
                  </div>
                );
              })}
            </div>

            {/* CTA */}
            <div className="flex flex-wrap gap-4 pt-2">
              <Button size="lg" asChild>
                <Link to="/register/owner">{t("owner_cta.cta_primary")}</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/owner/dashboard">{t("owner_cta.cta_secondary")}</Link>
              </Button>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center"
                  >
                    <span className="text-xs">👤</span>
                  </div>
                ))}
              </div>
              <span>
                {t("owner_cta.social_proof_prefix")}{" "}
                <strong className="text-foreground">{t("owner_cta.social_proof_count")}</strong>{" "}
                {t("owner_cta.social_proof_suffix")}
              </span>
            </div>
          </div>

          {/* Right: Image/Visual */}
          <div className="relative">
            <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-border flex items-center justify-center overflow-hidden">
              {/* Placeholder for actual image */}
              <div className="text-center p-8">
                <div className="text-6xl mb-4">🎿⛺🚴🏔️</div>
                <p className="text-lg font-semibold text-muted-foreground">
                  {t("owner_cta.placeholder_title")}
                </p>
              </div>
            </div>

            {/* Floating stat cards */}
            <div className="absolute -bottom-4 -left-4 bg-background border border-border rounded-lg p-4 shadow-lg">
              <div className="text-2xl font-bold text-primary">{t("owner_cta.stat_earnings_value")}</div>
              <div className="text-xs text-muted-foreground">
                {t("owner_cta.stat_earnings_label")}
              </div>
            </div>
            <div className="absolute -top-4 -right-4 bg-background border border-border rounded-lg p-4 shadow-lg">
              <div className="text-2xl font-bold text-primary">{t("owner_cta.stat_booking_value")}</div>
              <div className="text-xs text-muted-foreground">
                {t("owner_cta.stat_booking_label")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OwnerCTASection;
