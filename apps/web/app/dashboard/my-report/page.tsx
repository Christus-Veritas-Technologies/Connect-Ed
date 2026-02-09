"use client";

import {
  ChartHistogramIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMyReport } from "@/lib/hooks/use-student-reports";
import {
  StudentReportFull,
  ExportReportButton,
} from "../components/student-report-card";
import { Card, CardContent } from "@/components/ui/card";

export default function MyReportPage() {
  const { data, isLoading } = useMyReport();
  const report = data?.report;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            My Academic Report
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your performance across all subjects
          </p>
        </div>
        {report && <ExportReportButton report={report} />}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="size-10 rounded-full border-4 border-brand border-t-transparent animate-spin" />
        </div>
      ) : !report ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
              <HugeiconsIcon icon={ChartHistogramIcon} size={48} className="text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold mb-1">No report available</p>
            <p className="text-muted-foreground text-sm">
              Your academic report will appear here once exams have been graded.
            </p>
          </CardContent>
        </Card>
      ) : (
        <StudentReportFull report={report} showStudentHeader={false} />
      )}
    </div>
  );
}
