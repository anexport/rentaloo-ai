import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  Info,
  Package,
  Star,
} from "lucide-react";
import { fetchListingById } from "@/components/equipment/services/listings";
import { EquipmentHeader } from "./EquipmentHeader";
import { EquipmentPhotoGallery } from "./EquipmentPhotoGallery";
import { EquipmentOverviewTab } from "./EquipmentOverviewTab";
import { DetailsTab } from "./DetailsTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BookingSidebar from "@/components/booking/BookingSidebar";
import { FloatingBookingCTA } from "@/components/booking/FloatingBookingCTA";
import { MobileSidebarDrawer } from "@/components/booking/MobileSidebarDrawer";
import ReviewList from "@/components/reviews/ReviewList";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { createMaxWidthQuery } from "@/config/breakpoints";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { supabase } from "@/lib/supabase";
import type { Listing } from "@/components/equipment/services/listings";
import type { BookingCalculation, BookingConflict } from "@/types/booking";
import { calculateBookingTotal, checkBookingConflicts } from "@/lib/booking";
import { formatDateForStorage } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

type EquipmentDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId?: string;
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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const requestIdRef = useRef(0);
  const sheetContentRef = useRef<HTMLElement | null>(null);
  
  // Callback ref to attach to the scrollable container
  const sheetContentRefCallback = useCallback((element: HTMLElement | null) => {
    sheetContentRef.current = element;
  }, []);

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

  // Fetch rental count for this equipment
  const { data: rentalCountData } = useQuery({
    queryKey: ["rentalCount", listingId],
    queryFn: async () => {
      if (!listingId) return 0;
      const { count, error } = await supabase
        .from("booking_requests")
        .select("*", { count: "exact", head: true })
        .eq("equipment_id", listingId)
        .in("status", ["approved", "completed"]);
      
      if (error) {
        console.error("Error fetching rental count:", error);
        return 0;
      }
      return count || 0;
    },
    enabled: !!listingId && open,
  });

  // Fetch owner profile details
  const { data: ownerProfile } = useQuery({
    queryKey: ["ownerProfile", data?.owner?.id],
    queryFn: async () => {
      if (!data?.owner?.id) return null;
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, email, created_at")
        .eq("id", data.owner.id)
        .single();
      
      if (error) {
        console.error("Error fetching owner profile:", error);
        return null;
      }
      return profile;
    },
    enabled: !!data?.owner?.id && open,
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

      const newStartDate = formatDateForStorage(date);
      const endDate = dateRange?.to
        ? formatDateForStorage(dateRange.to)
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
        ? formatDateForStorage(dateRange.from)
        : null;

      if (!startDate) {
        // If no start date, set this as start date
        const newStartDate = formatDateForStorage(date);
        setDateRange({ from: date, to: undefined });
        setWatchedStartDate(newStartDate);
        setWatchedEndDate("");
        return;
      }

      const newEndDate = formatDateForStorage(date);

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
      const startDate = formatDateForStorage(dateRange.from);
      const endDate = formatDateForStorage(dateRange.to);

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

      // Set booking request ID for tracking
      if (newBooking) {
        setBookingRequestId(newBooking.id);
        // Payment happens in sidebar, no need to switch tabs
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
      setMobileSidebarOpen(false);
      setActiveTab("overview");
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
          category={data.category}
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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger
                  value="overview"
                  className="flex items-center gap-2"
                  aria-label="Overview - Description and details"
                >
                  <Info className="h-4 w-4" />
                  <span>Overview</span>
                </TabsTrigger>
                <TabsTrigger
                  value="details"
                  className="flex items-center gap-2"
                  aria-label="Details - Availability and location"
                >
                  <Package className="h-4 w-4" />
                  <span>Details</span>
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="flex items-center gap-2"
                  aria-label="Reviews - Owner ratings and feedback"
                >
                  <Star className="h-4 w-4" />
                  <span>Reviews</span>
                  {data.reviews && data.reviews.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {data.reviews.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-6">
                <EquipmentOverviewTab
                  description={data.description}
                  condition={data.condition}
                  category={data.category}
                  dailyRate={data.daily_rate}
                  location={data.location}
                  owner={data.owner && ownerProfile ? {
                    id: data.owner.id,
                    email: data.owner.email,
                    name: undefined, // Not available in profiles table
                    avatar_url: undefined, // Not available in profiles table
                    joinedDate: ownerProfile.created_at 
                      ? new Date(ownerProfile.created_at).getFullYear().toString()
                      : undefined,
                    totalRentals: undefined, // Could be fetched separately if needed
                    responseRate: undefined, // Could be calculated from messaging data
                    rating: avgRating,
                    isVerified: false, // Could be fetched from verification table
                  } : undefined}
                  rentalCount={rentalCountData || 0}
                  averageRating={avgRating}
                  isVerified={false} // Could be fetched from verification table
                  lastInspectionDate={
                    data.created_at 
                      ? data.created_at
                      : undefined
                  }
                />
              </TabsContent>

              <TabsContent value="details" className="mt-6">
                <DetailsTab
                  equipmentId={data.id}
                  dailyRate={data.daily_rate}
                  location={data.location}
                  latitude={data.latitude}
                  longitude={data.longitude}
                />
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                {data.reviews && data.reviews.length > 0 ? (
                  <ReviewList
                    revieweeId={data.owner?.id}
                    showSummary={true}
                    showEquipment={false}
                  />
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Star className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                          No Reviews Yet
                        </h3>
                        <p className="text-muted-foreground max-w-md">
                          This owner hasn't received any reviews yet. Be the first to rent and share your experience!
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sticky booking sidebar - Desktop only */}
          {!isMobile && (
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
              equipmentId={listingId}
            />
          )}
        </div>

        {/* Mobile-only: Floating CTA and Sidebar Drawer */}
        {isMobile && (
          <>
            <FloatingBookingCTA
              dailyRate={data.daily_rate}
              onOpenBooking={() => setMobileSidebarOpen(true)}
              isVisible={true}
              scrollContainerRef={sheetContentRef}
            />
            
            <MobileSidebarDrawer
              open={mobileSidebarOpen}
              onOpenChange={setMobileSidebarOpen}
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
              equipmentId={listingId}
            />
          </>
        )}
      </div>
    );
  };

  // Mobile: Use Sheet component
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          ref={sheetContentRefCallback}
          side="bottom"
          className="h-[90vh] max-h-[90vh] w-full overflow-y-auto px-0"
        >
          <div className="px-6 pt-6 pb-6">{renderContent()}</div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Use Dialog component
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">
          {data?.title || "Equipment Details"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {data?.description 
            ? `Details for ${data.title || "this equipment"}. ${data.description.substring(0, 150)}...`
            : "View equipment details, availability, and booking information"}
        </DialogDescription>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};

export default EquipmentDetailDialog;
