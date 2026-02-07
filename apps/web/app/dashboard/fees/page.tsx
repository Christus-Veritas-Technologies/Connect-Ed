"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Money01Icon,
  Add01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  TimeQuarterIcon,
  Calendar01Icon,
  AlertCircleIcon,
  FileDownloadIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useFees, useFeeStats, useRecordPayment } from "@/lib/hooks";
import { ApiError } from "@/lib/api";
import { exportToCSV, exportToPDF } from "@/lib/export-utils";
import { AddFeeDialog } from "@/components/dialogs/add-fee-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface Fee {
  id: string;
  amount: number;
  paidAmount: number;
  description: string;
  dueDate: string;
  status: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE";
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
  };
}

export default function FeesPage() {
  const searchParams = useSearchParams();

  const [filter, setFilter] = useState(searchParams.get("filter") || "all");
  const [termFilter, setTermFilter] = useState<string>("");
  const [yearFilter, setYearFilter] = useState<string>("");
  const [timePeriod, setTimePeriod] = useState<string>("all");
  const [customDateFrom, setCustomDateFrom] = useState<string>("");
  const [customDateTo, setCustomDateTo] = useState<string>("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<Fee | null>(null);

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "CASH" as "CASH" | "BANK_TRANSFER" | "ONLINE",
    reference: "",
    notes: "",
  });

  // Compute date filters from time period
  const getDateFilters = () => {
    const now = new Date();
    switch (timePeriod) {
      case "this_week": {
        const dayOfWeek = now.getDay();
        const start = new Date(now);
        start.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        return { dateFrom: start.toISOString().split("T")[0], dateTo: now.toISOString().split("T")[0] };
      }
      case "this_month": {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return { dateFrom: start.toISOString().split("T")[0], dateTo: now.toISOString().split("T")[0] };
      }
      case "this_term": {
        const month = now.getMonth();
        const termStartMonth = month < 4 ? 0 : month < 8 ? 4 : 8;
        const start = new Date(now.getFullYear(), termStartMonth, 1);
        return { dateFrom: start.toISOString().split("T")[0], dateTo: now.toISOString().split("T")[0] };
      }
      case "this_year": {
        const start = new Date(now.getFullYear(), 0, 1);
        return { dateFrom: start.toISOString().split("T")[0], dateTo: now.toISOString().split("T")[0] };
      }
      case "custom":
        return {
          dateFrom: customDateFrom || undefined,
          dateTo: customDateTo || undefined,
        };
      default:
        return {};
    }
  };

  const dateFilters = getDateFilters();

  // Query hooks
  const { data: feesData, isLoading } = useFees({
    status: filter !== "all" ? filter.toUpperCase() : undefined,
    term: termFilter && termFilter !== "all_terms" ? parseInt(termFilter) : undefined,
    year: yearFilter && yearFilter !== "all_years" ? parseInt(yearFilter) : undefined,
    dateFrom: dateFilters.dateFrom,
    dateTo: dateFilters.dateTo,
  });
  const { data: feeStats } = useFeeStats();
  const recordPaymentMutation = useRecordPayment();

  const fees = feesData?.fees || [];
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPaymentModal) return;

    recordPaymentMutation.mutate(
      {
        feeId: showPaymentModal.id,
        data: {
          amount: parseFloat(paymentForm.amount),
          paymentMethod: paymentForm.paymentMethod,
          reference: paymentForm.reference || undefined,
          notes: paymentForm.notes || undefined,
        },
      },
      {
        onSuccess: () => {
          setPaymentForm({ amount: "", paymentMethod: "CASH", reference: "", notes: "" });
          setShowPaymentModal(null);
        },
      }
    );
  };

  const getStatusVariant = (status: Fee["status"]) => {
    switch (status) {
      case "PAID": return "success";
      case "PARTIAL": return "warning";
      case "OVERDUE": return "destructive";
      default: return "default";
    }
  };

  const paymentFormError = recordPaymentMutation.error instanceof ApiError 
    ? recordPaymentMutation.error.message 
    : recordPaymentMutation.error?.message;

  // Export all fee records as CSV
  const handleExportFeesCSV = () => {
    if (fees.length === 0) return;
    const exportData = fees.map((fee) => ({
      student: `${fee.student.firstName} ${fee.student.lastName}`,
      admissionNumber: fee.student.admissionNumber,
      description: fee.description,
      amount: fee.amount,
      paidAmount: fee.paidAmount,
      outstanding: fee.amount - fee.paidAmount,
      dueDate: new Date(fee.dueDate).toLocaleDateString(),
      status: fee.status,
    }));
    exportToCSV(
      exportData,
      [
        { key: "student", label: "Student" },
        { key: "admissionNumber", label: "Admission No." },
        { key: "description", label: "Description" },
        { key: "amount", label: "Amount" },
        { key: "paidAmount", label: "Paid" },
        { key: "outstanding", label: "Outstanding" },
        { key: "dueDate", label: "Due Date" },
        { key: "status", label: "Status" },
      ],
      `fee-records-${new Date().toISOString().split("T")[0]}`
    );
  };

  const handleExportFeesPDF = () => {
    if (fees.length === 0) return;
    const exportData = fees.map((fee) => ({
      student: `${fee.student.firstName} ${fee.student.lastName}`,
      description: fee.description,
      amount: `$${fee.amount.toLocaleString()}`,
      paid: `$${fee.paidAmount.toLocaleString()}`,
      outstanding: `$${(fee.amount - fee.paidAmount).toLocaleString()}`,
      status: fee.status,
    }));
    exportToPDF(
      exportData,
      [
        { key: "student", label: "Student" },
        { key: "description", label: "Description" },
        { key: "amount", label: "Amount" },
        { key: "paid", label: "Paid" },
        { key: "outstanding", label: "Outstanding" },
        { key: "status", label: "Status" },
      ],
      `fee-records-${new Date().toISOString().split("T")[0]}`,
      "Fee Records Report"
    );
  };

  // Export students owing
  const handleExportOwingCSV = () => {
    if (!feeStats || feeStats.studentsOwing.length === 0) return;
    const exportData = feeStats.studentsOwing.map((s) => ({
      student: `${s.firstName} ${s.lastName}`,
      admissionNumber: s.admissionNumber,
      className: s.className,
      totalOwed: s.totalOwed,
    }));
    exportToCSV(
      exportData,
      [
        { key: "student", label: "Student" },
        { key: "admissionNumber", label: "Admission No." },
        { key: "className", label: "Class" },
        { key: "totalOwed", label: "Amount Owed" },
      ],
      `students-owing-${new Date().toISOString().split("T")[0]}`
    );
  };

  const handleExportOwingPDF = () => {
    if (!feeStats || feeStats.studentsOwing.length === 0) return;
    const exportData = feeStats.studentsOwing.map((s) => ({
      student: `${s.firstName} ${s.lastName}`,
      admissionNumber: s.admissionNumber,
      className: s.className,
      totalOwed: `$${s.totalOwed.toLocaleString()}`,
    }));
    exportToPDF(
      exportData,
      [
        { key: "student", label: "Student" },
        { key: "admissionNumber", label: "Admission No." },
        { key: "className", label: "Class" },
        { key: "totalOwed", label: "Amount Owed" },
      ],
      `students-owing-${new Date().toISOString().split("T")[0]}`,
      "Students Owing Report"
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <HugeiconsIcon icon={Money01Icon} size={28} className="text-brand" />
            Fees
          </h1>
          <p className="text-muted-foreground">
            Track student fees and payments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportFeesCSV} disabled={fees.length === 0}>
            <HugeiconsIcon icon={FileDownloadIcon} size={16} />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportFeesPDF} disabled={fees.length === 0}>
            <HugeiconsIcon icon={FileDownloadIcon} size={16} />
            PDF
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <HugeiconsIcon icon={Add01Icon} size={20} />
            Create New Fee Record
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="overflow-hidden border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Fees Paid This Term</p>
                  <p className="text-2xl font-bold mt-1 text-green-600">
                    ${(feeStats?.feesPaidThisTerm || 0).toLocaleString()}
                  </p>
                  {feeStats && (
                    <p className="text-xs text-muted-foreground mt-1">Term {feeStats.termNumber}</p>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-green-100 dark:bg-green-950">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={24} className="text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="overflow-hidden border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Unpaid Fees This Term</p>
                  <p className="text-2xl font-bold mt-1 text-orange-600">
                    ${(feeStats?.unpaidFeesThisTerm || 0).toLocaleString()}
                  </p>
                  {feeStats && (
                    <p className="text-xs text-muted-foreground mt-1">Term {feeStats.termNumber}</p>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-950">
                  <HugeiconsIcon icon={TimeQuarterIcon} size={24} className="text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="overflow-hidden border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Fees Paid This Year</p>
                  <p className="text-2xl font-bold mt-1 text-blue-600">
                    ${(feeStats?.feesPaidThisYear || 0).toLocaleString()}
                  </p>
                  {feeStats && (
                    <p className="text-xs text-muted-foreground mt-1">{feeStats.currentYear}</p>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-950">
                  <HugeiconsIcon icon={Calendar01Icon} size={24} className="text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="overflow-hidden border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Unpaid This Year</p>
                  <p className="text-2xl font-bold mt-1 text-red-600">
                    ${(feeStats?.unpaidFeesThisYear || 0).toLocaleString()}
                  </p>
                  {feeStats && (
                    <p className="text-xs text-muted-foreground mt-1">{feeStats.currentYear}</p>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-red-100 dark:bg-red-950">
                  <HugeiconsIcon icon={AlertCircleIcon} size={24} className="text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4 space-y-4">
          {/* Time Period Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground mr-1">Period:</span>
            {[
              { value: "all", label: "All Time" },
              { value: "this_week", label: "This Week" },
              { value: "this_month", label: "This Month" },
              { value: "this_term", label: "This Term" },
              { value: "this_year", label: "This Year" },
              { value: "custom", label: "Custom" },
            ].map((period) => (
              <Button
                key={period.value}
                variant={timePeriod === period.value ? "default" : "outline"}
                size="sm"
                onClick={() => setTimePeriod(period.value)}
              >
                {period.label}
              </Button>
            ))}
          </div>

          {/* Custom Date Range */}
          {timePeriod === "custom" && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">From:</Label>
                <Input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="w-auto h-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">To:</Label>
                <Input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="w-auto h-9"
                />
              </div>
            </div>
          )}

          {/* Status + Term/Year Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-wrap gap-2">
              {["all", "pending", "partial", "paid", "overdue"].map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(f)}
                  className="capitalize"
                >
                  {f}
                </Button>
              ))}
            </div>

            <div className="h-6 w-px bg-border hidden sm:block" />

            <div className="flex items-center gap-2">
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-[120px] h-9">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_years">All Years</SelectItem>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={termFilter} onValueChange={setTermFilter}>
                <SelectTrigger className="w-[120px] h-9">
                  <SelectValue placeholder="Term" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_terms">All Terms</SelectItem>
                  <SelectItem value="1">Term 1</SelectItem>
                  <SelectItem value="2">Term 2</SelectItem>
                  <SelectItem value="3">Term 3</SelectItem>
                </SelectContent>
              </Select>

              {(termFilter && termFilter !== "all_terms" || yearFilter && yearFilter !== "all_years") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setTermFilter(""); setYearFilter(""); }}
                  className="text-muted-foreground"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={16} />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fees Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="size-8 rounded-full border-4 border-brand border-t-transparent animate-spin" />
            </div>
          ) : fees.length === 0 ? (
            <div className="text-center py-12">
              <HugeiconsIcon icon={Money01Icon} size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No fees found</p>
              <Button onClick={() => setShowAddModal(true)}>
                <HugeiconsIcon icon={Add01Icon} size={20} />
                Create New Fee Record
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {fees.map((fee, index) => (
                    <motion.tr
                      key={fee.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group"
                    >
                      <TableCell>
                        <div>
                          <p className="font-semibold">
                            {fee.student.firstName} {fee.student.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {fee.student.admissionNumber}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{fee.description}</TableCell>
                      <TableCell className="font-semibold">
                        ${fee.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className={fee.paidAmount > 0 ? "text-success font-semibold" : ""}>
                        ${fee.paidAmount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {new Date(fee.dueDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(fee.status)}>
                          {fee.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {fee.status !== "PAID" && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setShowPaymentModal(fee);
                              setPaymentForm({
                                amount: String(fee.amount - fee.paidAmount),
                                paymentMethod: "CASH",
                                reference: "",
                                notes: "",
                              });
                            }}
                          >
                            Create New Fee Payment
                          </Button>
                        )}
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Students Owing Table */}
      {feeStats && feeStats.studentsOwing.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <HugeiconsIcon icon={AlertCircleIcon} size={20} className="text-red-500" />
                  Students Owing
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {feeStats.studentsOwing.length} student{feeStats.studentsOwing.length !== 1 ? "s" : ""} with outstanding fees
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleExportOwingCSV}>
                  <HugeiconsIcon icon={FileDownloadIcon} size={16} />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportOwingPDF}>
                  <HugeiconsIcon icon={FileDownloadIcon} size={16} />
                  PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Admission No.</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Amount Owed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feeStats.studentsOwing.map((student, index) => (
                  <motion.tr
                    key={student.studentId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="group"
                  >
                    <TableCell>
                      <p className="font-semibold">
                        {student.firstName} {student.lastName}
                      </p>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {student.admissionNumber}
                    </TableCell>
                    <TableCell>{student.className}</TableCell>
                    <TableCell className="text-right font-bold text-red-600">
                      ${student.totalOwed.toLocaleString()}
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add Fee Dialog */}
      <AddFeeDialog
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={() => {
          // Refresh fees list
          window.location.reload();
        }}
      />

      {/* Record Payment Dialog */}
      <Dialog open={!!showPaymentModal} onOpenChange={() => setShowPaymentModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Fee Payment</DialogTitle>
          </DialogHeader>

          {showPaymentModal && (
            <>
              <div className="text-sm text-muted-foreground mb-2">
                {showPaymentModal.student.firstName} {showPaymentModal.student.lastName} - {showPaymentModal.description}
              </div>
              <div className="mb-4">
                Outstanding: <span className="font-bold">${(showPaymentModal.amount - showPaymentModal.paidAmount).toLocaleString()}</span>
              </div>
            </>
          )}

          {paymentFormError && (
            <Alert variant="destructive">
              <AlertDescription>{paymentFormError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="space-y-2">
              <Label>Amount ($)</Label>
              <Input
                type="number"
                min="0"
                max={showPaymentModal ? showPaymentModal.amount - showPaymentModal.paidAmount : undefined}
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={paymentForm.paymentMethod}
                onValueChange={(value: "CASH" | "BANK_TRANSFER" | "ONLINE") =>
                  setPaymentForm({ ...paymentForm, paymentMethod: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="ONLINE">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Reference (optional)</Label>
              <Input
                placeholder="Receipt number or reference"
                value={paymentForm.reference}
                onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowPaymentModal(null)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" loading={recordPaymentMutation.isPending}>
                {!recordPaymentMutation.isPending && "Create Fee Payment"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
