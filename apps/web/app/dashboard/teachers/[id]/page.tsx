"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Trash2,
  BookmarkPlus,
  Mail,
  Calendar,
  GraduationCap,
  Loader2,
  Download,
  FileDown,
  AlertCircle,
} from "lucide-react";
import { DashboardBreadcrumbs } from "@/components/dashboard";
import { useAuth } from "@/lib/auth-context";
import { canEditEntity } from "@/lib/roles";
import { useTeacher, useDeleteTeacher } from "@/lib/hooks/use-teachers";
import { ApiError } from "@/lib/api";
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
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}


export default function TeacherDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();

  const teacherId = params.id as string;
  const canEdit = canEditEntity(user?.role, "teacher");

  // Data fetching
  const { data: teacherData, isLoading } = useTeacher(teacherId);
  const deleteMutation = useDeleteTeacher();

  const teacher = teacherData?.teacher || null;

  // Delete state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate(teacherId, {
      onSuccess: () => {
        toast.success("Teacher deleted successfully");
        router.push("/dashboard/teachers");
      },
      onError: (err) => {
        const error = err instanceof ApiError ? err.message : "Failed to delete teacher";
        toast.error(error);
        setShowDeleteDialog(false);
      },
    });
  };

  const handleExportCSV = () => {
    if (!teacher) return;

    const classesData = teacher.classesTeaching?.map((tc: any) => ({
      class: tc.class.name,
      subject: tc.subject?.name || "—",
      students: tc.class._count?.students || 0,
      level: tc.class.level || "—",
    })) || [];

    if (classesData.length === 0) return;

    exportToCSV(
      classesData,
      [
        { key: "class", label: "Class" },
        { key: "subject", label: "Subject" },
        { key: "students", label: "Students" },
        { key: "level", label: "Level" },
      ],
      `teacher-${teacher.name.replace(/\s+/g, "-")}-classes-${new Date().toISOString().split("T")[0]}`
    );
  };

  const handleExportPDF = () => {
    if (!teacher) return;

    const classesData = teacher.classesTeaching?.map((tc: any) => ({
      class: tc.class.name,
      subject: tc.subject?.name || "—",
      students: tc.class._count?.students || 0,
    })) || [];

    if (classesData.length === 0) return;

    exportToPDF(
      classesData,
      [
        { key: "class", label: "Class" },
        { key: "subject", label: "Subject" },
        { key: "students", label: "Students" },
      ],
      `teacher-${teacher.name.replace(/\s+/g, "-")}-classes-${new Date().toISOString().split("T")[0]}`,
      `Classes taught by ${teacher.name}`
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="size-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="space-y-6">
        <DashboardBreadcrumbs
          items={[
            { label: "Teachers", href: "/dashboard/teachers" },
            { label: "Not Found" },
          ]}
        />
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>Teacher not found</AlertDescription>
        </Alert>
        <Button onClick={() => router.push("/dashboard/teachers")}>
          Back to Teachers
        </Button>
      </div>
    );
  }

  const uniqueClasses = teacher.classesTeaching || [];
  const totalClasses = uniqueClasses.length;
  const totalSubjects = teacher.teacherSubjects?.length || 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <DashboardBreadcrumbs
        items={[
          { label: "Teachers", href: "/dashboard/teachers" },
          { label: teacher.name },
        ]}
      />

      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push("/dashboard/teachers")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{teacher.name}</h1>
          <p className="text-sm text-muted-foreground">{teacher.email}</p>
        </div>
      </div>

      {/* Teacher info card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Main info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Teacher Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Avatar and basic info */}
            <div className="flex items-start gap-4">
              <div className="size-20 rounded-lg bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                {getInitials(teacher.name)}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{teacher.name}</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Mail className="size-4" />
                  {teacher.email}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Badge
                    variant="outline"
                    className={
                      teacher.isActive
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-gray-50 text-gray-700 border-gray-200"
                    }
                  >
                    {teacher.isActive ? "Active" : "On Leave"}
                  </Badge>
                  {teacher.level && (
                    <Badge variant="outline" className="capitalize">
                      {teacher.level} School
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Email
                </p>
                <p className="text-sm font-medium mt-1">{teacher.email}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Level
                </p>
                <p className="text-sm font-medium mt-1 capitalize">
                  {teacher.level ? `${teacher.level} School` : "Not set"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Classes
                </p>
                <p className="text-sm font-medium mt-1">{totalClasses}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Subjects
                </p>
                <p className="text-sm font-medium mt-1">{totalSubjects}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Status
                </p>
                <p className="text-sm font-medium mt-1">
                  {teacher.isActive ? "Active" : "On Leave"}
                </p>
              </div>
            </div>

            {/* Subjects */}
            {totalSubjects > 0 && (
              <div className="pt-4 border-t">
                <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
                  Teaching Subjects
                </p>
                <div className="flex flex-wrap gap-2">
                  {teacher.teacherSubjects?.map((ts: any) => (
                    <Badge key={ts.id} variant="secondary">
                      {ts.subject.name}
                      {ts.subject.level && (
                        <span className="text-[10px] opacity-70 ml-1 capitalize">
                          • {ts.subject.level}
                        </span>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Created date */}
            {teacher.createdAt && (
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="size-4" />
                  <span>
                    Joined {new Date(teacher.createdAt).toLocaleDateString()}
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
                onClick={() => router.push(`/dashboard/teachers/${teacherId}/edit`)}
              >
                <GraduationCap className="size-4" />
                Edit Teacher
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleExportCSV}
              disabled={totalClasses === 0}
            >
              <Download className="size-4" />
              Export as CSV
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleExportPDF}
              disabled={totalClasses === 0}
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
                Delete Teacher
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Classes table */}
      {totalClasses > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookmarkPlus className="size-5" />
              Classes ({totalClasses})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Class</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead className="text-right">Students</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uniqueClasses.map((tc: any) => (
                    <TableRow
                      key={tc.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => router.push(`/dashboard/classes/${tc.class.id}`)}
                    >
                      <TableCell className="font-medium">
                        {tc.class.name}
                      </TableCell>
                      <TableCell className="text-sm">
                        {tc.subject?.name || "—"}
                      </TableCell>
                      <TableCell className="text-sm capitalize">
                        {tc.class.level || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">
                          {tc.class._count?.students || 0}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <BookmarkPlus className="size-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No classes assigned to this teacher</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Teacher</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-medium">{teacher.name}</span>? This action
            cannot be undone.
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
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
