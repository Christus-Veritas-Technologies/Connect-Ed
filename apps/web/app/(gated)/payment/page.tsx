"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle02Icon,
  ArrowRight01Icon,
  InformationCircleIcon,
  Logout01Icon,
} from "@hugeicons/core-free-icons";
import { useAuth } from "@/lib/auth-context";
import { useLogout } from "@/lib/hooks";
import { api } from "@/lib/api";
import { PRICING, getPlanAmounts } from "@/lib/pricing";
import { fmt, type CurrencyCode } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Plan = "LITE" | "GROWTH" | "ENTERPRISE";

const plans: Plan[] = ["LITE", "GROWTH", "ENTERPRISE"];

type PaymentCurrency = "USD";
type BillingCycle = "monthly" | "annual";

interface PlanStatus {
  monthlyPaymentPaid: boolean;
  paid: boolean;
  selectedPlan: Plan | null;
}

export default function PaymentPage() {
  const { user, school } = useAuth();
  const logoutMutation = useLogout();
  const [selectedPlan, setSelectedPlan] = useState<Plan>("LITE");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [error, setError] = useState("");
  const paymentCurrency: PaymentCurrency = "USD";
  const [planStatus, setPlanStatus] = useState<PlanStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  useEffect(() => {
    const fetchPlanStatus = async () => {
      try {
        const data = await api.get<PlanStatus>("/payments/plan-status");
        setPlanStatus(data);
        if (data.selectedPlan) {
          setSelectedPlan(data.selectedPlan);
        }
      } catch {
        setPlanStatus({ monthlyPaymentPaid: false, paid: false, selectedPlan: null });
      } finally {
        setIsLoadingStatus(false);
      }
    };
    fetchPlanStatus();
  }, []);

  const planMeta = PRICING[selectedPlan];
  const amounts = getPlanAmounts(selectedPlan, paymentCurrency);
  const monthlyAlreadyPaid = planStatus?.monthlyPaymentPaid ?? false;

  // First payment gets discount: 15% monthly or 25% annual
  const isFirstPayment = !school?.firstPaymentCompleted;
  const displayAmount = billingCycle === "annual"
    ? amounts.foundingAnnualPrice
    : (isFirstPayment ? amounts.firstMonthlyPrice : amounts.monthlyEstimate);
  const regularPrice = billingCycle === "annual"
    ? amounts.annualPrice
    : amounts.monthlyEstimate;
  const discountPercent = billingCycle === "annual" ? 25 : 15;
  const totalRemaining = monthlyAlreadyPaid ? 0 : displayAmount;

  const handlePayOnline = async () => {
    setIsPaymentLoading(true);
    setError("");

    try {
      if (paymentCurrency === "ZAR") {
        const response = await api.post<{
          checkoutUrl: string;
          paymentId: string;
        }>("/payments/create-dodo-checkout", {
          planType: selectedPlan,
          paymentType: "MONTHLY_ONLY",
          billingCycle,
          email: user?.email,
          currency: "ZAR",
        });
        window.location.href = response.checkoutUrl;
      } else {
        const response = await api.post<{
          checkoutUrl: string;
          intermediatePaymentId: string;
        }>("/payments/create-checkout", {
          planType: selectedPlan,
          paymentType: "MONTHLY_ONLY",
          billingCycle,
          email: user?.email,
        });
        window.location.href = response.checkoutUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
      setIsPaymentLoading(false);
    }
  };

  if (isLoadingStatus) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="size-10 rounded-full border-4 border-brand border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading payment status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {process.env.NODE_ENV === "development" && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-destructive"
          >
            <HugeiconsIcon icon={Logout01Icon} size={16} />
            Logout (Dev)
          </Button>
        </div>
      )}

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

      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-col sm:flex-row justify-center items-center gap-4"
      >
        <Tabs
          value={billingCycle}
          onValueChange={(v) => setBillingCycle(v as BillingCycle)}
        >
          <TabsList>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="annual" className="gap-1.5">
              Annual
              <Badge variant="brand" size="sm" className="text-[10px] py-0 px-1.5">
                Save 25%
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {billingCycle === "annual" && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <p className="text-sm text-brand font-medium">
            Founding Partner Schools — Exclusive 25% off annual plans
          </p>
        </motion.div>
      )}

      {billingCycle === "monthly" && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <p className="text-sm text-brand font-medium">
            Founding Partner Schools — Exclusive 15% off annual plans. Limited availability.
          </p>
        </motion.div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan, index) => {
          const planInfo = PRICING[plan];
          const planAmounts = getPlanAmounts(plan, paymentCurrency);
          const isSelected = selectedPlan === plan;
          const isPopular = plan === "GROWTH";
          const isLocked = monthlyAlreadyPaid && planStatus?.selectedPlan !== plan;

          return (
            <motion.div
              key={plan}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                hover={!isLocked}
                onClick={() => !isLocked && setSelectedPlan(plan)}
                className={`relative ${!isLocked ? "cursor-pointer" : "cursor-not-allowed opacity-60"} transition-all ${isSelected ? "bg-brand border-brand ring-4 ring-brand/20" : "bg-muted/40"
                  }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="brand">Most Popular</Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <CardTitle className={`text-xl ${isSelected ? "text-white" : ""}`}>
                    {planInfo.name}
                  </CardTitle>
                  <CardDescription className={isSelected ? "text-blue-100" : ""}>
                    {planInfo.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="text-center">
                    {billingCycle === "annual" ? (
                      <div>
                        {isFirstPayment && (
                          <div className="flex items-center gap-2 mb-1 justify-center">
                            <Badge variant="success" size="sm" className={`text-[10px] ${isSelected ? "bg-emerald-500 text-white" : ""}`}>
                              {discountPercent}% off first year
                            </Badge>
                          </div>
                        )}
                        <div className="flex items-baseline justify-center gap-1">
                          <span className={`text-4xl font-bold ${isSelected ? "text-white" : ""}`}>
                            {fmt(planAmounts.foundingAnnualPrice, paymentCurrency)}
                          </span>
                          <span className={`text-sm ${isSelected ? "text-blue-100" : "text-muted-foreground"}`}>
                            /year
                          </span>
                        </div>
                        <p className={`text-xs mt-1 ${isSelected ? "text-blue-200" : "text-muted-foreground"}`}>
                          {fmt(Math.round((planAmounts.foundingAnnualPrice / 12) * 100) / 100, paymentCurrency)}/mo{isFirstPayment && <> — <span className="line-through">{fmt(planAmounts.annualPrice, paymentCurrency)}</span></>}
                        </p>
                      </div>
                    ) : (
                      <div>
                        {isFirstPayment && (
                          <div className="flex items-center gap-2 mb-1 justify-center">
                            <Badge variant="success" size="sm" className={`text-[10px] ${isSelected ? "bg-emerald-500 text-white" : ""}`}>
                              {discountPercent}% off first month
                            </Badge>
                          </div>
                        )}
                        <div className="flex items-baseline justify-center gap-1">
                          <span className={`text-4xl font-bold ${isSelected ? "text-white" : ""}`}>
                            {fmt(isFirstPayment ? planAmounts.firstMonthlyPrice : planAmounts.monthlyEstimate, paymentCurrency)}
                          </span>
                          <span className={`text-sm ${isSelected ? "text-blue-100" : "text-muted-foreground"}`}>
                            /month
                          </span>
                        </div>
                        {isFirstPayment && (
                          <p className={`text-xs mt-1 ${isSelected ? "text-blue-200" : "text-muted-foreground"}`}>
                            Then {fmt(regularPrice, paymentCurrency)}/mo
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <ul className="space-y-3">
                    {planInfo.features.slice(0, 6).map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <HugeiconsIcon
                          icon={CheckmarkCircle02Icon}
                          size={18}
                          className={`shrink-0 mt-0.5 ${isSelected ? "text-blue-200" : "text-success"}`}
                        />
                        <span className={isSelected ? "text-white" : ""}>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={isSelected ? "secondary" : "outline"}
                    className={`w-full ${isSelected ? "bg-white text-brand hover:bg-white/90" : ""}`}
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
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">
                  {planMeta.name} Plan{" "}
                  <span className="text-xs text-muted-foreground">
                    {billingCycle === "annual" ? "annual" : "monthly"}
                  </span>
                  {isFirstPayment && !monthlyAlreadyPaid && (
                    <Badge variant="success" className="ml-2">
                      {billingCycle === "annual" ? "25% off first year" : "15% off first month"}
                    </Badge>
                  )}
                </span>
                {monthlyAlreadyPaid ? (
                  <Badge variant="outline" className="text-success border-success/40">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} className="mr-1" />
                    Paid
                  </Badge>
                ) : (
                  <span className="font-semibold">{fmt(displayAmount, paymentCurrency)}</span>
                )}
              </div>
              {!monthlyAlreadyPaid && isFirstPayment && (
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>
                    {billingCycle === "annual" ? "Standard annual price" : "Standard monthly price"}
                  </span>
                  <span className="line-through">
                    {fmt(
                      billingCycle === "annual" ? amounts.annualPrice : amounts.monthlyEstimate,
                      paymentCurrency
                    )}
                  </span>
                </div>
              )}
            </div>

            {totalRemaining > 0 && (
              <div className="flex justify-between py-2 text-lg font-bold">
                <span>Total Due Today</span>
                <span className="text-brand">{fmt(totalRemaining, paymentCurrency)}</span>
              </div>
            )}

            {!monthlyAlreadyPaid && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded">
                <HugeiconsIcon icon={InformationCircleIcon} size={16} className="shrink-0 mt-0.5" />
                <span>
                  {billingCycle === "annual" ? (
                    <>
                      {isFirstPayment ? (
                        <>
                          You&apos;ll be charged {fmt(amounts.foundingAnnualPrice, paymentCurrency)} for your first year as a new customer.
                          After 12 months, renewal is at the standard annual rate of {fmt(amounts.annualPrice, paymentCurrency)}.
                        </>
                      ) : (
                        <>
                          You&apos;ll be charged {fmt(amounts.annualPrice, paymentCurrency)} for the year.
                          After 12 months, you&apos;ll be charged again at the same rate.
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {isFirstPayment ? (
                        <>
                          You&apos;ll be charged {fmt(amounts.firstMonthlyPrice, paymentCurrency)} for your first month as a new customer.
                          Subsequent monthly payments will be {fmt(amounts.monthlyEstimate, paymentCurrency)}.
                        </>
                      ) : (
                        <>
                          You&apos;ll be charged {fmt(amounts.monthlyEstimate, paymentCurrency)} every month.
                          You can cancel or change your plan at any time.
                        </>
                      )}
                    </>
                  )}
                </span>
              </div>
            )}

            {totalRemaining > 0 ? (
              <Button
                className="w-full"
                size="lg"
                loading={isPaymentLoading}
                onClick={() => handlePayOnline()}
              >
                {!isPaymentLoading && (
                  <>
                    Pay {fmt(totalRemaining, paymentCurrency)} Now
                    <HugeiconsIcon icon={ArrowRight01Icon} size={20} />
                  </>
                )}
              </Button>
            ) : (
              <div className="text-center py-4">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={32} className="text-success mx-auto mb-2" />
                <p className="font-semibold text-success">All payments complete!</p>
                <p className="text-sm text-muted-foreground mt-1">Redirecting to setup...</p>
              </div>
            )}

            <p className="text-xs text-center text-muted-foreground">
              {paymentCurrency === "ZAR"
                ? "Secure payment powered by Dodo Payments"
                : "Secure payment powered by PayNow"}
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
