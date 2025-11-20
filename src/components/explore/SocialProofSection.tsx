import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import StarRating from "@/components/reviews/StarRating";
import { Quote } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Mitchell",
    role: "Adventure Enthusiast",
    rating: 5,
    text: "Saved over $800 renting ski equipment for our family trip to Tahoe. The gear was in excellent condition and the owner was incredibly helpful!",
    initials: "SM",
  },
  {
    name: "James Chen",
    role: "Weekend Warrior",
    rating: 5,
    text: "As someone who loves trying new sports, RentAloo is perfect. I've rented everything from kayaks to camping gear without breaking the bank.",
    initials: "JC",
  },
  {
    name: "Emily Rodriguez",
    role: "Equipment Owner",
    rating: 5,
    text: "I've made over $1,200 in 3 months renting out my mountain bike and camping gear. It's amazing passive income from stuff I wasn't using!",
    initials: "ER",
  },
];

const stats = [
  { value: "4.9/5", label: "Average rating" },
  { value: "2,000+", label: "Reviews" },
  { value: "98%", label: "Would recommend" },
];

const SocialProofSection = () => {
  return (
    <section className="py-16 sm:py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Loved by adventurers everywhere
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands of happy renters and owners in the RentAloo
            community
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-3xl mx-auto mb-12">
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
              TRUSTED BY LEADING ORGANIZATIONS
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-40">
            {/* Placeholder for actual logos */}
            {["REI", "Patagonia", "The North Face", "Arc'teryx"].map((brand) => (
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
