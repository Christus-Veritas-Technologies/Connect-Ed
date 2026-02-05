"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Money01Icon,
  Add01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useFees, useCreateFee, useRecordPayment, useStudents } from "@/lib/hooks";
import { ApiError } from "@/lib/api";
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<Fee | null>(null);

  const [feeForm, setFeeForm] = useState({
    studentId: "",
    amount: "",
    description: "",
    dueDate: "",
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "CASH" as "CASH" | "BANK_TRANSFER" | "ONLINE",
    reference: "",
    notes: "",
  });

  // Query hooks
  const { data: feesData, isLoading } = useFees({
    status: filter !== "all" ? filter.toUpperCase() : undefined,
  });
  const { data: studentsData } = useStudents({ limit: 1000 });
  const createFeeMutation = useCreateFee();
  const recordPaymentMutation = useRecordPayment();

  const fees = feesData?.fees || [];
  const students = studentsData?.students || [];

  const handleAddFee = async (e: React.FormEvent) => {
    e.preventDefault();
    createFeeMutation.mutate(
      {
        studentId: feeForm.studentId,
        amount: parseFloat(feeForm.amount),
        description: feeForm.description,
        dueDate: feeForm.dueDate,
      },
      {
        onSuccess: () => {
          setFeeForm({ studentId: "", amount: "", description: "", dueDate: "" });
          setShowAddModal(false);
        },
      }
    );
  };

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

  const feeFormError = createFeeMutation.error instanceof ApiError 
    ? createFeeMutation.error.message 
    : createFeeMutation.error?.message;

  const paymentFormError = recordPaymentMutation.error instanceof ApiError 
    ? recordPaymentMutation.error.message 
    : recordPaymentMutation.error?.message;

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
        <Button onClick={() => setShowAddModal(true)}>
          <HugeiconsIcon icon={Add01Icon} size={20} />
          Create Fee
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
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
                Create First Fee
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
                            Record Payment
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

      {/* Add Fee Dialog */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Fee</DialogTitle>
          </DialogHeader>

          {feeFormError && (
            <Alert variant="destructive">
              <AlertDescription>{feeFormError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleAddFee} className="space-y-4">
            <div className="space-y-2">
              <Label>Student</Label>
              <Select
                value={feeForm.studentId}
                onValueChange={(value) => setFeeForm({ ...feeForm, studentId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select student..." />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.firstName} {s.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="e.g., Term 1 Tuition"
                value={feeForm.description}
                onChange={(e) => setFeeForm({ ...feeForm, description: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={feeForm.amount}
                  onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={feeForm.dueDate}
                  onChange={(e) => setFeeForm({ ...feeForm, dueDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowAddModal(false)}
              >
                <HugeiconsIcon icon={Cancel01Icon} size={18} />
                Cancel
              </Button>
              <Button type="submit" className="flex-1" loading={createFeeMutation.isPending}>
                {!createFeeMutation.isPending && (
                  <>
                    <HugeiconsIcon icon={Add01Icon} size={18} />
                    Create Fee
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={!!showPaymentModal} onOpenChange={() => setShowPaymentModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
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
                {!recordPaymentMutation.isPending && "Record Payment"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
