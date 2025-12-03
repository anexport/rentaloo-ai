import { useState, useMemo } from "react";
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
import type { InspectionType, ChecklistItem } from "@/types/inspection";
import { cn } from "@/lib/utils";

interface InspectionWizardProps {
  bookingId: string;
  equipmentTitle: string;
  categorySlug?: string;
  inspectionType: InspectionType;
  isOwner: boolean;
  onSuccess: () => void;
  onCancel?: () => void;
  className?: string;
}

const WIZARD_STEPS = [
  { id: "intro", title: "Introduction", description: "What to expect" },
  { id: "photos", title: "Photos", description: "Document equipment" },
  { id: "checklist", title: "Checklist", description: "Review condition" },
  { id: "review", title: "Confirm", description: "Submit inspection" },
];

export default function InspectionWizard({
  bookingId,
  equipmentTitle,
  categorySlug,
  inspectionType,
  isOwner,
  onSuccess,
  onCancel,
  className,
}: InspectionWizardProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [photos, setPhotos] = useState<File[]>([]);
  const [conditionNotes, setConditionNotes] = useState("");
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Use photo upload hook to get previews
  const { previews } = usePhotoUpload({
    photos,
    onPhotosChange: setPhotos,
    maxPhotos: 10,
  });

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
        timestamp: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from("equipment_inspections")
        .insert(inspectionData);

      if (insertError) {
        console.error("Insert error:", insertError);
        throw new Error(`Failed to save inspection: ${insertError.message}`);
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
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

  // Success state
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 space-y-4">
        <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-center">Inspection Complete!</h2>
        <p className="text-muted-foreground text-center max-w-sm">
          Your {inspectionType} inspection has been successfully recorded and
          timestamped.
        </p>
      </div>
    );
  }

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
      default:
        return null;
    }
  };

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
