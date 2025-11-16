import { useNavigate } from "react-router-dom";
import { usePrefetchData } from "@/hooks/usePrefetchData";
import HeroSection from "@/components/explore/HeroSection";
import HowItWorksSection from "@/components/explore/HowItWorksSection";
import OwnerCTASection from "@/components/explore/OwnerCTASection";
import SocialProofSection from "@/components/explore/SocialProofSection";
import FeaturedListingsSection from "@/components/explore/FeaturedListingsSection";
import SearchBarPopover from "@/components/explore/SearchBarPopover";
import type { SearchBarFilters } from "@/types/search";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
  const navigate = useNavigate();

  // Prefetch data for better performance when navigating to explore page
  usePrefetchData();

  const handleSearch = (filters: SearchBarFilters) => {
    const params = new URLSearchParams();

    if (filters.search) params.set("search", filters.search);
    if (filters.location) params.set("location", filters.location);
    if (filters.category && filters.category !== "all") {
      params.set("category", filters.category);
    }
    if (filters.priceMin !== undefined) {
      params.set("priceMin", filters.priceMin.toString());
    }
    if (filters.priceMax !== undefined) {
      params.set("priceMax", filters.priceMax.toString());
    }

    navigate(`/explore?${params.toString()}`);
  };

  const handleBrowseAll = () => {
    navigate("/explore");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <HeroSection>
        <SearchBarPopover onFiltersChange={handleSearch} />
      </HeroSection>

      {/* Browse All CTA */}
      <div className="container mx-auto px-4 -mt-8 mb-12">
        <div className="text-center">
          <Button
            size="lg"
            onClick={handleBrowseAll}
            className="group"
          >
            Browse All Equipment
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>

      {/* How It Works */}
      <HowItWorksSection />

      {/* Featured Listings */}
      <FeaturedListingsSection />

      {/* Owner CTA */}
      <OwnerCTASection />

      {/* Social Proof */}
      <SocialProofSection />

      {/* Footer CTA */}
      <div className="bg-muted py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to start renting?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of renters and owners making the most of their outdoor
            gear. Start browsing equipment near you today.
          </p>
          <Button size="lg" onClick={handleBrowseAll}>
            Start Browsing
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
