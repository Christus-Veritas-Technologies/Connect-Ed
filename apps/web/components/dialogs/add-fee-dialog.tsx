"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api";
import { useCreateFee, useStudents } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Add01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";

interface AddFeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddFeeDialog({ open, onOpenChange, onSuccess }: AddFeeDialogProps) {
  const [feeForm, setFeeForm] = useState({
    studentId: "",
    amount: "",
    description: "",
    dueDate: "",
  });

  const { data: studentList } = useStudents({ page: 1, limit: 1000 });
  const createFeeMutation = useCreateFee();

  const students = studentList?.students || [];

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
          onOpenChange(false);
          toast.success("Fee record created successfully");
          onSuccess?.();
        },
      }
    );
  };

  const feeFormError =
    createFeeMutation.error instanceof ApiError
      ? createFeeMutation.error.message
      : createFeeMutation.error?.message;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Payment</DialogTitle>
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
              onValueChange={(value) =>
                setFeeForm({ ...feeForm, studentId: value })
              }
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
              onChange={(e) =>
                setFeeForm({ ...feeForm, description: e.target.value })
              }
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
                onChange={(e) =>
                  setFeeForm({ ...feeForm, dueDate: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              <HugeiconsIcon icon={Cancel01Icon} size={18} />
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              loading={createFeeMutation.isPending}
            >
              {!createFeeMutation.isPending && (
                <>
                  <HugeiconsIcon icon={Add01Icon} size={18} />
                  Add Payment
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
