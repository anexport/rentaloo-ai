import { useState, useEffect } from "react";
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
import { Calendar, DollarSign, Clock, AlertCircle } from "lucide-react";
import AvailabilityCalendar from "../AvailabilityCalendar";

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
}

const BookingRequestForm = ({
  equipment,
  onSuccess,
  onCancel,
}: BookingRequestFormProps) => {
  const { user } = useAuth();
  const { getOrCreateConversation } = useMessaging();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calculation, setCalculation] = useState<BookingCalculation | null>(
    null
  );
  const [conflicts, setConflicts] = useState<BookingConflict[]>([]);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [customPricing, setCustomPricing] = useState<Record<string, number>>(
    {}
  );

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

  // Fetch existing bookings and availability for conflict checking
  useEffect(() => {
    const fetchExistingBookings = async () => {
      const { data, error } = await supabase
        .from("booking_requests")
        .select("start_date, end_date, status")
        .eq("equipment_id", equipment.id)
        .in("status", ["pending", "approved"]);

      if (error) {
        console.error("Error fetching existing bookings:", error);
        return;
      }

      setExistingBookings(data || []);
    };

    const fetchAvailability = async () => {
      // Fetch next 3 months of availability data
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3);

      const { data, error } = await supabase
        .from("availability_calendar")
        .select("*")
        .eq("equipment_id", equipment.id)
        .gte("date", startDate.toISOString().split("T")[0])
        .lte("date", endDate.toISOString().split("T")[0]);

      if (error) {
        console.error("Error fetching availability:", error);
        return;
      }

      const blocked: string[] = [];
      const pricing: Record<string, number> = {};

      (data || []).forEach((item) => {
        if (item.is_blocked) {
          blocked.push(item.date);
        }
        if (item.custom_price) {
          pricing[item.date] = item.custom_price;
        }
      });

      setBlockedDates(blocked);
      setCustomPricing(pricing);
    };

    fetchExistingBookings();
    fetchAvailability();
  }, [equipment.id]);

  // Calculate pricing and check conflicts when dates change
  useEffect(() => {
    if (watchedStartDate && watchedEndDate) {
      const newCalculation = calculateBookingTotal(
        equipment.daily_rate,
        watchedStartDate,
        watchedEndDate
      );
      setCalculation(newCalculation);

      const newConflicts = checkBookingConflicts(
        equipment.id,
        watchedStartDate,
        watchedEndDate,
        existingBookings
      );
      setConflicts(newConflicts);
    }
  }, [
    watchedStartDate,
    watchedEndDate,
    equipment.daily_rate,
    equipment.id,
    existingBookings,
  ]);

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
          await getOrCreateConversation([equipment.owner_id], newBooking.id);
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
  const canSubmit = !hasConflicts && calculation && user && !isOwnEquipment;

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
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Equipment Info */}
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold text-lg text-foreground">
              {equipment.title}
            </h3>
            <p className="text-muted-foreground">{equipment.category.name}</p>
            <p className="text-sm text-muted-foreground">
              📍 {equipment.location}
            </p>
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
                <p className="text-sm text-red-600">
                  {errors.start_date.message}
                </p>
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
                <p className="text-sm text-red-600">
                  {errors.end_date.message}
                </p>
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
                You cannot book your own equipment. This equipment belongs to
                you.
              </AlertDescription>
            </Alert>
          )}

          {/* Pricing Breakdown */}
          {calculation && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center space-x-2">
                  <DollarSign className="h-5 w-5" />
                  <span>Pricing Breakdown</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span>
                    {formatBookingDuration(watchedStartDate, watchedEndDate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Daily Rate:</span>
                  <span>${calculation.daily_rate}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal ({calculation.days} days):</span>
                  <span>${calculation.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Fee (5%):</span>
                  <span>${calculation.fees.toFixed(2)}</span>
                </div>
                <hr />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total:</span>
                  <span>${calculation.total.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
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
      </CardContent>
    </Card>
  );
};

export default BookingRequestForm;
