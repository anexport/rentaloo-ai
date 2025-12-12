import { useState } from "react";
import {
  ArrowLeft,
  Camera,
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ChecklistItem, InspectionType } from "@/types/inspection";

interface InspectionReviewStepProps {
  photos: File[];
  photoPreviews: string[];
  checklistItems: ChecklistItem[];
  conditionNotes: string;
  onConditionNotesChange: (notes: string) => void;
  inspectionType: InspectionType;
  isOwner: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
  className?: string;
}

const STATUS_CONFIG = {
  good: {
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
  fair: {
    icon: AlertTriangle,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  damaged: {
    icon: AlertCircle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
};

export default function InspectionReviewStep({
  photos,
  photoPreviews,
  checklistItems,
  conditionNotes,
  onConditionNotesChange,
  inspectionType,
  isOwner,
  isSubmitting,
  onBack,
  onSubmit,
  className,
}: InspectionReviewStepProps) {
  const [confirmed, setConfirmed] = useState(false);
  const safePhotos = photos ?? [];
  const safePhotoPreviews = photoPreviews ?? [];
  const safeChecklistItems = checklistItems ?? [];

  const role = isOwner ? "owner" : "renter";
  const isPickup = inspectionType === "pickup";

  // Count statuses
  const statusCounts = safeChecklistItems.reduce(
    (acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const hasIssues =
    (statusCounts.fair || 0) > 0 || (statusCounts.damaged || 0) > 0;

  const canSubmit = confirmed && !isSubmitting;

  return (
    <div className={cn("flex flex-col min-h-0", className)}>
      {/* Step content */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">
              Review & Confirm
            </h2>
            <p className="text-muted-foreground">
              Review your inspection details before submitting.
            </p>
          </div>

          {/* Photos summary */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Camera className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Photos</p>
                  <p className="text-sm text-muted-foreground">
                    {safePhotos.length} photo{safePhotos.length !== 1 ? "s" : ""} captured
                  </p>
                </div>
              </div>

              {/* Photo thumbnails */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {safePhotoPreviews.slice(0, 6).map((preview, index) => (
                  <div
                    key={`${preview}-${index}`}
                    className="h-16 w-16 rounded-lg overflow-hidden shrink-0 border"
                  >
                    <img
                      src={preview}
                      alt={`Photo ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
                {safePhotos.length > 6 && (
                  <div className="h-16 w-16 rounded-lg border flex items-center justify-center bg-muted shrink-0">
                    <span className="text-sm font-medium text-muted-foreground">
                      +{safePhotos.length - 6}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Checklist summary */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Condition Checklist</p>
                  <p className="text-sm text-muted-foreground">
                    {safeChecklistItems.length} items reviewed
                  </p>
                </div>
              </div>

              {/* Status breakdown */}
              <div className="flex gap-3 mb-4">
                {(["good", "fair", "damaged"] as const).map((status) => {
                  const count = statusCounts[status] || 0;
                  if (count === 0) return null;
                  const config = STATUS_CONFIG[status];
                  const Icon = config.icon;
                  return (
                    <div
                      key={status}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm",
                        config.bgColor
                      )}
                    >
                      <Icon className={cn("h-4 w-4", config.color)} />
                      <span className={config.color}>
                        {count} {status}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Items with issues */}
              {hasIssues && (
                <div className="space-y-2 border-t pt-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    Items requiring attention:
                  </p>
                  {safeChecklistItems
                    .filter((item) => item.status !== "good")
                    .map((item, index) => {
                      const config = STATUS_CONFIG[item.status];
                      const Icon = config.icon;
                      return (
                        <div
                          key={`${item.item}-${index}`}
                          className={cn(
                            "flex items-start gap-2 p-2 rounded-lg",
                            config.bgColor
                          )}
                        >
                          <Icon
                            className={cn("h-4 w-4 mt-0.5 shrink-0", config.color)}
                          />
                          <div>
                            <p className={cn("text-sm font-medium", config.color)}>
                              {item.item}
                            </p>
                            {item.notes && (
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {item.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional notes */}
          <div className="space-y-2">
            <Label htmlFor="condition-notes">Additional Notes (Optional)</Label>
            <Textarea
              id="condition-notes"
              value={conditionNotes}
              onChange={(e) => onConditionNotesChange(e.target.value)}
              placeholder="Any additional observations about the equipment condition..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Confirmation checkbox */}
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="confirmation"
                  checked={confirmed}
                  onCheckedChange={(checked) => setConfirmed(checked === true)}
                  className="mt-1 h-5 w-5"
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="confirmation"
                    className="text-sm font-medium cursor-pointer leading-relaxed"
                  >
                    I confirm this inspection is accurate
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    As the {role}, I certify that the photos and condition
                    assessment accurately represent the equipment&apos;s state at the
                    time of this {isPickup ? "pickup" : "return"} inspection. I
                    understand this record may be used to resolve any disputes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trust badge */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <ShieldCheck className="h-8 w-8 text-green-600 dark:text-green-400 shrink-0" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">
                Secure & Protected
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                Your inspection is timestamped and securely stored to protect both
                parties.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t safe-area-bottom">
        <div className="max-w-2xl mx-auto flex gap-3">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isSubmitting}
            className="h-12"
            aria-label="Go back to checklist"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!canSubmit}
            className="flex-1 h-14 font-semibold text-base"
            aria-label="Submit inspection"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Complete Inspection
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
