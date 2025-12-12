import { useState, useEffect, useRef } from "react";
import {
  CheckCircle2,
  Camera,
  ClipboardCheck,
  MapPin,
  Clock,
  Loader2,
  PartyPopper,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Star,
  Shield,
  Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import type { ChecklistItem, ChecklistItemStatus } from "@/types/inspection";

interface InspectionSummary {
  photosCount: number;
  checklistItemsCount: number;
  checklistPassedCount: number;
  timestamp: string;
  location?: { lat: number; lng: number } | null;
}

interface ConditionComparison {
  pickupInspection: InspectionSummary | null;
  returnInspection: InspectionSummary;
  pickupChecklistItems: ChecklistItem[];
  returnChecklistItems: ChecklistItem[];
}

interface DepositInfo {
  amount: number;
  claimWindowHours: number;
}

interface ReturnConfirmationStepProps {
  bookingId: string;
  equipmentTitle: string;
  conditionComparison: ConditionComparison;
  depositInfo?: DepositInfo;
  onSuccess: () => void;
  onReviewClick?: () => void;
  onBack: () => void;
  className?: string;
}

const STATUS_CONFIG = {
  good: {
    icon: CheckCircle2,
    label: "Good",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
  fair: {
    icon: AlertTriangle,
    label: "Fair",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  damaged: {
    icon: AlertCircle,
    label: "Damaged",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
};

const getStatusCounts = (items: ChecklistItem[]) => {
  return items.reduce(
    (acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    },
    {} as Record<ChecklistItemStatus, number>
  );
};

const hasConditionDegraded = (
  pickupItems: ChecklistItem[],
  returnItems: ChecklistItem[]
): boolean => {
  const statusValue: Record<ChecklistItemStatus, number> = {
    good: 3,
    fair: 2,
    damaged: 1,
  };

  return returnItems.some((returnItem) => {
    const pickupItem = pickupItems.find((p) => p.item === returnItem.item);
    if (!pickupItem) return false;
    return statusValue[returnItem.status] < statusValue[pickupItem.status];
  });
};

const getDegradedItems = (
  pickupItems: ChecklistItem[],
  returnItems: ChecklistItem[]
): Array<{ item: string; from: ChecklistItemStatus; to: ChecklistItemStatus }> => {
  const statusValue: Record<ChecklistItemStatus, number> = {
    good: 3,
    fair: 2,
    damaged: 1,
  };

  return returnItems
    .map((returnItem) => {
      const pickupItem = pickupItems.find((p) => p.item === returnItem.item);
      if (!pickupItem) return null;
      if (statusValue[returnItem.status] < statusValue[pickupItem.status]) {
        return {
          item: returnItem.item,
          from: pickupItem.status,
          to: returnItem.status,
        };
      }
      return null;
    })
    .filter(Boolean) as Array<{ item: string; from: ChecklistItemStatus; to: ChecklistItemStatus }>;
};

export default function ReturnConfirmationStep({
  bookingId,
  equipmentTitle,
  conditionComparison,
  depositInfo,
  onSuccess,
  onReviewClick,
  onBack,
  className,
}: ReturnConfirmationStepProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const isMountedRef = useRef(true);
  const timeoutRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const { pickupInspection, returnInspection, pickupChecklistItems, returnChecklistItems } =
    conditionComparison;

  const hasDamage =
    pickupInspection &&
    hasConditionDegraded(pickupChecklistItems, returnChecklistItems);
  const degradedItems = pickupInspection
    ? getDegradedItems(pickupChecklistItems, returnChecklistItems)
    : [];

  const pickupCounts = getStatusCounts(pickupChecklistItems);
  const returnCounts = getStatusCounts(returnChecklistItems);

  const handleCompleteRental = async () => {
    setError("");
    setIsCompleting(true);

    try {
      // Verify authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("Authentication required to complete rental");
      }

      // Call the complete_rental function
      const { error: completeError } = await supabase.rpc("complete_rental", {
        p_booking_id: bookingId,
      });

      if (completeError) {
        throw new Error(completeError.message);
      }

      // Send system message to conversation (non-critical)
      try {
        const { data: conversation, error: convError } = await supabase
          .from("conversations")
          .select("id")
          .eq("booking_request_id", bookingId)
          .single();

        if (convError) {
          throw convError;
        }

        if (conversation?.id) {
          const { error: messageError } = await supabase.from("messages").insert({
            conversation_id: conversation.id,
            sender_id: user.id,
            content: `✅ The rental has been completed! ${equipmentTitle} has been returned and the return inspection is complete.${
              depositInfo
                ? ` The security deposit of $${depositInfo.amount.toFixed(2)} will be released within ${depositInfo.claimWindowHours} hours if no damage claim is filed.`
                : ""
            }`,
            message_type: "system",
          });

          if (messageError) {
            throw messageError;
          }
        }
      } catch (msgErr) {
        console.error("Error sending system message:", msgErr);
        // Non-critical error - don't fail the entire operation
      }

      setIsComplete(true);
      timeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          onSuccess();
        }
      }, 2500);
    } catch (err) {
      console.error("Error completing rental:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to complete rental. Please try again."
      );
    } finally {
      setIsCompleting(false);
    }
  };

  // Success state with review prompt
  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 space-y-6 animate-in fade-in duration-500">
        <div className="h-24 w-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
          <PartyPopper className="h-12 w-12 text-white" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Rental Complete!</h2>
          <p className="text-muted-foreground max-w-sm">
            Thank you for using Rentaloo. We hope you enjoyed your experience!
          </p>
        </div>

        {depositInfo && (
          <Card className="w-full max-w-sm border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
            <CardContent className="p-4 flex items-start gap-3">
              <Banknote className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">
                  Deposit Release
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  ${depositInfo.amount.toFixed(2)} will be released within{" "}
                  {depositInfo.claimWindowHours} hours
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {onReviewClick && (
          <Button
            onClick={onReviewClick}
            className="w-full max-w-sm h-12"
            variant="outline"
          >
            <Star className="h-4 w-4 mr-2" />
            Leave a Review
          </Button>
        )}
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
              Return Inspection Complete!
            </h2>
            <p className="text-muted-foreground">
              Review the condition comparison and complete your rental.
            </p>
          </div>

          {/* Error alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Condition Comparison Card */}
          {pickupInspection && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4">Condition Comparison</h3>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Pickup condition */}
                  <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      Pickup
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(["good", "fair", "damaged"] as const).map((status) => {
                        const count = pickupCounts[status] || 0;
                        if (count === 0) return null;
                        const config = STATUS_CONFIG[status];
                        return (
                          <Badge
                            key={status}
                            variant="secondary"
                            className={cn("text-xs", config.bgColor, config.color)}
                          >
                            {count} {config.label}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>

                  {/* Return condition */}
                  <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      Return
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(["good", "fair", "damaged"] as const).map((status) => {
                        const count = returnCounts[status] || 0;
                        if (count === 0) return null;
                        const config = STATUS_CONFIG[status];
                        return (
                          <Badge
                            key={status}
                            variant="secondary"
                            className={cn("text-xs", config.bgColor, config.color)}
                          >
                            {count} {config.label}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Status indicator */}
                {!hasDamage ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      No damage detected - condition maintained
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        Condition changes detected
                      </span>
                    </div>

                    {/* Degraded items list */}
                    <div className="space-y-2">
                      {degradedItems.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 text-sm p-2 rounded bg-muted/50"
                        >
                          <span className="flex-1">{item.item}</span>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs",
                              STATUS_CONFIG[item.from].bgColor,
                              STATUS_CONFIG[item.from].color
                            )}
                          >
                            {STATUS_CONFIG[item.from].label}
                          </Badge>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs",
                              STATUS_CONFIG[item.to].bgColor,
                              STATUS_CONFIG[item.to].color
                            )}
                          >
                            {STATUS_CONFIG[item.to].label}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Return Inspection Summary */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                Return Inspection Summary
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Photos */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <Camera className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {returnInspection.photosCount} photos
                    </p>
                    <p className="text-xs text-muted-foreground">documented</p>
                  </div>
                </div>

                {/* Checklist */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {returnInspection.checklistPassedCount}/
                      {returnInspection.checklistItemsCount} items
                    </p>
                    <p className="text-xs text-muted-foreground">verified</p>
                  </div>
                </div>

                {/* Location */}
                {returnInspection.location && (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-xs text-muted-foreground">
                        {returnInspection.location.lat.toFixed(4)}°,{" "}
                        {returnInspection.location.lng.toFixed(4)}°
                      </p>
                    </div>
                  </div>
                )}

                {/* Timestamp */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Timestamp</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(returnInspection.timestamp).toLocaleString(
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

          {/* Deposit Status Card */}
          {depositInfo && (
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-800 dark:text-blue-200">
                      Deposit Status
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      ${depositInfo.amount.toFixed(2)} held
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                      Will be released in {depositInfo.claimWindowHours} hours unless
                      the owner files a damage claim.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Fixed bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t safe-area-bottom">
        <div className="max-w-2xl mx-auto flex gap-3">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isCompleting}
            className="h-12"
            aria-label="Go back to review"
          >
            Back
          </Button>
          <Button
            onClick={handleCompleteRental}
            disabled={isCompleting}
            className="flex-1 h-14 font-semibold text-base bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            aria-label="Complete rental"
          >
            {isCompleting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Completing...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Complete Rental
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

