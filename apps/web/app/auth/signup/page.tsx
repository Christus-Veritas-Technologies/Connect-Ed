"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSignup } from "@/lib/hooks";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Lock, Mail, User2 } from "lucide-react";

const passwordRequirements = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
];

export default function SignupPage() {
  const signupMutation = useSignup();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    if (password !== confirmPassword) {
      setValidationError("Passwords do not match");
      return;
    }

    const failedRequirements = passwordRequirements.filter(r => !r.test(password));
    if (failedRequirements.length > 0) {
      setValidationError(failedRequirements[0].label);
      return;
    }

    signupMutation.mutate({ email, password, name });
  };

  const error = validationError || (signupMutation.error instanceof ApiError 
    ? signupMutation.error.message 
    : signupMutation.error?.message);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full space-y-4"
    >
      {/* Logo */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="flex justify-center w-full"
      >
        <div className="size-16 rounded-2xl bg-gradient-to-br from-brand to-mid flex items-center justify-center">
          <span className="text-2xl font-bold text-white">CE</span>
        </div>
      </motion.div>

      {/* Heading */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Create your account</h1>
        <p className="text-muted-foreground">Start managing your school with Connect-Ed</p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-2.5 w-full">
        {/* Name and Email Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-semibold">
              Full Name
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              icon={<User2 size={20} />}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@school.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail size={20} />}
              required
            />
          </div>
        </div>

        {/* Password and Confirm Password Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-semibold">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock size={20} />}
              required
            />
            {password && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-3 space-y-2"
              >
                {passwordRequirements.map((req, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-2 text-sm"
                  >
                    <CheckCircle
                      size={16}
                      className={req.test(password) ? "text-success" : "text-muted-foreground"}
                    />
                    <span className={req.test(password) ? "text-success" : "text-muted-foreground"}>
                      {req.label}
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-semibold">
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              icon={<Lock size={20} />}
              error={confirmPassword.length > 0 && password !== confirmPassword}
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          loading={signupMutation.isPending}
        >
          {signupMutation.isPending ? (
            <>
              Creating Account...
            </>
          ) : (
            <>
              Create Account
            </>
          )}
        </Button>
      </form>

          {/* Sign In Link */}
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-semibold text-brand hover:text-brand-hover transition-colors">
              Sign in
            </Link>
          </p>
        </motion.div>
      )
    }

