import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useMessaging } from "@/hooks/useMessaging";
import { supabase } from "@/lib/supabase";
import type { Database } from "../../lib/database.types";
import type {
  BookingFormData,
  BookingCalculation,
  BookingConflict,
} from "../../types/booking";
import {
  calculateBookingTotal,
  checkBookingConflicts,
  formatBookingDate,
  formatBookingDuration,
} from "../../lib/booking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Clock, AlertCircle } from "lucide-react";

const bookingFormSchema = z
  .object({
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().min(1, "End date is required"),
    message: z.string().optional(),
  })
  .refine(
    (data) => {
      const start = new Date(data.start_date);
      const end = new Date(data.end_date);
      return end > start;
    },
    {
      message: "End date must be after start date",
      path: ["end_date"],
    }
  );

interface BookingRequestFormProps {
  equipment: Database["public"]["Tables"]["equipment"]["Row"] & {
    category: Database["public"]["Tables"]["categories"]["Row"];
  };
  onSuccess?: () => void;
  onCancel?: () => void;
  isEmbedded?: boolean;
  onCalculationChange?: (
    calculation: BookingCalculation | null,
    startDate: string,
    endDate: string
  ) => void;
}

const BookingRequestForm = ({
  equipment,
  onSuccess,
  onCancel,
  isEmbedded = false,
  onCalculationChange,
}: BookingRequestFormProps) => {
  const { user } = useAuth();
  const { getOrCreateConversation, sendMessage } = useMessaging();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calculation, setCalculation] = useState<BookingCalculation | null>(
    null
  );
  const [conflicts, setConflicts] = useState<BookingConflict[]>([]);
  const [loadingConflicts, setLoadingConflicts] = useState(false);
  const requestIdRef = useRef(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      start_date: new Date().toISOString().split("T")[0],
      end_date: new Date(Date.now() + 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
    },
  });

  const watchedStartDate = watch("start_date");
  const watchedEndDate = watch("end_date");

  // Calculate pricing and check conflicts when dates change
  // Using database function for optimal performance (leverages index)
  useEffect(() => {
    if (watchedStartDate && watchedEndDate) {
      const newCalculation = calculateBookingTotal(
        equipment.daily_rate,
        watchedStartDate,
        watchedEndDate
      );
      setCalculation(newCalculation);
      onCalculationChange?.(newCalculation, watchedStartDate, watchedEndDate);

      // Increment request ID to mark this request as the latest
      requestIdRef.current += 1;
      const currentRequestId = requestIdRef.current;

      // Use async database function for conflict checking with proper error handling and race condition protection
      const checkConflicts = async () => {
        setLoadingConflicts(true);
        try {
          const result = await checkBookingConflicts(
            equipment.id,
            watchedStartDate,
            watchedEndDate
          );

          // Only apply results if this is still the latest request
          if (currentRequestId === requestIdRef.current) {
            setConflicts(result);
          }
        } catch (error) {
          // Only apply error handling if this is still the latest request
          if (currentRequestId === requestIdRef.current) {
            console.error("Error checking booking conflicts:", error);
            // Set persistent fallback conflict to prevent submission
            // This prevents the form from being submittable when availability check fails
            setConflicts([
              {
                type: "unavailable",
                message: "Could not verify availability — please try again",
              },
            ]);
          }
        } finally {
          // Only update loading state if this is still the latest request
          if (currentRequestId === requestIdRef.current) {
            setLoadingConflicts(false);
          }
        }
      };

      void checkConflicts();

      // Cleanup: mark request as stale on unmount or dependency change
      return () => {
        requestIdRef.current += 1;
      };
    } else {
      // Reset calculation when no dates are selected
      setCalculation(null);
      onCalculationChange?.(null, "", "");
    }
  }, [watchedStartDate, watchedEndDate, equipment.daily_rate, equipment.id, onCalculationChange]);

  const onSubmit = async (data: BookingFormData) => {
    if (!user || conflicts.length > 0) return;

    // Check if user is trying to book their own equipment
    if (user.id === equipment.owner_id) {
      alert("You cannot book your own equipment.");
      return;
    }

    setIsSubmitting(true);

    try {
      const bookingData = {
        equipment_id: equipment.id,
        renter_id: user.id,
        start_date: data.start_date,
        end_date: data.end_date,
        total_amount: calculation?.total || 0,
        status: "pending" as const,
        message: data.message || null,
      };

      const { data: newBooking, error } = await supabase
        .from("booking_requests")
        .insert(bookingData)
        .select()
        .single();

      if (error) throw error;

      // Automatically create a conversation for this booking
      if (newBooking) {
        try {
          const conversation = await getOrCreateConversation(
            [equipment.owner_id],
            newBooking.id
          );

          // Send initial message to the owner
          if (conversation && calculation) {
            const duration = formatBookingDuration(
              data.start_date,
              data.end_date
            );
            const startDateFormatted = formatBookingDate(data.start_date);
            const endDateFormatted = formatBookingDate(data.end_date);

            let messageContent = `Hi! I've requested to book your "${
              equipment.title
            }" from ${startDateFormatted} to ${endDateFormatted} (${duration}, $${calculation.total.toFixed(
              2
            )} total).`;

            if (data.message && data.message.trim()) {
              messageContent += `\n\n${data.message.trim()}`;
            }

            try {
              await sendMessage({
                conversation_id: conversation.id,
                content: messageContent,
                message_type: "text",
              });
            } catch (messageError) {
              console.error("Error sending initial message:", messageError);
              // Don't fail the booking if message sending fails
            }
          }
        } catch (convError) {
          console.error("Error creating conversation:", convError);
          // Don't fail the booking if conversation creation fails
        }
      }

      onSuccess?.();
    } catch (error) {
      console.error("Error creating booking request:", error);
      alert("Failed to submit booking request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasConflicts = conflicts.length > 0;
  const isOwnEquipment = user?.id === equipment.owner_id;
  const canSubmit = Boolean(
    !hasConflicts && !loadingConflicts && calculation && user && !isOwnEquipment
  );

  const formContent = (
    <BookingFormContent
      equipment={equipment}
      handleSubmit={handleSubmit}
      onSubmit={onSubmit}
      register={register}
      errors={errors}
      watchedStartDate={watchedStartDate}
      watchedEndDate={watchedEndDate}
      hasConflicts={hasConflicts}
      conflicts={conflicts}
      isOwnEquipment={isOwnEquipment}
      formatBookingDate={formatBookingDate}
      onCancel={onCancel}
      canSubmit={canSubmit}
      isSubmitting={isSubmitting}
    />
  );

  if (isEmbedded) {
    return <div className="w-full">{formContent}</div>;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-primary" />
          <span>Request Equipment Rental</span>
        </CardTitle>
        <CardDescription>
          Book "{equipment.title}" from {equipment.category.name}
        </CardDescription>
      </CardHeader>
      <CardContent>{formContent}</CardContent>
    </Card>
  );
};

interface BookingFormContentProps {
  equipment: Database["public"]["Tables"]["equipment"]["Row"] & {
    category: Database["public"]["Tables"]["categories"]["Row"];
  };
  handleSubmit: ReturnType<typeof useForm<BookingFormData>>["handleSubmit"];
  onSubmit: (data: BookingFormData) => Promise<void>;
  register: ReturnType<typeof useForm<BookingFormData>>["register"];
  errors: ReturnType<typeof useForm<BookingFormData>>["formState"]["errors"];
  watchedStartDate: string;
  watchedEndDate: string;
  hasConflicts: boolean;
  conflicts: BookingConflict[];
  isOwnEquipment: boolean;
  formatBookingDate: (date: string) => string;
  onCancel?: () => void;
  canSubmit: boolean;
  isSubmitting: boolean;
}

export const BookingFormContent = ({
  equipment,
  handleSubmit,
  onSubmit,
  register,
  errors,
  watchedStartDate,
  watchedEndDate,
  hasConflicts,
  conflicts,
  isOwnEquipment,
  formatBookingDate,
  onCancel,
  canSubmit,
  isSubmitting,
}: BookingFormContentProps) => {
  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(onSubmit)(e);
      }}
      className="space-y-6"
    >
      {/* Equipment Info */}
      <div className="bg-muted p-4 rounded-lg">
        <h3 className="font-semibold text-lg text-foreground">
          {equipment.title}
        </h3>
        <p className="text-muted-foreground">{equipment.category.name}</p>
        <p className="text-sm text-muted-foreground">📍 {equipment.location}</p>
        <div className="flex items-center space-x-4 mt-2">
          <span className="text-2xl font-bold text-primary">
            ${equipment.daily_rate}/day
          </span>
          <span className="text-sm text-muted-foreground capitalize">
            {equipment.condition} condition
          </span>
        </div>
      </div>

      {/* Date Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_date">Start Date *</Label>
          <Input
            id="start_date"
            type="date"
            {...register("start_date")}
            min={new Date().toISOString().split("T")[0]}
          />
          {errors.start_date && (
            <p className="text-sm text-red-600">{errors.start_date.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_date">End Date *</Label>
          <Input
            id="end_date"
            type="date"
            {...register("end_date")}
            min={watchedStartDate}
          />
          {errors.end_date && (
            <p className="text-sm text-red-600">{errors.end_date.message}</p>
          )}
        </div>
      </div>

      {/* Conflicts Alert */}
      {hasConflicts && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {conflicts.map((conflict, index) => (
                <div key={index}>{conflict.message}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Own Equipment Warning */}
      {isOwnEquipment && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You cannot book your own equipment. This equipment belongs to you.
          </AlertDescription>
        </Alert>
      )}

      {/* Message to Owner */}
      <div className="space-y-2">
        <Label htmlFor="message">Message to Owner (Optional)</Label>
        <Textarea
          id="message"
          {...register("message")}
          placeholder="Any special requests or questions for the owner..."
          rows={3}
        />
      </div>

      {/* Rental Period Summary */}
      {watchedStartDate && watchedEndDate && (
        <div className="bg-primary/10 dark:bg-primary/20 p-4 rounded-lg border border-primary/20">
          <h4 className="font-semibold text-primary mb-2">Rental Period</h4>
          <div className="flex items-center space-x-2 text-primary">
            <Clock className="h-4 w-4" />
            <span>
              {formatBookingDate(watchedStartDate)} -{" "}
              {formatBookingDate(watchedEndDate)}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className="min-w-[120px]"
        >
          {isSubmitting ? "Submitting..." : "Submit Request"}
        </Button>
      </div>
    </form>
  );
};

export default BookingRequestForm;
