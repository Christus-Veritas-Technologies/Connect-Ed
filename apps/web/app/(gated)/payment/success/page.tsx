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

export default function PaymentSuccessPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { school, checkAuth } = useAuth();
    const [status, setStatus] = useState<VerifyStatus>("loading");
    const [error, setError] = useState("");

    const intermediatePaymentId = searchParams.get("intermediatePaymentId");

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

            let lastError: Error | null = null;
            const maxRetries = 3;

            for (let attempt = 0; attempt < maxRetries; attempt++) {
                try {
                    await api.get(`/payments/verify/${intermediatePaymentId}`);
                    setStatus("success");
                    await checkAuth();
                    return;
                } catch (err) {
                    lastError = err instanceof Error ? err : new Error("Failed to verify payment");
                    if (attempt === maxRetries - 1) {
                        setError(lastError.message);
                        setStatus("error");
                    } else {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
            }
        };

        verifyPayment();
    }, [intermediatePaymentId]);

    const handleContinue = () => {
        router.push("/onboarding");
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
                        <div className="space-y-2">
                            <p className="text-muted-foreground">
                                Your payment of{" "}
                                <strong className="text-foreground">
                                    {fmt(amounts.monthlyEstimate, currency === "ZAR" ? "ZAR" : "USD")}
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

                        <p className="text-xs text-muted-foreground">
                            A confirmation email has been sent to your inbox.
                        </p>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
