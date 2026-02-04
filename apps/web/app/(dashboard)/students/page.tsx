"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserGroupIcon,
  Search01Icon,
  Add01Icon,
  ViewIcon,
  PencilEdit01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useStudents, useCreateStudent } from "@/lib/hooks";
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

export default function StudentsPage() {
  const searchParams = useSearchParams();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(
    searchParams.get("action") === "add"
  );

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    admissionNumber: "",
    dateOfBirth: "",
    gender: "",
    classId: "",
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Query hooks
  const { data, isLoading } = useStudents({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
  });

  const createMutation = useCreateStudent();

  const students = data?.students || [];
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();

    createMutation.mutate(formData, {
      onSuccess: () => {
        setFormData({
          firstName: "",
          lastName: "",
          admissionNumber: "",
          dateOfBirth: "",
          gender: "",
          classId: "",
        });
        setShowAddModal(false);
      },
    });
  };

  const formError = createMutation.error instanceof ApiError 
    ? createMutation.error.message 
    : createMutation.error?.message;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <HugeiconsIcon icon={UserGroupIcon} size={28} className="text-brand" />
            Students
          </h1>
          <p className="text-muted-foreground">
            Manage student records and enrollments
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <HugeiconsIcon icon={Add01Icon} size={20} />
          Add Student
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="py-4">
          <div className="relative">
            <Input
              placeholder="Search by name or admission number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<HugeiconsIcon icon={Search01Icon} size={20} />}
              className="max-w-md"
            />
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="size-8 rounded-full border-4 border-brand border-t-transparent animate-spin" />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12">
              <HugeiconsIcon icon={UserGroupIcon} size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No students found</p>
              <Button onClick={() => setShowAddModal(true)}>
                <HugeiconsIcon icon={Add01Icon} size={20} />
                Add Your First Student
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Admission No.</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {students.map((student, index) => (
                      <motion.tr
                        key={student.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-full bg-brand/10 flex items-center justify-center">
                              <span className="text-sm font-semibold text-brand">
                                {student.firstName[0]}
                                {student.lastName[0]}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold">
                                {student.firstName} {student.lastName}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {student.admissionNumber}
                        </TableCell>
                        <TableCell>{student.class?.name || "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={student.isActive ? "success" : "destructive"}
                          >
                            {student.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon-sm">
                              <HugeiconsIcon icon={ViewIcon} size={18} />
                            </Button>
                            <Button variant="ghost" size="icon-sm">
                              <HugeiconsIcon icon={PencilEdit01Icon} size={18} />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {students.length} of {pagination.total} students
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => setPage(pagination.page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPage(pagination.page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Student Dialog */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
          </DialogHeader>

          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleAddStudent} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Admission Number</Label>
              <Input
                placeholder="e.g., STU-2024-001"
                value={formData.admissionNumber}
                onChange={(e) =>
                  setFormData({ ...formData, admissionNumber: e.target.value })
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) =>
                    setFormData({ ...formData, dateOfBirth: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) =>
                    setFormData({ ...formData, gender: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
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
              <Button type="submit" className="flex-1" loading={createMutation.isPending}>
                {!createMutation.isPending && (
                  <>
                    <HugeiconsIcon icon={Add01Icon} size={18} />
                    Add Student
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
