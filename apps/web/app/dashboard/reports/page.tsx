"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Download,
  Users,
  DollarSign,
  Calendar,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { api } from "@/lib/api";
import { exportDataAsCSV, exportToPDF } from "@/lib/export-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { toast } from "sonner";

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

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("financial");
  const [timePeriod, setTimePeriod] = useState("this_term");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [financialReport, setFinancialReport] = useState<FinancialReport | null>(null);
  const [managerialReport, setManagerialReport] = useState<ManagerialReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch reports based on active tab
  useEffect(() => {
    const fetchReports = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("period", timePeriod);
        if (timePeriod === "custom") {
          if (customDateFrom) params.set("dateFrom", customDateFrom);
          if (customDateTo) params.set("dateTo", customDateTo);
        }

        if (activeTab === "financial") {
          const data = await api.get(`/reports/financial?${params.toString()}`);
          setFinancialReport(data);
        } else {
          const data = await api.get(`/reports/managerial?${params.toString()}`);
          setManagerialReport(data);
        }
      } catch (error) {
        console.error(`Failed to fetch ${activeTab} report:`, error);
        toast.error(`Failed to load ${activeTab} report`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, [activeTab, timePeriod, customDateFrom, customDateTo]);

  // Export Financial Report as CSV
  const handleExportFinancialCSV = () => {
    if (!financialReport) return;

    const exportData = [
      { metric: "Total Fees Expected", value: `$${financialReport.totalFeesExpected.toLocaleString()}` },
      { metric: "Total Fees Collected", value: `$${financialReport.totalFeesCollected.toLocaleString()}` },
      { metric: "Total Fees Pending", value: `$${financialReport.totalFeesPending.toLocaleString()}` },
      { metric: "Total Fees Overdue", value: `$${financialReport.totalFeesOverdue.toLocaleString()}` },
      { metric: "Total Expenses", value: `$${financialReport.totalExpenses.toLocaleString()}` },
      { metric: "Net Income", value: `$${financialReport.netIncome.toLocaleString()}` },
      { metric: "Collection Rate", value: `${financialReport.collectionRate}%` },
      { metric: "Students Who Paid", value: financialReport.studentsWhoPaid },
      { metric: "Students With Pending", value: financialReport.studentsWithPending },
      { metric: "Students With Overdue", value: financialReport.studentsWithOverdue },
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

  // Export Financial Report as PDF
  const handleExportFinancialPDF = () => {
    if (!financialReport) return;

    const exportData = [
      { metric: "Total Fees Expected", value: `$${financialReport.totalFeesExpected.toLocaleString()}` },
      { metric: "Total Fees Collected", value: `$${financialReport.totalFeesCollected.toLocaleString()}` },
      { metric: "Total Fees Pending", value: `$${financialReport.totalFeesPending.toLocaleString()}` },
      { metric: "Total Fees Overdue", value: `$${financialReport.totalFeesOverdue.toLocaleString()}` },
      { metric: "Total Expenses", value: `$${financialReport.totalExpenses.toLocaleString()}` },
      { metric: "Net Income", value: `$${financialReport.netIncome.toLocaleString()}` },
      { metric: "Collection Rate", value: `${financialReport.collectionRate}%` },
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

  // Export Managerial Report as CSV
  const handleExportManagerialCSV = () => {
    if (!managerialReport) return;

    const exportData = [
      { metric: "Total Teachers", value: managerialReport.totalTeachers },
      { metric: "Active Teachers", value: managerialReport.activeTeachers },
      { metric: "Total Students", value: managerialReport.totalStudents },
      { metric: "Active Students", value: managerialReport.activeStudents },
      { metric: "Total Parents", value: managerialReport.totalParents },
      { metric: "Male Students", value: managerialReport.studentsByGender.male },
      { metric: "Female Students", value: managerialReport.studentsByGender.female },
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

  // Export Managerial Report as PDF
  const handleExportManagerialPDF = () => {
    if (!managerialReport) return;

    const exportData = [
      { metric: "Total Teachers", value: managerialReport.totalTeachers.toString() },
      { metric: "Active Teachers", value: managerialReport.activeTeachers.toString() },
      { metric: "Total Students", value: managerialReport.totalStudents.toString() },
      { metric: "Active Students", value: managerialReport.activeStudents.toString() },
      { metric: "Total Parents", value: managerialReport.totalParents.toString() },
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="size-12 rounded-full border-4 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <BarChart3 size={28} className="text-brand" />
            School Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive analytics and insights
          </p>
        </div>

        {/* Time Period Filter */}
        <div className="flex items-center gap-2">
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
              <Button variant="outline" size="sm" onClick={handleExportFinancialCSV}>
                <Download size={16} />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportFinancialPDF}>
                <Download size={16} />
                PDF
              </Button>
            </>
          )}

          {activeTab === "managerial" && (
            <>
              <Button variant="outline" size="sm" onClick={handleExportManagerialCSV}>
                <Download size={16} />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportManagerialPDF}>
                <Download size={16} />
                PDF
              </Button>
            </>
          )}
        </div>
      </motion.div>

      {/* Custom Date Range */}
      {timePeriod === "custom" && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">From Date</label>
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">To Date</label>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="financial">
            Financial
          </TabsTrigger>
          <TabsTrigger value="managerial">
            Managerial
          </TabsTrigger>
        </TabsList>
        {/* Financial Report Tab */}
        <TabsContent value="financial" className="space-y-6">
          {financialReport ? (
            <>
              {/* Financial Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <Card className="border-l-4 border-l-green-500">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Fees Collected</p>
                          <p className="text-2xl font-bold text-green-600 mt-1">
                            ${financialReport.totalFeesCollected.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {financialReport.collectionRate.toFixed(1)}% collection rate
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-green-100">
                          <TrendingUp size={24} className="text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <Card className="border-l-4 border-l-yellow-500">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Pending Fees</p>
                          <p className="text-2xl font-bold text-yellow-600 mt-1">
                            ${financialReport.totalFeesPending.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {financialReport.studentsWithPending} students
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-yellow-100">
                          <Calendar size={24} className="text-yellow-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <Card className="border-l-4 border-l-red-500">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Overdue Fees</p>
                          <p className="text-2xl font-bold text-red-600 mt-1">
                            ${financialReport.totalFeesOverdue.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {financialReport.studentsWithOverdue} students
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-red-100">
                          <TrendingDown size={24} className="text-red-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                  <Card className="border-l-4 border-l-purple-500">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Net Income</p>
                          <p className={`text-2xl font-bold mt-1 ${financialReport.netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
                            ${financialReport.netIncome.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Expenses: ${financialReport.totalExpenses.toLocaleString()}
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-purple-100">
                          <DollarSign size={24} className="text-purple-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Payment Status Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Status Distribution</CardTitle>
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
                            <TableCell className="text-right font-medium">{item.count}</TableCell>
                            <TableCell className="text-right font-bold">
                              ${item.amount.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Expense Categories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {financialReport.topExpenseCategories?.map((cat) => {
                        const maxAmount = financialReport.topExpenseCategories[0]?.amount || 1;
                        const percentage = (cat.amount / maxAmount) * 100;

                        return (
                          <div key={cat.category}>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium">{cat.category}</span>
                              <span className="text-sm font-bold">${cat.amount.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-brand transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">{cat.count} txns</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Students Payment Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Student Payment Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-3xl font-bold text-gray-900">{financialReport.totalStudents}</p>
                      <p className="text-sm text-muted-foreground mt-1">Total Students</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-3xl font-bold text-green-600">{financialReport.studentsWhoPaid}</p>
                      <p className="text-sm text-muted-foreground mt-1">Fully Paid</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <p className="text-3xl font-bold text-yellow-600">{financialReport.studentsWithPending}</p>
                      <p className="text-sm text-muted-foreground mt-1">Pending</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <p className="text-3xl font-bold text-red-600">{financialReport.studentsWithOverdue}</p>
                      <p className="text-sm text-muted-foreground mt-1">Overdue</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payments by Period */}
              {financialReport.paymentsByPeriod && financialReport.paymentsByPeriod.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Payments by Period</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Period</TableHead>
                          <TableHead className="text-right">Students Paid</TableHead>
                          <TableHead className="text-right">Amount Collected</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {financialReport.paymentsByPeriod.map((payment) => (
                          <TableRow key={payment.period}>
                            <TableCell className="font-medium">{payment.period}</TableCell>
                            <TableCell className="text-right">{payment.studentsCount}</TableCell>
                            <TableCell className="text-right font-bold">
                              ${payment.amount.toLocaleString()}
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
            <div className="text-center py-12">
              <p className="text-muted-foreground">No financial data available for the selected period</p>
            </div>
          )}
        </TabsContent>

        {/* Managerial Report Tab */}
        <TabsContent value="managerial" className="space-y-6">
          {managerialReport ? (
            <>
              {/* Managerial Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Teachers</p>
                          <p className="text-2xl font-bold text-blue-600 mt-1">
                            {managerialReport.totalTeachers}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {managerialReport.activeTeachers} active
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-blue-100">
                          <Users size={24} className="text-blue-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <Card className="border-l-4 border-l-green-500">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Students</p>
                          <p className="text-2xl font-bold text-green-600 mt-1">
                            {managerialReport.totalStudents}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {managerialReport.activeStudents} active
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-green-100">
                          <Users size={24} className="text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <Card className="border-l-4 border-l-purple-500">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Parents</p>
                          <p className="text-2xl font-bold text-purple-600 mt-1">
                            {managerialReport.totalParents}
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-purple-100">
                          <Users size={24} className="text-purple-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                  <Card className="border-l-4 border-l-orange-500">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Student Ratio</p>
                          <p className="text-2xl font-bold text-orange-600 mt-1">
                            {managerialReport.studentTeacherRatio}:1
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Students per teacher</p>
                        </div>
                        <div className="p-3 rounded-xl bg-orange-100">
                          <BarChart3 size={24} className="text-orange-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Class Distribution and Teacher Workload */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Class Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Class</TableHead>
                          <TableHead>Level</TableHead>
                          <TableHead className="text-right">Students</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {managerialReport.classDistribution?.map((cls) => (
                          <TableRow key={cls.id}>
                            <TableCell className="font-medium">{cls.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{cls.level || "N/A"}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-bold">{cls.studentCount}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Teacher Workload</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Teacher</TableHead>
                          <TableHead className="text-right">Classes</TableHead>
                          <TableHead className="text-right">Students</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {managerialReport.teacherWorkload?.map((teacher) => (
                          <TableRow key={teacher.id}>
                            <TableCell className="font-medium">{teacher.name}</TableCell>
                            <TableCell className="text-right">{teacher.classesAssigned}</TableCell>
                            <TableCell className="text-right font-bold">{teacher.studentsTotal}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              {/* Gender Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Students by Gender</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-3xl font-bold text-blue-600">{managerialReport.studentsByGender.male}</p>
                      <p className="text-sm text-muted-foreground mt-1">Male</p>
                    </div>
                    <div className="text-center p-4 bg-pink-50 rounded-lg">
                      <p className="text-3xl font-bold text-pink-600">{managerialReport.studentsByGender.female}</p>
                      <p className="text-sm text-muted-foreground mt-1">Female</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-3xl font-bold text-gray-600">{managerialReport.studentsByGender.other}</p>
                      <p className="text-sm text-muted-foreground mt-1">Other</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Enrollments */}
              {managerialReport.recentEnrollments && managerialReport.recentEnrollments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Enrollments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead className="text-right">Enrolled Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {managerialReport.recentEnrollments.map((enrollment) => (
                          <TableRow key={enrollment.id}>
                            <TableCell className="font-medium">{enrollment.name}</TableCell>
                            <TableCell>{enrollment.className}</TableCell>
                            <TableCell className="text-right">
                              {new Date(enrollment.enrollmentDate).toLocaleDateString()}
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
            <div className="text-center py-12">
              <p className="text-muted-foreground">No managerial data available for the selected period</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
