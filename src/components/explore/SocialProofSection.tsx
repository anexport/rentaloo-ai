import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import StarRating from "@/components/reviews/StarRating";
import { Quote } from "lucide-react";
import { useTranslation } from "react-i18next";

const SocialProofSection = () => {
  const { t } = useTranslation("marketing");

  const testimonials = [
    {
      name: t("social_proof.testimonial_1_name"),
      role: t("social_proof.testimonial_1_role"),
      rating: 5,
      text: t("social_proof.testimonial_1_text"),
      initials: "SM",
    },
    {
      name: t("social_proof.testimonial_2_name"),
      role: t("social_proof.testimonial_2_role"),
      rating: 5,
      text: t("social_proof.testimonial_2_text"),
      initials: "JC",
    },
    {
      name: t("social_proof.testimonial_3_name"),
      role: t("social_proof.testimonial_3_role"),
      rating: 5,
      text: t("social_proof.testimonial_3_text"),
      initials: "ER",
    },
  ];

  const stats = [
    { value: t("social_proof.stat_rating_value"), label: t("social_proof.stat_rating_label") },
    { value: t("social_proof.stat_reviews_value"), label: t("social_proof.stat_reviews_label") },
    { value: t("social_proof.stat_recommend_value"), label: t("social_proof.stat_recommend_label") },
  ];

  const brands = [
    t("social_proof.brand_1"),
    t("social_proof.brand_2"),
    t("social_proof.brand_3"),
    t("social_proof.brand_4"),
  ];

  return (
    <section className="py-16 sm:py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            {t("social_proof.section_title")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("social_proof.section_subtitle")}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 max-w-3xl mx-auto mb-12">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial) => (
            <Card
              key={testimonial.name}
              className="relative overflow-hidden hover:shadow-md transition-shadow"
            >
              <CardContent className="p-6 space-y-4">
                {/* Quote icon */}
                <div className="absolute top-4 right-4 opacity-10">
                  <Quote className="h-12 w-12" />
                </div>

                {/* Rating */}
                <StarRating rating={testimonial.rating} size="sm" />

                {/* Testimonial text */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  "{testimonial.text}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-2">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {testimonial.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold text-sm">
                      {testimonial.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust badges */}
        <div className="mt-12 pt-12 border-t border-border">
          <div className="text-center mb-8">
            <p className="text-sm text-muted-foreground font-medium">
              {t("social_proof.trust_label")}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-40">
            {/* Placeholder for actual logos */}
            {brands.map((brand) => (
              <div
                key={brand}
                className="text-lg font-bold text-muted-foreground"
              >
                {brand}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialProofSection;
