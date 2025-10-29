import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePayment } from "@/hooks/usePayment";
import { supabase } from "@/lib/supabase";
import {
  formatCurrency,
  formatTransactionDate,
  getEscrowStatusColor,
  getEscrowStatusText,
} from "../../lib/payment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, TrendingUp, Clock, Eye } from "lucide-react";
import EscrowStatus from "./EscrowStatus";

interface EscrowPayment {
  id: string;
  escrow_amount: number;
  escrow_status: string;
  owner_payout_amount: number;
  booking_request: {
    end_date: string;
    equipment: {
      title: string;
    };
  };
  created_at: string | null;
}

const EscrowDashboard = () => {
  const { user } = useAuth();
  const { getEscrowBalance } = usePayment();
  const [payments, setPayments] = useState<EscrowPayment[]>([]);
  const [totalEscrow, setTotalEscrow] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);

  useEffect(() => {
    const fetchEscrowData = async () => {
      if (!user) return;

      setLoading(true);

      try {
        // Fetch all payments with escrow status
        const { data, error } = await supabase
          .from("payments")
          .select(
            `
            id,
            escrow_amount,
            escrow_status,
            owner_payout_amount,
            created_at,
            booking_request:booking_requests (
              end_date,
              equipment:equipment (
                title
              )
            )
          `
          )
          .eq("owner_id", user.id)
          .in("escrow_status", ["held", "released"])
          .order("created_at", { ascending: false });

        if (error) throw error;

        setPayments(data || []);

        // Calculate total held in escrow
        const balance = await getEscrowBalance(user.id);
        setTotalEscrow(balance);
      } catch (error) {
        console.error("Error fetching escrow data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEscrowData();
  }, [user, getEscrowBalance]);

  const handleEscrowReleased = () => {
    // Refresh escrow data
    if (user) {
      getEscrowBalance(user.id).then(setTotalEscrow);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          Loading escrow information...
        </CardContent>
      </Card>
    );
  }

  const selectedPaymentData = payments.find((p) => p.id === selectedPayment);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total in Escrow */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total in Escrow</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(totalEscrow)}
                </p>
              </div>
              <Shield className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        {/* Held Funds */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Held Funds</p>
                <p className="text-2xl font-bold">
                  {payments.filter((p) => p.escrow_status === "held").length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        {/* Released Funds */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Released Funds</p>
                <p className="text-2xl font-bold">
                  {
                    payments.filter((p) => p.escrow_status === "released")
                      .length
                  }
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Escrow Payments List */}
      <Card>
        <CardHeader>
          <CardTitle>Escrow Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No escrow payments found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {payment.booking_request?.equipment?.title ||
                            "Unknown Equipment"}
                        </h3>
                        <Badge
                          className={getEscrowStatusColor(
                            payment.escrow_status
                          )}
                        >
                          {getEscrowStatusText(payment.escrow_status)}
                        </Badge>
                      </div>

                      <div className="text-sm text-gray-600 space-y-1">
                        <div>
                          Escrow Amount: {formatCurrency(payment.escrow_amount)}
                        </div>
                        <div>
                          Payout: {formatCurrency(payment.owner_payout_amount)}
                        </div>
                        <div>
                          Created:{" "}
                          {formatTransactionDate(payment.created_at || "")}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSelectedPayment(
                          selectedPayment === payment.id ? null : payment.id
                        )
                      }
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {selectedPayment === payment.id ? "Hide" : "Details"}
                    </Button>
                  </div>

                  {/* Expanded Details */}
                  {selectedPayment === payment.id && selectedPaymentData && (
                    <div className="mt-4 pt-4 border-t">
                      <EscrowStatus
                        paymentId={payment.id}
                        escrowStatus={payment.escrow_status}
                        escrowAmount={payment.escrow_amount}
                        bookingEndDate={payment.booking_request?.end_date || ""}
                        onEscrowReleased={handleEscrowReleased}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EscrowDashboard;
