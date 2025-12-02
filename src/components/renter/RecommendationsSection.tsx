import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Sparkles, TrendingUp, Clock, ArrowRight } from "lucide-react";
import ListingCard from "@/components/equipment/ListingCard";
import type { Listing } from "@/components/equipment/services/listings";
import { fetchListings } from "@/components/equipment/services/listings";
import { cn } from "@/lib/utils";

type RecommendationType = "category" | "location" | "recent";

interface RecommendationSection {
  type: RecommendationType;
  title: string;
  description: string;
  listings: Listing[];
  loading: boolean;
}

const RecommendationsSection = () => {
  const { user } = useAuth();
  const [sections, setSections] = useState<RecommendationSection[]>([
    {
      type: "category",
      title: "Based on Your Rentals",
      description: "Equipment similar to what you've rented before",
      listings: [],
      loading: true,
    },
    {
      type: "location",
      title: "Popular Near You",
      description: "Trending equipment in your area",
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

  useEffect(() => {
    const loadRecommendations = async () => {
      if (!user) return;

      try {
        // Fetch user's booking history to get categories they've rented
        const { data: bookings } = await supabase
          .from("booking_requests")
          .select("equipment:equipment(category_id)")
          .eq("renter_id", user.id)
          .eq("status", "approved")
          .limit(10);

        // Get unique category IDs
        const categoryIds = [
          ...new Set(
            bookings
              ?.map((b) => (b.equipment as { category_id: string })?.category_id)
              .filter(Boolean) || []
          ),
        ] as string[];

        // Get user's location from profile or recent bookings
        const { data: recentBooking } = await supabase
          .from("booking_requests")
          .select("equipment:equipment(location)")
          .eq("renter_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const userLocation =
          (recentBooking?.equipment as { location?: string })?.location || null;

        // Load category-based recommendations
        if (categoryIds.length > 0) {
          try {
            const categoryListings = await fetchListings({
              categoryId: categoryIds[0],
              limit: 6,
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
          const popularListings = await fetchListings({ limit: 6 });
          setSections((prev) =>
            prev.map((s) =>
              s.type === "category"
                ? { ...s, listings: popularListings, loading: false }
                : s
            )
          );
        }

        // Load location-based recommendations
        if (userLocation) {
          try {
            const locationListings = await fetchListings({
              location: userLocation,
              limit: 6,
            });
            setSections((prev) =>
              prev.map((s) =>
                s.type === "location"
                  ? { ...s, listings: locationListings, loading: false }
                  : s
              )
            );
          } catch (error) {
            console.error("Error loading location recommendations:", error);
            setSections((prev) =>
              prev.map((s) =>
                s.type === "location" ? { ...s, loading: false } : s
              )
            );
          }
        } else {
          setSections((prev) =>
            prev.map((s) =>
              s.type === "location" ? { ...s, loading: false } : s
            )
          );
        }

        // Load recently viewed (from localStorage for now)
        const recentlyViewedIds = JSON.parse(
          localStorage.getItem("recentlyViewedEquipment") || "[]"
        ) as string[];

        if (recentlyViewedIds.length > 0) {
          try {
            const recentListings: Listing[] = [];
            for (const id of recentlyViewedIds.slice(0, 6)) {
              try {
                const { data } = await supabase
                  .from("equipment")
                  .select(
                    `*,
                     category:categories(*),
                     photos:equipment_photos(*),
                     owner:profiles!equipment_owner_id_fkey(id,email,identity_verified)
                    `
                  )
                  .eq("id", id)
                  .eq("is_available", true)
                  .single();

                if (data) {
                  recentListings.push(data as Listing);
                }
              } catch (error) {
                // Skip invalid IDs
                continue;
              }
            }
            setSections((prev) =>
              prev.map((s) =>
                s.type === "recent"
                  ? { ...s, listings: recentListings, loading: false }
                  : s
              )
            );
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

  const getSectionIcon = (type: RecommendationType) => {
    switch (type) {
      case "category":
        return <Sparkles className="h-5 w-5 text-primary" />;
      case "location":
        return <TrendingUp className="h-5 w-5 text-primary" />;
      case "recent":
        return <Clock className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <div className="space-y-8">
      {sections.map((section) => {
        if (section.loading || section.listings.length === 0) {
          if (section.loading) {
            return (
              <Card key={section.type}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getSectionIcon(section.type)}
                    {section.title}
                  </CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex-shrink-0 w-80">
                        <Skeleton className="aspect-video w-full rounded-lg mb-2" />
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          }
          return null; // Don't show empty sections
        }

        return (
          <Card key={section.type}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {getSectionIcon(section.type)}
                    {section.title}
                  </CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </div>
                <Link to="/equipment">
                  <Button variant="ghost" size="sm" className="gap-1">
                    View All
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                {section.listings.map((listing) => (
                  <div
                    key={listing.id}
                    className="flex-shrink-0 w-80"
                  >
                    <ListingCard listing={listing} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default RecommendationsSection;

