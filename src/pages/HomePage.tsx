import { useState } from "react";
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
  const [searchFilters, setSearchFilters] = useState<SearchBarFilters>({
    search: "",
    location: "",
    condition: "all",
    priceMin: undefined,
    priceMax: undefined,
    dateRange: undefined,
    equipmentType: undefined,
  });

  // Prefetch data for better performance when navigating to explore page
  usePrefetchData();

  const handleSearchSubmit = () => {
    const params = new URLSearchParams();

    if (searchFilters.search) params.set("search", searchFilters.search);
    if (searchFilters.location) params.set("location", searchFilters.location);
    if (searchFilters.category && searchFilters.category !== "all") {
      params.set("category", searchFilters.category);
    }
    if (searchFilters.priceMin !== undefined) {
      params.set("priceMin", searchFilters.priceMin.toString());
    }
    if (searchFilters.priceMax !== undefined) {
      params.set("priceMax", searchFilters.priceMax.toString());
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
        <SearchBarPopover
          value={searchFilters}
          onChange={setSearchFilters}
          onSubmit={handleSearchSubmit}
        />
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
