"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Trash2,
  BookmarkPlus,
  User,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Loader2,
  Users,
  Download,
  FileDown,
  AlertCircle,
  GraduationCap,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { fmt, type CurrencyCode } from "@/lib/currency";
import { DashboardBreadcrumbs } from "@/components/dashboard";
import { canEditEntity } from "@/lib/roles";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { exportToCSV, exportToPDF } from "@/lib/export-utils";

// Helper function to get initials from name
function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

interface StudentDetail {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  dateOfBirth?: string;
  gender?: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  class?: { id: string; name: string; classTeacher?: { name: string } } | null;
  parent?: { id: string; name: string; email: string; phone?: string } | null;
  fees?: Array<{
    id: string;
    amount: number;
    dueDate: string;
    isPaid: boolean;
    payments?: Array<{ amount: number }>;
  }>;
  createdAt: string;
}


export default function StudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { school, user } = useAuth();

  const studentId = params.id as string;
  const canEdit = canEditEntity(user?.role, "student");

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch student details
  const fetchStudent = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<{ student: StudentDetail }>(`/students/${studentId}`);
      setStudent(data.student);
    } catch (error) {
      console.error("Failed to fetch student:", error);
      toast.error("Failed to load student details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudent();
  }, [studentId]);

  // Handle delete
  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!student) return;
    try {
      await api.delete(`/students/${studentId}`);
      toast.success("Student deleted successfully");
      router.push("/dashboard/students");
    } catch (error) {
      const err = error instanceof ApiError ? error.message : "Failed to delete student";
      toast.error(err);
      setShowDeleteDialog(false);
    }
  };

  const handleExportCSV = () => {
    if (!student) return;

    const feesData = student.fees?.map((fee) => {
      const paid = fee.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      return {
        dueDate: new Date(fee.dueDate).toLocaleDateString(),
        amount: fee.amount,
        paid: paid,
        balance: fee.amount - paid,
        status: fee.isPaid ? "Paid" : "Pending",
      };
    }) || [];

    if (feesData.length === 0) return;

    exportToCSV(
      feesData,
      [
        { key: "dueDate", label: "Due Date" },
        { key: "amount", label: "Amount" },
        { key: "paid", label: "Paid" },
        { key: "balance", label: "Balance" },
        { key: "status", label: "Status" },
      ],
      `student-${student.firstName}-${student.lastName}-fees-${new Date().toISOString().split("T")[0]}`
    );
  };

  const handleExportPDF = () => {
    if (!student) return;

    const feesData = student.fees?.map((fee) => {
      const paid = fee.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      return {
        dueDate: new Date(fee.dueDate).toLocaleDateString(),
        amount: fee.amount,
        status: fee.isPaid ? "Paid" : "Pending",
      };
    }) || [];

    if (feesData.length === 0) return;

    exportToPDF(
      feesData,
      [
        { key: "dueDate", label: "Due Date" },
        { key: "amount", label: "Amount" },
        { key: "status", label: "Status" },
      ],
      `student-${student.firstName}-${student.lastName}-fees-${new Date().toISOString().split("T")[0]}`,
      `Fee records for ${student.firstName} ${student.lastName}`
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="size-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="space-y-6">
        <DashboardBreadcrumbs
          items={[
            { label: "Students", href: "/dashboard/students" },
            { label: "Not Found" },
          ]}
        />
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>Student not found</AlertDescription>
        </Alert>
        <Button onClick={() => router.push("/dashboard/students")}>
          Back to Students
        </Button>
      </div>
    );
  }

  // Calculate fee stats
  const totalFees = student.fees?.reduce((sum, fee) => sum + fee.amount, 0) || 0;
  const totalPaid =
    student.fees?.reduce(
      (sum, fee) => sum + (fee.payments?.reduce((s, p) => s + p.amount, 0) || 0),
      0
    ) || 0;
  const balance = totalFees - totalPaid;
  const feesCount = student.fees?.length || 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <DashboardBreadcrumbs
        items={[
          { label: "Students", href: "/dashboard/students" },
          { label: `${student.firstName} ${student.lastName}` },
        ]}
      />

      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push("/dashboard/students")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {student.firstName} {student.lastName}
          </h1>
          <p className="text-sm text-muted-foreground font-mono">
            {student.admissionNumber}
          </p>
        </div>
      </div>

      {/* Student info card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Main info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Student Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Avatar and basic info */}
            <div className="flex items-start gap-4">
              <div className="size-20 rounded-lg bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                {getInitials(student.firstName, student.lastName)}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">
                  {student.firstName} {student.lastName}
                </h2>
                <p className="text-sm text-muted-foreground font-mono mt-1">
                  {student.admissionNumber}
                </p>
                {student.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Mail className="size-4" />
                    {student.email}
                  </div>
                )}
                {student.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Phone className="size-4" />
                    {student.phone}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <Badge
                    variant="outline"
                    className={
                      student.isActive
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-gray-50 text-gray-700 border-gray-200"
                    }
                  >
                    {student.isActive ? "Active" : "Inactive"}
                  </Badge>
                  {student.gender && (
                    <Badge variant="outline" className="capitalize">
                      {student.gender}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Admission Number
                </p>
                <p className="text-sm font-medium mt-1 font-mono">
                  {student.admissionNumber}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Class
                </p>
                <p className="text-sm font-medium mt-1">
                  {student.class?.name || "Not assigned"}
                </p>
              </div>
              {student.dateOfBirth && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Date of Birth
                  </p>
                  <p className="text-sm font-medium mt-1">
                    {new Date(student.dateOfBirth).toLocaleDateString()}
                  </p>
                </div>
              )}
              {student.gender && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Gender
                  </p>
                  <p className="text-sm font-medium mt-1 capitalize">
                    {student.gender}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Status
                </p>
                <p className="text-sm font-medium mt-1">
                  {student.isActive ? "Active" : "Inactive"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Total Fees
                </p>
                <p className="text-sm font-medium mt-1">
                  {fmt(totalFees, school?.currency as CurrencyCode)}
                </p>
              </div>
            </div>

            {/* Parent info */}
            {student.parent && (
              <div className="pt-4 border-t">
                <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
                  Parent / Guardian
                </p>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="size-12 rounded-full bg-linear-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold shrink-0">
                    {getInitials(
                      student.parent.name.split(" ")[0] || "",
                      student.parent.name.split(" ")[1] || student.parent.name.split(" ")[0] || ""
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{student.parent.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {student.parent.email}
                    </p>
                    {student.parent.phone && (
                      <p className="text-xs text-muted-foreground">
                        {student.parent.phone}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => router.push(`/dashboard/parents/${student.parent?.id}`)}
                  >
                    View
                  </Button>
                </div>
              </div>
            )}

            {/* Created date */}
            {student.createdAt && (
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="size-4" />
                  <span>
                    Enrolled on {new Date(student.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {canEdit && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push(`/dashboard/students/${studentId}/edit`)}
              >
                <User className="size-4" />
                Edit Student
              </Button>
            )}
            {student.class && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push(`/dashboard/classes/${student.class?.id}`)}
              >
                <BookmarkPlus className="size-4" />
                View Class
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleExportCSV}
              disabled={feesCount === 0}
            >
              <Download className="size-4" />
              Export as CSV
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleExportPDF}
              disabled={feesCount === 0}
            >
              <FileDown className="size-4" />
              Export as PDF
            </Button>
            {canEdit && (
              <Button
                variant="outline"
                className="w-full justify-start text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="size-4" />
                Delete Student
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Fee records table */}
      {feesCount > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="size-5" />
              Fee Records ({feesCount})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {student.fees?.map((fee) => {
                    const paid = fee.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
                    const remaining = fee.amount - paid;
                    const isOverdue = !fee.isPaid && new Date(fee.dueDate) < new Date();

                    return (
                      <TableRow key={fee.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          {new Date(fee.dueDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {fmt(fee.amount, school?.currency as CurrencyCode)}
                        </TableCell>
                        <TableCell>
                          {fmt(paid, school?.currency as CurrencyCode)}
                        </TableCell>
                        <TableCell>
                          {fmt(remaining, school?.currency as CurrencyCode)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className={
                              fee.isPaid
                                ? "bg-green-50 text-green-700 border-green-200"
                                : isOverdue
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : "bg-orange-50 text-orange-700 border-orange-200"
                            }
                          >
                            {fee.isPaid ? "Paid" : isOverdue ? "Overdue" : "Pending"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Fee summary */}
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Total Fees</p>
                <p className="text-lg font-bold text-blue-600">
                  {fmt(totalFees, school?.currency as CurrencyCode)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="text-lg font-bold text-green-600">
                  {fmt(totalPaid, school?.currency as CurrencyCode)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className="text-lg font-bold text-orange-600">
                  {fmt(balance, school?.currency as CurrencyCode)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <DollarSign className="size-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No fee records yet</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Student</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-medium">
              {student.firstName} {student.lastName}
            </span>
            ? This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
