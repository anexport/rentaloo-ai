import type { PaymentSummary as PaymentSummaryType } from "../../types/payment";
import type { InsuranceType } from "../../types/booking";
import { formatCurrency } from "../../lib/payment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DollarSign, Shield, TrendingUp, RefreshCw, AlertCircle } from "lucide-react";

interface PaymentSummaryProps {
  summary: PaymentSummaryType;
  showEscrowInfo?: boolean;
  insuranceType?: InsuranceType;
}

const PaymentSummary = ({
  summary,
  showEscrowInfo = false,
  insuranceType,
}: PaymentSummaryProps) => {
  const hasInsurance = summary.insurance > 0;
  const hasDeposit = summary.deposit > 0;

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

        {/* Insurance */}
        {hasInsurance && (
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1 text-gray-600">
              <Shield className="h-3 w-3" />
              {insuranceType === 'basic' ? 'Basic' : 'Premium'} Protection
            </span>
            <span className="font-medium">
              {formatCurrency(summary.insurance)}
            </span>
          </div>
        )}

        {/* Tax */}
        {summary.tax > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Tax</span>
            <span className="font-medium">{formatCurrency(summary.tax)}</span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-gray-200 my-2" />

        {/* Rental Total */}
        <div className="flex justify-between items-center font-semibold">
          <span>Rental Total</span>
          <span>
            {formatCurrency(summary.subtotal + summary.service_fee + summary.insurance)}
          </span>
        </div>

        {/* Damage Deposit */}
        {hasDeposit && (
          <>
            <div className="border-t border-gray-200 my-2" />
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1 text-gray-600">
                <RefreshCw className="h-3 w-3 text-green-600" />
                Damage Deposit (Refundable)
              </span>
              <span className="font-medium text-green-600">
                {formatCurrency(summary.deposit)}
              </span>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                This deposit will be refunded after successful equipment return
              </AlertDescription>
            </Alert>
          </>
        )}

        {/* Divider */}
        <div className="border-t border-gray-200 my-2" />

        {/* Total */}
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">Total Charge</span>
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

