"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  UserGroupIcon,
  ChartHistogramIcon,
  CheckmarkCircle02Icon,
  Notification01Icon,
  Money01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

const STEPS = [
  { number: 1, title: "Welcome", description: "Welcome to Connect-Ed" },
  { number: 2, title: "Your Children", description: "See who's connected" },
  { number: 3, title: "Get Started", description: "You're all set" },
];

const PARENT_FEATURES = [
  {
    icon: ChartHistogramIcon,
    title: "Academic Reports",
    description: "View your child's exam results, grades, and performance reports in real time.",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    icon: Money01Icon,
    title: "Fee Tracking",
    description: "Check fee balances, payment history, and upcoming due dates.",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: Notification01Icon,
    title: "School Updates",
    description: "Receive important announcements and updates from the school.",
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    icon: UserGroupIcon,
    title: "Stay Connected",
    description: "Connect with teachers and school administration through the platform.",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
];

const PARENT_TIPS = [
  "Check 'My Child's Report' to view the latest exam results and grades",
  "School announcements will appear on your dashboard",
  "You may receive report notifications via email or WhatsApp",
  "Contact the school through the platform if you have questions",
];

export function ParentOnboarding() {
  const { user, checkAuth } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      await api.post("/onboarding/user-complete");
      await checkAuth();
      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    await handleComplete();
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center pt-8 pb-12"
      >
        <div className="size-16 rounded-2xl bg-gradient-to-br from-brand to-mid flex items-center justify-center mx-auto mb-4">
          <HugeiconsIcon icon={UserIcon} size={32} className="text-white" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900">Welcome, {user?.name}!</h1>
        <p className="text-slate-600 mt-2 text-lg">
          Stay connected with your child&apos;s education
        </p>
      </motion.div>

      <div className="max-w-2xl mx-auto px-4 pb-12">
        {/* Step Indicator */}
        <div className="flex justify-center gap-4 mb-12">
          {STEPS.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            return (
              <div key={step.number} className="flex flex-col items-center gap-2">
                <div
                  className={`size-10 rounded-full flex items-center justify-center font-semibold transition-all text-sm ${
                    isCompleted
                      ? "bg-success text-white"
                      : isActive
                        ? "bg-brand text-white ring-4 ring-brand/20"
                        : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {isCompleted ? (
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} />
                  ) : (
                    step.number
                  )}
                </div>
                <span className={`text-xs font-semibold ${isActive ? "text-brand" : "text-slate-600"}`}>
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>

        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Step 1: Welcome */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-brand">Welcome to Connect-Ed</h2>
                <p className="text-slate-600 mt-2">
                  Your child&apos;s school uses Connect-Ed to keep you informed.
                  Here&apos;s what you can access.
                </p>
              </div>

              <div className="grid gap-4">
                {PARENT_FEATURES.map((feature, i) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex gap-4 p-4 rounded-xl border border-slate-200 bg-white"
                  >
                    <div className={`size-12 rounded-xl ${feature.bg} flex items-center justify-center flex-shrink-0`}>
                      <HugeiconsIcon icon={feature.icon} size={24} className={feature.color} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{feature.title}</h3>
                      <p className="text-sm text-slate-600 mt-1">{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Your Children */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-brand">Your Children</h2>
                <p className="text-slate-600 mt-2">
                  Here are the children linked to your account.
                </p>
              </div>

              {user?.children && user.children.length > 0 ? (
                <div className="space-y-3">
                  {user.children.map((child, i) => (
                    <motion.div
                      key={child.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200"
                    >
                      <div className="size-12 rounded-full bg-brand/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-brand">
                          {child.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{child.name}</p>
                        {child.class && (
                          <p className="text-sm text-slate-600">Class: {child.class}</p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <p className="text-slate-600">
                    No children linked to your account yet. The school will link your children once they are enrolled.
                  </p>
                </div>
              )}

              <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-4">Quick Tips</h3>
                <ul className="space-y-3">
                  {PARENT_TIPS.map((tip, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-3 text-sm text-slate-700"
                    >
                      <span className="size-6 rounded-full bg-brand/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-brand">{i + 1}</span>
                      </span>
                      {tip}
                    </motion.li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Step 3: Get Started */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-brand">You&apos;re All Set!</h2>
                <p className="text-slate-600 mt-2">
                  You&apos;re ready to stay connected with your child&apos;s school.
                </p>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 bg-green-50 rounded-xl border border-green-200 text-center"
              >
                <div className="size-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={32} className="text-green-600" />
                </div>
                <p className="font-semibold text-green-900 text-lg">Ready to go!</p>
                <p className="text-sm text-green-700 mt-2">
                  Click the button below to go to your dashboard and see your child&apos;s latest updates.
                </p>
              </motion.div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-4 pt-8">
            {currentStep > 0 && (
              <Button variant="outline" className="w-1/4" onClick={handleBack} disabled={isLoading}>
                Back
              </Button>
            )}
            <Button
              variant="ghost"
              className="text-muted-foreground"
              onClick={handleSkip}
              disabled={isLoading}
            >
              Skip
            </Button>
            <Button className="flex-1" onClick={handleNext} disabled={isLoading}>
              {isLoading
                ? "Loading..."
                : currentStep === STEPS.length - 1
                  ? "Go to Dashboard"
                  : "Continue"}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
