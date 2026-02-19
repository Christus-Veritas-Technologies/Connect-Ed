"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    AlertCircleIcon,
    CreditCardIcon,
    ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { useAuth } from "@/lib/auth-context";
import { PRICING, getPlanAmounts } from "@/lib/pricing";
import { fmt } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card";

/**
 * SetupFeeGuard
 *
 * Displayed when the school has NOT completed their first payment
 * (school.signupFeePaid === false). Instead of silently redirecting,
 * this guard shows an informative screen telling the admin they need
 * to subscribe and provides a direct link to the payment page.
 *
 * Place this guard inside the dashboard layout, after DashboardGuard
 * and BillingGuard, so it only renders for authenticated users.
 */
export function SetupFeeGuard({ children }: { children: ReactNode }) {
    const { user, school } = useAuth();

    // Only block admin users whose school hasn't completed payment
    if (!user || !school || user.role !== "ADMIN" || school.signupFeePaid) {
        return <>{children}</>;
    }

    // Get the monthly price for the school's selected plan
    const plan = school.plan || "LITE";
    const currency = school.currency === "ZAR" ? "ZAR" as const : "USD" as const;
    const amounts = getPlanAmounts(plan, currency);
    const planMeta = PRICING[plan];

    return (
        <div className="flex items-center justify-center min-h-[70vh] p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-lg"
            >
                <Card className="border-amber-200 bg-amber-50/30">
                    <CardHeader className="text-center pb-2">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        >
                            <div className="size-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                                <HugeiconsIcon icon={CreditCardIcon} size={32} className="text-amber-600" />
                            </div>
                        </motion.div>
                        <CardTitle className="text-xl">Payment Required</CardTitle>
                        <CardDescription className="text-base mt-2">
                            Your subscription payment hasn&apos;t been completed yet.
                            Subscribe to unlock your dashboard.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {/* Amount breakdown */}
                        <div className="bg-white rounded-xl p-4 border border-amber-200/60">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-lg">{planMeta.name} Plan</p>
                                    <p className="text-sm text-muted-foreground">Monthly subscription</p>
                                </div>
                                <p className="text-2xl font-bold text-brand">
                                    {fmt(amounts.monthlyEstimate, currency)}<span className="text-sm font-normal text-muted-foreground">/mo</span>
                                </p>
                            </div>
                        </div>

                        {/* Info message */}
                        <div className="flex items-start gap-2 text-sm text-amber-800">
                            <HugeiconsIcon icon={AlertCircleIcon} size={18} className="shrink-0 mt-0.5 text-amber-600" />
                            <p>
                                Subscribe to your monthly plan to get started with Connect-Ed.
                                Once subscribed, you&apos;ll have full access to your dashboard
                                and all plan features.
                            </p>
                        </div>

                        {/* CTA */}
                        <Link href="/payment" className="block">
                            <Button className="w-full" size="lg">
                                Subscribe Now
                                <HugeiconsIcon icon={ArrowRight01Icon} size={20} />
                            </Button>
                        </Link>

                        <p className="text-xs text-center text-muted-foreground">
                            Need help? Contact support at support@connect-ed.com
                        </p>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
