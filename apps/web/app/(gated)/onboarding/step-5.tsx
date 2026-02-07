"use client";

import { useFormik } from "formik";
import { Calendar01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { step5ValidationSchema } from "./schemas";
import { FormField, FormSection, FormActions } from "./components";
import { useOnboarding } from "./onboarding-context";

interface OnboardingStep5Props {
  onBack: () => void;
  onNext: () => void;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function OnboardingStep5({ onBack, onNext }: OnboardingStep5Props) {
  const { updateStep5 } = useOnboarding();
  const currentYear = new Date().getFullYear();

  const formik = useFormik({
    initialValues: {
      termNumber: "",
      termStartMonth: "",
      termStartDay: "",
      year: currentYear,
    },
    validationSchema: step5ValidationSchema,
    validateOnMount: true,
    onSubmit: async (values) => {
      try {
        updateStep5({
          termNumber: parseInt(values.termNumber),
          termStartMonth: parseInt(values.termStartMonth),
          termStartDay: parseInt(String(values.termStartDay)),
          year: values.year,
        });
        onNext();
      } catch {
        // Handle error
      }
    },
  });

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-6">
      <FormField
        error={formik.touched.termNumber ? (formik.errors.termNumber as string) : undefined}
        delay={0.1}
      >
        <Label htmlFor="termNumber" className="font-semibold">
          Current Term Number
        </Label>
        <p className="text-sm text-slate-600 mb-2">
          Which term is your school currently in?
        </p>
        <Select
          value={formik.values.termNumber}
          onValueChange={(value) => formik.setFieldValue("termNumber", value)}
        >
          <SelectTrigger
            id="termNumber"
            className={
              formik.touched.termNumber && formik.errors.termNumber
                ? "border-destructive"
                : ""
            }
          >
            <SelectValue placeholder="Select current term" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Term 1</SelectItem>
            <SelectItem value="2">Term 2</SelectItem>
            <SelectItem value="3">Term 3</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      <FormSection title="Term Start Date" delay={0.15}>
        <p className="text-sm text-slate-600 mb-3">
          When did the current term start?
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="termStartMonth" className="text-xs font-semibold">
              Month
            </Label>
            <Select
              value={formik.values.termStartMonth}
              onValueChange={(value) => formik.setFieldValue("termStartMonth", value)}
            >
              <SelectTrigger
                id="termStartMonth"
                className={
                  formik.touched.termStartMonth && formik.errors.termStartMonth
                    ? "border-destructive"
                    : ""
                }
              >
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month, index) => (
                  <SelectItem key={month} value={String(index + 1)}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formik.touched.termStartMonth && formik.errors.termStartMonth && (
              <p className="text-xs text-destructive">{formik.errors.termStartMonth}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="termStartDay" className="text-xs font-semibold">
              Day
            </Label>
            <Input
              id="termStartDay"
              type="number"
              min="1"
              max="31"
              placeholder="Day"
              {...formik.getFieldProps("termStartDay")}
              className={
                formik.touched.termStartDay && formik.errors.termStartDay
                  ? "border-destructive"
                  : ""
              }
            />
            {formik.touched.termStartDay && formik.errors.termStartDay && (
              <p className="text-xs text-destructive">{formik.errors.termStartDay as string}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="year" className="text-xs font-semibold">
              Year
            </Label>
            <Input
              id="year"
              type="number"
              value={formik.values.year}
              readOnly
              disabled
              className="bg-slate-100"
            />
          </div>
        </div>
      </FormSection>

      <FormActions
        onBack={onBack}
        canContinue={formik.isValid}
        isLoading={formik.isSubmitting}
        showBack={true}
        delay={0.25}
      />
    </form>
  );
}
