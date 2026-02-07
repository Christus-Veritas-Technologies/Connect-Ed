"use client";

import { useFormik } from "formik";
import { Money01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { step4ValidationSchema } from "./schemas";
import { FormField, FormActions } from "./components";
import { useOnboarding } from "./onboarding-context";

interface OnboardingStep4Props {
  onBack: () => void;
  onNext: () => void;
}

export function OnboardingStep4({ onBack, onNext }: OnboardingStep4Props) {
  const { updateStep4 } = useOnboarding();

  const formik = useFormik({
    initialValues: {
      termlyFee: "",
    },
    validationSchema: step4ValidationSchema,
    validateOnMount: true,
    onSubmit: async (values) => {
      try {
        updateStep4({ termlyFee: String(values.termlyFee) });
        onNext();
      } catch {
        // Handle error
      }
    },
  });

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-6">
      <FormField
        error={formik.touched.termlyFee ? (formik.errors.termlyFee as string) : undefined}
        delay={0.1}
      >
        <Label htmlFor="termlyFee" className="font-semibold">
          Termly Fee Amount (USD)
        </Label>
        <p className="text-sm text-slate-600 mb-2">
          This is the amount each student is expected to pay per term.
        </p>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-slate-500">
            <HugeiconsIcon icon={Money01Icon} size={18} />
            <span className="font-medium">$</span>
          </div>
          <Input
            id="termlyFee"
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g., 500.00"
            {...formik.getFieldProps("termlyFee")}
            className={`pl-14 ${
              formik.touched.termlyFee && formik.errors.termlyFee
                ? "border-destructive"
                : ""
            }`}
          />
        </div>
        <p className="text-xs text-slate-500 mt-1">
          You can change this later in your school settings.
        </p>
      </FormField>

      <FormActions
        onBack={onBack}
        canContinue={formik.isValid}
        isLoading={formik.isSubmitting}
        showBack={true}
        delay={0.2}
      />
    </form>
  );
}
