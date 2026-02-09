"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChartHistogramIcon,
  ArrowLeft02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useParentChildrenReports } from "@/lib/hooks/use-student-reports";

import {
  StudentReportFull,
} from "../components/student-report-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function MyChildReportPage() {
  const { data, isLoading } = useParentChildrenReports();
  const [selectedChild, setSelectedChild] = useState<string | null>(null);

  const reports = data?.reports || [];
  const selectedReport = reports.find((r) => r.student.id === selectedChild);

  // If only one child, show their report directly
  if (reports.length === 1 && !selectedChild) {
    const singleReport = reports[0]!;
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            My Child&apos;s Report
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Academic performance report for {singleReport.student.name}
          </p>
        </div>
        <StudentReportFull report={singleReport} />
      </div>
    );
  }

  // Detail view for selected child
  if (selectedReport) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          className="gap-2"
          onClick={() => setSelectedChild(null)}
        >
          <HugeiconsIcon icon={ArrowLeft02Icon} size={18} />
          Back to all children
        </Button>
        <StudentReportFull report={selectedReport} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          My Children&apos;s Reports
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Academic performance reports for your children
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="size-10 rounded-full border-4 border-brand border-t-transparent animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
              <HugeiconsIcon icon={ChartHistogramIcon} size={48} className="text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold mb-1">No reports available</p>
            <p className="text-muted-foreground text-sm">
              Reports will appear here once your child&apos;s exams have been graded.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {reports.map((report, i) => (
              <motion.div
                key={report.student.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Card
                  className="cursor-pointer hover:border-brand/40 transition-colors"
                  onClick={() => setSelectedChild(report.student.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{report.student.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {report.student.admissionNumber} • {report.student.className}
                        </p>
                      </div>
                      <Badge
                        variant={report.overall.averageMark >= 50 ? "success" : "destructive"}
                      >
                        {report.overall.averageMark}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
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
                    {report.insights.weakestSubject && (
                      <p className="text-xs text-orange-600">
                        ⚠ Needs improvement: {report.insights.weakestSubject.name}
                      </p>
                    )}
                    {report.insights.strongestSubject && (
                      <p className="text-xs text-green-600">
                        ⭐ Best subject: {report.insights.strongestSubject.name}
                      </p>
                    )}
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
