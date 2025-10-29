import type { PaymentSummary as PaymentSummaryType } from "../../types/payment";
import { formatCurrency } from "../../lib/payment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Shield, TrendingUp } from "lucide-react";

interface PaymentSummaryProps {
  summary: PaymentSummaryType;
  showEscrowInfo?: boolean;
}

const PaymentSummary = ({
  summary,
  showEscrowInfo = false,
}: PaymentSummaryProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <span>Payment Summary</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Subtotal */}
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Rental Cost</span>
          <span className="font-medium">
            {formatCurrency(summary.subtotal)}
          </span>
        </div>

        {/* Service Fee */}
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Service Fee (5%)</span>
          <span className="font-medium">
            {formatCurrency(summary.service_fee)}
          </span>
        </div>

        {/* Tax */}
        {summary.tax > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Tax</span>
            <span className="font-medium">{formatCurrency(summary.tax)}</span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-gray-200 my-2" />

        {/* Total */}
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">Total</span>
          <span className="text-lg font-bold text-primary">
            {formatCurrency(summary.total)}
          </span>
        </div>

        {/* Escrow Information (for owners) */}
        {showEscrowInfo && (
          <>
            <div className="border-t border-gray-200 my-3" />

            <div className="bg-blue-50 p-3 rounded-lg space-y-2">
              <div className="flex items-start space-x-2">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-blue-900">
                    Escrow Protection
                  </div>
                  <div className="text-xs text-blue-700 mt-1">
                    Funds ({formatCurrency(summary.escrow_amount)}) are held
                    securely until rental completion
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-3 rounded-lg space-y-2">
              <div className="flex items-start space-x-2">
                <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-green-900">
                    Your Earnings
                  </div>
                  <div className="text-xs text-green-700 mt-1">
                    You'll receive {formatCurrency(summary.owner_payout)} after
                    successful rental completion
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentSummary;

