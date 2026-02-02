"use client";

import { useFormik } from "formik";
import { School01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { step1ValidationSchema } from "./schemas";
import { FormField, FormActions } from "./components";

interface OnboardingStep1Props {
  onNext: () => void;
}

export function OnboardingStep1({ onNext }: OnboardingStep1Props) {
  const { school } = useAuth();

  const formik = useFormik({
    initialValues: {
      schoolName: school?.name || "",
      address: "",
      phoneNumber: "",
      email: "",
    },
    validationSchema: step1ValidationSchema,
    onSubmit: async () => {
      try {
        // API call would go here
        onNext();
      } catch {
        // Handle error
      }
    },
  });

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-6">
      {/* School Name */}
      <FormField
        error={formik.touched.schoolName ? (formik.errors.schoolName as string) : undefined}
        delay={0.1}
      >
        <Label htmlFor="schoolName" className="font-semibold">
          School Name
        </Label>
        <Input
          id="schoolName"
          type="text"
          placeholder="e.g., Springfield Elementary School"
          {...formik.getFieldProps("schoolName")}
          icon={<HugeiconsIcon icon={School01Icon} size={20} />}
          className={
            formik.touched.schoolName && formik.errors.schoolName
              ? "border-destructive"
              : ""
          }
        />
      </FormField>

      {/* Address */}
      <FormField
        error={formik.touched.address ? (formik.errors.address as string) : undefined}
        delay={0.15}
      >
        <Label htmlFor="address" className="font-semibold">
          Address
        </Label>
        <Input
          id="address"
          type="text"
          placeholder="e.g., 123 Main Street, Harare"
          {...formik.getFieldProps("address")}
          className={
            formik.touched.address && formik.errors.address
              ? "border-destructive"
              : ""
          }
        />
      </FormField>

      {/* Phone Number with Country Code */}
      <FormField
        error={formik.touched.phoneNumber ? (formik.errors.phoneNumber as string) : undefined}
        delay={0.2}
      >
        <Label className="font-semibold">Phone Number</Label>
        <div className="flex gap-2">
          <Input
            type="text"
            value="263"
            disabled
            className="w-20"
          />
          <Input
            id="phoneNumber"
            type="text"
            placeholder="712345678"
            maxLength={9}
            {...formik.getFieldProps("phoneNumber")}
            className={`flex-1 ${
              formik.touched.phoneNumber && formik.errors.phoneNumber
                ? "border-destructive"
                : ""
            }`}
          />
        </div>
        <p className="text-xs text-slate-600">
          Enter your 9-digit phone number (must start with 7)
        </p>
      </FormField>

      {/* Email */}
      <FormField
        error={formik.touched.email ? (formik.errors.email as string) : undefined}
        delay={0.25}
      >
        <Label htmlFor="email" className="font-semibold">
          Email Address
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="school@example.com"
          {...formik.getFieldProps("email")}
          className={
            formik.touched.email && formik.errors.email
              ? "border-destructive"
              : ""
          }
        />
      </FormField>

      {/* Action Buttons */}
      <FormActions
        onContinue={() => formik.handleSubmit()}
        canContinue={formik.isValid}
        isLoading={formik.isSubmitting}
        showBack={false}
        delay={0.3}
      />
    </form>
  );
}
