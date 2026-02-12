"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Loader2,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  FileDown,
  X,
  MoreVertical,
} from "lucide-react";
import { useFees, useFeeStats, useRecordPayment } from "@/lib/hooks";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { exportToCSV, exportToPDF } from "@/lib/export-utils";
import { fmt, type CurrencyCode } from "@/lib/currency";
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
import {
  DashboardBreadcrumbs,
  PageHeader,
  StatsCard,
  FilterTabs,
} from "@/components/dashboard";

// ─── Types ───────────────────────────────────────────────────

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

type PaymentMethodOption = "CASH" | "BANK_TRANSFER" | "ONLINE";

// ─── Main Page ───────────────────────────────────────────────

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
  const [search, setSearch] = useState("");
  const { school } = useAuth();

  const getDefaultTermNumber = () =>
    (school?.currentTermNumber ?? 1).toString();
  const getDefaultTermYear = () =>
    (school?.currentTermYear ?? new Date().getFullYear()).toString();
  const getDefaultPaymentForm = () => ({
    amount: "",
    paymentMethod: "CASH" as PaymentMethodOption,
    reference: "",
    notes: "",
    termNumber: getDefaultTermNumber(),
    termYear: getDefaultTermYear(),
  });

  const [paymentForm, setPaymentForm] = useState(getDefaultPaymentForm);
  const resetPaymentForm = () => setPaymentForm(getDefaultPaymentForm());

  // Compute date filters from time period
  const getDateFilters = () => {
    const now = new Date();
    switch (timePeriod) {
      case "this_week": {
        const dayOfWeek = now.getDay();
        const start = new Date(now);
        start.setDate(
          now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
        );
        return {
          dateFrom: start.toISOString().split("T")[0],
          dateTo: now.toISOString().split("T")[0],
        };
      }
      case "this_month": {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return {
          dateFrom: start.toISOString().split("T")[0],
          dateTo: now.toISOString().split("T")[0],
        };
      }
      case "this_term": {
        const month = now.getMonth();
        const termStartMonth = month < 4 ? 0 : month < 8 ? 4 : 8;
        const start = new Date(now.getFullYear(), termStartMonth, 1);
        return {
          dateFrom: start.toISOString().split("T")[0],
          dateTo: now.toISOString().split("T")[0],
        };
      }
      case "this_year": {
        const start = new Date(now.getFullYear(), 0, 1);
        return {
          dateFrom: start.toISOString().split("T")[0],
          dateTo: now.toISOString().split("T")[0],
        };
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

  // ── Data fetching ──
  const { data: feesData, isLoading } = useFees({
    status: filter !== "all" ? filter.toUpperCase() : undefined,
    term:
      termFilter && termFilter !== "all_terms"
        ? parseInt(termFilter)
        : undefined,
    year:
      yearFilter && yearFilter !== "all_years"
        ? parseInt(yearFilter)
        : undefined,
    dateFrom: dateFilters.dateFrom,
    dateTo: dateFilters.dateTo,
  });
  const { data: feeStats } = useFeeStats();
  const recordPaymentMutation = useRecordPayment();
  const baseYear = school?.currentTermYear ?? new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, idx) => baseYear - 2 + idx);

  const fees: Fee[] = feesData?.fees || [];

  // Client-side search filter
  const filteredFees = fees.filter((fee) =>
    search
      ? `${fee.student.firstName} ${fee.student.lastName}`
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      fee.description.toLowerCase().includes(search.toLowerCase()) ||
      fee.student.admissionNumber
        .toLowerCase()
        .includes(search.toLowerCase())
      : true
  );

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPaymentModal) return;

    const parsedTermNumber = Number(paymentForm.termNumber);
    const parsedTermYear = Number(paymentForm.termYear);

    recordPaymentMutation.mutate(
      {
        feeId: showPaymentModal.id,
        data: {
          amount: parseFloat(paymentForm.amount),
          paymentMethod: paymentForm.paymentMethod,
          reference: paymentForm.reference || undefined,
          notes: paymentForm.notes || undefined,
          termNumber: Number.isFinite(parsedTermNumber)
            ? parsedTermNumber
            : undefined,
          termYear: Number.isFinite(parsedTermYear)
            ? parsedTermYear
            : undefined,
        },
      },
      {
        onSuccess: () => {
          resetPaymentForm();
          setShowPaymentModal(null);
        },
      }
    );
  };

  const getStatusVariant = (status: Fee["status"]) => {
    switch (status) {
      case "PAID":
        return "success";
      case "PARTIAL":
        return "warning";
      case "OVERDUE":
        return "destructive";
      default:
        return "default";
    }
  };

  const paymentFormError =
    recordPaymentMutation.error instanceof ApiError
      ? recordPaymentMutation.error.message
      : recordPaymentMutation.error?.message;

  // ── Export helpers ──
  const handleExportFeesCSV = () => {
    if (filteredFees.length === 0) return;
    const exportData = filteredFees.map((fee) => ({
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
    if (filteredFees.length === 0) return;
    const exportData = filteredFees.map((fee) => ({
      student: `${fee.student.firstName} ${fee.student.lastName}`,
      description: fee.description,
      amount: fmt(fee.amount, school?.currency as CurrencyCode),
      paid: fmt(fee.paidAmount, school?.currency as CurrencyCode),
      outstanding: fmt(fee.amount - fee.paidAmount, school?.currency as CurrencyCode),
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

  const handleExportOwingCSV = () => {
    if (!feeStats || feeStats.studentsOwing.length === 0) return;
    const exportData = feeStats.studentsOwing.map((s: any) => ({
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
    const exportData = feeStats.studentsOwing.map((s: any) => ({
      student: `${s.firstName} ${s.lastName}`,
      admissionNumber: s.admissionNumber,
      className: s.className,
      totalOwed: fmt(s.totalOwed, school?.currency as CurrencyCode),
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
      {/* Breadcrumb */}
      <DashboardBreadcrumbs items={[{ label: "Fees" }]} />

      {/* Header */}
      <PageHeader
        title="Fees"
        subtitle="Track student fees and payments"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by student or description..."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleExportFeesCSV}
              title="Export CSV"
              disabled={filteredFees.length === 0}
            >
              <Download className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleExportFeesPDF}
              title="Export PDF"
              disabled={filteredFees.length === 0}
            >
              <FileDown className="size-4" />
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="size-4" />
              Create Fee
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Paid This Term"
          value={fmt(feeStats?.feesPaidThisTerm || 0, school?.currency as CurrencyCode)}
          icon={<CheckCircle className="size-6" />}
          color="green"
          meta={feeStats ? `Term ${feeStats.termNumber}` : undefined}
          delay={0.1}
        />
        <StatsCard
          label="Unpaid This Term"
          value={fmt(feeStats?.unpaidFeesThisTerm || 0, school?.currency as CurrencyCode)}
          icon={<Clock className="size-6" />}
          color="orange"
          meta={feeStats ? `Term ${feeStats.termNumber}` : undefined}
          delay={0.2}
        />
        <StatsCard
          label="Paid This Year"
          value={fmt(feeStats?.feesPaidThisYear || 0, school?.currency as CurrencyCode)}
          icon={<DollarSign className="size-6" />}
          color="blue"
          meta={feeStats ? `${feeStats.currentYear}` : undefined}
          delay={0.3}
        />
        <StatsCard
          label="Unpaid This Year"
          value={fmt(feeStats?.unpaidFeesThisYear || 0, school?.currency as CurrencyCode)}
          icon={<AlertCircle className="size-6" />}
          color="red"
          meta={feeStats ? `${feeStats.currentYear}` : undefined}
          delay={0.4}
        />
      </div>

      {/* Filters Card */}
      <Card>
        <CardContent className="py-4 space-y-4">
          {/* Time Period Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground mr-1">
              Period:
            </span>
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
          )}

          {/* Status + Term/Year Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <FilterTabs
              tabs={[
                { key: "all", label: "All" },
                { key: "pending", label: "Pending" },
                { key: "partial", label: "Partial" },
                { key: "paid", label: "Paid" },
                { key: "overdue", label: "Overdue" },
              ]}
              active={filter}
              onChange={setFilter}
            />

            <div className="h-6 w-px bg-border hidden sm:block" />

            <div className="flex items-center gap-2">
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-[120px] h-9">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_years">All Years</SelectItem>
                  {Array.from(
                    { length: 5 },
                    (_, i) => new Date().getFullYear() - i
                  ).map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
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

              {((termFilter && termFilter !== "all_terms") ||
                (yearFilter && yearFilter !== "all_years")) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTermFilter("");
                      setYearFilter("");
                    }}
                    className="text-muted-foreground"
                  >
                    <X className="size-4" />
                    Clear
                  </Button>
                )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fees Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-brand" />
        </div>
      ) : filteredFees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl">
          <DollarSign className="size-12 text-muted-foreground mb-4" />
          <p className="text-lg font-semibold mb-1">No fees found</p>
          <p className="text-sm text-muted-foreground mb-4">
            Create a fee record to track payments
          </p>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="size-4" />
            Create Fee
          </Button>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
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
                {filteredFees.map((fee, index) => (
                  <motion.tr
                    key={fee.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="group hover:bg-muted/50"
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {fee.student.firstName} {fee.student.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {fee.student.admissionNumber}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {fee.description}
                    </TableCell>
                    <TableCell className="font-semibold">
                      ${fee.amount.toLocaleString()}
                    </TableCell>
                    <TableCell
                      className={
                        fee.paidAmount > 0
                          ? "text-green-600 font-semibold"
                          : ""
                      }
                    >
                      ${fee.paidAmount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">
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
                              ...getDefaultPaymentForm(),
                              amount: String(fee.amount - fee.paidAmount),
                            });
                          }}
                        >
                          Record Payment
                        </Button>
                      )}
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      )}

      {/* Students Owing */}
      {feeStats && feeStats.studentsOwing.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertCircle className="size-5 text-red-500" />
                  Students Owing
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {feeStats.studentsOwing.length} student
                  {feeStats.studentsOwing.length !== 1 ? "s" : ""} with
                  outstanding fees
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleExportOwingCSV}
                  title="Export CSV"
                >
                  <Download className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleExportOwingPDF}
                  title="Export PDF"
                >
                  <FileDown className="size-4" />
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
                {feeStats.studentsOwing.map(
                  (student: any, index: number) => (
                    <motion.tr
                      key={student.studentId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <TableCell>
                        <p className="font-medium">
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
                  )
                )}
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
          window.location.reload();
        }}
      />

      {/* Record Payment Dialog */}
      <Dialog
        open={!!showPaymentModal}
        onOpenChange={(open) => {
          if (!open) {
            resetPaymentForm();
            setShowPaymentModal(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>

          {showPaymentModal && (
            <>
              <div className="text-sm text-muted-foreground mb-2">
                {showPaymentModal.student.firstName}{" "}
                {showPaymentModal.student.lastName} -{" "}
                {showPaymentModal.description}
              </div>
              <div className="mb-4">
                Outstanding:{" "}
                <span className="font-bold">
                  $
                  {(
                    showPaymentModal.amount - showPaymentModal.paidAmount
                  ).toLocaleString()}
                </span>
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
                max={
                  showPaymentModal
                    ? showPaymentModal.amount - showPaymentModal.paidAmount
                    : undefined
                }
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) =>
                  setPaymentForm({
                    ...paymentForm,
                    amount: e.target.value,
                  })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={paymentForm.paymentMethod}
                onValueChange={(value: PaymentMethodOption) =>
                  setPaymentForm({
                    ...paymentForm,
                    paymentMethod: value,
                  })
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Term</Label>
                <Select
                  value={paymentForm.termNumber}
                  onValueChange={(value) =>
                    setPaymentForm({ ...paymentForm, termNumber: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Term 1</SelectItem>
                    <SelectItem value="2">Term 2</SelectItem>
                    <SelectItem value="3">Term 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Select
                  value={paymentForm.termYear}
                  onValueChange={(value) =>
                    setPaymentForm({ ...paymentForm, termYear: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Choose the term and year this payment should cover (helps when
              paying ahead).
            </p>

            <div className="space-y-2">
              <Label>Reference (optional)</Label>
              <Input
                placeholder="Receipt number or reference"
                value={paymentForm.reference}
                onChange={(e) =>
                  setPaymentForm({
                    ...paymentForm,
                    reference: e.target.value,
                  })
                }
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  resetPaymentForm();
                  setShowPaymentModal(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={recordPaymentMutation.isPending}
              >
                {recordPaymentMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Record Payment"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
