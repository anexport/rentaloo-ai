import type { KeyboardEvent } from "react";
import { Camera, X, ImagePlus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";
import { cn } from "@/lib/utils";

interface PhotoCaptureProps {
  photos: File[];
  onPhotosChange: (photos: File[]) => void;
  minPhotos?: number;
  maxPhotos?: number;
  className?: string;
}

export default function PhotoCapture({
  photos,
  onPhotosChange,
  minPhotos = 3,
  maxPhotos = 10,
  className,
}: PhotoCaptureProps) {
  const { previews, fileInputRef, handleFileSelect, removePhoto } =
    usePhotoUpload({
      photos,
      onPhotosChange,
      maxPhotos,
    });

  const handleAddPhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleAddPhotoKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const photosRemaining = Math.max(0, minPhotos - photos.length);
  const hasMinPhotos = photos.length >= minPhotos;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="font-semibold text-lg">Equipment Photos</h3>
          <p className="text-sm text-muted-foreground">
            Capture the equipment from multiple angles
          </p>
        </div>
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
            hasMinPhotos
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          )}
        >
          {hasMinPhotos ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          {photos.length}/{minPhotos}+
        </div>
      </div>

      {/* Photo grid - larger touch targets */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Existing photos */}
        {previews.map((preview, index) => (
          <Card
            key={index}
            className="relative aspect-square overflow-hidden group"
          >
            <img
              src={preview}
              alt={`Photo ${index + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {/* Delete button kept visible for quick edits */}
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-9 w-9 opacity-100 shadow-lg"
              onClick={() => removePhoto(index)}
              aria-label={`Remove photo ${index + 1}`}
            >
              <X className="h-4 w-4" />
            </Button>
            {/* Photo number badge */}
            <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded">
              {index + 1}
            </div>
          </Card>
        ))}

        {/* Add photo button - larger and more prominent */}
        {photos.length < maxPhotos && (
          <Card
            role="button"
            tabIndex={0}
            aria-label="Add a new equipment photo"
            className={cn(
              "aspect-square flex flex-col items-center justify-center cursor-pointer transition-all duration-200 border-2 border-dashed",
              "hover:bg-primary/5 hover:border-primary/50 active:scale-95",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              !hasMinPhotos && "border-primary/50 bg-primary/5"
            )}
            onClick={handleAddPhotoClick}
            onKeyDown={handleAddPhotoKeyDown}
          >
            <div
              className={cn(
                "flex flex-col items-center gap-2 p-4",
                !hasMinPhotos && "text-primary"
              )}
            >
              <div
                className={cn(
                  "h-14 w-14 rounded-full flex items-center justify-center",
                  hasMinPhotos
                    ? "bg-muted"
                    : "bg-primary/10"
                )}
              >
                <ImagePlus
                  className={cn(
                    "h-7 w-7",
                    hasMinPhotos ? "text-muted-foreground" : "text-primary"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-sm font-medium text-center",
                  hasMinPhotos ? "text-muted-foreground" : "text-primary"
                )}
              >
                {hasMinPhotos ? "Add More" : "Add Photo"}
              </span>
            </div>
          </Card>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/webp"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        capture="environment"
      />

      {/* Status message */}
      {!hasMinPhotos && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <Camera className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Please add {photosRemaining} more photo{photosRemaining !== 1 ? "s" : ""} to continue
          </p>
        </div>
      )}

      {/* Tips */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>Tips for good inspection photos:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-1">
          <li>Include overall shots and close-ups of any wear</li>
          <li>Ensure good lighting to capture details</li>
          <li>Photo any existing damage or scratches</li>
        </ul>
      </div>
    </div>
  );
}
