"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    CheckmarkCircle02Icon,
    ArrowRight01Icon,
    AlertCircleIcon,
    Loading03Icon,
} from "@hugeicons/core-free-icons";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { PRICING, getPlanAmounts } from "@/lib/pricing";
import { fmt, type CurrencyCode } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

type VerifyStatus = "loading" | "success" | "error";
type PaymentType = "FULL" | "MONTHLY_ONLY" | "SETUP_ONLY";

export default function PaymentSuccessPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { school, checkAuth } = useAuth();
    const [status, setStatus] = useState<VerifyStatus>("loading");
    const [error, setError] = useState("");

    const intermediatePaymentId = searchParams.get("intermediatePaymentId");
    const paymentType = (searchParams.get("type") || "FULL") as PaymentType;

    // Use school's plan to determine pricing
    const plan = school?.plan || "LITE";
    const currency = (school?.currency || "USD") as CurrencyCode;
    const amounts = getPlanAmounts(plan, currency === "ZAR" ? "ZAR" : "USD");
    const planMeta = PRICING[plan];

    useEffect(() => {
        const verifyPayment = async () => {
            if (!intermediatePaymentId) {
                setError("No payment reference found");
                setStatus("error");
                return;
            }

            try {
                await api.get(`/payments/verify/${intermediatePaymentId}`);
                setStatus("success");

                // Refresh auth to pick up updated school data
                await checkAuth();
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to verify payment");
                setStatus("error");
            }
        };

        verifyPayment();
    }, [intermediatePaymentId]);

    const handleContinue = () => {
        if (paymentType === "MONTHLY_ONLY") {
            // Monthly only — setup fee still pending, go back to payment page
            router.push("/payment");
        } else {
            // Full or setup-only — signupFeePaid should be true, proceed to onboarding
            router.push("/onboarding");
        }
    };

    if (status === "loading") {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center"
                >
                    <div className="size-12 rounded-full border-4 border-brand border-t-transparent animate-spin mx-auto mb-4" />
                    <h2 className="text-xl font-semibold">Verifying your payment...</h2>
                    <p className="text-muted-foreground mt-2">This will only take a moment</p>
                </motion.div>
            </div>
        );
    }

    if (status === "error") {
        return (
            <div className="max-w-md mx-auto">
                <Card>
                    <CardHeader className="text-center">
                        <HugeiconsIcon icon={AlertCircleIcon} size={48} className="text-destructive mx-auto mb-2" />
                        <CardTitle className="text-destructive">Payment Verification Failed</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                        <p className="text-sm text-muted-foreground text-center">
                            If you believe this is an error, please contact support. Your payment may
                            still be processing.
                        </p>
                        <Button className="w-full" onClick={() => router.push("/payment")}>
                            Back to Payment
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Success state — different messaging based on payment type
    return (
        <div className="max-w-md mx-auto">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
            >
                <Card>
                    <CardHeader className="text-center pb-2">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        >
                            <HugeiconsIcon
                                icon={CheckmarkCircle02Icon}
                                size={56}
                                className="text-success mx-auto mb-3"
                            />
                        </motion.div>
                        <CardTitle className="text-2xl text-success">
                            Payment Successful!
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 text-center">
                        {paymentType === "MONTHLY_ONLY" ? (
                            <>
                                <div className="space-y-2">
                                    <p className="text-muted-foreground">
                                        Your first month&apos;s fee of{" "}
                                        <strong className="text-foreground">
                                            {fmt(amounts.monthlyEstimate, currency === "ZAR" ? "ZAR" : "USD")}
                                        </strong>{" "}
                                        has been paid.
                                    </p>
                                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 mt-4">
                                        <p className="text-sm text-amber-800 font-medium">
                                            Setup fee still required
                                        </p>
                                        <p className="text-sm text-amber-700 mt-1">
                                            Your one-time setup fee of{" "}
                                            <strong>
                                                {fmt(amounts.signupFee, currency === "ZAR" ? "ZAR" : "USD")}
                                            </strong>{" "}
                                            for the {planMeta.name} plan is still pending. You&apos;ll need to
                                            pay this to access your dashboard.
                                        </p>
                                    </div>
                                </div>
                                <Button className="w-full" size="lg" onClick={handleContinue}>
                                    Pay Setup Fee
                                    <HugeiconsIcon icon={ArrowRight01Icon} size={20} />
                                </Button>
                            </>
                        ) : paymentType === "SETUP_ONLY" ? (
                            <>
                                <div className="space-y-2">
                                    <p className="text-muted-foreground">
                                        Your setup fee of{" "}
                                        <strong className="text-foreground">
                                            {fmt(amounts.signupFee, currency === "ZAR" ? "ZAR" : "USD")}
                                        </strong>{" "}
                                        has been paid. Your account is now fully active!
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Let&apos;s set up your school and get you started.
                                    </p>
                                </div>
                                <Button className="w-full" size="lg" onClick={handleContinue}>
                                    Continue to Setup
                                    <HugeiconsIcon icon={ArrowRight01Icon} size={20} />
                                </Button>
                            </>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <p className="text-muted-foreground">
                                        Your payment of{" "}
                                        <strong className="text-foreground">
                                            {fmt(amounts.signupFee + amounts.monthlyEstimate, currency === "ZAR" ? "ZAR" : "USD")}
                                        </strong>{" "}
                                        for the {planMeta.name} plan has been processed.
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Welcome to Connect-Ed! Let&apos;s set up your school.
                                    </p>
                                </div>
                                <Button className="w-full" size="lg" onClick={handleContinue}>
                                    Continue to Setup
                                    <HugeiconsIcon icon={ArrowRight01Icon} size={20} />
                                </Button>
                            </>
                        )}

                        <p className="text-xs text-muted-foreground">
                            A confirmation email has been sent to your inbox.
                        </p>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
