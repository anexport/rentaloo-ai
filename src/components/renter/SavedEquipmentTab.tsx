import { Heart, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ListingCard from "@/components/equipment/ListingCard";
import ListingCardSkeleton from "@/components/equipment/ListingCardSkeleton";
import { useFavorites } from "@/hooks/useFavorites";
import { useSavedEquipment } from "@/hooks/useSavedEquipment";

const SavedEquipmentTab = () => {
  const { t } = useTranslation("dashboard");
  const { loading: favoritesLoading } = useFavorites();
  const { data: listings = [], isLoading, error, refetch } = useSavedEquipment();

  const loading = isLoading || favoritesLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {t("renter.saved.title", { defaultValue: "Watchlist" })}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("renter.saved.description", {
              defaultValue: "Equipment you've saved for later",
            })}
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const handleRetry = () => {
    void refetch();
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {t("renter.saved.title", { defaultValue: "Watchlist" })}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("renter.saved.description", {
              defaultValue: "Equipment you've saved for later",
            })}
          </p>
        </div>
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-destructive mb-4">
              {error instanceof Error
                ? error.message
                : "Failed to load saved equipment"}
            </p>
            <Button variant="outline" onClick={handleRetry}>
              {t("common.retry", { defaultValue: "Try Again" })}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {t("renter.saved.title", { defaultValue: "Watchlist" })}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("renter.saved.description", {
              defaultValue: "Equipment you've saved for later",
            })}
          </p>
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Heart className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {t("renter.saved.empty_state.title", {
                defaultValue: "No saved equipment yet",
              })}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              {t("renter.saved.empty_state.description", {
                defaultValue:
                  "Browse equipment and tap the heart icon to save items you're interested in.",
              })}
            </p>
            <Link to="/equipment">
              <Button size="lg">
                <Search className="h-4 w-4 mr-2" />
                {t("renter.saved.empty_state.button", {
                  defaultValue: "Browse Equipment",
                })}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {t("renter.saved.title", { defaultValue: "Watchlist" })}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("renter.saved.description", {
              defaultValue: "Equipment you've saved for later",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Heart className="h-4 w-4 text-primary" />
          <span>
            {t("renter.saved.count", {
              count: listings.length,
              defaultValue: "{{count}} saved items",
            })}
          </span>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
        {listings.map((listing, index) => (
          <div
            key={listing.id}
            className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <ListingCard listing={listing} className="h-full" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SavedEquipmentTab;

