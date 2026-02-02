"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { OnboardingStep1 } from "./step-1";
import { OnboardingStep2 } from "./step-2";
import { OnboardingStep3 } from "./step-3";
import { OnboardingStep4 } from "./step-4";

const STEPS = [
  { number: 1, title: "School Details", description: "Let's get to know your school" },
  { number: 2, title: "Curriculum & Subjects", description: "Tell us about your programs" },
  { number: 3, title: "Students", description: "Student body information" },
  { number: 4, title: "Review", description: "Confirm your information" },
];

export default function OnboardingPage() {
  const { school } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (school && !school.signupFeePaid) {
      router.push("/payment");
    }
  }, [school, router]);

  const handleNext = (): void => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final step completed
      router.push("/dashboard");
    }
  };

  const handleBack = (): void => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center pt-8 pb-12"
      >
        <h1 className="text-4xl font-bold text-slate-900">Welcome to Connect-Ed!</h1>
        <p className="text-slate-600 mt-2 text-lg">
          Let&apos;s set up your school account
        </p>
      </motion.div>

      <div className="max-w-5xl mx-auto px-4 pb-12">
        <div className="flex gap-8">
          {/* Vertical Step Indicator */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col gap-4 min-w-fit relative"
          >
            {STEPS.map((step, index) => {
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-4 relative"
                >
                  {/* Step Circle */}
                  <div
                    className={`
                      size-10 rounded-full flex items-center justify-center font-semibold transition-all flex-shrink-0 text-sm
                      ${
                        isCompleted
                          ? "bg-success text-white"
                          : isActive
                            ? "bg-brand text-white ring-4 ring-brand/20"
                            : "bg-slate-200 text-slate-600"
                      }
                    `}
                  >
                    {isCompleted ? (
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} />
                    ) : (
                      step.number
                    )}
                  </div>

                  {/* Step Label (visible on active/completed) */}
                  {(isActive || isCompleted) && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="pt-1"
                    >
                      <div className={`text-sm font-semibold ${isActive ? "text-brand" : "text-slate-600"}`}>
                        {step.title}
                      </div>
                      <div className="text-xs text-slate-500">{step.description}</div>
                    </motion.div>
                  )}

                  {/* Vertical Line */}
                  {index < STEPS.length - 1 && (
                    <div
                      className={`absolute left-5 top-10 w-0.5 h-12 -translate-x-1/2 ${
                        isCompleted ? "bg-success" : isActive ? "bg-brand" : "bg-slate-200"
                      }`}
                    />
                  )}
                </motion.div>
              );
            })}
          </motion.div>

          {/* Form Card */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex-1"
          >
            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-2xl text-brand">
                  {STEPS[currentStep]?.title}
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  {STEPS[currentStep]?.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-8">
                {/* Step Components */}
                {currentStep === 0 && <OnboardingStep1 onNext={handleNext} />}
                {currentStep === 1 && (
                  <OnboardingStep2 onBack={handleBack} onNext={handleNext} />
                )}
                {currentStep === 2 && (
                  <OnboardingStep3 onBack={handleBack} onNext={handleNext} />
                )}
                {currentStep === 3 && <OnboardingStep4 onBack={handleBack} />}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
