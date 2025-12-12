import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Sparkles, Clock, ChevronRight, ChevronLeft } from "lucide-react";
import ListingCard from "@/components/equipment/ListingCard";
import ListingCardSkeleton from "@/components/equipment/ListingCardSkeleton";
import type { Listing } from "@/components/equipment/services/listings";
import { fetchListings } from "@/components/equipment/services/listings";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

type RecommendationType = "category" | "recent";

interface RecommendationSection {
  type: RecommendationType;
  title: string;
  description: string;
  listings: Listing[];
  loading: boolean;
}

type RecommendationsSectionProps = {
  onOpenListing?: (listing: Listing) => void;
};

const RecommendationsSection = ({ onOpenListing }: RecommendationsSectionProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [sections, setSections] = useState<RecommendationSection[]>([
    {
      type: "category",
      title: "Based on Your Rentals",
      description: "Equipment similar to what you've rented before",
      listings: [],
      loading: true,
    },
    {
      type: "recent",
      title: "Continue Exploring",
      description: "Recently viewed equipment",
      listings: [],
      loading: true,
    },
  ]);

  // Carousel for category section with autoplay
  const [categoryRef, categoryApi] = useEmblaCarousel(
    {
      loop: true,
      align: "start",
      skipSnaps: false,
      dragFree: false,
    },
    [
      Autoplay({
        delay: 3000,
        stopOnInteraction: true,
        stopOnMouseEnter: true,
      }),
    ]
  );

  // Carousel for recent section
  const [recentRef, recentApi] = useEmblaCarousel({
    loop: false,
    align: "start",
    skipSnaps: false,
    dragFree: true,
  });

  const scrollCategoryPrev = useCallback(() => {
    if (categoryApi) categoryApi.scrollPrev();
  }, [categoryApi]);

  const scrollCategoryNext = useCallback(() => {
    if (categoryApi) categoryApi.scrollNext();
  }, [categoryApi]);

  const scrollRecentPrev = useCallback(() => {
    if (recentApi) recentApi.scrollPrev();
  }, [recentApi]);

  const scrollRecentNext = useCallback(() => {
    if (recentApi) recentApi.scrollNext();
  }, [recentApi]);

  const handleViewAll = () => {
    navigate("/explore");
  };

  // Resume autoplay after manual navigation
  useEffect(() => {
    if (!categoryApi) return;

    const autoplay = categoryApi.plugins()?.autoplay;
    if (!autoplay) return;

    const onSelect = () => {
      // Reset autoplay timer on manual scroll
      autoplay.reset();
    };

    categoryApi.on("select", onSelect);
    return () => {
      categoryApi.off("select", onSelect);
    };
  }, [categoryApi]);

  useEffect(() => {
    const loadRecommendations = async () => {
      if (!user) return;

      try {
        // Fetch user's booking history to get categories they've rented
        const { data: bookings, error: bookingsError } = await supabase
          .from("booking_requests")
          .select("equipment:equipment(category_id)")
          .eq("renter_id", user.id)
          .eq("status", "approved")
          .limit(10);

        if (bookingsError) {
          console.error("Error fetching booking history:", bookingsError);
        }

        // Get unique category IDs
        const categoryIds = [
          ...new Set(
            bookings
              ?.map((b) => (b.equipment as { category_id: string })?.category_id)
              .filter(Boolean) || []
          ),
        ] as string[];

        // Load category-based recommendations
        if (categoryIds.length > 0) {
          try {
            const categoryListings = await fetchListings({
              categoryId: categoryIds[0],
              limit: 10,
            });
            setSections((prev) =>
              prev.map((s) =>
                s.type === "category"
                  ? { ...s, listings: categoryListings, loading: false }
                  : s
              )
            );
          } catch (error) {
            console.error("Error loading category recommendations:", error);
            setSections((prev) =>
              prev.map((s) =>
                s.type === "category" ? { ...s, loading: false } : s
              )
            );
          }
        } else {
          // If no category history, show popular items
          try {
            const popularListings = await fetchListings({ limit: 10 });
            setSections((prev) =>
              prev.map((s) =>
                s.type === "category"
                  ? { ...s, listings: popularListings, loading: false }
                  : s
              )
            );
          } catch (error) {
            console.error("Error loading popular listings:", error);
            setSections((prev) =>
              prev.map((s) =>
                s.type === "category" ? { ...s, loading: false } : s
              )
            );
          }
        }

        // Load recently viewed (from localStorage)
        let recentlyViewedIds: string[] = [];
        try {
          const stored = localStorage.getItem("recentlyViewedEquipment");
          recentlyViewedIds = stored ? JSON.parse(stored) : [];
          if (!Array.isArray(recentlyViewedIds)) {
            recentlyViewedIds = [];
          }
        } catch (error) {
          console.error("Failed to parse recently viewed equipment:", error);
        }

        if (recentlyViewedIds.length > 0) {
          try {
            const idsToFetch = recentlyViewedIds.slice(0, 10);
            const { data, error } = await supabase
              .from("equipment")
              .select(
                `*,
                 category:categories(*),
                 photos:equipment_photos(*),
                 owner:profiles!equipment_owner_id_fkey(id,email,identity_verified)
                `
              )
              .in("id", idsToFetch)
              .eq("is_available", true);

            if (error) {
              console.error("Error loading recent recommendations:", error);
              setSections((prev) =>
                prev.map((s) =>
                  s.type === "recent" ? { ...s, loading: false } : s
                )
              );
            } else if (data) {
              // Preserve original viewing order
              const dataMap = new Map(data.map((d) => [d.id, d]));
              const recentListings: Listing[] = [];
              for (const id of idsToFetch) {
                const item = dataMap.get(id);
                if (item) recentListings.push(item as Listing);
              }
              setSections((prev) =>
                prev.map((s) =>
                  s.type === "recent"
                    ? { ...s, listings: recentListings, loading: false }
                    : s
                )
              );
            }
          } catch (error) {
            console.error("Error loading recent recommendations:", error);
            setSections((prev) =>
              prev.map((s) =>
                s.type === "recent" ? { ...s, loading: false } : s
              )
            );
          }
        } else {
          setSections((prev) =>
            prev.map((s) =>
              s.type === "recent" ? { ...s, loading: false } : s
            )
          );
        }
      } catch (error) {
        console.error("Error loading recommendations:", error);
        setSections((prev) =>
          prev.map((s) => ({ ...s, loading: false }))
        );
      }
    };

    void loadRecommendations();
  }, [user]);

  // Return null for anonymous users
  if (!user) {
    return null;
  }

  const getSectionIcon = (type: RecommendationType) => {
    switch (type) {
      case "category":
        return <Sparkles className="h-6 w-6 text-primary" />;
      case "recent":
        return <Clock className="h-6 w-6 text-primary" />;
    }
  };

  const getCarouselControls = (type: RecommendationType) => {
    if (type === "category") {
      return { scrollPrev: scrollCategoryPrev, scrollNext: scrollCategoryNext };
    }
    return { scrollPrev: scrollRecentPrev, scrollNext: scrollRecentNext };
  };

  const getCarouselRef = (type: RecommendationType) => {
    return type === "category" ? categoryRef : recentRef;
  };

  // Check if there's any content to show
  const hasContent = sections.some(s => !s.loading && s.listings.length > 0);
  const isLoading = sections.some(s => s.loading);

  // Don't render if there's nothing to show
  if (!isLoading && !hasContent) {
    return null;
  }

  return (
    <>
      {sections.map((section, index) => {
        // Skip empty sections (but show loading state)
        if (!section.loading && section.listings.length === 0) {
          return null;
        }

        const controls = getCarouselControls(section.type);
        const carouselRef = getCarouselRef(section.type);

        // Loading state
        if (section.loading) {
          return (
            <section
              key={section.type}
              className={`py-16 sm:py-20 ${index % 2 === 0 ? "bg-muted/30" : "bg-background"}`}
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {getSectionIcon(section.type)}
                      <h2 className="text-3xl font-bold">{section.title}</h2>
                    </div>
                    <p className="text-muted-foreground">{section.description}</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <ListingCardSkeleton key={i} />
                  ))}
                </div>
              </div>
            </section>
          );
        }

        // Content state
        return (
          <section
            key={section.type}
            className={`py-16 sm:py-20 ${index % 2 === 0 ? "bg-muted/30" : "bg-background"}`}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {getSectionIcon(section.type)}
                    <h2 className="text-3xl font-bold">{section.title}</h2>
                  </div>
                  <p className="text-muted-foreground">{section.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={controls.scrollPrev}
                    className="hidden sm:flex h-10 w-10 rounded-full"
                    aria-label="Previous slide"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={controls.scrollNext}
                    className="hidden sm:flex h-10 w-10 rounded-full"
                    aria-label="Next slide"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleViewAll}
                    className="hidden sm:flex items-center gap-2"
                    aria-label={`View all ${section.title.toLowerCase()}`}
                  >
                    View all
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="overflow-hidden" ref={carouselRef}>
                <div className="flex gap-6">
                  {section.listings.map((listing) => (
                    <div
                      key={listing.id}
                      className="flex-[0_0_100%] min-w-0 sm:flex-[0_0_calc(50%-12px)] lg:flex-[0_0_calc(25%-18px)]"
                    >
                      <ListingCard listing={listing} onOpen={onOpenListing} className="h-full" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile controls */}
              <div className="mt-6 sm:hidden">
                <div className="flex justify-center gap-2 mb-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={controls.scrollPrev}
                    className="h-10 w-10 rounded-full"
                    aria-label="Previous slide"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={controls.scrollNext}
                    className="h-10 w-10 rounded-full"
                    aria-label="Next slide"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex justify-center">
                  <Button
                    variant="ghost"
                    onClick={handleViewAll}
                    className="flex items-center gap-2"
                    aria-label={`View all ${section.title.toLowerCase()}`}
                  >
                    View all
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
};

export default RecommendationsSection;
