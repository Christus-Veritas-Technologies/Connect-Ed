"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle02Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { PRICING } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { Plan } from "@repo/db";

const plans: Plan[] = ["LITE", "GROWTH", "ENTERPRISE"];

export default function PaymentPage() {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<Plan>("LITE");
  const [isManualPayment, setIsManualPayment] = useState(false);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [error, setError] = useState("");

  const pricing = PRICING[selectedPlan];
  
  // If manual payment, only charge monthly. Otherwise, charge signup + monthly
  const paymentAmount = isManualPayment 
    ? pricing.monthlyEstimate 
    : pricing.signupFee + pricing.monthlyEstimate;

  const handleManualPaymentToggle = (checked: boolean) => {
    setIsManualPayment(checked);
    setError("");
    
    // If enabling manual payment, call API in background
    if (checked) {
      api.post<{
        nextPaymentAmount: number;
      }>("/payments/confirm-manual-payment", {
        plan: selectedPlan,
        paymentType: "SIGNUP",
      }).catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to process manual payment confirmation");
        setIsManualPayment(false); // Revert on error
      });
    }
  };

  const handlePayOnline = async () => {
    setIsPaymentLoading(true);
    setError("");

    try {
      const response = await api.post<{
        checkoutUrl: string;
        intermediatePaymentId: string;
      }>("/payments/create-checkout", {
        planType: selectedPlan,
        paymentType: isManualPayment ? "TERM_PAYMENT" : "SIGNUP",
        email: user?.email,
      });

      // Redirect to PayNow checkout
      window.location.href = response.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
      setIsPaymentLoading(false);
    }
  };

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
                  isSelected 
                    ? "bg-brand border-brand ring-4 ring-brand/20" 
                    : "bg-muted/40"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="brand">Most Popular</Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <CardTitle className={`text-xl ${isSelected ? "text-white" : ""}`}>
                    {planPricing.name}
                  </CardTitle>
                  <CardDescription className={isSelected ? "text-blue-100" : ""}>
                    {planPricing.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="text-center">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className={`text-4xl font-bold ${isSelected ? "text-white" : ""}`}>
                        ${planPricing.signupFee}
                      </span>
                      <span className={isSelected ? "text-blue-100" : "text-muted-foreground"}>
                        signup
                      </span>
                    </div>
                    <p className={`text-sm mt-1 ${
                      isSelected 
                        ? "text-blue-100" 
                        : "text-muted-foreground"
                    }`}>
                      + ${planPricing.perTermCost}/term (~${planPricing.monthlyEstimate}/mo)
                    </p>
                  </div>

                  <ul className="space-y-3">
                    {planPricing.features.slice(0, 6).map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <HugeiconsIcon
                          icon={CheckmarkCircle02Icon}
                          size={18}
                          className={`shrink-0 mt-0.5 ${
                            isSelected ? "text-blue-200" : "text-success"
                          }`}
                        />
                        <span className={isSelected ? "text-white" : ""}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={isSelected ? "secondary" : "outline"}
                    className={`w-full ${
                      isSelected 
                        ? "bg-white text-brand hover:bg-white/90" 
                        : ""
                    }`}
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
            {!isManualPayment && (
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span>Signup Fee ({pricing.name})</span>
                  <span className="font-semibold">${pricing.signupFee}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>First Month</span>
                  <span className="font-semibold">${pricing.monthlyEstimate}</span>
                </div>
              </div>
            )}

            <div className="flex justify-between py-2 text-lg font-bold">
              <span>Total Due Today</span>
              <span className="text-brand">${paymentAmount}</span>
            </div>

            {/* Manual Payment Option */}
            <div className="p-4 rounded-xl bg-muted border border-border">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <Label htmlFor="manual-payment" className="font-medium cursor-pointer">
                    Already paid signup fee?
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isManualPayment
                      ? "Great! Pay only the monthly fee online"
                      : "Toggle this and pay only the monthly fee"}
                  </p>
                </div>
                <Switch
                  id="manual-payment"
                  checked={isManualPayment}
                  onCheckedChange={handleManualPaymentToggle}
                />
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              loading={isPaymentLoading}
              onClick={handlePayOnline}
            >
              {!isPaymentLoading && (
                <>
                  Pay ${paymentAmount} Now
                  <HugeiconsIcon icon={ArrowRight01Icon} size={20} />
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Secure payment powered by PayNow
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
