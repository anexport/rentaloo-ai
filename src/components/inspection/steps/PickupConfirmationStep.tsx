import { useState } from "react";
import {
  CheckCircle2,
  Camera,
  ClipboardCheck,
  MapPin,
  Clock,
  Calendar,
  Loader2,
  PartyPopper,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { formatBookingDate, formatBookingDuration } from "@/lib/booking";
import type { ChecklistItem } from "@/types/inspection";
import { toast } from "sonner";

interface RentalPeriodInfo {
  startDate: string;
  endDate: string;
  returnTime?: string;
}

interface InspectionSummary {
  photosCount: number;
  checklistItemsCount: number;
  checklistPassedCount: number;
  timestamp: string;
  location?: { lat: number; lng: number } | null;
}

interface PickupConfirmationStepProps {
  bookingId: string;
  equipmentTitle: string;
  rentalPeriod: RentalPeriodInfo;
  inspectionSummary: InspectionSummary;
  checklistItems: ChecklistItem[];
  onSuccess: () => void;
  onBack: () => void;
  className?: string;
}

export default function PickupConfirmationStep({
  bookingId,
  equipmentTitle,
  rentalPeriod,
  inspectionSummary,
  checklistItems,
  onSuccess,
  onBack,
  className,
}: PickupConfirmationStepProps) {
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  const handleStartRental = async () => {
    setError("");
    setIsActivating(true);

    try {
      // Call the activate_rental function
      const { error: activateError } = await supabase.rpc("activate_rental", {
        p_booking_id: bookingId,
      });

      if (activateError) {
        throw new Error(activateError.message);
      }

      // Send system message to conversation (non-critical)
      try {
        const { data: conversation, error: conversationError } = await supabase
          .from("conversations")
          .select("id")
          .eq("booking_request_id", bookingId)
          .single();

        if (conversationError) {
          throw conversationError;
        }

        if (conversation?.id) {
          const { data: userData, error: authError } = await supabase.auth.getUser();
          if (authError) throw authError;

          if (userData.user) {
            const { error: msgError } = await supabase.from("messages").insert({
              conversation_id: conversation.id,
              sender_id: userData.user.id,
              content: `🎉 The rental has officially started! The pickup inspection is complete and ${equipmentTitle} is now in the renter's care.`,
              message_type: "system",
            });
            if (msgError) throw msgError;
          }
        }
      } catch (msgErr) {
        console.error("Error sending system message:", msgErr);
        // Non-critical error - don't fail the entire operation
      }

      setIsComplete(true);
      toast.success("Rental Started!", {
        description: "The equipment is now in your care.",
      });
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err) {
      console.error("Error activating rental:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to start rental. Please try again."
      );
    } finally {
      setIsActivating(false);
    }
  };

  // Count items by status
  const statusCounts = checklistItems.reduce(
    (acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const allItemsGood = statusCounts.good === checklistItems.length;

  // Success state
  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 space-y-4 animate-in fade-in duration-500">
        <div className="h-24 w-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
          <PartyPopper className="h-12 w-12 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-center">Your Rental Has Started!</h2>
        <p className="text-muted-foreground text-center max-w-sm">
          The equipment is now in your care. Enjoy your rental and remember to
          return it by {formatBookingDate(rentalPeriod.endDate)}.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col min-h-0", className)}>
      {/* Step content */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Pickup Inspection Complete!
            </h2>
            <p className="text-muted-foreground">
              Your inspection has been recorded. Confirm to start your rental.
            </p>
          </div>

          {/* Error alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Inspection Summary Card */}
          <Card className="border-2 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" />
                Inspection Summary
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Photos */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center">
                    <Camera className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {inspectionSummary.photosCount} photos
                    </p>
                    <p className="text-xs text-muted-foreground">documented</p>
                  </div>
                </div>

                {/* Checklist */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center">
                    <CheckCircle2
                      className={cn(
                        "h-5 w-5",
                        allItemsGood ? "text-green-600" : "text-amber-600"
                      )}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {inspectionSummary.checklistPassedCount}/
                      {inspectionSummary.checklistItemsCount} items
                    </p>
                    <p className="text-xs text-muted-foreground">verified</p>
                  </div>
                </div>

                {/* Location */}
                {inspectionSummary.location && (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-xs text-muted-foreground">
                        {inspectionSummary.location.lat.toFixed(4)}°,{" "}
                        {inspectionSummary.location.lng.toFixed(4)}°
                      </p>
                    </div>
                  </div>
                )}

                {/* Timestamp */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Timestamp</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(inspectionSummary.timestamp).toLocaleString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        }
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rental Period Card */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Your Rental Period
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Equipment</span>
                  <span className="font-medium">{equipmentTitle}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Start Date</span>
                  <span className="font-medium">
                    {formatBookingDate(rentalPeriod.startDate)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">End Date</span>
                  <span className="font-medium">
                    {formatBookingDate(rentalPeriod.endDate)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">
                    {formatBookingDuration(
                      rentalPeriod.startDate,
                      rentalPeriod.endDate
                    )}
                  </span>
                </div>
              </div>

              {rentalPeriod.returnTime && (
                <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Return by:</strong> {rentalPeriod.returnTime} on{" "}
                    {formatBookingDate(rentalPeriod.endDate)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Responsibility Notice */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                By starting this rental, the equipment is now in your care.
                Please return it in the same condition. Any damage beyond normal
                wear and tear may result in charges from your security deposit.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Fixed bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t safe-area-bottom">
        <div className="max-w-2xl mx-auto flex gap-3">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isActivating}
            className="h-12"
            aria-label="Go back to review"
          >
            Back
          </Button>
          <Button
            onClick={handleStartRental}
            disabled={isActivating}
            className="flex-1 h-14 font-semibold text-base bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            aria-label="Start rental"
          >
            {isActivating ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Starting Rental...
              </>
            ) : (
              <>
                <PartyPopper className="h-5 w-5 mr-2" />
                Start My Rental
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

