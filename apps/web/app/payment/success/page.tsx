"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface PaymentResponse {
  payment: {
    id: string;
    amount: number;
    paid: boolean;
    plan: string;
    createdAt: string;
  };
  isPaid: boolean;
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const intermediatePaymentId = searchParams.get("intermediatePaymentId");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [payment, setPayment] = useState<PaymentResponse["payment"] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const verifyPayment = async () => {
      if (!intermediatePaymentId) {
        setStatus("error");
        setError("Payment ID not found");
        return;
      }

      try {
        const response = await api.get<PaymentResponse>(
          `/payments/verify/${intermediatePaymentId}`
        );

        setPayment(response.payment);

        if (response.isPaid) {
          setStatus("success");
        } else {
          // Payment not yet verified - they might still be processing
          // Wait a moment and check again
          setTimeout(verifyPayment, 2000);
        }
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Payment verification failed");
      }
    };

    verifyPayment();
  }, [intermediatePaymentId]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="animate-spin w-12 h-12 border-4 border-brand border-t-transparent rounded-full mx-auto" />
            <p className="text-muted-foreground">Verifying your payment...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Payment Not Found</h2>
                  <p className="text-muted-foreground mt-2">{error}</p>
                </div>
              </div>

              <Alert variant="destructive">
                <AlertTitle>Unable to Verify Payment</AlertTitle>
                <AlertDescription>
                  We couldn&apos;t find your payment record. This could mean:
                </AlertDescription>
                <ul className="mt-2 ml-4 space-y-1 text-sm list-disc">
                  <li>The payment link is invalid or expired</li>
                  <li>The payment hasn&apos;t been processed yet</li>
                  <li>There was an issue with this transaction</li>
                </ul>
              </Alert>

              <div className="space-y-3">
                <Button className="w-full" onClick={() => window.location.href = "/payment"}>
                  Retry Payment
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/")}
                >
                  Contact Support
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="text-center space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center"
              >
                <CheckCircle className="w-8 h-8 text-green-600" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-bold">Payment Successful!</h2>
                <p className="text-muted-foreground mt-2">
                  Thank you for choosing Connect-Ed
                </p>
              </div>
            </div>

            <Alert variant="success">
              <AlertTitle>Payment Confirmed</AlertTitle>
              <AlertDescription>
                {payment && (
                  <div className="space-y-1 text-sm mt-2">
                    <p>
                      <strong>Amount:</strong> ${payment.amount}
                    </p>
                    <p>
                      <strong>Plan:</strong> {payment.plan}
                    </p>
                    <p>
                      <strong>Transaction ID:</strong> {payment.id.slice(0, 8)}...
                    </p>
                  </div>
                )}
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button
                className="w-full"
                size="lg"
                onClick={() => router.push("/onboarding")}
              >
                Continue to Onboarding
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/dashboard")}
              >
                Go to Dashboard
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              A confirmation email has been sent to your email address.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
