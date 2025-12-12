import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle, ImageIcon } from "lucide-react";
import type { ClaimAction, ClaimStatus } from "@/types/claim";

interface ClaimResponseFormProps {
  claim: {
    id: string;
    booking_id: string;
    damage_description: string;
    estimated_cost: number;
    evidence_photos: string[];
    repair_quotes: string[];
    status: ClaimStatus;
  };
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function ClaimResponseForm({
  claim,
  onSuccess,
  onCancel,
}: ClaimResponseFormProps) {
  const { user } = useAuth();
  const [action, setAction] = useState<ClaimAction>("accept");
  const [notes, setNotes] = useState("");
  const [counterOffer, setCounterOffer] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (selectedPhoto) {
      overlayRef.current?.focus();
    }
  }, [selectedPhoto]);

  const handleSubmit = async () => {
    if (!user) {
      setError("You must be logged in to respond");
      return;
    }

    const immutableStatuses: Array<ClaimStatus | "closed"> = ["accepted", "resolved", "closed"];
    if (immutableStatuses.includes(claim.status)) {
      setError("This claim has already been resolved and can no longer be updated.");
      return;
    }

    if (action === "negotiate") {
      if (!counterOffer) {
        setError("Please enter a counter offer amount");
        return;
      }

      const parsedCounter = parseFloat(counterOffer);

      if (!Number.isFinite(parsedCounter)) {
        setError("Please enter a valid counter offer amount");
        return;
      }

      if (parsedCounter < 0) {
        setError("Counter offer must be a positive amount");
        return;
      }

      if (parsedCounter > claim.estimated_cost) {
        setError(
          `Counter offer cannot exceed claimed amount of $${claim.estimated_cost.toFixed(2)}`
        );
        return;
      }
    }

    if (action === "dispute" && !notes.trim()) {
      setError("Please explain why you are disputing this claim");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const parsedCounter =
        action === "negotiate" ? parseFloat(counterOffer) : undefined;

      const renterResponse = {
        action,
        notes: notes.trim() || undefined,
        counter_offer: parsedCounter,
        responded_at: new Date().toISOString(),
      };

      let newStatus: ClaimStatus = "pending";
      if (action === "accept") {
        newStatus = "accepted";
      } else if (action === "dispute") {
        newStatus = "disputed";
      } else if (action === "negotiate") {
        newStatus = "disputed"; // Negotiation starts a dispute process
      }

      const { error: updateError } = await supabase
        .from("damage_claims")
        .update({
          renter_response: renterResponse,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", claim.id);

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      console.error(err);
      setError("We couldn't submit your response. Please try again or contact support.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <h2 className="text-xl font-semibold">Response Submitted</h2>
        <p className="text-muted-foreground text-center">
          {action === "accept"
            ? "You have accepted the damage claim."
            : action === "dispute"
            ? "Your dispute has been filed. The owner will be notified."
            : "Your counter offer has been submitted."}
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

      {/* Claim Summary */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Damage Description</h3>
            <p className="text-sm text-muted-foreground">
              {claim.damage_description}
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Claimed Amount</h3>
            <p className="text-2xl font-bold text-destructive">
              ${claim.estimated_cost.toFixed(2)}
            </p>
          </div>

          {/* Evidence Photos */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Evidence Photos ({claim.evidence_photos.length})
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {claim.evidence_photos.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`Evidence ${index + 1}`}
                  className="aspect-square object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedPhoto(url)}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Response Options */}
      <div className="space-y-4">
        <h3 className="font-semibold">Your Response</h3>
        <RadioGroup
          value={action}
          onValueChange={(value) => setAction(value as ClaimAction)}
        >
          <Card
            className={`p-4 cursor-pointer ${
              action === "accept" ? "border-primary" : ""
            }`}
            onClick={() => setAction("accept")}
          >
            <div className="flex items-start gap-3">
              <RadioGroupItem value="accept" id="accept" />
              <div>
                <Label htmlFor="accept" className="font-semibold cursor-pointer">
                  Accept Claim
                </Label>
                <p className="text-sm text-muted-foreground">
                  I agree with the damage assessment and will pay $
                  {claim.estimated_cost.toFixed(2)}
                </p>
              </div>
            </div>
          </Card>

          <Card
            className={`p-4 cursor-pointer ${
              action === "negotiate" ? "border-primary" : ""
            }`}
            onClick={() => setAction("negotiate")}
          >
            <div className="flex items-start gap-3">
              <RadioGroupItem value="negotiate" id="negotiate" />
              <div className="flex-1">
                <Label
                  htmlFor="negotiate"
                  className="font-semibold cursor-pointer"
                >
                  Negotiate Amount
                </Label>
                <p className="text-sm text-muted-foreground">
                  I acknowledge the damage but want to propose a different amount
                </p>
                {action === "negotiate" && (
                  <div className="mt-3">
                    <Label htmlFor="counter-offer">Counter Offer ($)</Label>
                    <Input
                      id="counter-offer"
                      type="number"
                      step="0.01"
                      min="0"
                      max={claim.estimated_cost}
                      value={counterOffer}
                      onChange={(e) => setCounterOffer(e.target.value)}
                      placeholder="Enter your offer"
                      className="mt-1"
                    />
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card
            className={`p-4 cursor-pointer ${
              action === "dispute" ? "border-primary" : ""
            }`}
            onClick={() => setAction("dispute")}
          >
            <div className="flex items-start gap-3">
              <RadioGroupItem value="dispute" id="dispute" />
              <div>
                <Label htmlFor="dispute" className="font-semibold cursor-pointer">
                  Dispute Claim
                </Label>
                <p className="text-sm text-muted-foreground">
                  I disagree with this damage claim and want to dispute it
                </p>
              </div>
            </div>
          </Card>
        </RadioGroup>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">
          {action === "dispute" ? "Reason for Dispute *" : "Additional Notes"}
        </Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={
            action === "dispute"
              ? "Explain why you are disputing this claim..."
              : "Any additional comments..."
          }
          rows={3}
        />
      </div>

      <div className="flex gap-3 pt-4">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          variant={action === "accept" ? "default" : "outline"}
          className="flex-1"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isSubmitting
            ? "Submitting..."
            : action === "accept"
            ? "Accept & Pay"
            : action === "negotiate"
            ? "Submit Counter Offer"
            : "File Dispute"}
        </Button>
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          ref={overlayRef}
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Damage evidence photo"
          tabIndex={-1}
          onClick={() => setSelectedPhoto(null)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setSelectedPhoto(null);
            }
          }}
        >
          <img
            src={selectedPhoto}
            alt="Damage evidence"
            className="max-w-full max-h-full object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
