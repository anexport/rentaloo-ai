import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/useToast";
import { Loader2, RefreshCw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DepositReleaseButtonProps {
  bookingId: string;
  depositAmount: number;
  canRelease: boolean;
  reason?: string;
  onSuccess: () => void;
}

export default function DepositReleaseButton({
  bookingId,
  depositAmount,
  canRelease,
  reason,
  onSuccess,
}: DepositReleaseButtonProps) {
  const [isReleasing, setIsReleasing] = useState(false);
  const { toast } = useToast();

  const handleRelease = async () => {
    setIsReleasing(true);

    try {
      const { data, error } = await supabase.functions.invoke("release-deposit", {
        body: { bookingId },
      });

      if (error) throw error;

      toast({
        title: "Deposit Released",
        description: `$${depositAmount.toFixed(2)} has been refunded to the renter`,
      });

      onSuccess();
    } catch (error) {
      console.error("Error releasing deposit:", error);
      toast({
        variant: "destructive",
        title: "Release Failed",
        description:
          error instanceof Error ? error.message : "Failed to release deposit",
      });
    } finally {
      setIsReleasing(false);
    }
  };

  if (!canRelease) {
    return (
      <div className="space-y-1">
        <Button variant="outline" disabled className="w-full">
          <RefreshCw className="h-4 w-4 mr-2" />
          Release Deposit ${depositAmount.toFixed(2)}
        </Button>
        {reason && (
          <p className="text-xs text-muted-foreground text-center">{reason}</p>
        )}
      </div>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="default" disabled={isReleasing} className="w-full">
          {isReleasing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <RefreshCw className="h-4 w-4 mr-2" />
          Release Deposit ${depositAmount.toFixed(2)}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Release Deposit?</AlertDialogTitle>
          <AlertDialogDescription>
            This will refund ${depositAmount.toFixed(2)} to the renter. This
            action cannot be undone. Make sure you have verified the equipment
            condition before releasing the deposit.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleRelease} disabled={isReleasing}>
            {isReleasing ? "Releasing..." : "Release Deposit"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
