"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail01Icon, LockPasswordIcon, ArrowRight01Icon } from "@hugeicons/react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

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
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription className="text-base">
            Sign in to your Connect-Ed account
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-semibold">
                  Password
                </Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-brand hover:text-brand-hover font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<LockPasswordIcon size={20} />}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={isLoading}
            >
              {!isLoading && (
                <>
                  Sign In
                  <ArrowRight01Icon size={20} />
                </>
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex-col gap-4 pt-2 pb-6">
          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground font-medium">
                New to Connect-Ed?
              </span>
            </div>
          </div>
          <Link href="/auth/signup" className="w-full">
            <Button variant="outline" className="w-full" size="lg">
              Create an account
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
