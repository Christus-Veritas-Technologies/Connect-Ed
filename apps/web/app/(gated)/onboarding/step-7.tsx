"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Add01Icon, Delete01Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FormActions } from "./components";
import { useOnboarding } from "./onboarding-context";

interface GradeEntry {
  name: string;
  minMark: number;
  maxMark: number;
  isPass: boolean;
}

interface SubjectGrades {
  subjectName: string;
  grades: GradeEntry[];
}

interface OnboardingStep7Props {
  onBack: () => void;
  onNext: () => void;
}

const DEFAULT_GRADES: GradeEntry[] = [
  { name: "A", minMark: 90, maxMark: 100, isPass: true },
  { name: "B", minMark: 70, maxMark: 89, isPass: true },
  { name: "C", minMark: 50, maxMark: 69, isPass: true },
  { name: "D", minMark: 30, maxMark: 49, isPass: false },
  { name: "F", minMark: 0, maxMark: 29, isPass: false },
];

export function OnboardingStep7({ onBack, onNext }: OnboardingStep7Props) {
  const { data, updateStep6 } = useOnboarding();
  const subjects = data.step2?.subjects || [];

  const [subjectGrades, setSubjectGrades] = useState<SubjectGrades[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  // Initialize with existing data or defaults
  useEffect(() => {
    if (data.step6 && data.step6.length > 0) {
      setSubjectGrades(data.step6);
    } else {
      // Pre-fill with default grades for each subject
      setSubjectGrades(
        subjects.map((s) => ({
          subjectName: s.name,
          grades: DEFAULT_GRADES.map((g) => ({ ...g })),
        }))
      );
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateGrade = (subjectIdx: number, gradeIdx: number, field: keyof GradeEntry, value: any) => {
    setSubjectGrades((prev) => {
      const updated = [...prev];
      const subject = { ...updated[subjectIdx] };
      const grades = [...subject.grades];
      grades[gradeIdx] = { ...grades[gradeIdx], [field]: value };
      subject.grades = grades;
      updated[subjectIdx] = subject;
      return updated;
    });
  };

  const addGrade = (subjectIdx: number) => {
    setSubjectGrades((prev) => {
      const updated = [...prev];
      const subject = { ...updated[subjectIdx] };
      subject.grades = [...subject.grades, { name: "", minMark: 0, maxMark: 0, isPass: false }];
      updated[subjectIdx] = subject;
      return updated;
    });
  };

  const removeGrade = (subjectIdx: number, gradeIdx: number) => {
    setSubjectGrades((prev) => {
      const updated = [...prev];
      const subject = { ...updated[subjectIdx] };
      subject.grades = subject.grades.filter((_, i) => i !== gradeIdx);
      updated[subjectIdx] = subject;
      return updated;
    });
  };

  const applyDefaultsToAll = () => {
    setSubjectGrades((prev) =>
      prev.map((s) => ({
        ...s,
        grades: DEFAULT_GRADES.map((g) => ({ ...g })),
      }))
    );
  };

  const validate = (): boolean => {
    const errs: string[] = [];
    subjectGrades.forEach((sg) => {
      if (sg.grades.length === 0) {
        errs.push(`${sg.subjectName} has no grades defined.`);
      }
      sg.grades.forEach((g, i) => {
        if (!g.name.trim()) errs.push(`${sg.subjectName}: Grade ${i + 1} needs a name.`);
        if (g.minMark > g.maxMark) errs.push(`${sg.subjectName}: "${g.name}" min mark exceeds max mark.`);
      });
    });
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    updateStep6(subjectGrades);
    onNext();
  };

  const completedCount = subjectGrades.filter((sg) => sg.grades.length > 0 && sg.grades.every((g) => g.name.trim())).length;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Define grading scales for each subject. These will be used to grade students on exams.
          </p>
          <Badge variant="outline">
            {completedCount}/{subjects.length} subjects
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={applyDefaultsToAll} className="gap-2">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} />
          Apply default grades (A-F) to all
        </Button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Accordion type="multiple" className="space-y-2">
          {subjectGrades.map((sg, subjectIdx) => (
            <AccordionItem
              key={sg.subjectName}
              value={sg.subjectName}
              className="border rounded-lg px-4"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{sg.subjectName}</span>
                  <Badge variant={sg.grades.length > 0 ? "default" : "secondary"} className="text-xs">
                    {sg.grades.length} grade{sg.grades.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-4">
                {sg.grades.map((grade, gradeIdx) => (
                  <motion.div
                    key={gradeIdx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: gradeIdx * 0.03 }}
                    className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border"
                  >
                    <div className="w-20">
                      <Input
                        placeholder="A"
                        value={grade.name}
                        onChange={(e) => updateGrade(subjectIdx, gradeIdx, "name", e.target.value)}
                        className="text-center font-bold h-9"
                      />
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Min %"
                        min={0}
                        max={100}
                        value={grade.minMark}
                        onChange={(e) => updateGrade(subjectIdx, gradeIdx, "minMark", parseInt(e.target.value) || 0)}
                        className="h-9 w-20 text-center"
                      />
                      <span className="text-muted-foreground text-sm">to</span>
                      <Input
                        type="number"
                        placeholder="Max %"
                        min={0}
                        max={100}
                        value={grade.maxMark}
                        onChange={(e) => updateGrade(subjectIdx, gradeIdx, "maxMark", parseInt(e.target.value) || 0)}
                        className="h-9 w-20 text-center"
                      />
                      <span className="text-muted-foreground text-sm">%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Pass</Label>
                      <Switch
                        checked={grade.isPass}
                        onCheckedChange={(v) => updateGrade(subjectIdx, gradeIdx, "isPass", v)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeGrade(subjectIdx, gradeIdx)}
                      className="text-destructive hover:bg-destructive/10 p-1"
                    >
                      <HugeiconsIcon icon={Delete01Icon} size={16} />
                    </Button>
                  </motion.div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addGrade(subjectIdx)}
                  className="gap-2 w-full"
                >
                  <HugeiconsIcon icon={Add01Icon} size={16} />
                  Add Grade
                </Button>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.div>

      {errors.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-1">
          {errors.map((err, i) => (
            <p key={i} className="text-sm text-red-600">• {err}</p>
          ))}
        </motion.div>
      )}

      <div className="flex gap-4 pt-4">
        <Button type="button" variant="outline" className="w-1/4" onClick={onBack}>
          Back
        </Button>
        <Button type="button" className="flex-1" onClick={handleSubmit}>
          Continue
        </Button>
      </div>
    </div>
  );
}
