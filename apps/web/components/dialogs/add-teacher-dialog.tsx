"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Cancel01Icon, Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCreateTeacher } from "@/lib/hooks";
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

interface AddTeacherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (teacher: any) => void;
}

export function AddTeacherDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddTeacherDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });

  const createMutation = useCreateTeacher();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    createMutation.mutate(
      {
        ...formData,
        role: "TEACHER" as const,
        password: "", // Will be auto-generated on backend
      },
      {
        onSuccess: (data) => {
          setFormData({
            name: "",
            email: "",
          });
          onOpenChange(false);
          onSuccess?.(data.teacher);
        },
      }
    );
  };

  const formError =
    createMutation.error instanceof ApiError
      ? createMutation.error.message
      : createMutation.error?.message;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-bold">Add New Teacher</DialogTitle>
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
              Teacher Information
            </h3>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-2"
            >
              <Label className="text-sm font-medium">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="rounded-lg"
                placeholder="Jane Smith"
                required
              />
            </motion.div>

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
                placeholder="jane.smith@example.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                A temporary password will be generated and sent to this email
              </p>
            </motion.div>
          </div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
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
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <div className="size-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <HugeiconsIcon icon={Add01Icon} size={18} />
                  Add Teacher
                </>
              )}
            </Button>
          </motion.div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
