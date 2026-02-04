"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useAuth } from "@/lib/auth-context";
import { OnboardingProvider } from "./onboarding-context";
import { OnboardingStep1 } from "./step-1";
import { OnboardingStep2 } from "./step-2";
import { OnboardingStep3 } from "./step-3";
import { OnboardingStep4 } from "./step-4";

const STEPS = [
  { number: 1, title: "School Details", description: "Let's get to know your school" },
  { number: 2, title: "Learning", description: "Tell us about your programs" },
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
    <OnboardingProvider>
      <div className="min-h-screen bg-background">
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

      <div className="max-w-4xl mx-auto px-4 pb-12">
        {/* Horizontal Step Indicator */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center gap-4 mb-12"
        >
          {STEPS.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col items-center gap-2"
              >
                {/* Step Circle */}
                <div
                  className={`
                    size-10 rounded-full flex items-center justify-center font-semibold transition-all text-sm
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

                {/* Step Label */}
                <div className="text-center">
                  <div className={`text-xs font-semibold ${isActive ? "text-brand" : "text-slate-600"}`}>
                    {step.title}
                  </div>
                </div>

                {/* Connecting Line */}
                {index < STEPS.length - 1 && (
                  <div
                    className={`absolute left-[calc(50%+20px)] w-12 h-0.5 top-5 ${
                      isCompleted ? "bg-success" : isActive ? "bg-brand" : "bg-slate-200"
                    }`}
                  />
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {/* Content */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="max-w-2xl mx-auto"
        >
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-brand">
              {STEPS[currentStep]?.title}
            </h2>
            <p className="text-slate-600 text-base mt-2">
              {STEPS[currentStep]?.description}
            </p>
          </div>

          {/* Step Components */}
          {currentStep === 0 && <OnboardingStep1 onNext={handleNext} />}
          {currentStep === 1 && (
            <OnboardingStep2 onBack={handleBack} onNext={handleNext} />
          )}
          {currentStep === 2 && (
            <OnboardingStep3 onBack={handleBack} onNext={handleNext} />
          )}
          {currentStep === 3 && <OnboardingStep4 onBack={handleBack} />}
        </motion.div>
      </div>
      </div>
    </OnboardingProvider>
  )
}
