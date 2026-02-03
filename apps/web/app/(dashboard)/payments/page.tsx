"use client";

import { useEffect, useState } from "react";
import { DashboardGuard } from "@/components/auth-guard";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PaymentItem {
  id: string;
  amount: string | number;
  type: "SIGNUP_FEE" | "TERM_PAYMENT";
  status: "PENDING" | "COMPLETED" | "FAILED";
  paymentMethod: "CASH" | "BANK_TRANSFER" | "ONLINE";
  reference?: string | null;
  createdAt: string;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPayments = async () => {
      try {
        const response = await api.get<{ payments: PaymentItem[] }>("/payments");
        setPayments(response.payments || []);
      } catch {
        setPayments([]);
      } finally {
        setLoading(false);
      }
    };

    loadPayments();
  }, []);

  return (
    <DashboardGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Payment History</h1>
          <p className="text-muted-foreground">View all payments made for your school.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Loading payments...</div>
            ) : payments.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No payments found.</div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3"
                  >
                    <div>
                      <div className="text-sm font-semibold">
                        {payment.type === "SIGNUP_FEE" ? "Signup Fee" : "Term Payment"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-sm font-semibold">${Number(payment.amount).toFixed(2)}</div>
                    <div className="flex items-center gap-2">
                      <Badge variant={payment.status === "COMPLETED" ? "success" : payment.status === "FAILED" ? "destructive" : "outline"}>
                        {payment.status}
                      </Badge>
                      <Badge variant="outline">{payment.paymentMethod}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{payment.reference || "—"}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardGuard>
  );
}
