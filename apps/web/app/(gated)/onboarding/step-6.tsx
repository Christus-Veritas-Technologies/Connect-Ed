"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Building01Icon,
  BookOpen01Icon,
  User02Icon,
  Money01Icon,
  Calendar01Icon,
  CheckmarkCircle02Icon,
  CheckmarkBadge03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "./onboarding-context";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface OnboardingStep6Props {
  onBack: () => void;
}

export function OnboardingStep6({ onBack }: OnboardingStep6Props) {
  const { data } = useOnboarding();
  const { checkAuth } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleComplete = async () => {
    setIsLoading(true);
    setError("");

    try {
      const totalStudents = data.step3?.classes.reduce((sum, cls) => sum + (parseInt(cls.capacity) || 0), 0) || 0;
      const totalTeachers = data.step2?.subjects.length || 1;

      const payload = {
        schoolName: data.step1?.schoolName || "",
        address: data.step1?.address || "",
        phone: data.step1?.isLandline
          ? `020${data.step1?.phoneNumber}`
          : `263${data.step1?.phoneNumber}`,
        email: data.step1?.email || "",
        curriculum: {
          cambridge: data.step2?.curriculum.cambridge || false,
          zimsec: data.step2?.curriculum.zimsec || false,
        },
        educationLevels: {
          primary: data.step2?.educationLevels.primary || false,
          secondary: data.step2?.educationLevels.secondary || false,
        },
        subjects: data.step2?.subjects || [],
        classes: data.step3?.classes || [],
        teacherCount: totalTeachers,
        studentCount: totalStudents,
        termlyFee: data.step4?.termlyFee ? parseFloat(data.step4.termlyFee) : undefined,
        currentTermNumber: data.step5?.termNumber,
        currentTermYear: data.step5?.year,
        termStartMonth: data.step5?.termStartMonth,
        termStartDay: data.step5?.termStartDay,
        grades: data.step6 || [],
      };

      console.log("[Step 6] Onboarding context data:", data);
      console.log("[Step 6] Payload being sent to backend:", payload);

      await api.post("/onboarding", payload);
      await checkAuth();
      router.push("/dashboard");
    } catch (err: unknown) {
      console.error("Onboarding error:", err);
      const error = err instanceof Error ? err.message : "Failed to complete onboarding. Please try again.";
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* School Details */}
        <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <HugeiconsIcon icon={Building01Icon} size={24} className="text-blue-600" />
            <h3 className="font-semibold text-lg">School Information</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">School Name:</span>
              <span className="font-medium">{data.step1?.schoolName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Address:</span>
              <span className="font-medium">{data.step1?.address}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Phone:</span>
              <span className="font-medium">
                {data.step1?.isLandline ? "(020)" : "263"} {data.step1?.phoneNumber}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Email:</span>
              <span className="font-medium">{data.step1?.email}</span>
            </div>
          </div>
        </div>

        {/* Curriculum & Subjects */}
        <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <HugeiconsIcon icon={BookOpen01Icon} size={24} className="text-purple-600" />
            <h3 className="font-semibold text-lg">Curriculum & Subjects</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-slate-600">Curriculum:</span>
              <span className="ml-2 font-medium">
                {[
                  data.step2?.curriculum.cambridge && "Cambridge",
                  data.step2?.curriculum.zimsec && "ZIMSEC",
                ].filter(Boolean).join(", ")}
              </span>
            </div>
            <div>
              <span className="text-slate-600">Education Levels:</span>
              <span className="ml-2 font-medium">
                {[
                  data.step2?.educationLevels.primary && "Primary",
                  data.step2?.educationLevels.secondary && "Secondary",
                ].filter(Boolean).join(", ")}
              </span>
            </div>
            <div>
              <span className="text-slate-600 block mb-2">Subjects ({data.step2?.subjects.length}):</span>
              <div className="space-y-1 ml-4">
                {data.step2?.subjects.map((subject, index) => (
                  <div key={index} className="font-medium">
                    • {subject.name}
                    {subject.level && ` (${subject.level})`}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Classes */}
        <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <HugeiconsIcon icon={User02Icon} size={24} className="text-green-600" />
            <h3 className="font-semibold text-lg">Classes</h3>
          </div>
          <div className="space-y-2 text-sm">
            {data.step3?.classes.map((cls, index) => (
              <div key={index} className="flex justify-between">
                <span className="font-medium">
                  {cls.name}
                  {cls.level && <span className="text-slate-500 ml-2">({cls.level})</span>}
                </span>
                <span className="text-slate-600">Capacity: {cls.capacity} students</span>
              </div>
            ))}
            <div className="pt-3 border-t border-slate-300 mt-3">
              <div className="flex justify-between font-semibold">
                <span>Total Capacity:</span>
                <span>
                  {data.step3?.classes.reduce((sum, cls) => sum + (parseInt(cls.capacity) || 0), 0)} students
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Termly Fees */}
        <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <HugeiconsIcon icon={Money01Icon} size={24} className="text-emerald-600" />
            <h3 className="font-semibold text-lg">Termly Fees</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Fee per student per term:</span>
              <span className="font-medium text-lg">
                ${data.step4?.termlyFee
                  ? parseFloat(data.step4.termlyFee).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : "Not set"}
              </span>
            </div>
          </div>
        </div>

        {/* Current Term */}
        <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <HugeiconsIcon icon={Calendar01Icon} size={24} className="text-orange-600" />
            <h3 className="font-semibold text-lg">Current Term</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Term:</span>
              <span className="font-medium">Term {data.step5?.termNumber}, {data.step5?.year}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Start Date:</span>
              <span className="font-medium">
                {data.step5?.termStartMonth && data.step5?.termStartDay
                  ? `${MONTHS[data.step5.termStartMonth - 1]} ${data.step5.termStartDay}, ${data.step5.year}`
                  : "Not set"}
              </span>
            </div>
          </div>
        </div>

        {/* Grading System */}
        {data.step6 && data.step6.length > 0 && (
          <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <HugeiconsIcon icon={CheckmarkBadge03Icon} size={24} className="text-indigo-600" />
              <h3 className="font-semibold text-lg">Grading System</h3>
            </div>
            <div className="space-y-3 text-sm">
              {data.step6.map((sg, i) => (
                <div key={i}>
                  <span className="font-medium">{sg.subjectName}:</span>
                  <span className="ml-2 text-slate-600">
                    {sg.grades.map((g) => `${g.name} (${g.minMark}-${g.maxMark}%)`).join(", ")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm"
          >
            {error}
          </motion.div>
        )}

        {!error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 bg-green-50 rounded-lg border border-green-200"
          >
            <div className="flex items-start gap-3">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={24} className="text-green-600 flex-shrink-0 mt-1" />
              <div>
                <p className="font-semibold text-green-900">Ready to go!</p>
                <p className="text-sm text-green-700 mt-1">
                  Review your information above and click Complete Onboarding to finish setup.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="flex gap-4"
      >
        <Button
          type="button"
          variant="outline"
          className="w-1/4"
          onClick={onBack}
          disabled={isLoading}
        >
          Back
        </Button>
        <Button
          type="button"
          className="flex-1"
          onClick={handleComplete}
          disabled={isLoading}
        >
          {isLoading ? "Completing..." : "Complete Onboarding"}
        </Button>
      </motion.div>
    </div>
  );
}
