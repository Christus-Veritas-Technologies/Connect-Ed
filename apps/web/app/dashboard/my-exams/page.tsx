"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  TrendingUp,
  TrendingDown,
  Award,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DashboardBreadcrumbs,
  StatsCard,
  EmptyState,
} from "@/components/dashboard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ExamResult {
  id: string;
  mark: number;
  grade: string;
  isPass: boolean;
  createdAt: string;
  exam: {
    id: string;
    name: string;
    paper: string;
    totalMarks: number;
    subject: {
      id: string;
      name: string;
      code: string;
    };
  };
}

interface MyExamsData {
  examResults: ExamResult[];
  stats: {
    totalExams: number;
    averageMark: number;
    passCount: number;
    failCount: number;
    bestSubject: {
      name: string;
      average: number;
    } | null;
    weakestSubject: {
      name: string;
      average: number;
    } | null;
  };
}

const PAPER_LABELS: Record<string, string> = {
  PAPER_1: "Paper 1",
  PAPER_2: "Paper 2",
  PAPER_3: "Paper 3",
  PAPER_4: "Paper 4",
  PAPER_5: "Paper 5",
};

export default function MyExamsPage() {
  const { user } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState<string>("all");

  const { data, isLoading } = useQuery<MyExamsData>({
    queryKey: ["my-exams", selectedSubject],
    queryFn: async () => {
      const params = selectedSubject !== "all" ? `?subjectId=${selectedSubject}` : "";
      return api.get(`/dashboard/student/exams${params}`);
    },
  });

  const examResults = data?.examResults || [];
  const stats = data?.stats;

  // Get unique subjects for filter
  const subjects = Array.from(
    new Set(examResults.map((r) => JSON.stringify({ id: r.exam.subject.id, name: r.exam.subject.name })))
  ).map((s) => JSON.parse(s));

  // Group exams by subject
  const examsBySubject = examResults.reduce((acc, result) => {
    const subjectName = result.exam.subject.name;
    if (!acc[subjectName]) {
      acc[subjectName] = [];
    }
    acc[subjectName].push(result);
    return acc;
  }, {} as Record<string, ExamResult[]>);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <DashboardBreadcrumbs items={[{ label: "My Exams" }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Exams</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View your exam results and track your performance
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-brand" />
        </div>
      ) : examResults.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="size-12" />}
          title="No Exam Results Yet"
          description="Your exam results will appear here once your teachers have graded them."
        />
      ) : (
        <>
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="Total Exams"
                value={stats.totalExams.toString()}
                icon={<FileText className="size-5" />}
                trend={undefined}
              />
              <StatsCard
                title="Average Mark"
                value={`${stats.averageMark.toFixed(1)}%`}
                icon={<Award className="size-5" />}
                trend={undefined}
                className={
                  stats.averageMark >= 75
                    ? "border-green-200 bg-green-50"
                    : stats.averageMark >= 50
                    ? "border-blue-200 bg-blue-50"
                    : "border-red-200 bg-red-50"
                }
              />
              <StatsCard
                title="Passed"
                value={stats.passCount.toString()}
                icon={<CheckCircle2 className="size-5 text-green-600" />}
                trend={undefined}
                className="border-green-200 bg-green-50"
              />
              <StatsCard
                title="Failed"
                value={stats.failCount.toString()}
                icon={<XCircle className="size-5 text-red-600" />}
                trend={undefined}
                className="border-red-200 bg-red-50"
              />
            </div>
          )}

          {/* Best & Weakest Subject */}
          {stats && (stats.bestSubject || stats.weakestSubject) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {stats.bestSubject && (
                <Card className="border-green-200 bg-green-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-green-900 flex items-center gap-2">
                      <TrendingUp className="size-4" />
                      Best Subject
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-900">
                      {stats.bestSubject.name}
                    </p>
                    <p className="text-sm text-green-700">
                      Average: {stats.bestSubject.average.toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>
              )}
              {stats.weakestSubject && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-amber-900 flex items-center gap-2">
                      <TrendingDown className="size-4" />
                      Needs Improvement
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-amber-900">
                      {stats.weakestSubject.name}
                    </p>
                    <p className="text-sm text-amber-700">
                      Average: {stats.weakestSubject.average.toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Filter */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Filter by Subject:</label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Exam Results by Subject */}
          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {Object.entries(examsBySubject).map(([subjectName, results]) => (
                <motion.div
                  key={subjectName}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-bold">
                          {subjectName}
                        </CardTitle>
                        <Badge variant="secondary">
                          {results.length} exam{results.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {results.map((result) => (
                          <motion.div
                            key={result.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold">{result.exam.name}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {PAPER_LABELS[result.exam.paper] || result.exam.paper}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>
                                  {result.mark}/{result.exam.totalMarks} marks
                                </span>
                                <span>•</span>
                                <span>
                                  {new Date(result.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              {/* Progress Bar */}
                              <div className="w-24">
                                <Progress
                                  value={(result.mark / result.exam.totalMarks) * 100}
                                  className="h-2"
                                />
                              </div>

                              {/* Grade Badge */}
                              <Badge
                                className={
                                  result.isPass
                                    ? "bg-green-100 text-green-800 hover:bg-green-100"
                                    : "bg-red-100 text-red-800 hover:bg-red-100"
                                }
                              >
                                {result.grade}
                              </Badge>

                              {/* Pass/Fail Icon */}
                              {result.isPass ? (
                                <CheckCircle2 className="size-5 text-green-600" />
                              ) : (
                                <XCircle className="size-5 text-red-600" />
                              )}

                              {/* Percentage */}
                              <div className="w-16 text-right">
                                <span
                                  className={`text-lg font-bold ${
                                    result.isPass ? "text-green-600" : "text-red-600"
                                  }`}
                                >
                                  {((result.mark / result.exam.totalMarks) * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}
