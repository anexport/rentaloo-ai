import { useState } from "react";
import { usePayment } from "@/hooks/usePayment";
import {
  getEscrowStatusText,
  getEscrowStatusColor,
  formatCurrency,
  formatTransactionDate,
} from "../../lib/payment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertCircle, CheckCircle, Clock } from "lucide-react";

interface EscrowStatusProps {
  paymentId: string;
  escrowStatus: string;
  escrowAmount: number;
  bookingEndDate: string;
  onEscrowReleased?: () => void;
}

const EscrowStatus = ({
  paymentId,
  escrowStatus,
  escrowAmount,
  bookingEndDate,
  onEscrowReleased,
}: EscrowStatusProps) => {
  const { releaseEscrow, loading, error } = usePayment();
  const [isReleasing, setIsReleasing] = useState(false);
  const [releaseSuccess, setReleaseSuccess] = useState(false);

  const handleReleaseEscrow = async () => {
    setIsReleasing(true);
    try {
      const success = await releaseEscrow({ paymentId });
      if (success) {
        setReleaseSuccess(true);
        onEscrowReleased?.();
      }
    } finally {
      setIsReleasing(false);
    }
  };

  const canRelease = () => {
    const endDate = new Date(bookingEndDate);
    const now = new Date();
    // Add 1 day buffer after rental end
    const releaseDate = new Date(endDate);
    releaseDate.setDate(releaseDate.getDate() + 1);

    return now >= releaseDate && escrowStatus === "held";
  };

  const isReleaseAvailable = canRelease();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-primary" />
          <span>Escrow Status</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Status</span>
          <Badge className={getEscrowStatusColor(escrowStatus)}>
            {getEscrowStatusText(escrowStatus)}
          </Badge>
        </div>

        {/* Escrow Amount */}
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Amount in Escrow</span>
          <span className="text-lg font-bold text-primary">
            {formatCurrency(escrowAmount)}
          </span>
        </div>

        {/* Release Date Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <Clock className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-xs text-blue-700">
              {escrowStatus === "held" ? (
                <>
                  Funds will be available for release after{" "}
                  {formatTransactionDate(
                    new Date(
                      new Date(bookingEndDate).getTime() + 24 * 60 * 60 * 1000
                    ).toISOString()
                  )}
                </>
              ) : escrowStatus === "released" ? (
                <>Funds have been released to your account</>
              ) : (
                <>Funds have been {escrowStatus.toLowerCase()}</>
              )}
            </div>
          </div>
        </div>

        {/* Release Button */}
        {escrowStatus === "held" && (
          <>
            {isReleaseAvailable ? (
              <Button
                onClick={() => {
                  void handleReleaseEscrow();
                }}
                disabled={isReleasing || loading}
                className="w-full"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {isReleasing ? "Releasing..." : "Release Escrow Funds"}
              </Button>
            ) : (
              <Button disabled className="w-full" variant="outline">
                <Clock className="h-4 w-4 mr-2" />
                Release Available After Rental Ends
              </Button>
            )}
          </>
        )}

        {/* Success Message */}
        {releaseSuccess && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              Escrow funds have been released successfully!
            </AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Information */}
        <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
          <p className="font-medium">How Escrow Works:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Funds are held securely until rental completion</li>
            <li>Released automatically 24 hours after rental ends</li>
            <li>Protected against disputes and damage claims</li>
            <li>Transferred directly to your linked account</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default EscrowStatus;
