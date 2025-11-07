import { useState, useCallback, useRef, useEffect } from "react";
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
  CreditCard,
} from "lucide-react";
import { fetchListingById } from "@/components/equipment/services/listings";
import { EquipmentHeader } from "./EquipmentHeader";
import { EquipmentPhotoGallery } from "./EquipmentPhotoGallery";
import { EquipmentOverviewTab } from "./EquipmentOverviewTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import BookingSidebar from "@/components/booking/BookingSidebar";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import EquipmentLocationMap from "../EquipmentLocationMap";
import ReviewList from "@/components/reviews/ReviewList";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { createMaxWidthQuery } from "@/config/breakpoints";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import BookingRequestForm from "@/components/booking/BookingRequestForm";
import PaymentForm from "@/components/payment/PaymentForm";
import { supabase } from "@/lib/supabase";
import type { Listing } from "@/components/equipment/services/listings";
import type { BookingCalculation, BookingConflict } from "@/types/booking";
import { calculateBookingTotal, checkBookingConflicts } from "@/lib/booking";
import type { DateRange } from "react-day-picker";

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
  const [bookingRequestId, setBookingRequestId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [conflicts, setConflicts] = useState<BookingConflict[]>([]);
  const [loadingConflicts, setLoadingConflicts] = useState(false);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [isCancellingBooking, setIsCancellingBooking] = useState(false);
  const requestIdRef = useRef(0);

  const handleCalculationChange = useCallback(
    (calc: BookingCalculation | null, startDate: string, endDate: string) => {
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

  // Calculate booking when both dates are selected
  const calculateBooking = useCallback(
    (startDate: string, endDate: string) => {
      if (!data) return;

      const newCalculation = calculateBookingTotal(
        data.daily_rate,
        startDate,
        endDate
      );
      setCalculation(newCalculation);
      handleCalculationChange(newCalculation, startDate, endDate);

      // Check for conflicts
      requestIdRef.current += 1;
      const currentRequestId = requestIdRef.current;

      const checkConflicts = async () => {
        setLoadingConflicts(true);
        try {
          const result = await checkBookingConflicts(
            data.id,
            startDate,
            endDate
          );

          if (currentRequestId === requestIdRef.current) {
            setConflicts(result);
          }
        } catch (error) {
          if (currentRequestId === requestIdRef.current) {
            console.error("Error checking booking conflicts:", error);
            setConflicts([
              {
                type: "unavailable",
                message: "Could not verify availability — please try again",
              },
            ]);
          }
        } finally {
          if (currentRequestId === requestIdRef.current) {
            setLoadingConflicts(false);
          }
        }
      };

      void checkConflicts();
    },
    [data, handleCalculationChange]
  );

  // Handle start date selection
  const handleStartDateSelect = useCallback(
    (date: Date | undefined) => {
      if (!date) {
        requestIdRef.current += 1;
        setDateRange(undefined);
        setCalculation(null);
        setWatchedStartDate("");
        setWatchedEndDate("");
        setConflicts([]);
        return;
      }

      const newStartDate = date.toISOString().split("T")[0];
      const endDate = dateRange?.to
        ? dateRange.to.toISOString().split("T")[0]
        : null;

      // If end date exists and is before start date, clear end date
      if (endDate && endDate < newStartDate) {
        setDateRange({ from: date, to: undefined });
        setWatchedStartDate(newStartDate);
        setWatchedEndDate("");
        setCalculation(null);
        setConflicts([]);
        return;
      }

      const newRange: DateRange = {
        from: date,
        to: dateRange?.to,
      };
      setDateRange(newRange);
      setWatchedStartDate(newStartDate);

      // If both dates are selected, calculate
      if (endDate && endDate >= newStartDate) {
        calculateBooking(newStartDate, endDate);
      }
    },
    [dateRange, calculateBooking]
  );

  // Handle end date selection
  const handleEndDateSelect = useCallback(
    (date: Date | undefined) => {
      if (!date) {
        requestIdRef.current += 1;
        if (dateRange?.from) {
          setDateRange({ from: dateRange.from, to: undefined });
        } else {
          setDateRange(undefined);
        }
        setCalculation(null);
        setWatchedEndDate("");
        setConflicts([]);
        return;
      }

      const startDate = dateRange?.from
        ? dateRange.from.toISOString().split("T")[0]
        : null;

      if (!startDate) {
        // If no start date, set this as start date
        const newStartDate = date.toISOString().split("T")[0];
        setDateRange({ from: date, to: undefined });
        setWatchedStartDate(newStartDate);
        setWatchedEndDate("");
        return;
      }

      const newEndDate = date.toISOString().split("T")[0];

      // Validate end date is after start date
      if (newEndDate < startDate) {
        return;
      }

      if (!dateRange?.from) {
        return;
      }

      const newRange: DateRange = {
        from: dateRange.from,
        to: date,
      };
      setDateRange(newRange);
      setWatchedEndDate(newEndDate);

      // Calculate booking
      calculateBooking(startDate, newEndDate);
    },
    [dateRange, calculateBooking]
  );

  // Handle creating booking request and initializing payment
  const handleBookAndPay = useCallback(async () => {
    // Early return if loading conflicts or already creating
    if (loadingConflicts || isCreatingBooking) {
      return;
    }

    if (
      !user ||
      !data ||
      !dateRange?.from ||
      !dateRange?.to ||
      conflicts.length > 0
    ) {
      return;
    }

    // Check if user is trying to book their own equipment
    if (data.owner?.id === user.id) {
      toast({
        variant: "destructive",
        title: "Cannot Book Own Equipment",
        description: "You cannot book your own equipment.",
      });
      return;
    }

    if (!data.category) {
      toast({
        variant: "destructive",
        title: "Missing Category Information",
        description: "Equipment category information is missing.",
      });
      return;
    }

    setIsCreatingBooking(true);

    try {
      const startDate = dateRange.from.toISOString().split("T")[0];
      const endDate = dateRange.to.toISOString().split("T")[0];

      const bookingData = {
        equipment_id: data.id,
        renter_id: user.id,
        start_date: startDate,
        end_date: endDate,
        total_amount: calculation?.total || 0,
        status: "pending" as const,
        message: null,
      };

      const { data: newBooking, error } = await supabase
        .from("booking_requests")
        .insert(bookingData)
        .select()
        .single();

      if (error) throw error;

      // Set booking request ID to trigger payment form
      if (newBooking) {
        setBookingRequestId(newBooking.id);
        setActiveTab("book");
      }
    } catch (error) {
      console.error("Error creating booking request:", error);
      toast({
        variant: "destructive",
        title: "Booking Failed",
        description: "Failed to create booking request. Please try again.",
      });
    } finally {
      setIsCreatingBooking(false);
    }
  }, [
    user,
    data,
    dateRange,
    conflicts,
    calculation,
    toast,
    loadingConflicts,
    isCreatingBooking,
  ]);

  // Handle booking button click
  const handleBooking = useCallback(() => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Login Required",
        description: "Please log in to book this equipment.",
      });
      return;
    }
    void handleBookAndPay();
  }, [user, toast, handleBookAndPay]);

  // Reset calendar and dates when dialog closes
  useEffect(() => {
    if (!open) {
      // If there's a pending booking request, clean it up
      const cleanupBookingRequest = async () => {
        // Capture the current bookingRequestId before clearing state
        const currentBookingRequestId = bookingRequestId;

        if (currentBookingRequestId) {
          try {
            // Check if booking request still exists and is pending
            const { data: existingRequest, error: checkError } = await supabase
              .from("booking_requests")
              .select("id, status")
              .eq("id", currentBookingRequestId)
              .maybeSingle();

            if (checkError && checkError.code !== "PGRST116") {
              console.error("Error checking booking request:", checkError);
              return;
            }

            // If booking request exists and is still pending, delete it
            if (existingRequest && existingRequest.status === "pending") {
              const { error: deleteError } = await supabase
                .from("booking_requests")
                .delete()
                .eq("id", currentBookingRequestId)
                .eq("status", "pending");

              if (deleteError) {
                console.error("Error deleting booking request:", deleteError);
              }
            }
          } catch (error) {
            console.error("Error cleaning up booking request:", error);
          }
        }
      };

      void cleanupBookingRequest();

      // Clear local state
      setDateRange(undefined);
      setCalculation(null);
      setWatchedStartDate("");
      setWatchedEndDate("");
      setConflicts([]);
      setBookingRequestId(null);
      setIsCreatingBooking(false);
      setIsCancellingBooking(false);
    }
  }, [open, bookingRequestId]);

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
        <EquipmentHeader
          title={data.title}
          location={data.location}
          condition={data.condition}
          avgRating={avgRating}
          reviewCount={data.reviews?.length || 0}
        />

        <Separator />

        {/* Photo Gallery - Airbnb style */}
        <EquipmentPhotoGallery
          photos={photos}
          equipmentTitle={data.title}
        />

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
                <EquipmentOverviewTab
                  description={data.description}
                  condition={data.condition}
                  category={data.category}
                />
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
                ) : bookingRequestId && calculation ? (
                  <PaymentForm
                    bookingRequestId={bookingRequestId}
                    ownerId={data.owner?.id || ""}
                    totalAmount={calculation.total}
                    isCancelling={isCancellingBooking}
                    onSuccess={() => {
                      setActiveTab("overview");
                      toast({
                        title: "Payment Successful",
                        description:
                          "Your booking has been confirmed! The owner has been notified.",
                      });
                      setBookingRequestId(null);
                    }}
                    onCancel={async () => {
                      if (!bookingRequestId || isCancellingBooking) return;

                      setIsCancellingBooking(true);

                      try {
                        // Check if booking request still exists (idempotency)
                        const { data: existingRequest, error: checkError } =
                          await supabase
                            .from("booking_requests")
                            .select("id, status")
                            .eq("id", bookingRequestId)
                            .maybeSingle();

                        if (checkError && checkError.code !== "PGRST116") {
                          throw checkError;
                        }

                        // If booking request exists and is still pending, delete it
                        if (
                          existingRequest &&
                          existingRequest.status === "pending"
                        ) {
                          const { error: deleteError } = await supabase
                            .from("booking_requests")
                            .delete()
                            .eq("id", bookingRequestId)
                            .eq("status", "pending"); // Only delete if still pending (safety check)

                          if (deleteError) throw deleteError;
                        }

                        // Clear local state and update UI
                        setBookingRequestId(null);
                        setActiveTab("overview");

                        toast({
                          title: "Booking Cancelled",
                          description:
                            "Your booking request has been cancelled.",
                        });
                      } catch (error) {
                        console.error(
                          "Error cancelling booking request:",
                          error
                        );
                        toast({
                          variant: "destructive",
                          title: "Cancellation Failed",
                          description:
                            "Failed to cancel booking request. Please try again.",
                        });
                      } finally {
                        setIsCancellingBooking(false);
                      }
                    }}
                  />
                ) : (
                  <BookingRequestForm
                    equipment={{
                      ...data,
                      category: data.category,
                    }}
                    onSuccess={(id) => {
                      setBookingRequestId(id);
                    }}
                    isEmbedded={true}
                    initialDates={
                      watchedStartDate && watchedEndDate
                        ? {
                            start_date: watchedStartDate,
                            end_date: watchedEndDate,
                          }
                        : undefined
                    }
                    onCalculationChange={handleCalculationChange}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sticky booking sidebar */}
          <BookingSidebar
            listing={data}
            avgRating={avgRating}
            reviewCount={data.reviews?.length || 0}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onStartDateSelect={handleStartDateSelect}
            onEndDateSelect={handleEndDateSelect}
            conflicts={conflicts}
            loadingConflicts={loadingConflicts}
            calculation={calculation}
            watchedStartDate={watchedStartDate}
            watchedEndDate={watchedEndDate}
            onBooking={handleBooking}
            isCreatingBooking={isCreatingBooking}
            user={user}
          />
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
