"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { LockPasswordIcon, ArrowLeft01Icon, CheckmarkCircle02Icon } from "@hugeicons/react";
import { resetPasswordSchema } from "@/lib/validation";
import { useResetPassword } from "@/lib/hooks";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const resetPasswordMutation = useResetPassword();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const error = useMemo(() => {
    if (formError) return formError;
    return resetPasswordMutation.error instanceof ApiError
      ? resetPasswordMutation.error.message
      : resetPasswordMutation.error?.message;
  }, [formError, resetPasswordMutation.error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!token) {
      setFormError("Reset token is missing or invalid.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    try {
      resetPasswordSchema.parse({ token, password });
      resetPasswordMutation.mutate({ token, password });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Invalid password");
    }
  };

  if (resetPasswordMutation.isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-0 shadow-2xl shadow-brand/10">
          <CardContent className="pt-8 pb-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="mx-auto mb-6 size-20 rounded-full bg-success/10 flex items-center justify-center"
            >
              <CheckmarkCircle02Icon size={40} className="text-success" />
            </motion.div>
            <h2 className="text-2xl font-bold mb-2">Password updated</h2>
            <p className="text-muted-foreground mb-6">
              Your password has been reset successfully.
            </p>
            <Link href="/auth/login">
              <Button variant="outline" className="w-full">
                <ArrowLeft01Icon size={20} />
                Back to login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-0 shadow-2xl shadow-brand/10">
        <CardHeader className="text-center pb-2">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto mb-4 size-16 rounded-2xl bg-gradient-to-br from-brand to-mid flex items-center justify-center"
          >
            <span className="text-2xl font-bold text-white">CE</span>
          </motion.div>
          <CardTitle className="text-2xl font-bold">Reset your password</CardTitle>
          <CardDescription className="text-base">
            Enter a new password for your account
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">
                New Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<LockPasswordIcon size={20} />}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-semibold">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                icon={<LockPasswordIcon size={20} />}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={resetPasswordMutation.isPending}
            >
              {!resetPasswordMutation.isPending && "Reset Password"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/auth/login"
              className="text-sm text-muted-foreground hover:text-brand font-medium transition-colors inline-flex items-center gap-2"
            >
              <ArrowLeft01Icon size={16} />
              Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
