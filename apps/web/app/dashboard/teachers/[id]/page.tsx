"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter, useParams } from "next/navigation";
import {
  TeacherIcon,
  ArrowLeft01Icon,
  PencilEdit01Icon,
  Delete02Icon,
  BookmarkAdd01Icon,
  UserGroupIcon,
  Mail01Icon,
  Phone01Icon,
  CalendarIcon,
  Cancel01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useAuth } from "@/lib/auth-context";
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

interface ClassInfo {
  id: string;
  name: string;
  level?: string | null;
  _count?: { students: number };
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  isActive: boolean;
}

interface TeacherDetail {
  id: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  classes: ClassInfo[];
  createdAt: string;
}

export default function TeacherDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { school } = useAuth();

  const teacherId = params.id as string;

  const [teacher, setTeacher] = useState<TeacherDetail | null>(null);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch teacher details
  const fetchTeacher = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<{ teacher: TeacherDetail }>(`/teachers/${teacherId}`);
      setTeacher(data.teacher);

      // Fetch students for teacher's classes
      if (data.teacher.classes.length > 0) {
        const studentsPromises = data.teacher.classes.map((cls) =>
          api.get<{ class: { students: Student[] } }>(`/classes/${cls.id}`)
        );
        const studentsData = await Promise.all(studentsPromises);
        const students = studentsData.flatMap((d) => d.class.students);
        setAllStudents(students);
      }
    } catch (error) {
      console.error("Failed to fetch teacher:", error);
      toast.error("Failed to load teacher details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacher();
  }, [teacherId]);

  // Handle delete
  const handleDelete = async () => {
    if (!teacher) return;
    setIsDeleting(true);
    try {
      await api.delete(`/teachers/${teacherId}`);
      toast.success("Teacher deleted successfully");
      router.push("/dashboard/teachers");
    } catch (error) {
      const err = error instanceof ApiError ? error.message : "Failed to delete teacher";
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

  if (!teacher) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        <h1 className="text-2xl font-bold mb-2">Teacher not found</h1>
        <Button onClick={() => router.push("/dashboard/teachers")} className="mt-4">
          Back to Teachers
        </Button>
      </div>
    );
  }

  const totalClasses = teacher.classes.length;
  const totalStudents = teacher.classes.reduce((sum, cls) => sum + (cls._count?.students || 0), 0);
  const activeStudents = allStudents.filter((s) => s.isActive).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-indigo-50 p-4 md:p-6">
      {/* Back Button */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard/teachers")}
          className="mb-4 gap-2"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={20} />
          Back to Teachers
        </Button>
      </motion.div>

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-8 md:p-12 mb-6 shadow-2xl"
      >
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex items-start gap-6">
              <div className="size-24 md:size-28 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-xl flex-shrink-0 border-4 border-white/30">
                <span className="text-4xl md:text-5xl font-bold text-white">
                  {teacher.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </span>
              </div>
              <div>
                <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">{teacher.name}</h1>
                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2 text-white/90">
                    <HugeiconsIcon icon={Mail01Icon} size={18} />
                    <span className="text-sm md:text-base">{teacher.email}</span>
                  </div>
                  {teacher.phone && (
                    <div className="flex items-center gap-2 text-white/90">
                      <HugeiconsIcon icon={Phone01Icon} size={18} />
                      <span className="text-sm md:text-base">{teacher.phone}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge
                    className={
                      teacher.isActive
                        ? "bg-green-500/90 text-white border-green-300 shadow-lg"
                        : "bg-orange-500/90 text-white border-orange-300 shadow-lg"
                    }
                  >
                    {teacher.isActive ? "Active" : "On Leave"}
                  </Badge>
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm shadow-lg">
                    {totalClasses} {totalClasses === 1 ? "Class" : "Classes"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => router.push(`/dashboard/teachers/${teacherId}/edit`)}
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
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg">
            <div className="absolute top-0 right-0 opacity-10">
              <HugeiconsIcon icon={BookmarkAdd01Icon} size={80} />
            </div>
            <div className="relative z-10">
              <p className="text-sm font-medium text-blue-100">Classes Teaching</p>
              <p className="text-4xl font-bold mt-2">{totalClasses}</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-6 text-white shadow-lg">
            <div className="absolute top-0 right-0 opacity-10">
              <HugeiconsIcon icon={UserGroupIcon} size={80} />
            </div>
            <div className="relative z-10">
              <p className="text-sm font-medium text-purple-100">Total Students</p>
              <p className="text-4xl font-bold mt-2">{totalStudents}</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500 to-green-600 p-6 text-white shadow-lg">
            <div className="absolute top-0 right-0 opacity-10">
              <HugeiconsIcon icon={Tick02Icon} size={80} />
            </div>
            <div className="relative z-10">
              <p className="text-sm font-medium text-green-100">Active Students</p>
              <p className="text-4xl font-bold mt-2">{activeStudents}</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 text-white shadow-lg">
            <div className="absolute top-0 right-0 opacity-10">
              <HugeiconsIcon icon={CalendarIcon} size={80} />
            </div>
            <div className="relative z-10">
              <p className="text-sm font-medium text-indigo-100">Status</p>
              <p className="text-sm font-bold mt-2">{teacher.isActive ? "Active" : "On Leave"}</p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Teacher Info */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-1"
        >
          <Card className="shadow-lg border-2">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-indigo-50">
                  <HugeiconsIcon icon={TeacherIcon} size={24} className="text-indigo-600" />
                </div>
                <h2 className="text-xl font-bold">Teacher Info</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 py-3 border-b">
                  <HugeiconsIcon icon={Mail01Icon} size={20} className="text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-semibold text-sm truncate">{teacher.email}</p>
                  </div>
                </div>

                {teacher.phone && (
                  <div className="flex items-center gap-3 py-3 border-b">
                    <HugeiconsIcon icon={Phone01Icon} size={20} className="text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="font-semibold">{teacher.phone}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 py-3 border-b">
                  <HugeiconsIcon icon={BookmarkAdd01Icon} size={20} className="text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Classes</p>
                    <p className="font-semibold">{totalClasses}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 py-3 border-b">
                  <HugeiconsIcon icon={UserGroupIcon} size={20} className="text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Students</p>
                    <p className="font-semibold">{totalStudents}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 py-3">
                  <HugeiconsIcon icon={CalendarIcon} size={20} className="text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Joined</p>
                    <p className="font-semibold text-sm">
                      {new Date(teacher.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Column - Classes & Students */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Classes */}
          <Card className="shadow-lg border-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-blue-50">
                    <HugeiconsIcon icon={BookmarkAdd01Icon} size={24} className="text-blue-600" />
                  </div>
                  <h2 className="text-xl font-bold">Classes</h2>
                </div>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {totalClasses}
                </Badge>
              </div>

              {teacher.classes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
                    <HugeiconsIcon icon={BookmarkAdd01Icon} size={48} className="text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No classes assigned yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {teacher.classes.map((cls, index) => (
                    <motion.div
                      key={cls.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.7 + index * 0.05 }}
                      className="group relative overflow-hidden rounded-xl border-2 hover:border-brand/50 transition-all hover:shadow-lg bg-gradient-to-br from-white to-brand/5 cursor-pointer"
                      onClick={() => router.push(`/dashboard/classes/${cls.id}`)}
                    >
                      <div className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="size-12 rounded-lg bg-gradient-to-br from-brand to-purple-600 flex items-center justify-center shadow-md">
                            <span className="text-sm font-bold text-white">
                              {cls.name.substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold truncate">{cls.name}</p>
                            {cls.level && (
                              <p className="text-xs text-muted-foreground capitalize">{cls.level}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t">
                          <span className="text-sm text-muted-foreground">Students</span>
                          <Badge variant="secondary">{cls._count?.students || 0}</Badge>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Students */}
          <Card className="shadow-lg border-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-purple-50">
                    <HugeiconsIcon icon={UserGroupIcon} size={24} className="text-purple-600" />
                  </div>
                  <h2 className="text-xl font-bold">All Students</h2>
                </div>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {allStudents.length}
                </Badge>
              </div>

              {allStudents.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
                    <HugeiconsIcon icon={UserGroupIcon} size={48} className="text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No students yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
                  {allStudents.map((student, index) => (
                    <motion.div
                      key={student.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 + index * 0.03 }}
                      className="group flex items-center gap-3 p-3 rounded-lg border hover:border-brand/50 transition-all hover:shadow-md cursor-pointer"
                      onClick={() => router.push(`/dashboard/students/${student.id}`)}
                    >
                      <div className="size-10 rounded-full bg-gradient-to-br from-brand to-purple-600 flex items-center justify-center shadow-sm flex-shrink-0">
                        <span className="text-xs font-bold text-white">
                          {student.firstName[0]}
                          {student.lastName[0]}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{student.admissionNumber}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          student.isActive
                            ? "bg-green-50 text-green-700 border-green-200 text-xs"
                            : "bg-gray-50 text-gray-700 border-gray-200 text-xs"
                        }
                      >
                        {student.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Teacher</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete <strong>{teacher.name}</strong>?
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
                    <HugeiconsIcon icon={Delete02Icon} size={16} className="mr-2" />
                    Delete
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
