"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface OnboardingStep4Props {
  onBack: () => void;
}

export function OnboardingStep4({ onBack }: OnboardingStep4Props) {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-slate-50 rounded-lg border border-slate-200 text-center"
      >
        <p className="text-slate-600">
          Step 4: Review & Confirmation - Coming soon
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-4"
      >
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onBack}
        >
          Back
        </Button>
        <Button
          type="button"
          className="flex-1"
        >
          Complete Onboarding
        </Button>
      </motion.div>
    </div>
  );
}
