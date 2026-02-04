"use client";

import { useFormik } from "formik";
import { motion } from "framer-motion";
import { Delete01Icon, Add01Icon, User02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { step3ValidationSchema } from "./schemas";
import { FormSection, FormActions } from "./components";
import { useOnboarding } from "./onboarding-context";

interface OnboardingStep3Props {
  onBack: () => void;
  onNext: () => void;
}

export function OnboardingStep3({ onBack, onNext }: OnboardingStep3Props) {
  const { updateStep3 } = useOnboarding();
  
  const formik = useFormik({
    initialValues: {
      classes: [{ name: "", capacity: "" }],
    },
    validationSchema: step3ValidationSchema,
    onSubmit: async (values) => {
      try {
        updateStep3(values);
        onNext();
      } catch {
        // Handle error
      }
    },
  });

  const addClass = (): void => {
    formik.setFieldValue("classes", [
      ...formik.values.classes,
      { name: "", capacity: "" },
    ]);
  };

  const removeClass = (index: number): void => {
    formik.setFieldValue(
      "classes",
      formik.values.classes.filter((_: Record<string, string>, i: number) => i !== index)
    );
  };

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-6">
      {/* School Classes */}
      <FormSection
        title="Classes"
        error={formik.errors.classes as string}
        delay={0.1}
      >
        <div className="flex items-center gap-2 mb-4">
          <HugeiconsIcon icon={User02Icon} size={20} className="text-green-600" />
          <span className="text-sm text-slate-600 font-medium">Create your school classes</span>
        </div>
        <div className="space-y-4">
          {formik.values.classes.map((schoolClass: Record<string, string>, index: number) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const classError = (formik.errors.classes as any)?.[index] as any;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const classTouched = (formik.touched.classes as any)?.[index] as any;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex gap-3 items-end p-4 bg-slate-50 rounded-lg border border-slate-200"
              >
                {/* Class Name */}
                <div className="flex-1 space-y-2">
                  <Label htmlFor={`class-${index}`} className="text-xs font-semibold">
                    Class Name
                  </Label>
                  <Input
                    id={`class-${index}`}
                    type="text"
                    placeholder="e.g., Form 1A"
                    value={schoolClass.name}
                    onChange={(e) => {
                      const newClasses = [...formik.values.classes];
                      if (newClasses[index]) {
                        newClasses[index].name = e.target.value;
                        formik.setFieldValue("classes", newClasses);
                      }
                    }}
                    onBlur={() => formik.setFieldTouched(`classes.${index}.name`, true)}
                    className={
                      classTouched?.name && classError?.name
                        ? "border-destructive"
                        : ""
                    }
                  />
                  {classTouched?.name && classError?.name && (
                    <p className="text-xs text-destructive">
                      {classError.name}
                    </p>
                  )}
                </div>

                {/* Class Capacity */}
                <div className="flex-1 space-y-2">
                  <Label htmlFor={`capacity-${index}`} className="text-xs font-semibold">
                    Capacity
                  </Label>
                  <Input
                    id={`capacity-${index}`}
                    type="number"
                    placeholder="e.g., 40"
                    min="1"
                    max="200"
                    value={schoolClass.capacity}
                    onChange={(e) => {
                      const newClasses = [...formik.values.classes];
                      if (newClasses[index]) {
                        newClasses[index].capacity = e.target.value;
                        formik.setFieldValue("classes", newClasses);
                      }
                    }}
                    onBlur={() => formik.setFieldTouched(`classes.${index}.capacity`, true)}
                    className={
                      classTouched?.capacity && classError?.capacity
                        ? "border-destructive"
                        : ""
                    }
                  />
                  {classTouched?.capacity && classError?.capacity && (
                    <p className="text-xs text-destructive">
                      {classError.capacity}
                    </p>
                  )}
                </div>

                {/* Delete Button */}
                {formik.values.classes.length > 1 && (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => removeClass(index)}
                    className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <HugeiconsIcon
                      icon={Delete01Icon}
                      size={20}
                      className="text-destructive"
                    />
                  </motion.button>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Add Class Button */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          onClick={addClass}
          className="w-full py-2 px-4 border-2 border-dashed border-brand text-brand rounded-lg hover:bg-brand/5 transition-colors font-medium flex items-center justify-center gap-2"
        >
          <HugeiconsIcon icon={Add01Icon} size={20} />
          Add Class
        </motion.button>
      </FormSection>

      {/* Action Buttons */}
      <FormActions
        onBack={onBack}
        onContinue={() => formik.handleSubmit()}
        canContinue={formik.isValid}
        isLoading={formik.isSubmitting}
        showBack={true}
        delay={0.3}
      />
    </form>
  );
}
