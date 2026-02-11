"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  BookmarkPlus,
  User,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  MapPin,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { fmt, type CurrencyCode } from "@/lib/currency";
import { DashboardBreadcrumbs } from "@/components/dashboard";
import { canEditEntity } from "@/lib/roles";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

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
  const [isDeleting, setIsDeleting] = useState(false);

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
  const handleDelete = async () => {
    if (!student) return;
    setIsDeleting(true);
    try {
      await api.delete(`/students/${studentId}`);
      toast.success("Student deleted successfully");
      router.push("/dashboard/students");
    } catch (error) {
      const err = error instanceof ApiError ? error.message : "Failed to delete student";
      toast.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="size-12 rounded-full border-4 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        <h1 className="text-2xl font-semibold text-foreground mb-2">Student not found</h1>
        <Button onClick={() => router.push("/dashboard/students")} className="mt-4">
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
  const paidFees = student.fees?.filter((f) => f.isPaid).length || 0;
  const pendingFees = (student.fees?.length || 0) - paidFees;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <DashboardBreadcrumbs
        items={[
          { label: "Students", href: "/dashboard/students" },
          { label: `${student.firstName} ${student.lastName}` },
        ]}
      />

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand via-purple-600 to-pink-600 p-8 md:p-12 mb-6 shadow-2xl"
      >
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex items-start gap-6">
              <div className="size-24 md:size-28 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-xl flex-shrink-0 border-4 border-white/30">
                <span className="text-4xl md:text-5xl font-bold text-white">
                  {student.firstName[0]}
                  {student.lastName[0]}
                </span>
              </div>
              <div>
                <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">
                  {student.firstName} {student.lastName}
                </h1>
                <p className="text-lg text-white/90 font-mono mb-3">{student.admissionNumber}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge
                    className={
                      student.isActive
                        ? "bg-green-500/90 text-white border-green-300 shadow-lg"
                        : "bg-gray-500/90 text-white border-gray-300 shadow-lg"
                    }
                  >
                    {student.isActive ? "Active" : "Inactive"}
                  </Badge>
                  {student.gender && (
                    <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm shadow-lg capitalize">
                      {student.gender}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {canEdit && (
              <div className="flex gap-2">
                <Button
                  onClick={() => router.push(`/dashboard/students/${studentId}/edit`)}
                  variant="secondary"
                  className="gap-2 shadow-lg"
                >
                  <Pencil className="size-5" />
                  Edit
                </Button>
                <Button
                  onClick={() => setShowDeleteDialog(true)}
                  variant="destructive"
                  className="gap-2 shadow-lg"
                >
                  <Trash2 className="size-5" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500 to-green-600 p-6 text-white shadow-lg">
            <div className="absolute top-0 right-0 opacity-10">
              <DollarSign className="size-20" />
            </div>
            <div className="relative z-10">
              <p className="text-sm font-medium text-green-100">Total Fees</p>
              <p className="text-3xl font-semibold mt-2">{fmt(totalFees, school?.currency as CurrencyCode)}</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg">
            <div className="absolute top-0 right-0 opacity-10">
              <CheckCircle className="size-20" />
            </div>
            <div className="relative z-10">
              <p className="text-sm font-medium text-blue-100">Paid</p>
              <p className="text-3xl font-semibold mt-2">{fmt(totalPaid, school?.currency as CurrencyCode)}</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-white shadow-lg">
            <div className="absolute top-0 right-0 opacity-10">
              <XCircle className="size-20" />
            </div>
            <div className="relative z-10">
              <p className="text-sm font-medium text-orange-100">Balance</p>
              <p className="text-3xl font-semibold mt-2">{fmt(balance, school?.currency as CurrencyCode)}</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-6 text-white shadow-lg">
            <div className="absolute top-0 right-0 opacity-10">
              <BookmarkPlus className="size-20" />
            </div>
            <div className="relative z-10">
              <p className="text-sm font-medium text-purple-100">Class</p>
              <p className="text-sm font-bold mt-2 truncate">{student.class?.name || "Not assigned"}</p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Personal Info */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-1 space-y-6"
        >
          {/* Personal Information */}
          <Card className="shadow-lg border-2">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-brand/10">
                  <User className="size-6 text-brand" />
                </div>
                <h2 className="text-xl font-bold">Personal Info</h2>
              </div>

              <div className="space-y-4">
                {student.dateOfBirth && (
                  <div className="flex items-center gap-3 py-3 border-b">
                    <Calendar className="size-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Date of Birth</p>
                      <p className="font-semibold">
                        {new Date(student.dateOfBirth).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}

                {student.email && (
                  <div className="flex items-center gap-3 py-3 border-b">
                    <Mail className="size-5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-semibold text-sm truncate">{student.email}</p>
                    </div>
                  </div>
                )}

                {student.phone && (
                  <div className="flex items-center gap-3 py-3 border-b">
                    <Phone className="size-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="font-semibold">{student.phone}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 py-3">
                  <Calendar className="size-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Enrolled</p>
                    <p className="font-semibold text-sm">
                      {new Date(student.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Class Info */}
          {student.class && (
            <Card className="shadow-lg border-2 border-brand/20 bg-gradient-to-br from-brand/5 to-purple-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-brand/10">
                    <BookmarkPlus className="size-6 text-brand" />
                  </div>
                  <h2 className="text-xl font-bold">Class</h2>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Class Name</span>
                    <span className="font-bold text-brand">{student.class.name}</span>
                  </div>

                  {student.class.classTeacher && (
                    <div className="flex items-center justify-between pt-3 border-t">
                      <span className="text-sm text-muted-foreground">Teacher</span>
                      <span className="font-semibold text-sm">{student.class.classTeacher.name}</span>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    className="w-full mt-4 border-brand/30 hover:bg-brand/10"
                    onClick={() => router.push(`/dashboard/classes/${student.class?.id}`)}
                  >
                    View Class Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Right Column - Parent & Fees */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Parent Information */}
          {student.parent && (
            <Card className="shadow-lg border-2">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-purple-50">
                      <User className="size-6 text-purple-600" />
                    </div>
                    <h2 className="text-xl font-bold">Parent / Guardian</h2>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => router.push(`/dashboard/parents/${student.parent?.id}`)}
                  >
                    View Profile
                  </Button>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-100">
                  <div className="size-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md flex-shrink-0">
                    <span className="text-2xl font-bold text-white">
                      {student.parent.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold mb-1">{student.parent.name}</p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="size-3.5" />
                        <span className="truncate">{student.parent.email}</span>
                      </div>
                      {student.parent.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="size-3.5" />
                          <span>{student.parent.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Fee Records */}
          <Card className="shadow-lg border-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-green-50">
                    <DollarSign className="size-6 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Fee Records</h2>
                    <p className="text-sm text-muted-foreground">
                      {paidFees} paid • {pendingFees} pending
                    </p>
                  </div>
                </div>
              </div>

              {!student.fees || student.fees.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
                    <DollarSign className="size-12 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No fee records yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {student.fees.slice(0, 5).map((fee, index) => {
                    const paid = fee.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
                    const remaining = fee.amount - paid;
                    const isOverdue = !fee.isPaid && new Date(fee.dueDate) < new Date();

                    return (
                      <motion.div
                        key={fee.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 + index * 0.05 }}
                        className={`p-4 rounded-xl border-2 transition-all ${fee.isPaid
                          ? "bg-green-50 border-green-200"
                          : isOverdue
                            ? "bg-red-50 border-red-200"
                            : "bg-orange-50 border-orange-200"
                          }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Badge
                              variant={fee.isPaid ? "default" : "destructive"}
                              className={fee.isPaid ? "bg-green-600" : isOverdue ? "bg-red-600" : "bg-orange-600"}
                            >
                              {fee.isPaid ? "Paid" : isOverdue ? "Overdue" : "Pending"}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              Due: {new Date(fee.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                          <span className="text-xl font-bold">${fee.amount.toFixed(2)}</span>
                        </div>
                        {!fee.isPaid && (
                          <div className="mt-2 pt-2 border-t">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Paid: ${paid.toFixed(2)}</span>
                              <span className="font-semibold text-orange-700">
                                Balance: ${remaining.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Delete Confirmation Dialog - Only shown if user has edit permissions */}
      {canEdit && (
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Student</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete{" "}
                  <strong>
                    {student.firstName} {student.lastName}
                  </strong>
                  ?
                </p>
                <p className="text-xs text-destructive/80">
                  This action cannot be undone. All associated data will be removed.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDeleteDialog(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <div className="size-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="size-4 mr-2" />
                      Delete
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
