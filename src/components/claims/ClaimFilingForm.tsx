import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import EvidencePhotoUpload from "@/components/claims/EvidencePhotoUpload";
import RepairQuoteUpload from "@/components/claims/RepairQuoteUpload";

interface ClaimFilingFormProps {
  bookingId: string;
  depositAmount: number;
  insuranceCoverage: number;
  pickupPhotos?: string[];
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function ClaimFilingForm({
  bookingId,
  depositAmount,
  insuranceCoverage,
  pickupPhotos,
  onSuccess,
  onCancel,
}: ClaimFilingFormProps) {
  const { user } = useAuth();
  const [damageDescription, setDamageDescription] = useState("");
  const [estimatedCost, setEstimatedCost] = useState<string>("");
  const [evidencePhotos, setEvidencePhotos] = useState<File[]>([]);
  const [repairQuotes, setRepairQuotes] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const maxClaimAmount = depositAmount + insuranceCoverage;
  const estimatedCostNum = parseFloat(estimatedCost) || 0;
  const requiresQuote = estimatedCostNum > 100;

  const validateClaim = () => {
    if (!damageDescription.trim()) {
      setError("Please describe the damage");
      return false;
    }
    if (estimatedCostNum <= 0) {
      setError("Please enter a valid claim amount");
      return false;
    }
    if (estimatedCostNum > maxClaimAmount) {
      setError(
        `Claim amount cannot exceed $${maxClaimAmount.toFixed(2)} (deposit + insurance)`
      );
      return false;
    }
    if (evidencePhotos.length < 2) {
      setError("Please upload at least 2 evidence photos");
      return false;
    }
    if (requiresQuote && repairQuotes.length === 0) {
      setError("Repair quote required for claims over $100");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!user) {
      setError("You must be logged in to file a claim");
      return;
    }

    setError("");

    if (!validateClaim()) return;

    setIsSubmitting(true);

    try {
      // Upload evidence photos
      const photoUrls: string[] = [];
      for (let i = 0; i < evidencePhotos.length; i++) {
        const file = evidencePhotos[i];
        const fileExt = file.name.split(".").pop() || "jpg";
        const fileName = `${user.id}/${bookingId}/claim/${Date.now()}_${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("claim-evidence")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          // Try inspection-photos bucket as fallback
          const { error: fallbackError } = await supabase.storage
            .from("inspection-photos")
            .upload(fileName, file, {
              cacheControl: "3600",
              upsert: false,
            });

          if (fallbackError) {
            throw new Error(`Failed to upload photo ${i + 1}`);
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from("inspection-photos").getPublicUrl(fileName);
          photoUrls.push(publicUrl);
        } else {
          const {
            data: { publicUrl },
          } = supabase.storage.from("claim-evidence").getPublicUrl(fileName);
          photoUrls.push(publicUrl);
        }
      }

      // Upload repair quotes
      const quoteUrls: string[] = [];
      for (let i = 0; i < repairQuotes.length; i++) {
        const file = repairQuotes[i];
        const fileExt = file.name.split(".").pop() || "pdf";
        const fileName = `${user.id}/${bookingId}/quotes/${Date.now()}_${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("claim-evidence")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          // Try inspection-photos bucket as fallback
          const { error: fallbackError } = await supabase.storage
            .from("inspection-photos")
            .upload(fileName, file, {
              cacheControl: "3600",
              upsert: false,
            });

          if (fallbackError) {
            throw new Error(`Failed to upload quote ${i + 1}`);
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from("inspection-photos").getPublicUrl(fileName);
          quoteUrls.push(publicUrl);
        } else {
          const {
            data: { publicUrl },
          } = supabase.storage.from("claim-evidence").getPublicUrl(fileName);
          quoteUrls.push(publicUrl);
        }
      }

      // Create claim record
      const { error: insertError } = await supabase
        .from("damage_claims")
        .insert({
          booking_id: bookingId,
          filed_by: user.id,
          damage_description: damageDescription,
          estimated_cost: estimatedCostNum,
          evidence_photos: photoUrls,
          repair_quotes: quoteUrls,
          status: "pending",
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        throw new Error(`Failed to file claim: ${insertError.message}`);
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      console.error("Error filing claim:", err);
      setError(
        err instanceof Error ? err.message : "Failed to file claim. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <h2 className="text-xl font-semibold">Claim Filed Successfully</h2>
        <p className="text-muted-foreground text-center">
          Your damage claim has been submitted. The renter will be notified and
          has 48 hours to respond.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Maximum claim amount: ${maxClaimAmount.toFixed(2)} ($
          {depositAmount.toFixed(2)} deposit + ${insuranceCoverage.toFixed(2)}{" "}
          insurance)
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="damage-description">Damage Description *</Label>
        <Textarea
          id="damage-description"
          value={damageDescription}
          onChange={(e) => setDamageDescription(e.target.value)}
          placeholder="Describe the damage in detail..."
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="estimated-cost">Estimated Repair Cost *</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            $
          </span>
          <Input
            id="estimated-cost"
            type="number"
            step="0.01"
            min="0"
            max={maxClaimAmount}
            value={estimatedCost}
            onChange={(e) => setEstimatedCost(e.target.value)}
            placeholder="0.00"
            className="pl-7"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Maximum: ${maxClaimAmount.toFixed(2)}
        </p>
      </div>

      <EvidencePhotoUpload
        photos={evidencePhotos}
        onPhotosChange={setEvidencePhotos}
        pickupPhotos={pickupPhotos}
      />

      <RepairQuoteUpload
        quotes={repairQuotes}
        onQuotesChange={setRepairQuotes}
        required={requiresQuote}
      />

      <div className="flex gap-3 pt-4">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          variant="destructive"
          className="flex-1"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isSubmitting ? "Filing Claim..." : "File Damage Claim"}
        </Button>
      </div>
    </div>
  );
}
