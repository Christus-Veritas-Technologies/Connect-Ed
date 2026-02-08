"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChartHistogramIcon,
  Search01Icon,
  ArrowRight01Icon,
  ArrowLeft02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useAuth } from "@/lib/auth-context";
import { useStudentReports } from "@/lib/hooks/use-student-reports";

import {
  StudentReportFull,
} from "../components/student-report-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

export default function StudentReportsPage() {
  const { user } = useAuth();
  const { data, isLoading } = useStudentReports();
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const reports = data?.reports || [];
  const insights = data?.schoolInsights;

  const filteredReports = reports.filter((r) =>
    r.student.name.toLowerCase().includes(search.toLowerCase()) ||
    r.student.admissionNumber.toLowerCase().includes(search.toLowerCase()) ||
    r.student.className.toLowerCase().includes(search.toLowerCase())
  );

  const selectedReport = reports.find((r) => r.student.id === selectedStudent);

  const isTeacher = user?.role === "TEACHER";
  const title = isTeacher ? "My Students' Reports" : "Student Reports";
  const subtitle = isTeacher
    ? "View academic reports for students in your classes"
    : "View academic performance reports for all students";

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
        <StudentReportFull report={selectedReport} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <HugeiconsIcon icon={ChartHistogramIcon} size={28} className="text-brand" />
          {title}
        </h1>
        <p className="text-muted-foreground">{subtitle}</p>
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

      {/* Search */}
      <div className="relative max-w-md">
        <HugeiconsIcon
          icon={Search01Icon}
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="Search by name, admission number, or class..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredReports.map((report, i) => (
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
      )}
    </div>
  );
}
