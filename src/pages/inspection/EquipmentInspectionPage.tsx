import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import InspectionWizard from "@/components/inspection/InspectionWizard";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import type { InspectionType } from "@/types/inspection";

interface BookingDetails {
  id: string;
  equipment_id: string;
  renter_id: string;
  status: string;
  start_date: string;
  end_date: string;
  damage_deposit_amount: number | null;
  equipment: {
    id: string;
    title: string;
    owner_id: string;
    category: {
      sport_type: string;
    } | null;
  };
}

export default function EquipmentInspectionPage() {
  const { bookingId, type } = useParams<{
    bookingId: string;
    type: "pickup" | "return";
  }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const inspectionType: InspectionType = type === "return" ? "return" : "pickup";

  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId || !user) {
        setError("Invalid booking or not authenticated");
        setLoading(false);
        return;
      }

      // Clear stale errors and show loading when a valid fetch is about to run
      setError("");
      setLoading(true);

      try {
        const { data, error: fetchError } = await supabase
          .from("booking_requests")
          .select(
            `
            id,
            equipment_id,
            renter_id,
            status,
            start_date,
            end_date,
            damage_deposit_amount,
            equipment:equipment(
              id,
              title,
              owner_id,
              category:categories(sport_type)
            )
          `
          )
          .eq("id", bookingId)
          .single();

        if (fetchError) throw fetchError;

        if (!data) {
          setError("Booking not found");
          setLoading(false);
          return;
        }

        // Check if user is owner or renter
        const equipment = data.equipment as BookingDetails["equipment"];
        const isOwner = equipment?.owner_id === user.id;
        const isRenter = data.renter_id === user.id;

        if (!isOwner && !isRenter) {
          setError("You are not authorized to view this inspection");
          setLoading(false);
          return;
        }

        // Check booking status based on inspection type
        // Pickup inspection: booking must be 'approved'
        // Return inspection: booking must be 'active'
        const validPickupStatuses = ["approved"];
        const validReturnStatuses = ["active"];

        if (inspectionType === "pickup" && !validPickupStatuses.includes(data.status)) {
          setError("Booking must be approved before pickup inspection");
          setLoading(false);
          return;
        }

        if (inspectionType === "return" && !validReturnStatuses.includes(data.status)) {
          setError("Rental must be active before return inspection");
          setLoading(false);
          return;
        }

        setBooking({
          ...data,
          equipment,
        } as BookingDetails);
      } catch (err) {
        console.error("Error fetching booking:", err);
        setError("Failed to load booking details");
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId, user, inspectionType]);

  const handleSuccess = () => {
    // Navigate back to appropriate dashboard
    const isOwner = booking?.equipment?.owner_id === user?.id;
    navigate(isOwner ? "/owner/dashboard" : "/renter/dashboard");
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const handleReviewClick = () => {
    // Navigate to review flow after rental completion
    // For now, navigate back to dashboard where review prompt will appear
    const isOwner = booking?.equipment?.owner_id === user?.id;
    navigate(isOwner ? "/owner/dashboard" : "/renter/dashboard", {
      state: { showReviewPrompt: true, bookingId: booking?.id },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading inspection...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || "Something went wrong"}</AlertDescription>
          </Alert>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleCancel}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const isOwner = booking.equipment?.owner_id === user?.id;

  // Prepare booking info for the wizard
  const bookingInfo = {
    startDate: booking.start_date,
    endDate: booking.end_date,
    depositAmount: booking.damage_deposit_amount ?? undefined,
  };

  return (
    <InspectionWizard
      bookingId={booking.id}
      equipmentTitle={booking.equipment?.title || "Equipment"}
      categorySlug={booking.equipment?.category?.sport_type}
      inspectionType={inspectionType}
      isOwner={isOwner}
      bookingInfo={bookingInfo}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
      onReviewClick={inspectionType === "return" ? handleReviewClick : undefined}
    />
  );
}
