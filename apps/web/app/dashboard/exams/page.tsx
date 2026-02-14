"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Check,
  MoreVertical,
  Loader2,
  BookOpen,
  ClipboardCheck,
  BarChart3,
  FileText,
  Download,
  FileDown,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DashboardBreadcrumbs,
  PageHeader,
  StatsCard,
  FilterTabs,
  ViewToggle,
  EmptyState,
  BulkActions,
} from "@/components/dashboard";
import { exportToPDF, exportDataAsCSV } from "@/lib/export-utils";
import { toast } from "sonner";

// ─── Constants ───────────────────────────────────────────────

const PAPER_LABELS: Record<string, string> = {
  PAPER_1: "Paper 1",
  PAPER_2: "Paper 2",
  PAPER_3: "Paper 3",
  PAPER_4: "Paper 4",
  PAPER_5: "Paper 5",
};

// ─── Compact Exam Card ──────────────────────────────────────

function ExamCard({
  exam,
  isSelected,
  onSelect,
  onViewDetails,
  onGrade,
  onDelete,
}: {
  exam: any;
  isSelected: boolean;
  onSelect: () => void;
  onViewDetails: () => void;
  onGrade: () => void;
  onDelete: () => void;
}) {
  const hasResults = exam.stats && exam.stats.totalResults > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      layout
      className="relative group"
    >
      <Card
        hover
        className={`h-full cursor-pointer transition-all ${isSelected ? "ring-2 ring-brand shadow-lg" : ""
          }`}
        onClick={onViewDetails}
      >
        <CardContent className="p-4">
          {/* Selection checkmark */}
          {isSelected && (
            <div className="absolute top-3 right-3 size-5 rounded-md bg-brand flex items-center justify-center z-10">
              <Check className="size-3.5 text-white" strokeWidth={3} />
            </div>
          )}

          {/* Icon area */}
          <div className="w-full aspect-[4/3] rounded-lg bg-gradient-to-br from-brand to-purple-600 flex flex-col items-center justify-center mb-3 p-3">
            <BookOpen className="size-8 text-white mb-2" />
            {hasResults && (
              <div className="text-center">
                <span className="text-2xl font-bold text-white">
                  {exam.stats.averageMark}%
                </span>
                <p className="text-xs text-white/80">Average</p>
              </div>
            )}
            {!hasResults && (
              <p className="text-xs text-white/80">No results yet</p>
            )}
          </div>

          {/* Name */}
          <h3 className="font-medium text-sm truncate">{exam.name}</h3>

          {/* Meta */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <span className="truncate">{exam.subject.name}</span>
            <span>·</span>
            <span>{exam.class.name}</span>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {PAPER_LABELS[exam.paper]}
            </Badge>
            {hasResults && (
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200 text-xs"
              >
                {exam.stats.passRate}% pass
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Hover actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-3 right-3 size-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onGrade}>
            <ClipboardCheck className="size-4" />
            Enter Grades
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}

// ─── Main Page ───────────────────────────────────────────────

export default function ExamsPage() {
  const { user } = useAuth();
  const router = useRouter();

  // ── State ──
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table" | "list">("grid");
  const [filterTab, setFilterTab] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [gradeExamId, setGradeExamId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    paper: "",
    subjectId: "",
    classId: "",
  });

  // ── Data fetching ──
  const { data: examsData, isLoading } = useExams();
  const { data: subjectsData } = useSubjects();
  const { data: classesData } = useClasses();
  const createMutation = useCreateExam();
  const deleteMutation = useDeleteExam();

  const exams = examsData?.exams || [];
  const subjects = subjectsData?.subjects || [];
  const classes = classesData?.classes || [];

  // ── Derived data ──
  const filteredExams = exams
    .filter((exam: any) =>
      search
        ? exam.name.toLowerCase().includes(search.toLowerCase()) ||
        exam.subject.name.toLowerCase().includes(search.toLowerCase())
        : true
    )
    .filter((exam: any) => {
      if (filterTab === "graded")
        return exam.stats && exam.stats.totalResults > 0;
      if (filterTab === "ungraded")
        return !exam.stats || exam.stats.totalResults === 0;
      return true;
    });

  const gradedExams = exams.filter(
    (e: any) => e.stats && e.stats.totalResults > 0
  );
  const ungradedExams = exams.filter(
    (e: any) => !e.stats || e.stats.totalResults === 0
  );
  const avgScore =
    gradedExams.length > 0
      ? Math.round(
        gradedExams.reduce(
          (sum: number, e: any) => sum + (e.stats?.averageMark || 0),
          0
        ) / gradedExams.length
      )
      : 0;

  const recentExams = !search ? filteredExams.slice(0, 8) : [];

  // ── Selection ──
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Actions ──
  const handleCreate = () => {
    if (
      !formData.name ||
      !formData.paper ||
      !formData.subjectId ||
      !formData.classId
    ) {
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
        const msg =
          err instanceof ApiError ? err.message : "Failed to create exam";
        toast.error(msg);
      },
    });
  };

  const handleBulkDelete = () => {
    if (
      !confirm(`Delete ${selectedIds.size} exam(s)? This cannot be undone.`)
    )
      return;
    const ids = Array.from(selectedIds);
    ids.forEach((id) => {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        },
      });
    });
    toast.success(`Deleting ${ids.length} exam(s)...`);
  };

  const handleExportCSV = () => {
    const toExport =
      selectedIds.size > 0
        ? filteredExams.filter((e: any) => selectedIds.has(e.id))
        : filteredExams;
    if (toExport.length === 0) return;

    exportDataAsCSV(
      toExport.map((e: any) => ({
        Name: e.name,
        Subject: e.subject.name,
        Class: e.class.name,
        Paper: PAPER_LABELS[e.paper],
        Average: e.stats?.averageMark ?? "—",
        "Pass Rate": e.stats?.passRate ? `${e.stats.passRate}%` : "—",
        Results: e.stats?.totalResults ?? 0,
      })),
      ["Name", "Subject", "Class", "Paper", "Average", "Pass Rate", "Results"],
      `exams-${new Date().toISOString().split("T")[0]}`
    );
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <DashboardBreadcrumbs items={[{ label: "Exams" }]} />

      {/* Header */}
      <PageHeader
        title="Exams"
        subtitle="Create exams and enter student grades"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search exams..."
        action={
          user?.role === "TEACHER" ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleExportCSV}
                title="Export CSV"
              >
                <Download className="size-4" />
              </Button>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="size-4" />
                Create Exam
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Total Exams"
          value={exams.length}
          icon={<BookOpen className="size-6" />}
          color="brand"
          delay={0.1}
        />
        <StatsCard
          label="Graded"
          value={gradedExams.length}
          icon={<ClipboardCheck className="size-6" />}
          color="green"
          delay={0.2}
        />
        <StatsCard
          label="Ungraded"
          value={ungradedExams.length}
          icon={<FileText className="size-6" />}
          color="orange"
          delay={0.3}
        />
        <StatsCard
          label="Avg Score"
          value={`${avgScore}%`}
          icon={<BarChart3 className="size-6" />}
          color="blue"
          delay={0.4}
        />
      </div>

      {/* Recent Exams */}
      {!isLoading && recentExams.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Exams</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recentExams.map((exam: any) => (
              <ExamCard
                key={exam.id}
                exam={exam}
                isSelected={selectedIds.has(exam.id)}
                onSelect={() => toggleSelection(exam.id)}
                onViewDetails={() => router.push(`/dashboard/exams/${exam.id}`)}
                onGrade={() => setGradeExamId(exam.id)}
                onDelete={() =>
                  deleteMutation.mutate(exam.id, {
                    onSuccess: () => toast.success("Exam deleted"),
                    onError: () => toast.error("Failed to delete"),
                  })
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Main Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">All Exams</h2>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <FilterTabs
            tabs={[
              { key: "all", label: "All", count: exams.length },
              {
                key: "graded",
                label: "Graded",
                count: gradedExams.length,
              },
              {
                key: "ungraded",
                label: "Ungraded",
                count: ungradedExams.length,
              },
            ]}
            active={filterTab}
            onChange={setFilterTab}
          />
          <ViewToggle mode={viewMode} onChange={setViewMode} />
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-8 animate-spin text-brand" />
          </div>
        )}

        {/* Empty */}
        {!isLoading && filteredExams.length === 0 && (
          <EmptyState
            icon={<BookOpen className="size-12" />}
            title={
              search || filterTab !== "all"
                ? "No exams match your filters"
                : "No exams yet"
            }
            description="Create your first exam to start grading students."
            action={
              user?.role === "TEACHER" ? (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="size-4" />
                  Create Exam
                </Button>
              ) : undefined
            }
          />
        )}

        {/* Grid View */}
        {!isLoading && filteredExams.length > 0 && viewMode === "grid" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredExams.map((exam: any) => (
                <ExamCard
                  key={exam.id}
                  exam={exam}
                  isSelected={selectedIds.has(exam.id)}
                  onSelect={() => toggleSelection(exam.id)}
                  onViewDetails={() => router.push(`/dashboard/exams/${exam.id}`)}
                  onGrade={() => setGradeExamId(exam.id)}
                  onDelete={() =>
                    deleteMutation.mutate(exam.id, {
                      onSuccess: () => toast.success("Exam deleted"),
                      onError: () => toast.error("Failed to delete"),
                    })
                  }
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Table View */}
        {!isLoading &&
          filteredExams.length > 0 &&
          viewMode === "table" && (
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left text-sm font-medium p-3">
                      Exam
                    </th>
                    <th className="text-left text-sm font-medium p-3">
                      Subject
                    </th>
                    <th className="text-left text-sm font-medium p-3">
                      Class
                    </th>
                    <th className="text-left text-sm font-medium p-3">
                      Paper
                    </th>
                    <th className="text-left text-sm font-medium p-3">
                      Average
                    </th>
                    <th className="text-right text-sm font-medium p-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExams.map((exam: any) => (
                    <tr
                      key={exam.id}
                      className="border-b last:border-b-0 hover:bg-muted/50"
                    >
                      <td className="p-3">
                        <p className="font-medium text-sm">{exam.name}</p>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {exam.subject.name}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {exam.class.name}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">
                          {PAPER_LABELS[exam.paper]}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm font-medium">
                        {exam.stats?.averageMark
                          ? `${exam.stats.averageMark}%`
                          : "—"}
                      </td>
                      <td className="p-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="size-8 p-0"
                            >
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setGradeExamId(exam.id)}
                            >
                              <ClipboardCheck className="size-4" />
                              Enter Grades
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                deleteMutation.mutate(exam.id, {
                                  onSuccess: () =>
                                    toast.success("Exam deleted"),
                                  onError: () =>
                                    toast.error("Failed to delete"),
                                })
                              }
                              className="text-destructive"
                            >
                              <Trash2 className="size-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <BulkActions
          count={selectedIds.size}
          onDelete={handleBulkDelete}
          onExport={handleExportCSV}
          onClearSelection={() => setSelectedIds(new Set())}
        />
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
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select
                value={formData.subjectId}
                onValueChange={(v) =>
                  setFormData({ ...formData, subjectId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject..." />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Class</Label>
              <Select
                value={formData.classId}
                onValueChange={(v) =>
                  setFormData({ ...formData, classId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select class..." />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Paper</Label>
              <Select
                value={formData.paper}
                onValueChange={(v) =>
                  setFormData({ ...formData, paper: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select paper..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAPER_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Exam"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enter Grades Dialog */}
      {gradeExamId && (
        <EnterGradesDialog
          examId={gradeExamId}
          onClose={() => setGradeExamId(null)}
        />
      )}
    </div>
  );
}

// ─── Enter Grades Dialog ─────────────────────────────────────

function EnterGradesDialog({
  examId,
  onClose,
}: {
  examId: string;
  onClose: () => void;
}) {
  const { data: studentsData, isLoading } = useExamStudents(examId);
  const { data: examData } = useExamDetail(examId);
  const enterMutation = useEnterExamResults(examId);

  const students = studentsData?.students || [];
  const [marks, setMarks] = useState<Record<string, string>>({});

  // Initialize marks from existing data
  useState(() => {
    if (students.length > 0) {
      const initial: Record<string, string> = {};
      students.forEach((s: any) => {
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
        const msg =
          err instanceof ApiError ? err.message : "Failed to save results";
        toast.error(msg);
      },
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Enter Grades
            {examData?.exam ? ` — ${examData.exam.name}` : ""}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-8 animate-spin text-brand" />
          </div>
        ) : students.length === 0 ? (
          <p className="text-muted-foreground text-sm py-6 text-center">
            No students found in this class.
          </p>
        ) : (
          <div className="space-y-3">
            {students.map((student: any) => (
              <div
                key={student.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {student.firstName} {student.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {student.admissionNumber}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder={
                      student.existingMark !== null
                        ? String(student.existingMark)
                        : "—"
                    }
                    value={
                      marks[student.id] ??
                      (student.existingMark !== null
                        ? String(student.existingMark)
                        : "")
                    }
                    onChange={(e) =>
                      setMarks((prev) => ({
                        ...prev,
                        [student.id]: e.target.value,
                      }))
                    }
                    className="w-20 text-center h-9"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>
            ))}
            <div className="flex gap-3 pt-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={enterMutation.isPending}
              >
                {enterMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Grades"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
