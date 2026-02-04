"use client";

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertCircleIcon,
  CreditCardIcon,
  School01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface SchoolPaymentGuardProps {
  children: ReactNode;
}

export function SchoolPaymentGuard({ children }: SchoolPaymentGuardProps) {
  const { user, school, isLoading } = useAuth();
  const router = useRouter();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="size-10 rounded-full border-4 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  // If no user or school, don't render (auth guard will handle redirect)
  if (!user || !school) {
    return null;
  }

  // Check if school has paid and is active
  const isSchoolActive = school.isActive && school.signupFeePaid;

  if (isSchoolActive) {
    return <>{children}</>;
  }

  // School is not active - show appropriate message based on role
  const isAdmin = user.role === "ADMIN";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-destructive/20 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 size-16 rounded-full bg-destructive/10 flex items-center justify-center">
              {isAdmin ? (
                <HugeiconsIcon icon={CreditCardIcon} className="size-8 text-destructive" />
              ) : (
                <HugeiconsIcon icon={School01Icon} className="size-8 text-destructive" />
              )}
            </div>
            <CardTitle className="text-xl">
              {isAdmin ? "Payment Required" : "School Temporarily Unavailable"}
            </CardTitle>
            <CardDescription>
              {isAdmin
                ? "Your school subscription requires attention"
                : `${school.name || "Your school"} is currently unavailable`}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Alert variant="destructive" className="border-destructive/30">
              <HugeiconsIcon icon={AlertCircleIcon} className="size-4" />
              <AlertTitle>
                {isAdmin ? "Outstanding Payment" : "Access Restricted"}
              </AlertTitle>
              <AlertDescription>
                {isAdmin ? (
                  <>
                    Your school&apos;s subscription payment is overdue. Please complete
                    the payment to restore access for all users.
                  </>
                ) : (
                  <>
                    Please contact your school administrator to resolve the
                    outstanding payment. Access will be restored once the
                    payment is completed.
                  </>
                )}
              </AlertDescription>
            </Alert>

            {!isAdmin && (
              <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Need help?</p>
                <p>
                  If you believe this is an error, please contact your school
                  administration or reach out to our support team at{" "}
                  <a
                    href="mailto:support@connect-ed.com"
                    className="text-brand hover:underline"
                  >
                    support@connect-ed.com
                  </a>
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            {isAdmin ? (
              <>
                <Button
                  onClick={() => router.push("/payment")}
                  className="w-full bg-brand hover:bg-brand/90"
                  size="lg"
                >
                  <HugeiconsIcon icon={CreditCardIcon} className="size-4 mr-2" />
                  Complete Payment
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/dashboard/settings")}
                  className="w-full"
                >
                  View Account Settings
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
