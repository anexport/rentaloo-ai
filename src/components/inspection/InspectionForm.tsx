import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import PhotoCapture from "@/components/inspection/PhotoCapture";
import ConditionChecklist from "@/components/inspection/ConditionChecklist";
import SignaturePad from "@/components/inspection/SignaturePad";
import type { InspectionType, ChecklistItem } from "@/types/inspection";

interface InspectionFormProps {
  bookingId: string;
  categorySlug?: string;
  inspectionType: InspectionType;
  isOwner: boolean;
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function InspectionForm({
  bookingId,
  categorySlug,
  inspectionType,
  isOwner,
  onSuccess,
  onCancel,
}: InspectionFormProps) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<File[]>([]);
  const [conditionNotes, setConditionNotes] = useState("");
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [signature, setSignature] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const canSubmit = photos.length >= 3 && signature && !isSubmitting;

  const handleSubmit = async () => {
    if (!user) {
      setError("You must be logged in to submit an inspection");
      return;
    }

    if (photos.length < 3) {
      setError("Please add at least 3 photos");
      return;
    }

    if (!signature) {
      setError("Please sign to confirm the inspection");
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
        owner_signature: isOwner ? signature : null,
        renter_signature: !isOwner ? signature : null,
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
      }, 1500);
    } catch (err) {
      console.error("Error submitting inspection:", err);
      setError(
        err instanceof Error ? err.message : "Failed to submit inspection. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <h2 className="text-xl font-semibold">Inspection Submitted</h2>
        <p className="text-muted-foreground">
          Your {inspectionType} inspection has been recorded successfully.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold capitalize">
          {inspectionType} Inspection
        </h2>
        <p className="text-muted-foreground">
          Document the equipment condition with photos, checklist, and your
          signature.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <PhotoCapture photos={photos} onPhotosChange={setPhotos} />

      <ConditionChecklist
        categorySlug={categorySlug}
        items={checklistItems}
        onItemsChange={setChecklistItems}
      />

      <div className="space-y-2">
        <Label htmlFor="condition-notes">Additional Notes (Optional)</Label>
        <Textarea
          id="condition-notes"
          value={conditionNotes}
          onChange={(e) => setConditionNotes(e.target.value)}
          placeholder="Any additional observations about the equipment condition..."
          rows={3}
        />
      </div>

      <SignaturePad
        label={isOwner ? "Owner Signature" : "Renter Signature"}
        onSignatureChange={setSignature}
      />

      <div className="flex gap-3 pt-4">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex-1"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isSubmitting ? "Submitting..." : "Complete Inspection"}
        </Button>
      </div>
    </div>
  );
}
