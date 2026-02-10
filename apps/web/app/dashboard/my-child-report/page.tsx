"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, ArrowLeft, Loader2 } from "lucide-react";
import { useParentChildrenReports } from "@/lib/hooks/use-student-reports";

import { StudentReportFull } from "../components/student-report-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DashboardBreadcrumbs } from "@/components/dashboard";

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
        <DashboardBreadcrumbs items={[{ label: "My Child's Report" }]} />
        <div>
          <h1 className="text-3xl font-bold text-foreground">
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
        <DashboardBreadcrumbs
          items={[
            { label: "My Children's Reports", href: "/dashboard/my-child-report" },
            { label: selectedReport.student.name },
          ]}
        />
        <Button
          variant="ghost"
          className="gap-2"
          onClick={() => setSelectedChild(null)}
        >
          <ArrowLeft className="size-4" />
          Back to all children
        </Button>
        <StudentReportFull report={selectedReport} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <DashboardBreadcrumbs items={[{ label: "My Children's Reports" }]} />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          My Children&apos;s Reports
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Academic performance reports for your children
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-brand" />
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl">
          <BarChart3 className="size-12 text-muted-foreground mb-4" />
          <p className="text-lg font-semibold mb-1">No reports available</p>
          <p className="text-sm text-muted-foreground">
            Reports will appear here once your child&apos;s exams have been
            graded.
          </p>
        </div>
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
                  hover
                  className="cursor-pointer"
                  onClick={() => setSelectedChild(report.student.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">
                          {report.student.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {report.student.admissionNumber} •{" "}
                          {report.student.className}
                        </p>
                      </div>
                      <Badge
                        variant={
                          report.overall.averageMark >= 50
                            ? "success"
                            : "destructive"
                        }
                      >
                        {report.overall.averageMark}%
                      </Badge>
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
                        ⚠ Needs improvement:{" "}
                        {report.insights.weakestSubject.name}
                      </p>
                    )}
                    {report.insights.strongestSubject && (
                      <p className="text-xs text-green-600">
                        ⭐ Best subject:{" "}
                        {report.insights.strongestSubject.name}
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
