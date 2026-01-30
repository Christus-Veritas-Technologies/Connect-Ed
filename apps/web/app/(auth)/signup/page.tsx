"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Mail01Icon, 
  LockPasswordIcon, 
  UserIcon, 
  ArrowRight01Icon,
  CheckmarkCircle02Icon 
} from "@hugeicons/react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const passwordRequirements = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
];

export default function SignupPage() {
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const failedRequirements = passwordRequirements.filter(r => !r.test(password));
    if (failedRequirements.length > 0) {
      setError(failedRequirements[0].label);
      return;
    }

    setIsLoading(true);

    try {
      await signup(email, password, name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
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
          <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
          <CardDescription className="text-base">
            Start managing your school with Connect-Ed
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
              <Label htmlFor="name" className="text-sm font-semibold">
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                icon={<UserIcon size={20} />}
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
                placeholder="admin@yourschool.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail01Icon size={20} />}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<LockPasswordIcon size={20} />}
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
                      <CheckmarkCircle02Icon
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
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                icon={<LockPasswordIcon size={20} />}
                error={confirmPassword.length > 0 && password !== confirmPassword}
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
                  Create Account
                  <ArrowRight01Icon size={20} />
                </>
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex-col gap-4 pt-2 pb-6">
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-brand hover:text-brand-hover font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
