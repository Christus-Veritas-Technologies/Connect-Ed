"use client";

import { useFormik } from "formik";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Delete01Icon, Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { step2ValidationSchema } from "./schemas";
import { FormSection, FormActions } from "./components";

interface OnboardingStep2Props {
  onBack: () => void;
  onNext: () => void;
}

export function OnboardingStep2({ onBack, onNext }: OnboardingStep2Props) {
  const formik = useFormik({
    initialValues: {
      curriculum: {
        cambridge: false,
        zimsec: false,
      },
      educationLevels: {
        primary: false,
        secondary: false,
      },
      subjects: [{ name: "", level: "" }],
    },
    validationSchema: step2ValidationSchema,
    onSubmit: async () => {
      try {
        // API call would go here
        onNext();
      } catch {
        // Handle error
      }
    },
  });

  const hasBothLevels =
    formik.values.educationLevels.primary && formik.values.educationLevels.secondary;

  // Auto-set level for subjects when only one education level is selected
  const getAutoLevel = (): string => {
    if (formik.values.educationLevels.primary) return "primary";
    if (formik.values.educationLevels.secondary) return "secondary";
    return "";
  };

  // Auto-fill level for all subjects when education levels change
  useEffect(() => {
    if (!hasBothLevels) {
      const autoLevel = getAutoLevel();
      const updatedSubjects = formik.values.subjects.map((subject: Record<string, string>) => ({
        ...subject,
        level: autoLevel,
      }));
      formik.setFieldValue("subjects", updatedSubjects);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.educationLevels.primary, formik.values.educationLevels.secondary]);

  const addSubject = (): void => {
    formik.setFieldValue("subjects", [
      ...formik.values.subjects,
      { name: "", level: "" },
    ]);
  };

  const removeSubject = (index: number): void => {
    formik.setFieldValue(
      "subjects",
      formik.values.subjects.filter((_: Record<string, string>, i: number) => i !== index)
    );
  };

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-6">
      {/* Curriculum Switches */}
      <FormSection
        title="School Curriculum"
        error={formik.errors.curriculum as string}
        delay={0.1}
      >
        <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <Label htmlFor="cambridge" className="font-normal cursor-pointer">
              Cambridge
            </Label>
            <Switch
              id="cambridge"
              checked={formik.values.curriculum.cambridge}
              onCheckedChange={(value: boolean) => {
                formik.setFieldValue("curriculum.cambridge", value);
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="zimsec" className="font-normal cursor-pointer">
              ZIMSEC
            </Label>
            <Switch
              id="zimsec"
              checked={formik.values.curriculum.zimsec}
              onCheckedChange={(value: boolean) => {
                formik.setFieldValue("curriculum.zimsec", value);
              }}
            />
          </div>
        </div>
      </FormSection>

      {/* Education Levels Checkboxes */}
      <FormSection
        title="Education Levels"
        error={formik.errors.educationLevels as string}
        delay={0.15}
      >
        <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-3">
            <Checkbox
              id="primary"
              checked={formik.values.educationLevels.primary}
              onCheckedChange={(value: boolean) => {
                formik.setFieldValue("educationLevels.primary", value);
              }}
            />
            <Label htmlFor="primary" className="font-normal cursor-pointer">
              Primary School
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox
              id="secondary"
              checked={formik.values.educationLevels.secondary}
              onCheckedChange={(value: boolean) => {
                formik.setFieldValue("educationLevels.secondary", value);
              }}
            />
            <Label htmlFor="secondary" className="font-normal cursor-pointer">
              Secondary School
            </Label>
          </div>
        </div>
      </FormSection>

      {/* School Subjects */}
      <FormSection
        title="School Subjects"
        error={formik.errors.subjects as string}
        delay={0.2}
      >
        <div className="space-y-4">
          {formik.values.subjects.map((subject: Record<string, string>, index: number) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const subjectError = (formik.errors.subjects as any)?.[index] as any;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const subjectTouched = (formik.touched.subjects as any)?.[index] as any;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex gap-3 items-end p-4 bg-slate-50 rounded-lg border border-slate-200"
              >
                {/* Subject Name */}
                <div className="flex-1 space-y-2">
                  <Label htmlFor={`subject-${index}`} className="text-xs font-semibold">
                    Subject Name
                  </Label>
                  <Input
                    id={`subject-${index}`}
                    type="text"
                    placeholder="e.g., Mathematics"
                    value={subject.name}
                    onChange={(e) => {
                      const newSubjects = [...formik.values.subjects];
                      if (newSubjects[index]) {
                        newSubjects[index].name = e.target.value;
                        formik.setFieldValue("subjects", newSubjects);
                      }
                    }}
                    onBlur={() => formik.setFieldTouched(`subjects.${index}.name`, true)}
                    className={
                      subjectTouched?.name && subjectError?.name
                        ? "border-destructive"
                        : ""
                    }
                  />
                  {subjectTouched?.name && subjectError?.name && (
                    <p className="text-xs text-destructive">
                      {subjectError.name}
                    </p>
                  )}
                </div>

                {/* Subject Level (conditional) */}
                {hasBothLevels && (
                  <div className="flex-1 space-y-2">
                    <Label htmlFor={`level-${index}`} className="text-xs font-semibold">
                      Level
                    </Label>
                    <Select
                      value={subject.level}
                      onValueChange={(value) => {
                        const newSubjects = [...formik.values.subjects];
                        if (newSubjects[index]) {
                          newSubjects[index].level = value;
                          formik.setFieldValue("subjects", newSubjects);
                        }
                      }}
                    >
                      <SelectTrigger id={`level-${index}`}>
                  hasBothLevels && !subject.level && (
                  <input
                    type="hidden"
                    readOnly
                    value={getAutoLevel()}
                    onChange={() => {
                      const newSubjects = [...formik.values.subjects];
                      if (newSubjects[index]) {
                        newSubjects[index].level = getAutoLevel();
                        formik.setFieldValue("subjects", newSubjects);
                      }
                    }}
                  />
                )}

                {/* Auto-fill level when only one is selected */}
                {!hasBothLevels && subject.level === "" && (
                  <input
                    type="hidden"
                    value={formik.values.educationLevels.primary ? "primary" : "secondary"}
                    onChange={(e) => {
                      const newSubjects = [...formik.values.subjects];
                      if (newSubjects[index]) {
                        newSubjects[index].level = e.target.value;
                        formik.setFieldValue("subjects", newSubjects);
                      }
                    }}
                  />
                )}

                {/* Delete Button */}
                {formik.values.subjects.length > 1 && (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => removeSubject(index)}
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

        {/* Add Subject Button */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          onClick={addSubject}
          className="w-full py-2 px-4 border-2 border-dashed border-brand text-brand rounded-lg hover:bg-brand/5 transition-colors font-medium flex items-center justify-center gap-2"
        >
          <HugeiconsIcon icon={Add01Icon} size={20} />
          Add Subject
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
