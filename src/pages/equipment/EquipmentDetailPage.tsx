import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchListingById } from "@/features/equipment/services/listings";
import { Separator } from "@/components/ui/separator";
import { MapPin } from "lucide-react";
import StarRating from "@/components/reviews/StarRating";

const EquipmentDetailPage = () => {
  const { id } = useParams();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => fetchListingById(id!),
    enabled: !!id,
  });

  if (!id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Missing equipment id.</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (isError) {
    // Optional: log for debugging
    // Using console.error to avoid crashing UI
    console.error("Failed to load equipment details:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">
          Failed to load equipment details{message ? `: ${message}` : "."}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Equipment not found.</div>
      </div>
    );
  }

  const avgRating = (() => {
    if (!data.reviews || data.reviews.length === 0) return 0;
    const validRatings = data.reviews.filter(
      (r) => typeof r.rating === "number" && Number.isFinite(r.rating)
    );
    if (validRatings.length === 0) return 0;
    const sum = validRatings.reduce((acc, r) => acc + r.rating, 0);
    return sum / validRatings.length;
  })();

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-semibold text-foreground">{data.title}</h1>
        <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" /> {data.location}
          </div>
          {avgRating > 0 && (
            <div className="flex items-center gap-2">
              <StarRating rating={avgRating} size="sm" />
              <span>{avgRating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Gallery */}
        {data.photos && data.photos.length > 0 && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <img
              src={data.photos[0].photo_url}
              alt={data.title}
              className="w-full h-64 object-cover rounded-md"
            />
            {data.photos.slice(1, 3).map((p, idx) => (
              <img
                key={p.id}
                src={p.photo_url}
                alt={p.alt || p.description || `${data.title} - photo ${idx + 2}`}
                className="w-full h-64 object-cover rounded-md"
              />
            ))}
          </div>
        )}

        <div className="mt-6">
          <Separator />
        </div>

        <section className="mt-6 grid md:grid-cols-[1fr_320px] gap-8">
          <div>
            <h2 className="text-lg font-semibold">About this item</h2>
            <p className="mt-2 text-foreground leading-relaxed">
              {data.description}
            </p>
            <div className="mt-6">
              <h3 className="font-medium">Condition</h3>
              <p className="text-sm text-muted-foreground capitalize">
                {data.condition}
              </p>
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-semibold">Where you'll pick up</h2>
              <div className="mt-3 h-52 w-full rounded-md border border-border bg-muted flex items-center justify-center text-muted-foreground">
                Map placeholder
              </div>
            </div>
          </div>

          <aside className="h-fit rounded-md border border-border p-4 bg-card">
            <div className="text-2xl font-bold text-foreground">
              ${data.daily_rate}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                / day
              </span>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Category: {data.category?.name}
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              Contact the owner to arrange pickup after booking.
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
};

export default EquipmentDetailPage;
