"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChartHistogramIcon,
  Search01Icon,
  ArrowRight01Icon,
  ArrowLeft02Icon,
  SentIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useAuth } from "@/lib/auth-context";
import { useStudentReports, useBulkSendReportsToParents } from "@/lib/hooks/use-student-reports";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { Cell, Pie, PieChart, Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import {
  StudentReportFull,
} from "../components/student-report-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const ITEMS_PER_PAGE = 10;

export default function StudentReportsPage() {
  const { user } = useAuth();
  const { data, isLoading } = useStudentReports();
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const reports = data?.reports || [];
  const insights = data?.schoolInsights;

  const filteredReports = reports.filter((r) =>
    r.student.name.toLowerCase().includes(search.toLowerCase()) ||
    r.student.admissionNumber.toLowerCase().includes(search.toLowerCase()) ||
    r.student.className.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredReports.length / ITEMS_PER_PAGE);
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  // Chart data calculations
  const passFailData = useMemo(() => {
    if (!reports.length) return [];

    const totalPassed = reports.reduce((sum, r) => sum + r.overall.totalPassed, 0);
    const totalFailed = reports.reduce((sum, r) => sum + r.overall.totalFailed, 0);

    return [
      { name: "Pass", value: totalPassed, fill: "hsl(142, 76%, 36%)" },
      { name: "Fail", value: totalFailed, fill: "hsl(0, 84%, 60%)" },
    ];
  }, [reports]);

  // Average marks across all exams for line chart
  const examAveragesData = useMemo(() => {
    if (!reports.length) return [];

    // Collect all unique exams across all students
    const examMap = new Map<string, { name: string; totalMark: number; count: number }>();

    reports.forEach(report => {
      report.subjects.forEach(subject => {
        subject.exams.forEach(exam => {
          const key = `${exam.examName}-${exam.paper}`;
          if (!examMap.has(key)) {
            examMap.set(key, { name: `${exam.examName} ${exam.paper}`, totalMark: 0, count: 0 });
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
      .slice(0, 10); // Show last 10 exams
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
        toast.success(`Reports sent: ${data.sent} successful, ${data.failed} failed`);
      },
      onError: (err) => {
        const msg = err instanceof ApiError ? err.message : "Failed to send reports";
        toast.error(msg);
      },
    });
  };

  // Detail view
  if (selectedReport) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          className="gap-2"
          onClick={() => setSelectedStudent(null)}
        >
          <HugeiconsIcon icon={ArrowLeft02Icon} size={18} />
          Back to all reports
        </Button>
        <StudentReportFull report={selectedReport} showSendButton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <HugeiconsIcon icon={ChartHistogramIcon} size={28} className="text-brand" />
            {title}
          </h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
        {isAdmin && reports.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleBulkSend}
            disabled={bulkSend.isPending}
          >
            <HugeiconsIcon icon={SentIcon} size={16} />
            {bulkSend.isPending ? "Sending..." : "Send All to Parents"}
          </Button>
        )}
      </div>

      {/* School Insights (Admin Only) */}
      {insights && !isTeacher && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-brand/20">
            <CardContent className="pt-5 pb-4 space-y-1">
              <p className="text-xs text-muted-foreground">Total Students</p>
              <p className="text-2xl font-bold">{insights.totalStudents}</p>
            </CardContent>
          </Card>
          <Card className="border-blue-200">
            <CardContent className="pt-5 pb-4 space-y-2">
              <p className="text-xs text-muted-foreground">School Average</p>
              <p className="text-2xl font-bold text-blue-600">{insights.schoolAverage}%</p>
              <Progress value={insights.schoolAverage} className="h-1.5" />
            </CardContent>
          </Card>
          <Card className="border-green-200">
            <CardContent className="pt-5 pb-4 space-y-2">
              <p className="text-xs text-muted-foreground">School Pass Rate</p>
              <p className="text-2xl font-bold text-green-600">{insights.schoolPassRate}%</p>
              <Progress value={insights.schoolPassRate} className="h-1.5" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      {reports.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Pass vs Fail Donut Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Pass vs Fail Distribution</CardTitle>
              <CardDescription>Overall exam results across all students</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  pass: {
                    label: "Pass",
                    color: "hsl(142, 76%, 36%)",
                  },
                  fail: {
                    label: "Fail",
                    color: "hsl(0, 84%, 60%)",
                  },
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
                  <span className="text-sm">Pass: {passFailData[0]?.value || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-600" />
                  <span className="text-sm">Fail: {passFailData[1]?.value || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Average Marks Line Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Average Marks Across Exams</CardTitle>
              <CardDescription>Performance trends across different examinations</CardDescription>
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

      {/* Search */}
      <div className="relative w-full">
        <HugeiconsIcon
          icon={Search01Icon}
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="Search by name, admission number, or class..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="size-10 rounded-full border-4 border-brand border-t-transparent animate-spin" />
        </div>
      ) : filteredReports.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
              <HugeiconsIcon icon={ChartHistogramIcon} size={48} className="text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold mb-1">No reports found</p>
            <p className="text-muted-foreground text-sm">
              {search ? "Try a different search term." : "No exam results have been recorded yet."}
            </p>
          </CardContent>
        </Card>
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
                    className="h-full cursor-pointer hover:border-brand/40 transition-colors"
                    onClick={() => setSelectedStudent(report.student.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{report.student.name}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {report.student.admissionNumber} • {report.student.className}
                          </p>
                        </div>
                        <Badge
                          variant={report.overall.averageMark >= 50 ? "success" : "destructive"}
                          className="text-xs"
                        >
                          {report.overall.averageMark}%
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Progress ring */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Pass Rate</span>
                          <span className="font-medium">{report.overall.passRate}%</span>
                        </div>
                        <Progress value={report.overall.passRate} className="h-2" />
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-1.5 rounded-lg bg-blue-50">
                          <span className="font-bold text-blue-700">{report.overall.totalSubjects}</span>
                          <p className="text-blue-600">Subjects</p>
                        </div>
                        <div className="p-1.5 rounded-lg bg-purple-50">
                          <span className="font-bold text-purple-700">{report.overall.totalExams}</span>
                          <p className="text-purple-600">Exams</p>
                        </div>
                        <div className="p-1.5 rounded-lg bg-green-50">
                          <span className="font-bold text-green-700">{report.overall.totalPassed}</span>
                          <p className="text-green-600">Passed</p>
                        </div>
                      </div>

                      {/* Insights */}
                      {report.insights.weakestSubject && (
                        <p className="text-xs text-orange-600">
                          ⚠ Weakest: {report.insights.weakestSubject.name} ({report.insights.weakestSubject.averageMark}%)
                        </p>
                      )}

                      <Button variant="ghost" size="sm" className="w-full gap-2 text-xs">
                        View Full Report
                        <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <HugeiconsIcon icon={ArrowLeft02Icon} size={16} />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="min-w-[40px]"
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
