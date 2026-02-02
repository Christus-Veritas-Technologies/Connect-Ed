"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckmarkCircle02Icon,
  CreditCardIcon,
  BankIcon,
  ArrowRight01Icon,
  InformationCircleIcon,
  HugeiconsFreeIcons,
} from "@hugeicons/core-free-icons";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { PRICING } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import type { Plan } from "@repo/db";
import { HugeiconsIcon } from "@hugeicons/react";

const plans: Plan[] = ["LITE", "GROWTH", "ENTERPRISE"];

export default function PaymentPage() {
  const { school, user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<Plan>("LITE");
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cash">("online");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCashInstructions, setShowCashInstructions] = useState(false);

  const handlePayOnline = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await api.post<{ checkoutUrl: string }>("/payments/create-checkout", {
        planType: selectedPlan,
        paymentType: "SIGNUP",
      });

      window.location.href = response.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
      setIsLoading(false);
    }
  };

  const pricing = PRICING[selectedPlan];
  const total = pricing.signupFee + pricing.monthlyEstimate;

  if (showCashInstructions) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Cash Payment Instructions</CardTitle>
            <CardDescription>
              Follow these steps to complete your payment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert variant="warning">
              <AlertTitle>Selected Plan: {pricing.name}</AlertTitle>
              <AlertDescription>
                Total amount: ${total} (Signup fee + First month)
              </AlertDescription>
            </Alert>

            <div className="p-4 rounded-xl bg-muted">
              <h3 className="font-semibold mb-2">Payment Details</h3>
              <p><strong>Amount:</strong> ${total}</p>
              <p><strong>Reference:</strong> {school?.id?.slice(0, 8).toUpperCase()}</p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Steps to Pay</h3>
              <ol className="space-y-2 list-decimal list-inside text-muted-foreground">
                <li>Make a bank transfer or cash deposit</li>
                <li>Use reference: <strong className="text-foreground">{school?.id?.slice(0, 8).toUpperCase()}</strong></li>
                <li>Send payment proof to: <strong className="text-foreground">payments@connect-ed.com</strong></li>
                <li>Include your email: <strong className="text-foreground">{user?.email}</strong></li>
                <li>We&apos;ll verify and activate within 24 hours</li>
              </ol>
            </div>

            <div className="p-4 rounded-xl bg-muted">
              <h3 className="font-semibold mb-2">Bank Details</h3>
              <p><strong>Bank:</strong> Example Bank</p>
              <p><strong>Account Name:</strong> Connect-Ed Ltd</p>
              <p><strong>Account Number:</strong> 1234567890</p>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowCashInstructions(false)}
            >
              Back to Plan Selection
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold">Choose Your Plan</h1>
        <p className="text-muted-foreground mt-2">
          Select the plan that best fits your school&apos;s needs
        </p>
      </motion.div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Plan Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan, index) => {
          const planPricing = PRICING[plan];
          const isSelected = selectedPlan === plan;
          const isPopular = plan === "GROWTH";

          return (
            <motion.div
              key={plan}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                hover
                onClick={() => setSelectedPlan(plan)}
                className={`relative cursor-pointer transition-all ${
                  isSelected ? "border-brand ring-4 ring-brand/20" : ""
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="brand">Most Popular</Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl">{planPricing.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {planPricing.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="text-center">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold">${planPricing.signupFee}</span>
                      <span className="text-muted-foreground">signup</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      + ${planPricing.perTermCost}/term (~${planPricing.monthlyEstimate}/mo)
                    </p>
                  </div>

                  <ul className="space-y-3">
                    {planPricing.features.slice(0, 6).map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <HugeiconsIcon icon={CheckmarkCircle02Icon}
                          size={18}
                          className="text-success shrink-0 mt-0.5"
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={isSelected ? "default" : "outline"}
                    className="w-full"
                    onClick={() => setSelectedPlan(plan)}
                  >
                    {isSelected ? "Selected" : "Select Plan"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Payment Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>Payment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span>Signup Fee ({pricing.name})</span>
                <span className="font-semibold">${pricing.signupFee}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span>First Month</span>
                <span className="font-semibold">${pricing.monthlyEstimate}</span>
              </div>
              <div className="flex justify-between py-2 text-lg font-bold">
                <span>Total Due Today</span>
                <span className="text-brand">${total}</span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold">Payment Method</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setPaymentMethod("online")}
                  className={`p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${
                    paymentMethod === "online"
                      ? "border-brand bg-brand/5"
                      : "border-border hover:border-brand/50"
                  }`}
                >
                  <HugeiconsIcon icon={CreditCardIcon} size={24} className="text-brand" />
                  <span className="font-medium">Pay Online</span>
                </button>
                <button
                  onClick={() => setPaymentMethod("cash")}
                  className={`p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${
                    paymentMethod === "cash"
                      ? "border-brand bg-brand/5"
                      : "border-border hover:border-brand/50"
                  }`}
                >
                  <HugeiconsIcon icon={BankIcon} size={24} className="text-brand" />
                  <span className="font-medium">Cash/Transfer</span>
                </button>
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              loading={isLoading}
              onClick={paymentMethod === "online" ? handlePayOnline : () => setShowCashInstructions(true)}
            >
              {!isLoading && (
                <>
                  {paymentMethod === "online" ? `Pay $${total} Now` : "View Payment Instructions"}
                  <HugeiconsIcon icon={ArrowRight01Icon} size={20} />
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
              <HugeiconsIcon icon={InformationCircleIcon} size={14} />
              Secure payment powered by Dodo Payments
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
