"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
  BookmarkAdd01Icon,
  ArrowLeft01Icon,
  PencilEdit01Icon,
  Delete02Icon,
  TeacherIcon,
  UserGroupIcon,
  Cancel01Icon,
  Tick02Icon,
  Add01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useAuth } from "@/lib/auth-context";
import { canEditEntity } from "@/lib/roles";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { AddStudentDialog } from "@/components/dialogs/add-student-dialog";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  isActive: boolean;
}

interface ClassDetail {
  id: string;
  name: string;
  level?: string | null;
  isActive: boolean;
  classTeacher?: { id: string; name: string; email: string } | null;
  teachers: {
    id: string;
    teacher: { id: string; name: string; email: string };
    subject: { id: string; name: string } | null;
  }[];
  students: Student[];
  createdAt: string;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
}

export default function ClassDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const classId = params.id as string;
  const isEditMode = searchParams.get("edit") === "true";
  const canEdit = canEditEntity(user?.role, "class");

  const [classData, setClassData] = useState<ClassDetail | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAddStudentDialog, setShowAddStudentDialog] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    level: "",
    classTeacherId: "",
  });

  // Fetch class details
  const fetchClass = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<{ class: ClassDetail }>(`/classes/${classId}`);
      setClassData(data.class);
      setFormData({
        name: data.class.name,
        level: data.class.level || "",
        classTeacherId: data.class.classTeacher?.id || "none",
      });
    } catch (error) {
      console.error("Failed to fetch class:", error);
      toast.error("Failed to load class details");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch teachers
  const fetchTeachers = async () => {
    try {
      const data = await api.get<{ teachers: Teacher[] }>("/teachers");
      setTeachers(data.teachers);
    } catch (error) {
      console.error("Failed to fetch teachers:", error);
    }
  };

  useEffect(() => {
    fetchClass();
    fetchTeachers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  // Handle save
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const dataToSave = {
        name: formData.name,
        level: formData.level || null,
        classTeacherId: formData.classTeacherId === "none" ? null : formData.classTeacherId || null,
      };
      await api.patch(`/classes/${classId}`, dataToSave);
      toast.success("Class updated successfully!");
      setIsEditing(false);
      await fetchClass();
    } catch (error) {
      const err = error instanceof ApiError ? error.message : "Failed to update class";
      toast.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/classes/${classId}`);
      toast.success("Class deleted successfully");
      router.push("/dashboard/classes");
    } catch (error) {
      const err = error instanceof ApiError ? error.message : "Failed to delete class";
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

  if (!classData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        <h1 className="text-2xl font-bold mb-2">Class not found</h1>
        <Button onClick={() => router.push("/dashboard/classes")} className="mt-4">
          Back to Classes
        </Button>
      </div>
    );
  }

  const activeStudents = classData.students.filter((s) => s.isActive).length;
  const inactiveStudents = classData.students.length - activeStudents;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-brand/5 p-4 md:p-6">
      {/* Back Button */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard/classes")}
          className="mb-4 gap-2"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={20} />
          Back to Classes
        </Button>
      </motion.div>

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
              <div className="size-20 md:size-24 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-xl flex-shrink-0 border-2 border-white/30">
                <span className="text-3xl md:text-4xl font-bold text-white">
                  {classData.name.substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                {isEditing ? (
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="text-3xl md:text-4xl font-bold text-white bg-white/20 border-white/30 mb-3"
                  />
                ) : (
                  <h1 className="text-3xl md:text-5xl font-bold text-white mb-3">
                    {classData.name}
                  </h1>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <Badge
                    className={
                      classData.isActive
                        ? "bg-green-500/90 text-white border-green-300 shadow-lg"
                        : "bg-gray-500/90 text-white border-gray-300 shadow-lg"
                    }
                  >
                    {classData.isActive ? "Active" : "Inactive"}
                  </Badge>
                  {classData.level && (
                    <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm shadow-lg capitalize">
                      {classData.level}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {canEdit && !isEditing ? (
                <>
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="secondary"
                    className="gap-2 shadow-lg"
                  >
                    <HugeiconsIcon icon={PencilEdit01Icon} size={20} />
                    Edit
                  </Button>
                  <Button
                    onClick={() => setShowDeleteDialog(true)}
                    variant="destructive"
                    className="gap-2 shadow-lg"
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={20} />
                    Delete
                  </Button>
                </>
              ) : canEdit && isEditing ? (
                <>
                  <Button
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        name: classData.name,
                        level: classData.level || "",
                        classTeacherId: classData.classTeacher?.id || "",
                      });
                    }}
                    variant="secondary"
                    className="gap-2"
                    disabled={isSaving}
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={20} />
                    Cancel
                  </Button>
                  <Button onClick={handleSave} className="gap-2" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <div className="size-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <HugeiconsIcon icon={Tick02Icon} size={20} />
                        Save
                      </>
                    )}
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg">
            <div className="absolute top-0 right-0 opacity-10">
              <HugeiconsIcon icon={UserGroupIcon} size={80} />
            </div>
            <div className="relative z-10">
              <p className="text-sm font-medium text-blue-100">Total Students</p>
              <p className="text-4xl font-bold mt-2">{classData.students.length}</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500 to-green-600 p-6 text-white shadow-lg">
            <div className="absolute top-0 right-0 opacity-10">
              <HugeiconsIcon icon={Tick02Icon} size={80} />
            </div>
            <div className="relative z-10">
              <p className="text-sm font-medium text-green-100">Active</p>
              <p className="text-4xl font-bold mt-2">{activeStudents}</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-white shadow-lg">
            <div className="absolute top-0 right-0 opacity-10">
              <HugeiconsIcon icon={Cancel01Icon} size={80} />
            </div>
            <div className="relative z-10">
              <p className="text-sm font-medium text-orange-100">Inactive</p>
              <p className="text-4xl font-bold mt-2">{inactiveStudents}</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-6 text-white shadow-lg">
            <div className="absolute top-0 right-0 opacity-10">
              <HugeiconsIcon icon={TeacherIcon} size={80} />
            </div>
            <div className="relative z-10">
              <p className="text-sm font-medium text-purple-100">Teacher</p>
              <p className="text-sm font-bold mt-2 truncate">
                {classData.classTeacher?.name || "Not assigned"}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Class Info */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-1"
        >
          <Card className="shadow-lg border-2">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-brand/10">
                  <HugeiconsIcon icon={BookmarkAdd01Icon} size={24} className="text-brand" />
                </div>
                <h2 className="text-xl font-bold">Class Information</h2>
              </div>

              <div className="space-y-4">
                {isEditing ? (
                  <>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Level</Label>
                      <Select
                        value={formData.level}
                        onValueChange={(value) => setFormData({ ...formData, level: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select level..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="primary">Primary</SelectItem>
                          <SelectItem value="secondary">Secondary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Class Teacher</Label>
                      <Select
                        value={formData.classTeacherId}
                        onValueChange={(value) => setFormData({ ...formData, classTeacherId: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select teacher..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {teachers.map((teacher) => (
                            <SelectItem key={teacher.id} value={teacher.id}>
                              {teacher.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between py-3 border-b">
                      <span className="text-sm font-medium text-muted-foreground">Level</span>
                      <span className="font-semibold capitalize">{classData.level || "—"}</span>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b">
                      <span className="text-sm font-medium text-muted-foreground">Status</span>
                      <Badge variant={classData.isActive ? "default" : "secondary"}>
                        {classData.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b">
                      <span className="text-sm font-medium text-muted-foreground">Students</span>
                      <span className="font-semibold">{classData.students.length}</span>
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm font-medium text-muted-foreground">Created</span>
                      <span className="font-semibold text-sm">
                        {new Date(classData.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Class Teacher Card */}
              {classData.classTeacher && !isEditing && (
                <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-brand/10 to-purple-50 border-2 border-brand/20">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Class Teacher</p>
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md">
                      <span className="text-lg font-bold text-white">
                        {classData.classTeacher.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{classData.classTeacher.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {classData.classTeacher.email}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push(`/dashboard/teachers/${classData.classTeacher?.id}`)}
                    >
                      View
                    </Button>
                  </div>
                </div>
              )}

              {/* Subject Teachers */}
              {!isEditing && classData.teachers && classData.teachers.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs font-medium text-muted-foreground mb-3">Subject Teachers</p>
                  <div className="space-y-2">
                    {classData.teachers.map((ta) => (
                      <div
                        key={ta.id}
                        className="flex items-center gap-3 p-3 rounded-lg border hover:border-brand/30 transition-colors cursor-pointer"
                        onClick={() => router.push(`/dashboard/teachers/${ta.teacher.id}`)}
                      >
                        <div className="size-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-sm">
                          <span className="text-xs font-bold text-white">
                            {ta.teacher.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{ta.teacher.name}</p>
                          {ta.subject && (
                            <p className="text-xs text-muted-foreground">{ta.subject.name}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Column - Students List */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="lg:col-span-2"
        >
          <Card className="shadow-lg border-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-blue-50">
                    <HugeiconsIcon icon={UserGroupIcon} size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Students</h2>
                    <p className="text-sm text-muted-foreground">
                      {classData.students.length} student{classData.students.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                {canEdit && (
                  <Button
                    onClick={() => setShowAddStudentDialog(true)}
                    size="sm"
                    className="gap-2"
                  >
                    <HugeiconsIcon icon={Add01Icon} size={16} />
                    Add Student
                  </Button>
                )}
              </div>

              {classData.students.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
                    <HugeiconsIcon icon={UserGroupIcon} size={48} className="text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-4">No students in this class yet</p>
                  {canEdit && (
                    <Button
                      onClick={() => setShowAddStudentDialog(true)}
                      variant="outline"
                      className="gap-2"
                    >
                      <HugeiconsIcon icon={Add01Icon} size={16} />
                      Add First Student
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {classData.students.map((student, index) => (
                    <motion.div
                      key={student.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + index * 0.05 }}
                      className="group relative overflow-hidden rounded-xl border-2 hover:border-brand/50 transition-all hover:shadow-md"
                    >
                      <div className="flex items-center gap-4 p-4">
                        <div className="size-12 rounded-full bg-gradient-to-br from-brand to-purple-600 flex items-center justify-center shadow-md flex-shrink-0">
                          <span className="text-sm font-bold text-white">
                            {student.firstName[0]}
                            {student.lastName[0]}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground font-mono">
                            {student.admissionNumber}
                          </p>
                        </div>
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
                        <Button
                          size="sm"
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => router.push(`/dashboard/students/${student.id}`)}
                        >
                          View
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Add Student Dialog */}
      <AddStudentDialog
        open={showAddStudentDialog}
        onOpenChange={setShowAddStudentDialog}
        preSelectedClassId={classId}
        onSuccess={() => {
          // Refresh class data to show the new student
          fetchClass();
        }}
      />

      {/* Delete Confirmation Dialog - Only shown if user has edit permissions */}
      {canEdit && (
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Class</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete <strong>{classData.name}</strong>?
                </p>
                <p className="text-xs text-destructive/80">
                  This action cannot be undone. All students will be unassigned from this class.
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
                      <HugeiconsIcon icon={Delete02Icon} size={16} className="mr-2" />
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
