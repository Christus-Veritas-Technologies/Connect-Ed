"use client";

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    AlertCircleIcon,
    CreditCardIcon,
    School01Icon,
    TimerIcon,
} from "@hugeicons/core-free-icons";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

/**
 * Calculates how many days overdue the school's payment is.
 * Returns 0 if no payment date is set or the date is in the future.
 */
function getDaysOverdue(nextPaymentDate: string | null): number {
    if (!nextPaymentDate) return 0;
    const due = new Date(nextPaymentDate);
    const now = new Date();
    if (now <= due) return 0;
    return Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

interface BillingGuardProps {
    children: ReactNode;
}

/**
 * Wraps protected pages. If the school's payment is >3 days overdue,
 * shows a lockout screen instead of the children.
 *
 * - Admins: see a "make payment" prompt
 * - Everyone else: see a soft "waiting for payment" message
 *
 * During the 3-day grace period this guard does NOT block access
 * (the cron emails handle reminders).
 */
export function BillingGuard({ children }: BillingGuardProps) {
    const { user, school, isLoading } = useAuth();
    const router = useRouter();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="size-10 rounded-full border-4 border-brand border-t-transparent animate-spin" />
            </div>
        );
    }

    if (!user || !school) {
        return null;
    }

    const daysOverdue = getDaysOverdue(school.nextPaymentDate);
    const isLocked = daysOverdue > 3;

    // Not locked → render normally
    if (!isLocked) {
        return <>{children}</>;
    }

    // Locked out → show appropriate screen
    const isAdmin = user.role === "ADMIN";

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <Card className="border-amber-200/60 shadow-lg">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto mb-4 size-16 rounded-full bg-amber-100 flex items-center justify-center">
                            {isAdmin ? (
                                <HugeiconsIcon icon={CreditCardIcon} className="size-8 text-amber-600" />
                            ) : (
                                <HugeiconsIcon icon={TimerIcon} className="size-8 text-amber-600" />
                            )}
                        </div>
                        <CardTitle className="text-xl">
                            {isAdmin ? "Payment Required" : "System Maintenance"}
                        </CardTitle>
                        <CardDescription>
                            {isAdmin
                                ? "Your school's monthly payment is overdue"
                                : `${school.name || "Your school"} is temporarily unavailable`}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {isAdmin ? (
                            <Alert className="border-amber-300/50 bg-amber-50">
                                <HugeiconsIcon icon={AlertCircleIcon} className="size-4 text-amber-600" />
                                <AlertTitle className="text-amber-800">Outstanding Payment</AlertTitle>
                                <AlertDescription className="text-amber-700">
                                    Your monthly payment is <strong>{daysOverdue} day{daysOverdue !== 1 ? "s" : ""}</strong> overdue.
                                    Please complete the payment to restore full access for everyone at your school.
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <>
                                <div className="rounded-xl bg-muted/50 p-5 text-center space-y-3">
                                    <HugeiconsIcon icon={School01Icon} className="size-10 text-muted-foreground mx-auto" />
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        The system is currently undergoing scheduled maintenance.
                                        Please check back shortly — everything will be back to normal soon.
                                    </p>
                                </div>

                                <div className="rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground">
                                    <p className="font-medium text-foreground mb-1">Need help?</p>
                                    <p>
                                        If this persists, please contact your school administration or reach out to{" "}
                                        <a
                                            href="mailto:support@connect-ed.com"
                                            className="text-brand hover:underline"
                                        >
                                            support@connect-ed.com
                                        </a>
                                    </p>
                                </div>
                            </>
                        )}
                    </CardContent>

                    <CardFooter className="flex flex-col gap-3">
                        {isAdmin ? (
                            <>
                                <Button
                                    onClick={() => router.push("/payment")}
                                    className="w-full"
                                    size="lg"
                                >
                                    <HugeiconsIcon icon={CreditCardIcon} className="size-4 mr-2" />
                                    Make Payment
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => router.push("/")}
                                    className="w-full"
                                >
                                    Return to Home
                                </Button>
                            </>
                        ) : (
                            <Button
                                variant="outline"
                                onClick={() => router.push("/")}
                                className="w-full"
                            >
                                Return to Home
                            </Button>
                        )}
                    </CardFooter>
                </Card>

                <p className="text-center text-xs text-muted-foreground mt-4">
                    Connect-Ed School Management System
                </p>
            </motion.div>
        </div>
    );
}
