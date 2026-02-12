"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft,
    BookOpen,
    Users,
    TrendingUp,
    Award,
    Edit3,
    Save,
    X,
    Trash2,
    Download,
} from "lucide-react";
import {
    useExamDetail,
    useExamStudents,
    useEnterExamResults,
    useDeleteExam,
} from "@/lib/hooks/use-exams";
import { DashboardBreadcrumbs, StatsCard, EmptyState } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from "recharts";
import { toast } from "sonner";

const PAPER_LABELS: Record<string, string> = {
    PAPER_1: "Paper 1",
    PAPER_2: "Paper 2",
    PAPER_3: "Paper 3",
    PAPER_4: "Paper 4",
    PAPER_5: "Paper 5",
};

const GRADE_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#6b7280"];

export default function ExamDetailPage() {
    const params = useParams();
    const router = useRouter();
    const examId = params.id as string;

    const [isEnteringMarks, setIsEnteringMarks] = useState(false);
    const [marks, setMarks] = useState<Record<string, string>>({});
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const { data: examData, isLoading } = useExamDetail(examId);
    const { data: studentsData } = useExamStudents(examId);
    const enterMarksMutation = useEnterExamResults(examId);
    const deleteMutation = useDeleteExam();

    const exam = examData?.exam;
    const students = studentsData?.students || [];

    // Initialize marks from existing data
    const initializeMarks = () => {
        const initial: Record<string, string> = {};
        students.forEach((student) => {
            if (student.existingMark !== null) {
                initial[student.id] = student.existingMark.toString();
            }
        });
        setMarks(initial);
        setIsEnteringMarks(true);
    };

    const handleMarkChange = (studentId: string, value: string) => {
        // Allow empty or numeric values between 0-100
        if (value === "" || (/^\d+$/.test(value) && parseInt(value) <= 100)) {
            setMarks((prev) => ({ ...prev, [studentId]: value }));
        }
    };

    const handleSaveMarks = async () => {
        const results = Object.entries(marks)
            .filter(([_, mark]) => mark !== "")
            .map(([studentId, mark]) => ({
                studentId,
                mark: parseInt(mark),
            }));

        if (results.length === 0) {
            toast.error("Please enter at least one mark");
            return;
        }

        try {
            await enterMarksMutation.mutateAsync(results);
            toast.success(`Successfully saved ${results.length} mark(s)`);
            setIsEnteringMarks(false);
        } catch (error: any) {
            toast.error(error?.message || "Failed to save marks");
        }
    };

    const handleDelete = async () => {
        try {
            await deleteMutation.mutateAsync(examId);
            toast.success("Exam deleted successfully");
            router.push("/dashboard/exams");
        } catch (error: any) {
            toast.error(error?.message || "Failed to delete exam");
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-32" />
                    ))}
                </div>
                <Skeleton className="h-96" />
            </div>
        );
    }

    if (!exam) {
        return (
            <EmptyState
                icon={<BookOpen className="size-12" />}
                title="Exam Not Found"
                description="The exam you're looking for doesn't exist or has been deleted."
                action={
                    <Button onClick={() => router.push("/dashboard/exams")}>
                        <ArrowLeft className="size-4" />
                        Back to Exams
                    </Button>
                }
            />
        );
    }

    const hasResults = exam.stats.totalResults > 0;

    // Grade distribution for pie chart
    const gradeDistribution = exam.grades.map((grade, index) => ({
        name: grade.name,
        value: exam.results.filter((r) => r.gradeName === grade.name).length,
        color: GRADE_COLORS[index % GRADE_COLORS.length],
    })).filter((g) => g.value > 0);

    // Mark distribution for bar chart
    const markRanges = [
        { range: "0-20", min: 0, max: 20 },
        { range: "21-40", min: 21, max: 40 },
        { range: "41-60", min: 41, max: 60 },
        { range: "61-80", min: 61, max: 80 },
        { range: "81-100", min: 81, max: 100 },
    ];
    const markDistribution = markRanges.map((r) => ({
        range: r.range,
        students: exam.results.filter((res) => res.mark >= r.min && res.mark <= r.max).length,
    }));

    return (
        <div className="space-y-6">
            {/* Breadcrumbs */}
            <DashboardBreadcrumbs
                items={[
                    { label: "Exams", href: "/dashboard/exams" },
                    { label: exam.name },
                ]}
            />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.push("/dashboard/exams")}
                    >
                        <ArrowLeft className="size-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">{exam.name}</h1>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                                {exam.subject.name} {exam.subject.code && `(${exam.subject.code})`}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                                {exam.class.name}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                                {PAPER_LABELS[exam.paper]}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                                by {exam.teacher.name}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!isEnteringMarks ? (
                        <>
                            <Button variant="outline" onClick={initializeMarks}>
                                <Edit3 className="size-4" />
                                Enter Marks
                            </Button>
                            <Button
                                variant="outline"
                                className="text-destructive"
                                onClick={() => setShowDeleteDialog(true)}
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => setIsEnteringMarks(false)}>
                                <X className="size-4" />
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSaveMarks}
                                disabled={enterMarksMutation.isPending}
                            >
                                <Save className="size-4" />
                                Save Marks
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    label="Total Students"
                    value={exam.stats.totalResults}
                    icon={<Users className="size-5" />}
                    color="brand"
                />
                <StatsCard
                    label="Average Mark"
                    value={`${exam.stats.averageMark}%`}
                    icon={<TrendingUp className="size-5" />}
                    color="blue"
                    delay={0.05}
                />
                <StatsCard
                    label="Pass Rate"
                    value={`${exam.stats.passRate}%`}
                    icon={<Award className="size-5" />}
                    color="green"
                    delay={0.1}
                />
                <StatsCard
                    label="Passed / Failed"
                    value={`${exam.stats.passedCount} / ${exam.stats.failedCount}`}
                    icon={<BookOpen className="size-5" />}
                    color="purple"
                    delay={0.15}
                />
            </div>

            {/* Charts Row */}
            {hasResults && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Grade Distribution */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Grade Distribution</CardTitle>
                            <CardDescription>Breakdown of student grades</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {gradeDistribution.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={gradeDistribution}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={(entry) => `${entry.name}: ${entry.value}`}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {gradeDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-center text-muted-foreground py-12">No results yet</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Mark Distribution */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Mark Distribution</CardTitle>
                            <CardDescription>Number of students per mark range</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={markDistribution}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="range" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="students" fill="hsl(var(--brand))" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Student Results Table / Entry Form */}
            <Card>
                <CardHeader>
                    <CardTitle>Student Results</CardTitle>
                    <CardDescription>
                        {isEnteringMarks
                            ? "Enter marks for each student (0-100). Leave blank to skip."
                            : hasResults
                                ? "View and manage student exam results"
                                : "No results entered yet. Click 'Enter Marks' to add results."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {students.length === 0 ? (
                        <EmptyState
                            icon={<Users className="size-12" />}
                            title="No Students Found"
                            description="No students are enrolled in this class."
                        />
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-16">#</TableHead>
                                        <TableHead>Admission No.</TableHead>
                                        <TableHead>Student Name</TableHead>
                                        {!isEnteringMarks && hasResults && (
                                            <>
                                                <TableHead className="text-center">Mark</TableHead>
                                                <TableHead className="text-center">Grade</TableHead>
                                                <TableHead className="text-center">Status</TableHead>
                                            </>
                                        )}
                                        {isEnteringMarks && (
                                            <TableHead className="text-center">Mark (0-100)</TableHead>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <AnimatePresence mode="popLayout">
                                        {students.map((student, index) => {
                                            const result = exam.results.find((r) => r.student.id === student.id);
                                            return (
                                                <motion.tr
                                                    key={student.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    transition={{ delay: index * 0.02 }}
                                                    className="border-b"
                                                >
                                                    <TableCell className="font-medium">{index + 1}</TableCell>
                                                    <TableCell className="font-mono text-xs">
                                                        {student.admissionNumber}
                                                    </TableCell>
                                                    <TableCell>
                                                        {student.firstName} {student.lastName}
                                                    </TableCell>
                                                    {!isEnteringMarks && result && (
                                                        <>
                                                            <TableCell className="text-center font-semibold">
                                                                {result.mark}%
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <Badge variant="outline">{result.gradeName}</Badge>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <Badge
                                                                    variant={result.isPass ? "success" : "destructive"}
                                                                    className="text-xs"
                                                                >
                                                                    {result.isPass ? "Pass" : "Fail"}
                                                                </Badge>
                                                            </TableCell>
                                                        </>
                                                    )}
                                                    {!isEnteringMarks && !result && (
                                                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                                                            No result
                                                        </TableCell>
                                                    )}
                                                    {isEnteringMarks && (
                                                        <TableCell>
                                                            <Input
                                                                type="text"
                                                                inputMode="numeric"
                                                                value={marks[student.id] || ""}
                                                                onChange={(e) => handleMarkChange(student.id, e.target.value)}
                                                                placeholder="Enter mark"
                                                                className="w-32 mx-auto text-center"
                                                            />
                                                        </TableCell>
                                                    )}
                                                </motion.tr>
                                            );
                                        })}
                                    </AnimatePresence>
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Exam?</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to delete this exam? This action cannot be undone and all
                        student results will be permanently deleted.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? "Deleting..." : "Delete Exam"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
