"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Cancel01Icon, Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCreateParent, useStudents } from "@/lib/hooks";
import { ApiError } from "@/lib/api";
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

interface AddParentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedStudentId?: string;
  onSuccess?: (parent: any) => void;
}

export function AddParentDialog({
  open,
  onOpenChange,
  preselectedStudentId,
  onSuccess,
}: AddParentDialogProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    studentIds: [] as string[],
  });
  const [childSearch, setChildSearch] = useState("");

  const { data: studentsData } = useStudents({ limit: 1000 });
  const createMutation = useCreateParent();

  // Auto-select preselected student
  useEffect(() => {
    if (preselectedStudentId && !formData.studentIds.includes(preselectedStudentId)) {
      setFormData((prev) => ({
        ...prev,
        studentIds: [preselectedStudentId],
      }));
    }
  }, [preselectedStudentId]);

  const students = studentsData?.students || [];
  
  // Filter students based on search
  const filteredStudents = childSearch
    ? students.filter((s) =>
        `${s.firstName} ${s.lastName} ${s.admissionNumber}`
          .toLowerCase()
          .includes(childSearch.toLowerCase())
      )
    : students;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    createMutation.mutate(formData, {
      onSuccess: (data) => {
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          studentIds: [],
        });
        setChildSearch("");
        onOpenChange(false);
        onSuccess?.(data.parent);
      },
    });
  };

  const handleStudentToggle = (studentId: string) => {
    setFormData((prev) => ({
      ...prev,
      studentIds: prev.studentIds.includes(studentId)
        ? prev.studentIds.filter((id) => id !== studentId)
        : [...prev.studentIds, studentId],
    }));
  };

  const formError =
    createMutation.error instanceof ApiError
      ? createMutation.error.message
      : createMutation.error?.message;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-bold">Add New Parent</DialogTitle>
        </DialogHeader>

        {formError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Personal Information
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-2"
              >
                <Label className="text-sm font-medium">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  className="rounded-lg"
                  placeholder="John"
                  required
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-2"
              >
                <Label className="text-sm font-medium">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  className="rounded-lg"
                  placeholder="Doe"
                  required
                />
              </motion.div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-2"
              >
                <Label className="text-sm font-medium">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="rounded-lg"
                  placeholder="john.doe@example.com"
                  required
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-2"
              >
                <Label className="text-sm font-medium">Phone</Label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="rounded-lg"
                  placeholder="+1234567890"
                />
              </motion.div>
            </div>
          </div>

          {/* Children Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              Link to Students <span className="text-destructive">*</span>
            </h3>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              <Label className="text-sm font-medium">Search and Select Children</Label>
              <Input
                placeholder="Search by name or student ID..."
                value={childSearch}
                onChange={(e) => setChildSearch(e.target.value)}
                className="rounded-lg mb-3"
              />
              <div className="space-y-2 max-h-[250px] overflow-y-auto border rounded-lg p-3">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center space-x-2 p-2 hover:bg-muted rounded-lg cursor-pointer"
                    onClick={() => handleStudentToggle(student.id)}
                  >
                    <input
                      type="checkbox"
                      checked={formData.studentIds.includes(student.id)}
                      onChange={() => handleStudentToggle(student.id)}
                      className="size-4 rounded border-gray-300"
                    />
                    <label className="flex-1 text-sm cursor-pointer">
                      {student.firstName} {student.lastName} -{" "}
                      {student.admissionNumber}
                    </label>
                  </div>
                ))}
                {filteredStudents.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4\">
                    {childSearch ? "No students match your search" : "No students available"}
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Select at least one student to link to this parent
              </p>
            </motion.div>
          </div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex gap-3 pt-4 border-t"
          >
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-2 rounded-lg"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              <HugeiconsIcon icon={Cancel01Icon} size={18} />
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 gap-2 rounded-lg"
              disabled={createMutation.isPending || formData.studentIds.length === 0}
            >
              {createMutation.isPending ? (
                <>
                  <div className="size-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <HugeiconsIcon icon={Add01Icon} size={18} />
                  Add Parent
                </>
              )}
            </Button>
          </motion.div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
