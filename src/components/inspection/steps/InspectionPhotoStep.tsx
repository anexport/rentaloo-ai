import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import PhotoCapture from "@/components/inspection/PhotoCapture";
import { cn } from "@/lib/utils";

interface InspectionPhotoStepProps {
  photos: File[];
  onPhotosChange: (photos: File[]) => void;
  minPhotos?: number;
  maxPhotos?: number;
  onBack: () => void;
  onContinue: () => void;
  className?: string;
}

export default function InspectionPhotoStep({
  photos,
  onPhotosChange,
  minPhotos = 3,
  maxPhotos = 10,
  onBack,
  onContinue,
  className,
}: InspectionPhotoStepProps) {
  const canContinue = photos.length >= minPhotos;

  return (
    <div className={cn("flex flex-col min-h-0", className)}>
      {/* Step content */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">
              Photo Documentation
            </h2>
            <p className="text-muted-foreground">
              Take clear photos of the equipment to document its current condition.
            </p>
          </div>

          {/* Photo capture component */}
          <PhotoCapture
            photos={photos}
            onPhotosChange={onPhotosChange}
            minPhotos={minPhotos}
            maxPhotos={maxPhotos}
          />
        </div>
      </div>

      {/* Fixed bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t safe-area-bottom">
        <div className="max-w-2xl mx-auto flex gap-3">
          <Button
            variant="outline"
            onClick={onBack}
            className="h-12"
            aria-label="Go back to previous step"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={onContinue}
            disabled={!canContinue}
            className="flex-1 h-12 font-semibold"
            aria-label="Continue to condition checklist"
          >
            Continue
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

