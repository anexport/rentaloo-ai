import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  Calendar as CalendarIcon,
  Info,
  MessageSquare,
  Package,
  CheckCircle2,
  CreditCard,
  DollarSign,
} from "lucide-react";
import { getCategoryIcon } from "@/lib/categoryIcons";
import StarRating from "@/components/reviews/StarRating";
import { fetchListingById } from "@/components/equipment/services/listings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import EquipmentLocationMap from "./EquipmentLocationMap";
import ReviewList from "@/components/reviews/ReviewList";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { createMaxWidthQuery } from "@/config/breakpoints";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import BookingRequestForm from "@/components/booking/BookingRequestForm";
import type { Listing } from "@/components/equipment/services/listings";
import type { BookingCalculation } from "@/types/booking";
import { formatBookingDuration } from "@/lib/booking";

type EquipmentDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId?: string;
};

// Type guard to check if listing has category
const hasCategory = (
  listing: Listing | undefined
): listing is Listing & { category: NonNullable<Listing["category"]> } => {
  return !!listing?.category;
};

const EquipmentDetailDialog = ({
  open,
  onOpenChange,
  listingId,
}: EquipmentDetailDialogProps) => {
  const isMobile = useMediaQuery(createMaxWidthQuery("md"));
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [calculation, setCalculation] = useState<BookingCalculation | null>(
    null
  );
  const [watchedStartDate, setWatchedStartDate] = useState<string>("");
  const [watchedEndDate, setWatchedEndDate] = useState<string>("");

  const handleCalculationChange = useCallback(
    (
      calc: BookingCalculation | null,
      startDate: string,
      endDate: string
    ) => {
      setCalculation(calc);
      setWatchedStartDate(startDate);
      setWatchedEndDate(endDate);
    },
    []
  );

  const { data, isLoading } = useQuery({
    queryKey: ["listing", listingId],
    queryFn: () => fetchListingById(listingId as string),
    enabled: !!listingId && open,
  });

  const avgRating = (() => {
    if (!data?.reviews || data.reviews.length === 0) return 0;
    const validRatings = data.reviews.filter(
      (r) =>
        typeof r.rating === "number" &&
        Number.isFinite(r.rating) &&
        r.rating >= 0 &&
        r.rating <= 5
    );
    if (validRatings.length === 0) return 0;
    const sum = validRatings.reduce((acc, r) => acc + r.rating, 0);
    return sum / validRatings.length;
  })();

  const photos = data?.photos || [];
  const primaryPhoto = photos[0];
  const secondaryPhotos = photos.slice(1, 5); // Up to 4 secondary photos

  const getHeaderProps = () => {
    const title = data?.title ?? "Equipment details";
    const description = data?.category?.name
      ? `Category: ${data.category.name}`
      : "Detailed information about this equipment.";
    return { title, description };
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="py-12 text-center text-muted-foreground">
          Loading...
        </div>
      );
    }

    if (!data) {
      return (
        <div className="py-12 text-center text-muted-foreground">
          Equipment not found.
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header with meta info */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">
                {data.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {data.location}
                </div>
                {avgRating > 0 && (
                  <div className="flex items-center gap-2">
                    <StarRating rating={avgRating} size="sm" />
                    <span className="font-medium">{avgRating.toFixed(1)}</span>
                    {data.reviews && data.reviews.length > 0 && (
                      <span>({data.reviews.length})</span>
                    )}
                  </div>
                )}
                <Badge variant="outline" className="capitalize">
                  {data.condition}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Photo Gallery - Airbnb style */}
        {photos.length > 0 && (
          <div className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-[60%_40%] gap-2 h-[300px] sm:h-[400px] md:h-[500px]">
              {/* Primary large image */}
              <div className="relative rounded-lg overflow-hidden border border-border">
                <img
                  src={primaryPhoto.photo_url}
                  alt={data.title}
                  className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  loading="lazy"
                />
              </div>

              {/* Secondary images grid */}
              {secondaryPhotos.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {secondaryPhotos.map((photo, idx) => (
                    <div
                      key={photo.id}
                      className="relative rounded-lg overflow-hidden border border-border group"
                    >
                      <img
                        src={photo.photo_url}
                        alt={`${data.title} - ${idx + 2}`}
                        className="w-full h-full object-cover cursor-pointer group-hover:opacity-90 transition-opacity"
                        loading="lazy"
                      />
                      {photos.length > 5 && idx === 3 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-semibold">
                          +{photos.length - 5} more
                        </div>
                      )}
                    </div>
                  ))}
                  {/* Fill empty cells if needed */}
                  {secondaryPhotos.length < 4 &&
                    Array.from({ length: 4 - secondaryPhotos.length }).map(
                      (_, idx) => (
                        <div
                          key={`empty-${idx}`}
                          className="rounded-lg border border-border bg-muted"
                          aria-hidden="true"
                        />
                      )
                    )}
                </div>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Main content with tabs and sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Main content tabs */}
          <div className="space-y-6">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger
                  value="overview"
                  className="flex items-center gap-1 sm:gap-2"
                  aria-label="Overview"
                >
                  <Info className="h-4 w-4" />
                  <span className="hidden sm:inline">Overview</span>
                </TabsTrigger>
                <TabsTrigger
                  value="availability"
                  className="flex items-center gap-1 sm:gap-2"
                  aria-label="Availability"
                >
                  <CalendarIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Availability</span>
                </TabsTrigger>
                <TabsTrigger
                  value="location"
                  className="flex items-center gap-1 sm:gap-2"
                  aria-label="Location"
                >
                  <MapPin className="h-4 w-4" />
                  <span className="hidden sm:inline">Location</span>
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="flex items-center gap-1 sm:gap-2"
                  aria-label="Reviews"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">Reviews</span>
                </TabsTrigger>
                <TabsTrigger
                  value="book"
                  className="flex items-center gap-1 sm:gap-2"
                  aria-label="Book"
                >
                  <CreditCard className="h-4 w-4" />
                  <span className="hidden sm:inline">Book</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-6">
                <div>
                  <h2 className="text-xl font-semibold mb-3">
                    About this item
                  </h2>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {data.description}
                  </p>
                </div>

                <Card>
                  <div className="p-4">
                    <div className="flex flex-wrap items-center gap-4">
                      {/* Condition */}
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground font-medium">
                            Condition
                          </span>
                          <Badge variant="outline" className="capitalize w-fit">
                            {data.condition}
                          </Badge>
                        </div>
                      </div>

                      {/* Vertical divider */}
                      <div className="h-8 w-px bg-border" />

                      {/* Category */}
                      <div className="flex items-center gap-2">
                        {data.category &&
                          (() => {
                            const CategoryIcon = getCategoryIcon(
                              data.category.name
                            );
                            return (
                              <CategoryIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                            );
                          })()}
                        {!data.category && (
                          <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground font-medium">
                            Category
                          </span>
                          <Badge variant="secondary" className="w-fit">
                            {data.category?.name || "N/A"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="availability" className="mt-6">
                <AvailabilityCalendar
                  equipmentId={data.id}
                  defaultDailyRate={data.daily_rate}
                  viewOnly={true}
                />
              </TabsContent>

              <TabsContent value="location" className="mt-6">
                <EquipmentLocationMap
                  location={data.location}
                  latitude={data.latitude}
                  longitude={data.longitude}
                />
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                <ReviewList
                  revieweeId={data.owner?.id}
                  showSummary={true}
                  showEquipment={false}
                />
              </TabsContent>

              <TabsContent value="book" className="mt-6">
                {!hasCategory(data) ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Package className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                          Category Information Missing
                        </h3>
                        <p className="text-muted-foreground max-w-md">
                          This equipment is missing category information. Please
                          contact the owner or try again later.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <BookingRequestForm
                    equipment={{
                      ...data,
                      category: data.category,
                    }}
                    onSuccess={() => {
                      setActiveTab("overview");
                      toast({
                        title: "Booking Request Submitted",
                        description:
                          "Your booking request has been submitted successfully!",
                      });
                    }}
                    isEmbedded={true}
                    onCalculationChange={handleCalculationChange}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sticky booking sidebar */}
          <aside className="lg:sticky lg:top-6 h-fit">
            <Card className="p-6 space-y-6">
              <div>
                <div className="text-3xl font-bold text-foreground">
                  ${data.daily_rate}
                  <span className="text-base font-normal text-muted-foreground">
                    {" "}
                    / day
                  </span>
                </div>
                {avgRating > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <StarRating rating={avgRating} size="sm" />
                    <span className="text-sm text-muted-foreground">
                      {avgRating.toFixed(1)} ({data.reviews?.length || 0}{" "}
                      reviews)
                    </span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">Pickup Location</h3>
                  <p className="text-sm text-muted-foreground flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                    {data.location}
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h3 className="font-semibold">Contact</h3>
                  <p className="text-sm text-muted-foreground">
                    Contact the owner to arrange pickup after booking.
                  </p>
                </div>
              </div>

              <Separator />

              {/* Pricing Breakdown */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Pricing Breakdown
                </h3>
                {calculation && watchedStartDate && watchedEndDate ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-medium">
                        {formatBookingDuration(watchedStartDate, watchedEndDate)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Daily Rate:</span>
                      <span className="font-medium">
                        ${calculation.daily_rate}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Subtotal ({calculation.days} days):
                      </span>
                      <span className="font-medium">
                        ${calculation.subtotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Service Fee (5%):
                      </span>
                      <span className="font-medium">
                        ${calculation.fees.toFixed(2)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold text-base">
                      <span>Total:</span>
                      <span>${calculation.total.toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select dates to see pricing breakdown.
                  </p>
                )}
              </div>

              <Button
                className="w-full"
                size="lg"
                aria-label="Request to book this equipment"
                onClick={() => {
                  if (!user) {
                    toast({
                      variant: "destructive",
                      title: "Login Required",
                      description: "Please log in to request a booking.",
                    });
                    return;
                  }
                  if (data?.owner?.id === user.id) {
                    toast({
                      variant: "destructive",
                      title: "Cannot Book Own Equipment",
                      description: "You cannot book your own equipment.",
                    });
                    return;
                  }
                  if (!data?.category) {
                    toast({
                      variant: "destructive",
                      title: "Missing Category Information",
                      description: "Equipment category information is missing.",
                    });
                    return;
                  }
                  setActiveTab("book");
                }}
              >
                {!user
                  ? "Login to Book"
                  : data?.owner?.id === user.id
                  ? "Your Equipment"
                  : "Request to Book"}
              </Button>
            </Card>
          </aside>
        </div>
      </div>
    );
  };

  // Mobile: Use Sheet component
  if (isMobile) {
    const { title, description } = getHeaderProps();
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[90vh] max-h-[90vh] w-full overflow-y-auto px-0"
        >
          <SheetHeader className="px-6">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <div className="mt-6 px-6 pb-6">{renderContent()}</div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Use Dialog component
  const { title, description } = getHeaderProps();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};

export default EquipmentDetailDialog;
