"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormik } from "formik";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FormError } from "./components";
import { step4ValidationSchema } from "./schemas";
import {
  clearOnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingDraft,
  type OnboardingDraft,
} from "./storage";

interface OnboardingStep4Props {
  onBack: () => void;
}

export function OnboardingStep4({ onBack }: OnboardingStep4Props) {
  const router = useRouter();
  const { user, setAuthData } = useAuth();
  const [draft, setDraft] = useState<OnboardingDraft>({});
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    setDraft(loadOnboardingDraft());
  }, []);

  const summary = useMemo(() => {
    const subjectsCount = draft.subjects?.length || 0;
    const classesCount = draft.classes?.length || 0;
    const curriculum = [
      draft.curriculum?.cambridge ? "Cambridge" : null,
      draft.curriculum?.zimsec ? "ZIMSEC" : null,
    ].filter(Boolean);

    return {
      subjectsCount,
      classesCount,
      curriculum,
    };
  }, [draft]);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      teacherCount: draft.teacherCount || 1,
      studentCount: draft.studentCount || 1,
      confirm: false,
    },
    validationSchema: step4ValidationSchema,
    onSubmit: async (values) => {
      try {
        setError(undefined);
        if (!draft.schoolName) {
          setError("School name is missing. Please go back to Step 1.");
          return;
        }
        saveOnboardingDraft({
          teacherCount: values.teacherCount,
          studentCount: values.studentCount,
        });

        const response = await api.post<{ school: { id: string; name: string; plan: string; isActive: boolean; onboardingComplete: boolean } }>(
          "/onboarding",
          {
            schoolName: draft.schoolName,
            teacherCount: values.teacherCount,
            studentCount: values.studentCount,
          }
        );

        if (user) {
          setAuthData(user, {
            ...response.school,
            signupFeePaid: true,
          });
        }

        clearOnboardingDraft();
        router.push("/dashboard");
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to complete onboarding");
      }
    },
  });

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-6">
      <FormError message={error} />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-slate-50 rounded-lg border border-slate-200 space-y-3"
      >
        <div>
          <p className="text-xs text-slate-500">School Name</p>
          <p className="text-sm font-semibold text-slate-800">{draft.schoolName || "—"}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500">Curriculum</p>
            <p className="text-sm font-semibold text-slate-800">
              {summary.curriculum.length ? summary.curriculum.join(", ") : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Education Levels</p>
            <p className="text-sm font-semibold text-slate-800">
              {draft.educationLevels?.primary && draft.educationLevels?.secondary
                ? "Primary & Secondary"
                : draft.educationLevels?.primary
                  ? "Primary"
                  : draft.educationLevels?.secondary
                    ? "Secondary"
                    : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Subjects</p>
            <p className="text-sm font-semibold text-slate-800">{summary.subjectsCount}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Classes</p>
            <p className="text-sm font-semibold text-slate-800">{summary.classesCount}</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-4"
      >
        <div className="space-y-2">
          <Label htmlFor="teacherCount" className="font-semibold">
            Number of Teachers
          </Label>
          <Input
            id="teacherCount"
            type="number"
            min={1}
            value={formik.values.teacherCount}
            onChange={(e) => formik.setFieldValue("teacherCount", Number(e.target.value))}
            onBlur={() => formik.setFieldTouched("teacherCount", true)}
            className={formik.touched.teacherCount && formik.errors.teacherCount ? "border-destructive" : ""}
          />
          {formik.touched.teacherCount && formik.errors.teacherCount && (
            <p className="text-xs text-destructive">{formik.errors.teacherCount as string}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="studentCount" className="font-semibold">
            Number of Students
          </Label>
          <Input
            id="studentCount"
            type="number"
            min={1}
            value={formik.values.studentCount}
            onChange={(e) => formik.setFieldValue("studentCount", Number(e.target.value))}
            onBlur={() => formik.setFieldTouched("studentCount", true)}
            className={formik.touched.studentCount && formik.errors.studentCount ? "border-destructive" : ""}
          />
          {formik.touched.studentCount && formik.errors.studentCount && (
            <p className="text-xs text-destructive">{formik.errors.studentCount as string}</p>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-3"
      >
        <Checkbox
          id="confirm"
          checked={formik.values.confirm}
          onCheckedChange={(value: boolean) => formik.setFieldValue("confirm", value)}
        />
        <Label htmlFor="confirm" className="text-sm">
          I confirm the above details are correct.
        </Label>
      </motion.div>
      {formik.touched.confirm && formik.errors.confirm && (
        <p className="text-xs text-destructive">{formik.errors.confirm as string}</p>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex gap-4"
      >
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" className="flex-1" loading={formik.isSubmitting}>
          {!formik.isSubmitting && "Complete Onboarding"}
        </Button>
      </motion.div>
    </form>
  );
}
