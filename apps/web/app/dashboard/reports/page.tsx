"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Download,
  FileDown,
  Users,
  DollarSign,
  Calendar,
  TrendingUp,
  TrendingDown,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { fmt, type CurrencyCode } from "@/lib/currency";
import { exportDataAsCSV, exportToPDF } from "@/lib/export-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DashboardBreadcrumbs,
  PageHeader,
  StatsCard,
  FilterTabs,
} from "@/components/dashboard";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────

interface FinancialReport {
  totalFeesExpected: number;
  totalFeesCollected: number;
  totalFeesPending: number;
  totalFeesOverdue: number;
  totalExpenses: number;
  netIncome: number;
  collectionRate: number;
  studentsWhoPaid: number;
  studentsWithPending: number;
  studentsWithOverdue: number;
  totalStudents: number;
  paymentsByPeriod: Array<{
    period: string;
    amount: number;
    count: number;
    studentsCount?: number;
  }>;
  feesByStatus: Array<{
    status: string;
    count: number;
    amount: number;
    paidAmount: number;
  }>;
  topExpenseCategories: Array<{
    category: string;
    amount: number;
    count: number;
  }>;
  period: string;
  startDate: string;
  endDate: string;
}

interface ManagerialReport {
  totalTeachers: number;
  totalStudents: number;
  totalParents: number;
  activeTeachers: number;
  activeStudents: number;
  studentTeacherRatio: number;
  classDistribution: Array<{
    id: string;
    name: string;
    studentCount: number;
    level: string;
  }>;
  teacherWorkload: Array<{
    id: string;
    name: string;
    classesAssigned: number;
    studentsTotal: number;
  }>;
  studentsByGender: {
    male: number;
    female: number;
    other: number;
  };
  recentEnrollments: Array<{
    id: string;
    name: string;
    className: string;
    enrollmentDate: string;
    level: string | null;
  }>;
}

// ─── Main Page ───────────────────────────────────────────────

export default function ReportsPage() {
  const { school } = useAuth();
  const currency = (school?.currency || "USD") as CurrencyCode;
  const [activeTab, setActiveTab] = useState("financial");
  const [timePeriod, setTimePeriod] = useState("this_term");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [financialReport, setFinancialReport] =
    useState<FinancialReport | null>(null);
  const [managerialReport, setManagerialReport] =
    useState<ManagerialReport | null>(null);
  const [isLoadingFinancial, setIsLoadingFinancial] = useState(false);
  const [isLoadingManagerial, setIsLoadingManagerial] = useState(false);

  // Fetch financial report
  useEffect(() => {
    const fetchFinancialReport = async () => {
      setIsLoadingFinancial(true);
      try {
        const params = new URLSearchParams();
        params.set("period", timePeriod);
        if (timePeriod === "custom") {
          if (customDateFrom) params.set("dateFrom", customDateFrom);
          if (customDateTo) params.set("dateTo", customDateTo);
        }
        const data = await api.get(`/reports/financial?${params.toString()}`);
        setFinancialReport(data as FinancialReport);
      } catch (error) {
        console.error("Failed to fetch financial report:", error);
        toast.error("Failed to load financial report");
      } finally {
        setIsLoadingFinancial(false);
      }
    };
    fetchFinancialReport();
  }, [timePeriod, customDateFrom, customDateTo]);

  // Fetch managerial report
  useEffect(() => {
    const fetchManagerialReport = async () => {
      setIsLoadingManagerial(true);
      try {
        const params = new URLSearchParams();
        params.set("period", timePeriod);
        if (timePeriod === "custom") {
          if (customDateFrom) params.set("dateFrom", customDateFrom);
          if (customDateTo) params.set("dateTo", customDateTo);
        }
        const data = await api.get(
          `/reports/managerial?${params.toString()}`
        );
        setManagerialReport(data as ManagerialReport);
      } catch (error) {
        console.error("Failed to fetch managerial report:", error);
        toast.error("Failed to load managerial report");
      } finally {
        setIsLoadingManagerial(false);
      }
    };
    fetchManagerialReport();
  }, [timePeriod, customDateFrom, customDateTo]);

  // ── Export helpers ──

  const handleExportFinancialCSV = () => {
    if (!financialReport) return;
    const exportData = [
      {
        metric: "Total Fees Expected",
        value: fmt(financialReport.totalFeesExpected, currency),
      },
      {
        metric: "Total Fees Collected",
        value: fmt(financialReport.totalFeesCollected, currency),
      },
      {
        metric: "Total Fees Pending",
        value: fmt(financialReport.totalFeesPending, currency),
      },
      {
        metric: "Total Fees Overdue",
        value: fmt(financialReport.totalFeesOverdue, currency),
      },
      {
        metric: "Total Expenses",
        value: fmt(financialReport.totalExpenses, currency),
      },
      {
        metric: "Net Income",
        value: fmt(financialReport.netIncome, currency),
      },
      {
        metric: "Collection Rate",
        value: `${financialReport.collectionRate}%`,
      },
      { metric: "Students Who Paid", value: financialReport.studentsWhoPaid },
      {
        metric: "Students With Pending",
        value: financialReport.studentsWithPending,
      },
      {
        metric: "Students With Overdue",
        value: financialReport.studentsWithOverdue,
      },
    ];
    exportDataAsCSV(
      exportData,
      [
        { key: "metric", label: "Metric" },
        { key: "value", label: "Value" },
      ],
      `financial-report-${new Date().toISOString().split("T")[0]}`
    );
    toast.success("Financial report exported successfully");
  };

  const handleExportFinancialPDF = () => {
    if (!financialReport) return;
    const exportData = [
      {
        metric: "Total Fees Expected",
        value: fmt(financialReport.totalFeesExpected, currency),
      },
      {
        metric: "Total Fees Collected",
        value: fmt(financialReport.totalFeesCollected, currency),
      },
      {
        metric: "Total Fees Pending",
        value: fmt(financialReport.totalFeesPending, currency),
      },
      {
        metric: "Total Fees Overdue",
        value: fmt(financialReport.totalFeesOverdue, currency),
      },
      {
        metric: "Total Expenses",
        value: fmt(financialReport.totalExpenses, currency),
      },
      {
        metric: "Net Income",
        value: fmt(financialReport.netIncome, currency),
      },
      {
        metric: "Collection Rate",
        value: `${financialReport.collectionRate}%`,
      },
    ];
    exportToPDF(
      exportData,
      [
        { key: "metric", label: "Metric" },
        { key: "value", label: "Value" },
      ],
      `financial-report-${new Date().toISOString().split("T")[0]}`,
      "Financial Report"
    );
    toast.success("Financial report exported as PDF");
  };

  const handleExportManagerialCSV = () => {
    if (!managerialReport) return;
    const exportData = [
      { metric: "Total Teachers", value: managerialReport.totalTeachers },
      { metric: "Active Teachers", value: managerialReport.activeTeachers },
      { metric: "Total Students", value: managerialReport.totalStudents },
      { metric: "Active Students", value: managerialReport.activeStudents },
      { metric: "Total Parents", value: managerialReport.totalParents },
      {
        metric: "Male Students",
        value: managerialReport.studentsByGender.male,
      },
      {
        metric: "Female Students",
        value: managerialReport.studentsByGender.female,
      },
    ];
    exportDataAsCSV(
      exportData,
      [
        { key: "metric", label: "Metric" },
        { key: "value", label: "Value" },
      ],
      `managerial-report-${new Date().toISOString().split("T")[0]}`
    );
    toast.success("Managerial report exported successfully");
  };

  const handleExportManagerialPDF = () => {
    if (!managerialReport) return;
    const exportData = [
      {
        metric: "Total Teachers",
        value: managerialReport.totalTeachers.toString(),
      },
      {
        metric: "Active Teachers",
        value: managerialReport.activeTeachers.toString(),
      },
      {
        metric: "Total Students",
        value: managerialReport.totalStudents.toString(),
      },
      {
        metric: "Active Students",
        value: managerialReport.activeStudents.toString(),
      },
      {
        metric: "Total Parents",
        value: managerialReport.totalParents.toString(),
      },
    ];
    exportToPDF(
      exportData,
      [
        { key: "metric", label: "Metric" },
        { key: "value", label: "Value" },
      ],
      `managerial-report-${new Date().toISOString().split("T")[0]}`,
      "Managerial Report"
    );
    toast.success("Managerial report exported as PDF");
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <DashboardBreadcrumbs items={[{ label: "Reports" }]} />

      {/* Header */}
      <PageHeader
        title="School Reports"
        subtitle="Comprehensive analytics and insights"
        action={
          <div className="flex items-center gap-2">
            {/* Time Period Filter */}
            <Select value={timePeriod} onValueChange={setTimePeriod}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select period..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="this_term">This Term</SelectItem>
                <SelectItem value="this_year">This Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {activeTab === "financial" && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleExportFinancialCSV}
                  title="Export CSV"
                >
                  <Download className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleExportFinancialPDF}
                  title="Export PDF"
                >
                  <FileDown className="size-4" />
                </Button>
              </>
            )}

            {activeTab === "managerial" && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleExportManagerialCSV}
                  title="Export CSV"
                >
                  <Download className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleExportManagerialPDF}
                  title="Export PDF"
                >
                  <FileDown className="size-4" />
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Custom Date Range */}
      {timePeriod === "custom" && (
        <Card className="border-border/60">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">
                  From:
                </Label>
                <Input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="w-auto h-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">
                  To:
                </Label>
                <Input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="w-auto h-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <FilterTabs
          tabs={[
            { key: "financial", label: "Financial" },
            { key: "managerial", label: "Managerial" },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />

        {/* ── Financial Report Tab ── */}
        <TabsContent value="financial" className="space-y-6">
          {isLoadingFinancial ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-8 animate-spin text-brand" />
            </div>
          ) : financialReport ? (
            <>
              {/* Financial Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                  label="Fees Collected"
                  value={fmt(financialReport.totalFeesCollected, currency)}
                  icon={<TrendingUp className="size-6" />}
                  color="green"
                  meta={`${financialReport.collectionRate.toFixed(1)}% collection rate`}
                  delay={0.1}
                />
                <StatsCard
                  label="Pending Fees"
                  value={fmt(financialReport.totalFeesPending, currency)}
                  icon={<Calendar className="size-6" />}
                  color="orange"
                  meta={`${financialReport.studentsWithPending} students`}
                  delay={0.2}
                />
                <StatsCard
                  label="Overdue Fees"
                  value={fmt(financialReport.totalFeesOverdue, currency)}
                  icon={<TrendingDown className="size-6" />}
                  color="red"
                  meta={`${financialReport.studentsWithOverdue} students`}
                  delay={0.3}
                />
                <StatsCard
                  label="Net Income"
                  value={fmt(financialReport.netIncome, currency)}
                  icon={<DollarSign className="size-6" />}
                  color="purple"
                  meta={`Expenses: ${fmt(financialReport.totalExpenses, currency)}`}
                  delay={0.4}
                />
              </div>

              {/* Payment Status & Expense Categories */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-border/60">
                  <CardHeader className="space-y-1">
                    <CardTitle className="text-lg">Payment Status Distribution</CardTitle>
                    <CardDescription>
                      Breakdown of fee statuses across all students
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {financialReport.feesByStatus?.map((item) => (
                          <TableRow key={item.status}>
                            <TableCell>
                              <Badge
                                variant={
                                  item.status === "PAID"
                                    ? "success"
                                    : item.status === "OVERDUE"
                                      ? "destructive"
                                      : "warning"
                                }
                              >
                                {item.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {item.count}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              {fmt(item.amount, currency)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="border-border/60">
                  <CardHeader className="space-y-1">
                    <CardTitle className="text-lg">Top Expense Categories</CardTitle>
                    <CardDescription>
                      Highest spending categories for this period
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {financialReport.topExpenseCategories?.map((cat) => {
                        const maxAmount =
                          financialReport.topExpenseCategories[0]?.amount || 1;
                        const percentage = (cat.amount / maxAmount) * 100;
                        return (
                          <div key={cat.category}>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium">
                                {cat.category}
                              </span>
                              <span className="text-sm font-bold">
                                {fmt(cat.amount, currency)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-brand transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {cat.count} txns
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Student Payment Overview */}
              <Card className="border-border/60">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-lg">Student Payment Overview</CardTitle>
                  <CardDescription>
                    Summary of student payment statuses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-xl">
                      <p className="text-3xl font-semibold">
                        {financialReport.totalStudents}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Total Students
                      </p>
                    </div>
                    <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-xl">
                      <p className="text-3xl font-semibold text-green-600">
                        {financialReport.studentsWhoPaid}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Fully Paid
                      </p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-xl">
                      <p className="text-3xl font-semibold text-yellow-600">
                        {financialReport.studentsWithPending}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Pending
                      </p>
                    </div>
                    <div className="text-center p-4 bg-red-50 dark:bg-red-950/20 rounded-xl">
                      <p className="text-3xl font-semibold text-red-600">
                        {financialReport.studentsWithOverdue}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Overdue
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payments by Period */}
              {financialReport.paymentsByPeriod &&
                financialReport.paymentsByPeriod.length > 0 && (
                  <Card className="border-border/60">
                    <CardHeader className="space-y-1">
                      <CardTitle className="text-lg">Payments by Period</CardTitle>
                      <CardDescription>
                        Payment collections grouped by time period
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Period</TableHead>
                            <TableHead className="text-right">
                              Students Paid
                            </TableHead>
                            <TableHead className="text-right">
                              Amount Collected
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {financialReport.paymentsByPeriod.map((payment) => (
                            <TableRow key={payment.period}>
                              <TableCell className="font-medium">
                                {payment.period}
                              </TableCell>
                              <TableCell className="text-right">
                                {payment.studentsCount ?? payment.count}
                              </TableCell>
                              <TableCell className="text-right font-bold">
                                {fmt(payment.amount, currency)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl">
              <BarChart3 className="size-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-1">No data available</p>
              <p className="text-sm text-muted-foreground">
                No financial data available for the selected period
              </p>
            </div>
          )}
        </TabsContent>

        {/* ── Managerial Report Tab ── */}
        <TabsContent value="managerial" className="space-y-6">
          {isLoadingManagerial ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-8 animate-spin text-brand" />
            </div>
          ) : managerialReport ? (
            <>
              {/* Managerial Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                  label="Total Teachers"
                  value={managerialReport.totalTeachers}
                  icon={<Users className="size-6" />}
                  color="blue"
                  meta={`${managerialReport.activeTeachers} active`}
                  delay={0.1}
                />
                <StatsCard
                  label="Total Students"
                  value={managerialReport.totalStudents}
                  icon={<Users className="size-6" />}
                  color="green"
                  meta={`${managerialReport.activeStudents} active`}
                  delay={0.2}
                />
                <StatsCard
                  label="Total Parents"
                  value={managerialReport.totalParents}
                  icon={<Users className="size-6" />}
                  color="purple"
                  delay={0.3}
                />
                <StatsCard
                  label="Student : Teacher Ratio"
                  value={`${managerialReport.studentTeacherRatio}:1`}
                  icon={<BarChart3 className="size-6" />}
                  color="orange"
                  meta="Students per teacher"
                  delay={0.4}
                />
              </div>

              {/* Class Distribution & Teacher Workload */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-border/60">
                  <CardHeader className="space-y-1">
                    <CardTitle className="text-lg">Class Distribution</CardTitle>
                    <CardDescription>
                      Student enrollment across all classes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Class</TableHead>
                          <TableHead>Level</TableHead>
                          <TableHead className="text-right">
                            Students
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {managerialReport.classDistribution?.map((cls) => (
                          <TableRow key={cls.id}>
                            <TableCell className="font-medium">
                              {cls.name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {cls.level || "N/A"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              {cls.studentCount}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="border-border/60">
                  <CardHeader className="space-y-1">
                    <CardTitle className="text-lg">Teacher Workload</CardTitle>
                    <CardDescription>
                      Classes and students assigned to each teacher
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Teacher</TableHead>
                          <TableHead className="text-right">
                            Classes
                          </TableHead>
                          <TableHead className="text-right">
                            Students
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {managerialReport.teacherWorkload?.map((teacher) => (
                          <TableRow key={teacher.id}>
                            <TableCell className="font-medium">
                              {teacher.name}
                            </TableCell>
                            <TableCell className="text-right">
                              {teacher.classesAssigned}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              {teacher.studentsTotal}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              {/* Gender Distribution */}
              <Card className="border-border/60">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-lg">Students by Gender</CardTitle>
                  <CardDescription>
                    Gender distribution of enrolled students
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl">
                      <p className="text-3xl font-semibold text-blue-600">
                        {managerialReport.studentsByGender.male}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Male
                      </p>
                    </div>
                    <div className="text-center p-4 bg-pink-50 dark:bg-pink-950/20 rounded-xl">
                      <p className="text-3xl font-semibold text-pink-600">
                        {managerialReport.studentsByGender.female}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Female
                      </p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-xl">
                      <p className="text-3xl font-semibold">
                        {managerialReport.studentsByGender.other}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Other
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Enrollments */}
              {managerialReport.recentEnrollments &&
                managerialReport.recentEnrollments.length > 0 && (
                  <Card className="border-border/60">
                    <CardHeader className="space-y-1">
                      <CardTitle className="text-lg">Recent Enrollments</CardTitle>
                      <CardDescription>
                        Most recently enrolled students
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Class</TableHead>
                            <TableHead className="text-right">
                              Enrolled Date
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {managerialReport.recentEnrollments.map(
                            (enrollment) => (
                              <TableRow key={enrollment.id}>
                                <TableCell className="font-medium">
                                  {enrollment.name}
                                </TableCell>
                                <TableCell>{enrollment.className}</TableCell>
                                <TableCell className="text-right">
                                  {new Date(
                                    enrollment.enrollmentDate
                                  ).toLocaleDateString()}
                                </TableCell>
                              </TableRow>
                            )
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl">
              <BarChart3 className="size-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-1">No data available</p>
              <p className="text-sm text-muted-foreground">
                No managerial data available for the selected period
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
