import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import {
  formatCurrency,
  formatTransactionDate,
  getPaymentStatusText,
  getPaymentStatusColor,
} from "../../lib/payment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt, Download } from "lucide-react";

interface Transaction {
  id: string;
  booking_request_id: string;
  total_amount: number;
  payment_status: string;
  escrow_status: string;
  created_at: string | null;
  equipment_title?: string;
  counterparty_name?: string;
}

interface TransactionHistoryProps {
  userType: "renter" | "owner";
}

const TransactionHistory = ({ userType }: TransactionHistoryProps) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const column = userType === "renter" ? "renter_id" : "owner_id";

        const { data, error } = await supabase
          .from("payments")
          .select(
            `
            *,
            booking_request:booking_requests (
              equipment:equipment (
                title
              )
            )
          `
          )
          .eq(column, user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setTransactions(data || []);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchTransactions();
  }, [user, userType]);

  const filteredTransactions = transactions.filter((tx) => {
    if (filter === "all") return true;
    return tx.payment_status === filter;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          Loading transactions...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center space-x-2">
            <Receipt className="h-5 w-5 text-primary" />
            <span>Transaction History</span>
          </CardTitle>

          {/* Filter Buttons */}
          <div className="flex items-center space-x-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All
            </Button>
            <Button
              variant={filter === "succeeded" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("succeeded")}
            >
              Completed
            </Button>
            <Button
              variant={filter === "pending" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("pending")}
            >
              Pending
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Receipt className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No transactions found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-gray-900">
                        {transaction.equipment_title || "Unknown Equipment"}
                      </h3>
                      <Badge
                        className={getPaymentStatusColor(
                          transaction.payment_status
                        )}
                      >
                        {getPaymentStatusText(transaction.payment_status)}
                      </Badge>
                    </div>

                    <div className="text-sm text-gray-600 space-y-1">
                      <div>
                        Transaction ID: {transaction.id.substring(0, 8)}...
                      </div>
                      <div>
                        {formatTransactionDate(transaction.created_at || "")}
                      </div>
                      {userType === "owner" && transaction.escrow_status && (
                        <div className="text-xs">
                          Escrow: {transaction.escrow_status.replace("_", " ")}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      {formatCurrency(transaction.total_amount)}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        // TODO: Implement receipt download
                        alert("Receipt download coming soon!");
                      }}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Receipt
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TransactionHistory;
