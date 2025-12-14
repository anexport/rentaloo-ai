import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { InspectionStepIndicator } from "@/components/inspection/steps/InspectionStepIndicator";
import InspectionIntroStep from "@/components/inspection/steps/InspectionIntroStep";
import InspectionPhotoStep from "@/components/inspection/steps/InspectionPhotoStep";
import InspectionChecklistStep from "@/components/inspection/steps/InspectionChecklistStep";
import InspectionReviewStep from "@/components/inspection/steps/InspectionReviewStep";
import PickupConfirmationStep from "@/components/inspection/steps/PickupConfirmationStep";
import ReturnConfirmationStep from "@/components/inspection/steps/ReturnConfirmationStep";
import type { InspectionType, ChecklistItem } from "@/types/inspection";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface BookingInfo {
  startDate: string;
  endDate: string;
  depositAmount?: number;
  claimWindowHours?: number;
}

interface InspectionWizardProps {
  bookingId: string;
  equipmentTitle: string;
  categorySlug?: string;
  inspectionType: InspectionType;
  isOwner: boolean;
  bookingInfo?: BookingInfo;
  onSuccess: () => void;
  onCancel?: () => void;
  onReviewClick?: () => void;
  className?: string;
}

const getWizardSteps = (inspectionType: InspectionType) => {
  const baseSteps = [
    { id: "intro", title: "Introduction", description: "What to expect" },
    { id: "photos", title: "Photos", description: "Document equipment" },
    { id: "checklist", title: "Checklist", description: "Review condition" },
    { id: "review", title: "Review", description: "Check details" },
  ];

  // Add confirmation step
  const confirmStep =
    inspectionType === "pickup"
      ? { id: "confirm", title: "Start", description: "Begin rental" }
      : { id: "confirm", title: "Complete", description: "Finish rental" };

  return [...baseSteps, confirmStep];
};

export default function InspectionWizard({
  bookingId,
  equipmentTitle,
  categorySlug,
  inspectionType,
  isOwner,
  bookingInfo,
  onSuccess,
  onCancel,
  onReviewClick,
  className,
}: InspectionWizardProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [photos, setPhotos] = useState<File[]>([]);
  const [conditionNotes, setConditionNotes] = useState("");
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [inspectionSubmitted, setInspectionSubmitted] = useState(false);
  const [inspectionTimestamp, setInspectionTimestamp] = useState<string>("");
  const [inspectionLocation, setInspectionLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // For return inspections, fetch pickup inspection data for comparison using React Query
  const {
    data: pickupInspection,
    isLoading: isLoadingPickupInspection,
    error: pickupInspectionError,
  } = useQuery({
    queryKey: ["pickup-inspection", bookingId],
    queryFn: async () => {
      if (!user) {
        throw new Error("Authentication required");
      }

      const { data, error } = await supabase
        .from("equipment_inspections")
        .select("*")
        .eq("booking_id", bookingId)
        .eq("inspection_type", "pickup")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error(
          "No pickup inspection found for this booking. Please complete the pickup inspection first."
        );
      }

      return {
        photos: (data.photos as string[]) || [],
        checklistItems: (data.checklist_items as ChecklistItem[]) || [],
        timestamp: data.timestamp,
        location: data.location as { lat: number; lng: number } | null,
      };
    },
    enabled: inspectionType === "return" && !!bookingId && !!user,
  });

  // Show error toast if pickup inspection fetch fails
  useEffect(() => {
    if (pickupInspectionError) {
      toast.error("Failed to load pickup inspection data");
      console.error("Pickup inspection error:", pickupInspectionError);
    }
  }, [pickupInspectionError]);

  // Use photo upload hook to get previews
  const { previews } = usePhotoUpload({
    photos,
    onPhotosChange: setPhotos,
    maxPhotos: 10,
  });

  const WIZARD_STEPS = useMemo(
    () => getWizardSteps(inspectionType),
    [inspectionType]
  );

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
  };

  const handleBack = () => {
    setCurrentStep((prev) => {
      if (prev === 0) {
        onCancel?.();
        return 0;
      }
      return Math.max(prev - 1, 0);
    });
  };

  const handleSubmit = async () => {
    if (!user) {
      setError("You must be logged in to submit an inspection");
      return;
    }

    if (inspectionType === "return" && isOwner) {
      setError("Owners can't submit return inspections. Please review the renter's return inspection instead.");
      return;
    }

    if (photos.length < 3) {
      setError("Please add at least 3 photos");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      // Upload photos to Supabase Storage
      const photoUrls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const file = photos[i];
        const fileExt = file.name.split(".").pop() || "jpg";
        const fileName = `${user.id}/${bookingId}/${inspectionType}/${Date.now()}_${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("inspection-photos")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          throw new Error(`Failed to upload photo ${i + 1}: ${uploadError.message}`);
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("inspection-photos").getPublicUrl(fileName);

        photoUrls.push(publicUrl);
      }

      // Get geolocation if available
      let location = null;
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>(
            (resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 5000,
                maximumAge: 60000,
              });
            }
          );
          location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
        } catch {
          // Geolocation not available or denied - continue without it
          console.log("Geolocation not available");
        }
      }

      const timestamp = new Date().toISOString();

      // Create inspection record
      const inspectionData = {
        booking_id: bookingId,
        inspection_type: inspectionType,
        photos: photoUrls,
        condition_notes: conditionNotes || null,
        checklist_items: checklistItems,
        verified_by_owner: isOwner,
        verified_by_renter: !isOwner,
        // Store confirmation acknowledgment instead of signature
        owner_signature: isOwner ? "checkbox_confirmed" : null,
        renter_signature: !isOwner ? "checkbox_confirmed" : null,
        location,
        timestamp,
      };

      const { error: insertError } = await supabase
        .from("equipment_inspections")
        .insert(inspectionData);

      if (insertError) {
        console.error("Insert error:", insertError);
        throw new Error(`Failed to save inspection: ${insertError.message}`);
      }

      // Store inspection data for confirmation step
      setInspectionTimestamp(timestamp);
      setInspectionLocation(location);
      setInspectionSubmitted(true);

      // Move to confirmation step
      handleNext();
    } catch (err) {
      console.error("Error submitting inspection:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to submit inspection. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate inspection summary for confirmation steps
  const inspectionSummary = useMemo(() => {
    const goodItems = checklistItems.filter((item) => item.status === "good");
    return {
      photosCount: photos.length,
      checklistItemsCount: checklistItems.length,
      checklistPassedCount: goodItems.length,
      timestamp: inspectionTimestamp || new Date().toISOString(),
      location: inspectionLocation,
    };
  }, [photos, checklistItems, inspectionTimestamp, inspectionLocation]);

  // Rental period info for pickup confirmation
  const rentalPeriod = useMemo(() => {
    return {
      startDate: bookingInfo?.startDate || new Date().toISOString(),
      endDate: bookingInfo?.endDate || new Date().toISOString(),
      returnTime: "5:00 PM", // Default return time
    };
  }, [bookingInfo]);

  // Condition comparison for return confirmation
  const conditionComparison = useMemo(() => {
    return {
      pickupInspection: pickupInspection
        ? {
            photosCount: pickupInspection.photos.length,
            checklistItemsCount: pickupInspection.checklistItems.length,
            checklistPassedCount: pickupInspection.checklistItems.filter(
              (item) => item.status === "good"
            ).length,
            timestamp: pickupInspection.timestamp,
            location: pickupInspection.location,
          }
        : null,
      returnInspection: inspectionSummary,
      pickupChecklistItems: pickupInspection?.checklistItems || [],
      returnChecklistItems: checklistItems,
    };
  }, [pickupInspection, inspectionSummary, checklistItems]);

  // Deposit info for return confirmation
  const depositInfo = useMemo(() => {
    if (!bookingInfo?.depositAmount) return undefined;
    return {
      amount: bookingInfo.depositAmount,
      claimWindowHours: bookingInfo.claimWindowHours ?? 48,
    };
  }, [bookingInfo]);

  // Determine which step to render
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <InspectionIntroStep
            equipmentTitle={equipmentTitle}
            inspectionType={inspectionType}
            isOwner={isOwner}
            onContinue={handleNext}
          />
        );
      case 1:
        return (
          <InspectionPhotoStep
            photos={photos}
            onPhotosChange={setPhotos}
            minPhotos={3}
            maxPhotos={10}
            onBack={handleBack}
            onContinue={handleNext}
          />
        );
      case 2:
        return (
          <InspectionChecklistStep
            categorySlug={categorySlug}
            items={checklistItems}
            onItemsChange={setChecklistItems}
            onBack={handleBack}
            onContinue={handleNext}
          />
        );
      case 3:
        return (
          <InspectionReviewStep
            photos={photos}
            photoPreviews={previews}
            checklistItems={checklistItems}
            conditionNotes={conditionNotes}
            onConditionNotesChange={setConditionNotes}
            inspectionType={inspectionType}
            isOwner={isOwner}
            isSubmitting={isSubmitting}
            onBack={handleBack}
            onSubmit={handleSubmit}
          />
        );
      case 4:
        // Confirmation step - different for pickup vs return
        if (inspectionType === "pickup") {
          return (
            <PickupConfirmationStep
              bookingId={bookingId}
              equipmentTitle={equipmentTitle}
              rentalPeriod={rentalPeriod}
              inspectionSummary={inspectionSummary}
              checklistItems={checklistItems}
              onSuccess={onSuccess}
              onBack={handleBack}
            />
          );
        } else {
          return (
            <ReturnConfirmationStep
              bookingId={bookingId}
              equipmentTitle={equipmentTitle}
              conditionComparison={conditionComparison}
              depositInfo={depositInfo}
              onSuccess={onSuccess}
              onReviewClick={onReviewClick}
              onBack={handleBack}
            />
          );
        }
      default:
        return null;
    }
  };

  // Show loading state for return inspections while fetching pickup data
  if (inspectionType === "return" && isLoadingPickupInspection) {
    return (
      <div className={cn("flex flex-col min-h-screen bg-background", className)}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            <p className="text-sm text-muted-foreground">Loading pickup inspection data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col min-h-screen bg-background", className)}>
      {/* Sticky header with step indicator */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <InspectionStepIndicator
            steps={WIZARD_STEPS}
            currentStep={currentStep}
          />
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="px-4 pt-4 max-w-2xl mx-auto w-full">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Step content */}
      <div className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        {renderStep()}
      </div>
    </div>
  );
}
