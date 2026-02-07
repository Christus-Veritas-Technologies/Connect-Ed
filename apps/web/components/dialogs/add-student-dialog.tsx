"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ApiError } from "@/lib/api";
import { useCreateStudent } from "@/lib/hooks";
import { useClasses } from "@/lib/hooks/use-classes";
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
import { toast } from "sonner";

type ClassWithLevel = {
  id: string;
  name: string;
  level?: string | null;
  _count?: { students: number };
};

interface AddStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (studentId: string) => void;
  preSelectedClassId?: string;
}

export function AddStudentDialog({
  open,
  onOpenChange,
  onSuccess,
  preSelectedClassId,
}: AddStudentDialogProps) {
  const [createAccount, setCreateAccount] = useState(false);
  const [classSearch, setClassSearch] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    email: "",
    phone: "",
    classId: preSelectedClassId || "",
  });

  const { data: classesData, isLoading: loadingClasses } = useClasses();
  const createMutation = useCreateStudent();

  const allClasses = classesData?.classes || [];
  const filteredClasses = classSearch
    ? allClasses.filter((c: ClassWithLevel) =>
        c.name.toLowerCase().includes(classSearch.toLowerCase())
      )
    : allClasses;

  const primaryClasses = filteredClasses.filter(
    (c: ClassWithLevel) => c.level?.toLowerCase() === "primary"
  );
  const secondaryClasses = filteredClasses.filter(
    (c: ClassWithLevel) => c.level?.toLowerCase() === "secondary"
  );
  const otherClasses = filteredClasses.filter(
    (c: ClassWithLevel) =>
      !c.level ||
      (c.level.toLowerCase() !== "primary" &&
        c.level.toLowerCase() !== "secondary")
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      admissionNumber: generateStudentId(),
    };

    createMutation.mutate(payload, {
      onSuccess: (data) => {
        // Reset form
        setFormData({
          firstName: "",
          lastName: "",
          dateOfBirth: "",
          gender: "",
          email: "",
          phone: "",
          classId: preSelectedClassId || "",
        });
        setClassSearch("");
        setCreateAccount(false);
        
        toast.success("Student created successfully!", {
          description: `${data.student.firstName} ${data.student.lastName} has been added.`,
        });
        
        onOpenChange(false);
        if (onSuccess) {
          onSuccess(data.student.id);
        }
      },
      onError: () => {
        toast.error("Failed to create student", {
          description: "Please try again or contact support.",
        });
      },
    });
  };

  const generateStudentId = () => {
    const prefix = "STU";
    const year = new Date().getFullYear();
    const uuid = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${year}-${uuid}`;
  };

  const formError =
    createMutation.error instanceof ApiError
      ? createMutation.error.message
      : createMutation.error?.message;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-bold">
            Add New Student
          </DialogTitle>
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

        {loadingClasses ? (
          <div className="flex items-center justify-center py-12">
            <div className="size-8 rounded-full border-4 border-brand border-t-transparent animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
                Personal Information
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    First Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    placeholder="John"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Last Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Date of Birth</Label>
                  <Input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) =>
                      setFormData({ ...formData, dateOfBirth: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Gender</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) =>
                      setFormData({ ...formData, gender: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
                Contact Information
              </h3>

              {/* Create Account Switch */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex-1">
                  <Label className="text-sm font-medium cursor-pointer">
                    Create Account
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Enable for students who need login access (email required)
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createAccount}
                    onChange={(e) => setCreateAccount(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Email {createAccount && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="john.doe@example.com"
                    required={createAccount}
                  />
                  {createAccount && !formData.email && (
                    <p className="text-xs text-destructive">Email is required for account creation</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Phone</Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value="+263"
                      disabled
                      className="w-20"
                    />
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="flex-1"
                      placeholder="712345678"
                      maxLength={9}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter 9-digit phone number (must start with 7)
                  </p>
                </div>
              </div>
            </div>

            {/* Class Assignment */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
                Class Assignment
              </h3>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Assign to Class</Label>
                <Input
                  type="text"
                  placeholder="Search classes..."
                  value={classSearch}
                  onChange={(e) => setClassSearch(e.target.value)}
                  className="mb-2"
                />
                <Select
                  value={formData.classId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, classId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a class..." />
                  </SelectTrigger>
                  <SelectContent>
                    {primaryClasses.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          Primary
                        </div>
                        {primaryClasses.map((cls: ClassWithLevel) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name} ({cls._count?.students || 0} students)
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {secondaryClasses.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          Secondary
                        </div>
                        {secondaryClasses.map((cls: ClassWithLevel) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name} ({cls._count?.students || 0} students)
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {otherClasses.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          Other
                        </div>
                        {otherClasses.map((cls: ClassWithLevel) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name} ({cls._count?.students || 0} students)
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Adding..." : "Add Student"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
