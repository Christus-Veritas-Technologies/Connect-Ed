"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Search,
  ArrowRight,
  ArrowLeft,
  Send,
  Loader2,
  PlusCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  useStudentReports,
  useBulkSendReportsToParents,
} from "@/lib/hooks/use-student-reports";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import {
  Cell,
  Pie,
  PieChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

import { StudentReportFull } from "../components/student-report-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  DashboardBreadcrumbs,
  PageHeader,
  StatsCard,
  Pagination,
} from "@/components/dashboard";

const ITEMS_PER_PAGE = 10;

// ─── Main Page ───────────────────────────────────────────────

export default function StudentReportsPage() {
  const { user } = useAuth();
  const { data, isLoading } = useStudentReports();
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const reports = data?.reports || [];
  const insights = data?.schoolInsights;

  // Client-side search filter
  const filteredReports = reports.filter(
    (r) =>
      r.student.name.toLowerCase().includes(search.toLowerCase()) ||
      r.student.admissionNumber
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      r.student.className.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredReports.length / ITEMS_PER_PAGE);
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  // Chart data — pass vs fail donut
  const passFailData = useMemo(() => {
    if (!reports.length) return [];
    const totalPassed = reports.reduce(
      (sum, r) => sum + r.overall.totalPassed,
      0
    );
    const totalFailed = reports.reduce(
      (sum, r) => sum + r.overall.totalFailed,
      0
    );
    return [
      { name: "Pass", value: totalPassed, fill: "hsl(142, 76%, 36%)" },
      { name: "Fail", value: totalFailed, fill: "hsl(0, 84%, 60%)" },
    ];
  }, [reports]);

  // Chart data — average marks line
  const examAveragesData = useMemo(() => {
    if (!reports.length) return [];
    const examMap = new Map<
      string,
      { name: string; totalMark: number; count: number }
    >();
    reports.forEach((report) => {
      report.subjects.forEach((subject) => {
        subject.exams.forEach((exam) => {
          const key = `${exam.examName}-${exam.paper}`;
          if (!examMap.has(key)) {
            examMap.set(key, {
              name: `${exam.examName} ${exam.paper}`,
              totalMark: 0,
              count: 0,
            });
          }
          const entry = examMap.get(key)!;
          entry.totalMark += exam.mark;
          entry.count += 1;
        });
      });
    });
    return Array.from(examMap.values())
      .map(({ name, totalMark, count }) => ({
        exam: name,
        average: Math.round(totalMark / count),
      }))
      .slice(0, 10);
  }, [reports]);

  const selectedReport = reports.find((r) => r.student.id === selectedStudent);

  const bulkSend = useBulkSendReportsToParents();

  const isTeacher = user?.role === "TEACHER";
  const isAdmin = user?.role === "ADMIN";
  const title = isTeacher ? "My Students' Reports" : "Student Reports";
  const subtitle = isTeacher
    ? "View academic reports for students in your classes"
    : "View academic performance reports for all students";

  const handleBulkSend = () => {
    const studentIds = reports.map((r) => r.student.id);
    if (studentIds.length === 0) return;
    bulkSend.mutate(studentIds, {
      onSuccess: (data) => {
        toast.success(
          `Reports sent: ${data.sent} successful, ${data.failed} failed`
        );
      },
      onError: (err) => {
        const msg =
          err instanceof ApiError ? err.message : "Failed to send reports";
        toast.error(msg);
      },
    });
  };

  // Detail view
  if (selectedReport) {
    return (
      <div className="space-y-6">
        <DashboardBreadcrumbs
          items={[
            { label: "Student Reports", href: "/dashboard/student-reports" },
            { label: selectedReport.student.name },
          ]}
        />
        <Button
          variant="ghost"
          className="gap-2"
          onClick={() => setSelectedStudent(null)}
        >
          <ArrowLeft className="size-4" />
          Back to all reports
        </Button>
        <StudentReportFull report={selectedReport} showSendButton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <DashboardBreadcrumbs items={[{ label: "Student Reports" }]} />

      {/* Header */}
      <PageHeader
        title={title}
        subtitle={subtitle}
        search={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search by name, admission number, or class..."
        action={
          <div className="flex items-center gap-2">
            {/* Quick action for recording marks */}
            <Button
              variant="default"
              className="gap-2"
              onClick={() => window.location.href = '/dashboard/exams'}
            >
              <PlusCircle className="size-4" />
              Record Marks
            </Button>

            {/* Bulk send for admin */}
            {isAdmin && reports.length > 0 && (
              <Button
                variant="outline"
                onClick={handleBulkSend}
                disabled={bulkSend.isPending}
              >
                <Send className="size-4" />
                {bulkSend.isPending ? "Sending..." : "Send All to Parents"}
              </Button>
            )}
          </div>
        }
      />

      {/* School Insights (Admin Only) */}
      {insights && !isTeacher && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            label="Total Students"
            value={insights.totalStudents}
            icon={<BarChart3 className="size-6" />}
            color="brand"
            delay={0.1}
          />
          <StatsCard
            label="School Average"
            value={`${insights.schoolAverage}%`}
            icon={<BarChart3 className="size-6" />}
            color="blue"
            delay={0.2}
          />
          <StatsCard
            label="School Pass Rate"
            value={`${insights.schoolPassRate}%`}
            icon={<BarChart3 className="size-6" />}
            color="green"
            delay={0.3}
          />
        </div>
      )}

      {/* Teacher Insights */}
      {isTeacher && reports.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            label="My Students"
            value={reports.length}
            icon={<BarChart3 className="size-6" />}
            color="brand"
            delay={0.1}
          />
          <StatsCard
            label="Class Average"
            value={`${Math.round(
              reports.reduce((sum, r) => sum + r.overall.averageMark, 0) / reports.length
            )}%`}
            icon={<BarChart3 className="size-6" />}
            color="blue"
            delay={0.2}
          />
          <StatsCard
            label="Class Pass Rate"
            value={`${Math.round(
              reports.reduce((sum, r) => sum + r.overall.passRate, 0) / reports.length
            )}%`}
            icon={<BarChart3 className="size-6" />}
            color="green"
            delay={0.3}
          />
          <StatsCard
            label="Total Exams"
            value={reports.reduce((sum, r) => sum + r.overall.totalExams, 0)}
            icon={<BarChart3 className="size-6" />}
            color="purple"
            delay={0.4}
          />
        </div>
      )}

      {/* Charts Section */}
      {reports.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Pass vs Fail Donut */}
          <Card>
            <CardHeader>
              <CardTitle>Pass vs Fail Distribution</CardTitle>
              <CardDescription>
                Overall exam results across all students
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  pass: { label: "Pass", color: "hsl(142, 76%, 36%)" },
                  fail: { label: "Fail", color: "hsl(0, 84%, 60%)" },
                }}
                className="h-[250px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={passFailData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {passFailData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-600" />
                  <span className="text-sm">
                    Pass: {passFailData[0]?.value || 0}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-600" />
                  <span className="text-sm">
                    Fail: {passFailData[1]?.value || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Average Marks Line */}
          <Card>
            <CardHeader>
              <CardTitle>Average Marks Across Exams</CardTitle>
              <CardDescription>
                Performance trends across different examinations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  average: {
                    label: "Average Mark",
                    color: "hsl(221, 83%, 53%)",
                  },
                }}
                className="h-[250px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={examAveragesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="exam"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={10}
                    />
                    <YAxis domain={[0, 100]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="average"
                      stroke="hsl(221, 83%, 53%)"
                      strokeWidth={2}
                      dot={{ fill: "hsl(221, 83%, 53%)", r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading / Empty / Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-brand" />
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl">
          <BarChart3 className="size-12 text-muted-foreground mb-4" />
          <p className="text-lg font-semibold mb-1">No reports found</p>
          <p className="text-sm text-muted-foreground">
            {search
              ? "Try a different search term."
              : "No exam results have been recorded yet."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {paginatedReports.map((report, i) => (
                <motion.div
                  key={report.student.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card
                    hover
                    className="h-full cursor-pointer"
                    onClick={() => setSelectedStudent(report.student.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">
                            {report.student.name}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {report.student.admissionNumber} •{" "}
                            {report.student.className}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1.5 items-end">
                          <Badge
                            variant={
                              report.overall.averageMark >= 50
                                ? "success"
                                : "destructive"
                            }
                            className="text-xs"
                          >
                            {report.overall.averageMark}%
                          </Badge>
                          {report.overall.averageGrade && (
                            <div className="text-lg font-bold bg-gradient-to-r from-brand to-blue-600 bg-clip-text text-transparent">
                              {report.overall.averageGrade}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Pass Rate</span>
                          <span className="font-medium">
                            {report.overall.passRate}%
                          </span>
                        </div>
                        <Progress
                          value={report.overall.passRate}
                          className="h-2"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                          <span className="font-bold text-blue-700 dark:text-blue-400">
                            {report.overall.totalSubjects}
                          </span>
                          <p className="text-blue-600 dark:text-blue-400">
                            Subjects
                          </p>
                        </div>
                        <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                          <span className="font-bold text-purple-700 dark:text-purple-400">
                            {report.overall.totalExams}
                          </span>
                          <p className="text-purple-600 dark:text-purple-400">
                            Exams
                          </p>
                        </div>
                        <div className="p-1.5 rounded-lg bg-green-50 dark:bg-green-950/20">
                          <span className="font-bold text-green-700 dark:text-green-400">
                            {report.overall.totalPassed}
                          </span>
                          <p className="text-green-600 dark:text-green-400">
                            Passed
                          </p>
                        </div>
                      </div>

                      {report.insights.weakestSubject && (
                        <p className="text-xs text-orange-600">
                          ⚠ Weakest: {report.insights.weakestSubject.name} (
                          {report.insights.weakestSubject.averageMark}%)
                        </p>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full gap-2 text-xs"
                      >
                        View Full Report
                        <ArrowRight className="size-3.5" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Pagination */}
          {filteredReports.length > ITEMS_PER_PAGE && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredReports.length}
              pageSize={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
              noun="report"
            />
          )}
        </>
      )}
    </div>
  );
}
