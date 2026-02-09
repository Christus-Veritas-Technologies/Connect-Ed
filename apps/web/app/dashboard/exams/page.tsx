"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Add01Icon,
  Delete02Icon,
  CheckmarkCircle02Icon,
  BookOpen01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useAuth } from "@/lib/auth-context";
import {
  useExams,
  useExamDetail,
  useExamStudents,
  useCreateExam,
  useDeleteExam,
  useEnterExamResults,
} from "@/lib/hooks/use-exams";
import { useSubjects } from "@/lib/hooks/use-subjects";
import { useClasses } from "@/lib/hooks/use-classes";

import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const PAPER_LABELS: Record<string, string> = {
  PAPER_1: "Paper 1",
  PAPER_2: "Paper 2",
  PAPER_3: "Paper 3",
  PAPER_4: "Paper 4",
  PAPER_5: "Paper 5",
};

export default function ExamsPage() {
  const { user } = useAuth();
  const { data: examsData, isLoading } = useExams();
  const { data: subjectsData } = useSubjects();
  const { data: classesData } = useClasses();
  const createMutation = useCreateExam();
  const deleteMutation = useDeleteExam();

  const exams = examsData?.exams || [];
  const subjects = subjectsData?.subjects || [];
  const classes = classesData?.classes || [];

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [gradeExamId, setGradeExamId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    paper: "",
    subjectId: "",
    classId: "",
  });

  const handleCreate = () => {
    if (!formData.name || !formData.paper || !formData.subjectId || !formData.classId) {
      toast.error("Please fill in all fields");
      return;
    }
    createMutation.mutate(formData, {
      onSuccess: () => {
        setShowCreateDialog(false);
        setFormData({ name: "", paper: "", subjectId: "", classId: "" });
        toast.success("Exam created!");
      },
      onError: (err) => {
        const msg = err instanceof ApiError ? err.message : "Failed to create exam";
        toast.error(msg);
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Exams
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create exams and enter student grades
          </p>
        </div>
        {user?.role === "TEACHER" && (
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <HugeiconsIcon icon={Add01Icon} size={20} />
            Create Exam
          </Button>
        )}
      </div>

      {/* Exams Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="size-10 rounded-full border-4 border-brand border-t-transparent animate-spin" />
        </div>
      ) : exams.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
              <HugeiconsIcon icon={BookOpen01Icon} size={48} className="text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold mb-1">No exams yet</p>
            <p className="text-muted-foreground text-sm">
              Create your first exam to start grading students.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {exams.map((exam, i) => (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="h-full hover:border-brand/30 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{exam.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {exam.subject.name} • {exam.class.name}
                        </p>
                      </div>
                      <Badge variant="outline">{PAPER_LABELS[exam.paper]}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Stats */}
                    {exam.stats && exam.stats.totalResults > 0 ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Average</span>
                          <span className="font-bold">{exam.stats.averageMark}%</span>
                        </div>
                        <Progress value={exam.stats.averageMark} className="h-2" />
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 rounded-lg bg-green-50 text-center">
                            <span className="font-bold text-green-700">{exam.stats.passRate}%</span>
                            <p className="text-green-600">Pass Rate</p>
                          </div>
                          <div className="p-2 rounded-lg bg-blue-50 text-center">
                            <span className="font-bold text-blue-700">{exam.stats.totalResults}</span>
                            <p className="text-blue-600">Results</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No results entered yet</p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5"
                        onClick={() => setGradeExamId(exam.id)}
                      >
                        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} />
                        Enter Grades
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() =>
                          deleteMutation.mutate(exam.id, {
                            onSuccess: () => toast.success("Exam deleted"),
                            onError: () => toast.error("Failed to delete"),
                          })
                        }
                        disabled={deleteMutation.isPending}
                      >
                        <HugeiconsIcon icon={Delete02Icon} size={16} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Exam Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Exam</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Exam Name</Label>
              <Input
                placeholder="e.g. Mid-Term Exam"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select
                value={formData.subjectId}
                onValueChange={(v) => setFormData({ ...formData, subjectId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject..." />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s: { id: string; name: string }) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Class</Label>
              <Select
                value={formData.classId}
                onValueChange={(v) => setFormData({ ...formData, classId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select class..." />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c: { id: string; name: string }) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Paper</Label>
              <Select
                value={formData.paper}
                onValueChange={(v) => setFormData({ ...formData, paper: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select paper..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAPER_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Exam"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enter Grades Dialog */}
      {gradeExamId && (
        <EnterGradesDialog examId={gradeExamId} onClose={() => setGradeExamId(null)} />
      )}
    </div>
  );
}

// ============================================
// Enter Grades Dialog
// ============================================

function EnterGradesDialog({ examId, onClose }: { examId: string; onClose: () => void }) {
  const { data: studentsData, isLoading } = useExamStudents(examId);
  const { data: examData } = useExamDetail(examId);
  const enterMutation = useEnterExamResults(examId);

  const students = studentsData?.students || [];
  const [marks, setMarks] = useState<Record<string, string>>({});

  // Initialize marks from existing data
  useState(() => {
    if (students.length > 0) {
      const initial: Record<string, string> = {};
      students.forEach((s) => {
        if (s.existingMark !== null) initial[s.id] = String(s.existingMark);
      });
      setMarks(initial);
    }
  });

  const handleSave = () => {
    const results = Object.entries(marks)
      .filter(([, mark]) => mark !== "" && !isNaN(Number(mark)))
      .map(([studentId, mark]) => ({
        studentId,
        mark: Math.min(100, Math.max(0, parseInt(mark))),
      }));

    if (results.length === 0) {
      toast.error("Enter at least one mark");
      return;
    }

    enterMutation.mutate(results, {
      onSuccess: () => {
        toast.success(`${results.length} result(s) saved`);
        onClose();
      },
      onError: (err) => {
        const msg = err instanceof ApiError ? err.message : "Failed to save results";
        toast.error(msg);
      },
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Enter Grades{examData?.exam ? ` — ${examData.exam.name}` : ""}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="size-8 rounded-full border-4 border-brand border-t-transparent animate-spin" />
          </div>
        ) : students.length === 0 ? (
          <p className="text-muted-foreground text-sm py-6 text-center">
            No students found in this class.
          </p>
        ) : (
          <div className="space-y-3">
            {students.map((student) => (
              <div
                key={student.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {student.firstName} {student.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{student.admissionNumber}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder={student.existingMark !== null ? String(student.existingMark) : "—"}
                    value={marks[student.id] ?? (student.existingMark !== null ? String(student.existingMark) : "")}
                    onChange={(e) =>
                      setMarks((prev) => ({ ...prev, [student.id]: e.target.value }))
                    }
                    className="w-20 text-center h-9"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>
            ))}
            <div className="flex gap-3 pt-3">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={enterMutation.isPending}>
                {enterMutation.isPending ? "Saving..." : "Save Grades"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
