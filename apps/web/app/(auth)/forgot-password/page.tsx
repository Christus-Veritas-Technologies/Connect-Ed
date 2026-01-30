"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail01Icon, ArrowLeft01Icon, CheckmarkCircle02Icon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to send reset email");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
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
            <h2 className="text-2xl font-bold mb-2">Check your email</h2>
            <p className="text-muted-foreground mb-6">
              We&apos;ve sent a password reset link to <strong>{email}</strong>
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
          <CardTitle className="text-2xl font-bold">Forgot password?</CardTitle>
          <CardDescription className="text-base">
            No worries, we&apos;ll send you reset instructions
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
              <Label htmlFor="email" className="text-sm font-semibold">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@school.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail01Icon size={20} />}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={isLoading}
            >
              {!isLoading && "Send Reset Link"}
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
