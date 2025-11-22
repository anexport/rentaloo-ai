import { Search, Calendar, Handshake, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const steps = [
  {
    icon: Search,
    title: "Search & Browse",
    description: "Find gear near you from thousands of local listings",
    step: 1,
  },
  {
    icon: Calendar,
    title: "Request to Book",
    description: "Pick your dates and send a booking request to the owner",
    step: 2,
  },
  {
    icon: Handshake,
    title: "Meet & Rent",
    description: "Pick up from the owner and enjoy your adventure",
    step: 3,
  },
  {
    icon: Star,
    title: "Return & Review",
    description: "Return the gear and leave feedback for the community",
    step: 4,
  },
];

const HowItWorksSection = () => {
  return (
    <section className="py-16 sm:py-20 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            How RentAloo works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Renting outdoor gear is simple and secure. Get started in minutes.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <Card
                key={step.step}
                className="relative overflow-hidden hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    {/* Step number badge */}
                    <div className="absolute top-4 right-4 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">
                        {step.step}
                      </span>
                    </div>

                    {/* Icon */}
                    <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold">{step.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
