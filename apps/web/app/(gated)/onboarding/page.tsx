"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as yup from "yup";
import { motion } from "framer-motion";
import {
  School01Icon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/react";
import { useAuth, useAuthFetch } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const STEPS = [
  { number: 1, title: "School Details", description: "Let's get to know your school" },
  { number: 2, title: "Staff", description: "Tell us about your team" },
  { number: 3, title: "Students", description: "Student body information" },
  { number: 4, title: "Review", description: "Confirm your information" },
];

// Validation schema for Step 1
const step1ValidationSchema = yup.object().shape({
  schoolName: yup
    .string()
    .required("School name is required")
    .min(2, "School name must be at least 2 characters"),
  address: yup
    .string()
    .required("Address is required")
    .min(5, "Address must be at least 5 characters"),
  phoneNumber: yup
    .string()
    .required("Phone number is required")
    .test("starts-with-7", "Phone number must start with 7", (value) => {
      return value ? value.startsWith("7") : false;
    })
    .test("exact-length", "Phone number must be exactly 9 digits", (value) => {
      return value ? value.length === 9 : false;
    })
    .matches(/^\d+$/, "Phone number must contain only digits"),
  email: yup
    .string()
    .required("Email is required")
    .email("Must be a valid email address"),
});

export default function OnboardingPage() {
  const { school, refreshToken } = useAuth();
  const authFetch = useAuthFetch();
  const router = useRouter();

  useEffect(() => {
    if (school && !school.signupFeePaid) {
      router.push("/payment");
    }
  }, [school, router]);

  const formik = useFormik({
    initialValues: {
      schoolName: school?.name || "",
      address: "",
      phoneNumber: "",
      email: school?.email || "",
    },
    validationSchema: step1ValidationSchema,
    onSubmit: async (values) => {
      try {
        const response = await authFetch("/api/onboarding/step-1", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || "Failed to save school details");
        }

        // Move to next step
        // For now, just refresh and redirect
        await refreshToken();
        // Will implement step 2, 3, 4 next
      } catch (err) {
        formik.setFieldError("submit", err instanceof Error ? err.message : "Failed to submit form");
      }
    },
  });

  const currentStep = 0; // Step 1 for now

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
            className="flex flex-col gap-4 min-w-fit"
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
                  className="flex items-start gap-4"
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
                      <CheckmarkCircle02Icon size={20} />
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
                  {STEPS[currentStep].title}
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  {STEPS[currentStep].description}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-8 space-y-6">
                {/* Submit Error */}
                {formik.errors.submit && (
                  <Alert variant="destructive">
                    <AlertDescription>{formik.errors.submit}</AlertDescription>
                  </Alert>
                )}

                {/* Step 1: School Details */}
                {currentStep === 0 && (
                  <form onSubmit={formik.handleSubmit} className="space-y-6">
                    {/* School Name */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="space-y-2"
                    >
                      <Label htmlFor="schoolName" className="font-semibold">
                        School Name
                      </Label>
                      <Input
                        id="schoolName"
                        type="text"
                        placeholder="e.g., Springfield Elementary School"
                        {...formik.getFieldProps("schoolName")}
                        icon={<School01Icon size={20} />}
                        className={
                          formik.touched.schoolName && formik.errors.schoolName
                            ? "border-destructive"
                            : ""
                        }
                      />
                      {formik.touched.schoolName && formik.errors.schoolName && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-xs text-destructive"
                        >
                          {formik.errors.schoolName}
                        </motion.p>
                      )}
                    </motion.div>

                    {/* Address */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                      className="space-y-2"
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
                      {formik.touched.address && formik.errors.address && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-xs text-destructive"
                        >
                          {formik.errors.address}
                        </motion.p>
                      )}
                    </motion.div>

                    {/* Phone Number with Country Code */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="space-y-2"
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
                      {formik.touched.phoneNumber && formik.errors.phoneNumber && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-xs text-destructive"
                        >
                          {formik.errors.phoneNumber}
                        </motion.p>
                      )}
                    </motion.div>

                    {/* Email */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="space-y-2"
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
                      {formik.touched.email && formik.errors.email && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-xs text-destructive"
                        >
                          {formik.errors.email}
                        </motion.p>
                      )}
                    </motion.div>

                    {/* Action Buttons */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex gap-4 pt-4"
                    >
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={!formik.isValid || formik.isSubmitting}
                        loading={formik.isSubmitting}
                      >
                        {!formik.isSubmitting && (
                          <>
                            Continue to Next Step
                            <ArrowRight01Icon size={20} />
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </form>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
