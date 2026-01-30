"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { db } from "@repo/db";

// This is a development-only mock checkout page
export default function MockCheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const amount = searchParams.get("amount");
  const plan = searchParams.get("plan");
  const schoolId = searchParams.get("schoolId");

  const handleSimulatePayment = async (success: boolean) => {
    setIsProcessing(true);

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (success) {
      // In development, we'll call the webhook endpoint directly
      await fetch("/api/webhooks/dodo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "payment.completed",
          data: {
            id: `dev_session_${Date.now()}`,
            metadata: {
              schoolId,
              planType: plan,
              paymentType: "SIGNUP",
            },
          },
        }),
      });

      router.push("/onboarding");
    } else {
      router.push("/payment?cancelled=true");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--muted)' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
        <div className="text-center">
          <div className="alert alert-warning" style={{ marginBottom: '1.5rem' }}>
            Development Mode - Mock Checkout
          </div>

          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Mock Payment
          </h1>
          <p style={{ color: 'var(--muted-foreground)', marginBottom: '1.5rem' }}>
            This simulates the Dodo Payments checkout
          </p>

          <div style={{ 
            background: 'var(--muted)', 
            padding: '1rem', 
            borderRadius: 'var(--radius)',
            marginBottom: '1.5rem'
          }}>
            <p><strong>Plan:</strong> {plan}</p>
            <p><strong>Amount:</strong> ${amount}</p>
          </div>

          {isProcessing ? (
            <div className="flex flex-col items-center gap-4">
              <div className="spinner" style={{ width: '2rem', height: '2rem' }}></div>
              <p>Processing payment...</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleSimulatePayment(true)}
                className="btn btn-primary w-full"
              >
                Simulate Successful Payment
              </button>
              <button
                onClick={() => handleSimulatePayment(false)}
                className="btn btn-outline w-full"
              >
                Simulate Failed Payment
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
