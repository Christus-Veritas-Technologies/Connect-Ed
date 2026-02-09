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
  Mail01Icon,
  CalendarIcon,
  Cancel01Icon,
  Tick02Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useAuth } from "@/lib/auth-context";
import { canEditEntity } from "@/lib/roles";
import { useTeacher, useUpdateTeacher, useDeleteTeacher } from "@/lib/hooks/use-teachers";
import { useClasses } from "@/lib/hooks/use-classes";
import { useSubjects } from "@/lib/hooks/use-subjects";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function TeacherDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();

  const teacherId = params.id as string;
  const canEdit = canEditEntity(user?.role, "teacher");

  // Data fetching
  const { data: teacherData, isLoading } = useTeacher(teacherId);
  const { data: classesData } = useClasses();
  const { data: subjectsData } = useSubjects();
  const updateMutation = useUpdateTeacher();
  const deleteMutation = useDeleteTeacher();

  const teacher = teacherData?.teacher || null;
  const allClasses = classesData?.classes || [];
  const allSubjects = subjectsData?.subjects || [];

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    level: "" as string,
    classIds: [] as string[],
    subjectIds: [] as string[],
    isActive: true,
  });
  const [classSearch, setClassSearch] = useState("");
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Populate edit form when teacher data loads
  useEffect(() => {
    if (teacher) {
      const nameParts = teacher.name.split(" ");
      setEditForm({
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        email: teacher.email,
        level: teacher.level || "",
        classIds: teacher.classesTeaching?.map((tc) => tc.class.id) || [],
        subjectIds: teacher.teacherSubjects?.map((ts) => ts.subject.id) || [],
        isActive: teacher.isActive,
      });
    }
  }, [teacher]);

  // Filter subjects by level
  const filteredSubjects = editForm.level
    ? allSubjects.filter((s) => s.level === editForm.level || !s.level)
    : [];

  // Filter classes for search dropdown
  const filteredClasses = classSearch
    ? allClasses.filter(
        (cls) =>
          cls.name.toLowerCase().includes(classSearch.toLowerCase()) &&
          !editForm.classIds.includes(cls.id)
      )
    : [];

  const handleSave = () => {
    if (!teacher) return;

    updateMutation.mutate(
      {
        id: teacherId,
        data: {
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          email: editForm.email,
          level: editForm.level || undefined,
          isActive: editForm.isActive,
          classIds: editForm.classIds,
          subjectIds: editForm.subjectIds,
        },
      },
      {
        onSuccess: () => {
          setIsEditing(false);
          toast.success("Teacher updated successfully");
        },
        onError: (err) => {
          const error = err instanceof ApiError ? err.message : "Failed to update teacher";
          toast.error(error);
        },
      }
    );
  };

  const handleDelete = () => {
    deleteMutation.mutate(teacherId, {
      onSuccess: () => {
        toast.success("Teacher deleted successfully");
        router.push("/dashboard/teachers");
      },
      onError: (err) => {
        const error = err instanceof ApiError ? err.message : "Failed to delete teacher";
        toast.error(error);
      },
    });
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
        <h1 className="text-2xl font-semibold text-foreground mb-2">Teacher not found</h1>
        <Button onClick={() => router.push("/dashboard/teachers")} className="mt-4">
          Back to Teachers
        </Button>
      </div>
    );
  }

  const uniqueClasses = teacher.classesTeaching || [];
  const totalClasses = uniqueClasses.length;
  const totalSubjects = teacher.teacherSubjects?.length || 0;

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
                {isEditing ? (
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={editForm.firstName}
                      onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                      className="bg-white/20 border-white/30 text-white placeholder:text-white/60 text-xl font-bold"
                      placeholder="First name"
                    />
                    <Input
                      value={editForm.lastName}
                      onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                      className="bg-white/20 border-white/30 text-white placeholder:text-white/60 text-xl font-bold"
                      placeholder="Last name"
                    />
                  </div>
                ) : (
                  <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">{teacher.name}</h1>
                )}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2 text-white/90">
                    <HugeiconsIcon icon={Mail01Icon} size={18} />
                    {isEditing ? (
                      <Input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="bg-white/20 border-white/30 text-white placeholder:text-white/60 text-sm h-8 w-64"
                        placeholder="Email address"
                      />
                    ) : (
                      <span className="text-sm md:text-base">{teacher.email}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {isEditing ? (
                    <Select
                      value={editForm.isActive ? "active" : "inactive"}
                      onValueChange={(v) => setEditForm({ ...editForm, isActive: v === "active" })}
                    >
                      <SelectTrigger className="w-32 bg-white/20 border-white/30 text-white h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">On Leave</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge
                      className={
                        teacher.isActive
                          ? "bg-green-500/90 text-white border-green-300 shadow-lg"
                          : "bg-orange-500/90 text-white border-orange-300 shadow-lg"
                      }
                    >
                      {teacher.isActive ? "Active" : "On Leave"}
                    </Badge>
                  )}
                  {teacher.level && !isEditing && (
                    <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm shadow-lg capitalize">
                      {teacher.level} School
                    </Badge>
                  )}
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm shadow-lg">
                    {totalClasses} {totalClasses === 1 ? "Class" : "Classes"}
                  </Badge>
                </div>
              </div>
            </div>

            {canEdit && (
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button
                      onClick={() => setIsEditing(false)}
                      variant="secondary"
                      className="gap-2 shadow-lg"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} size={20} />
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      className="gap-2 shadow-lg bg-green-600 hover:bg-green-700"
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? (
                        <div className="size-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      ) : (
                        <HugeiconsIcon icon={Tick02Icon} size={20} />
                      )}
                      Save
                    </Button>
                  </>
                ) : (
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
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
              <HugeiconsIcon icon={TeacherIcon} size={80} />
            </div>
            <div className="relative z-10">
              <p className="text-sm font-medium text-purple-100">Subjects</p>
              <p className="text-4xl font-bold mt-2">{totalSubjects}</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 text-white shadow-lg">
            <div className="absolute top-0 right-0 opacity-10">
              <HugeiconsIcon icon={CalendarIcon} size={80} />
            </div>
            <div className="relative z-10">
              <p className="text-sm font-medium text-indigo-100">Joined</p>
              <p className="text-lg font-bold mt-2">
                {new Date(teacher.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Level, Subjects & Details */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-1 space-y-6"
        >
          {/* Level & Subjects */}
          <Card className="shadow-lg border-2 h-fit">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-purple-50">
                  <HugeiconsIcon icon={TeacherIcon} size={24} className="text-purple-600" />
                </div>
                <h2 className="text-xl font-bold">Level & Subjects</h2>
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Teaching Level</Label>
                    <Select
                      value={editForm.level}
                      onValueChange={(value) =>
                        setEditForm({ ...editForm, level: value, subjectIds: [] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select level..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primary">Primary</SelectItem>
                        <SelectItem value="secondary">Secondary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {editForm.level && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Subjects</Label>
                      <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-1">
                        {filteredSubjects.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            No subjects for this level
                          </p>
                        ) : (
                          filteredSubjects.map((subject) => {
                            const isSelected = editForm.subjectIds.includes(subject.id);
                            return (
                              <button
                                key={subject.id}
                                type="button"
                                onClick={() => {
                                  setEditForm({
                                    ...editForm,
                                    subjectIds: isSelected
                                      ? editForm.subjectIds.filter((id) => id !== subject.id)
                                      : [...editForm.subjectIds, subject.id],
                                  });
                                }}
                                className={`w-full px-3 py-2 text-left text-sm rounded-md transition-colors flex items-center justify-between ${
                                  isSelected
                                    ? "bg-brand/10 text-brand border border-brand/30"
                                    : "hover:bg-muted"
                                }`}
                              >
                                <span>{subject.name}</span>
                                {isSelected && <HugeiconsIcon icon={Tick02Icon} size={16} />}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 py-3 border-b">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Level</p>
                      <p className="font-semibold capitalize">{teacher.level ? `${teacher.level} School` : "Not set"}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Subjects</p>
                    {teacher.teacherSubjects && teacher.teacherSubjects.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {teacher.teacherSubjects.map((ts) => (
                          <Badge key={ts.id} variant="secondary">
                            {ts.subject.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No subjects assigned</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Teacher Details */}
          <Card className="shadow-lg border-2 h-fit">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-indigo-50">
                  <HugeiconsIcon icon={TeacherIcon} size={24} className="text-indigo-600" />
                </div>
                <h2 className="text-xl font-bold">Details</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 py-3 border-b">
                  <HugeiconsIcon icon={Mail01Icon} size={20} className="text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-semibold text-sm truncate">{teacher.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 py-3 border-b">
                  <HugeiconsIcon icon={BookmarkAdd01Icon} size={20} className="text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Classes</p>
                    <p className="font-semibold">{totalClasses}</p>
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

        {/* Right Column - Classes */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2"
        >
          <Card className="shadow-lg border-2 h-fit">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-blue-50">
                    <HugeiconsIcon icon={BookmarkAdd01Icon} size={24} className="text-blue-600" />
                  </div>
                  <h2 className="text-xl font-bold">Classes</h2>
                </div>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {isEditing ? editForm.classIds.length : totalClasses}
                </Badge>
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  {/* Search to add class */}
                  <div className="relative">
                    <div className="relative">
                      <HugeiconsIcon
                        icon={Search01Icon}
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      />
                      <Input
                        placeholder="Search to add a class..."
                        value={classSearch}
                        onChange={(e) => {
                          setClassSearch(e.target.value);
                          setShowClassDropdown(true);
                        }}
                        onFocus={() => setShowClassDropdown(true)}
                        className="pl-10"
                      />
                    </div>
                    {showClassDropdown && classSearch && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-border rounded-lg shadow-lg z-50 max-h-[200px] overflow-y-auto">
                        {filteredClasses.length === 0 ? (
                          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                            No matching classes
                          </div>
                        ) : (
                          filteredClasses.map((cls) => (
                            <button
                              key={cls.id}
                              type="button"
                              onClick={() => {
                                setEditForm({
                                  ...editForm,
                                  classIds: [...editForm.classIds, cls.id],
                                });
                                setClassSearch("");
                                setShowClassDropdown(false);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-muted transition-colors flex items-center justify-between"
                            >
                              <span className="text-sm">{cls.name}</span>
                              {cls.level && (
                                <Badge variant="outline" className="text-xs capitalize">
                                  {cls.level}
                                </Badge>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selected classes with X to remove */}
                  {editForm.classIds.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground text-sm">No classes assigned. Search above to add classes.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {editForm.classIds.map((classId) => {
                        const cls = allClasses.find((c) => c.id === classId);
                        if (!cls) return null;
                        return (
                          <div
                            key={classId}
                            className="flex items-center justify-between p-3 rounded-lg border-2 bg-card"
                          >
                            <div className="flex items-center gap-3">
                              <div className="size-10 rounded-lg bg-gradient-to-br from-brand to-purple-600 flex items-center justify-center shadow-sm">
                                <span className="text-xs font-bold text-white">
                                  {cls.name.substring(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-semibold text-sm">{cls.name}</p>
                                {cls.level && (
                                  <p className="text-xs text-muted-foreground capitalize">{cls.level}</p>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                              onClick={() =>
                                setEditForm({
                                  ...editForm,
                                  classIds: editForm.classIds.filter((id) => id !== classId),
                                })
                              }
                            >
                              <HugeiconsIcon icon={Cancel01Icon} size={18} />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {uniqueClasses.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
                        <HugeiconsIcon icon={BookmarkAdd01Icon} size={48} className="text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">No classes assigned yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {uniqueClasses.map((tc, index) => (
                        <motion.div
                          key={tc.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.6 + index * 0.05 }}
                          className="group relative overflow-hidden rounded-xl border-2 hover:border-brand/50 transition-all hover:shadow-lg bg-gradient-to-br from-white to-brand/5 cursor-pointer"
                          onClick={() => router.push(`/dashboard/classes/${tc.class.id}`)}
                        >
                          <div className="p-4">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="size-12 rounded-lg bg-gradient-to-br from-brand to-purple-600 flex items-center justify-center shadow-md">
                                <span className="text-sm font-bold text-white">
                                  {tc.class.name.substring(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold truncate">{tc.class.name}</p>
                                {tc.class.level && (
                                  <p className="text-xs text-muted-foreground capitalize">{tc.class.level}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-3 border-t">
                              <span className="text-sm text-muted-foreground">Students</span>
                              <Badge variant="secondary">{tc.class._count?.students || 0}</Badge>
                            </div>
                            {tc.subject && (
                              <div className="flex items-center justify-between pt-2">
                                <span className="text-sm text-muted-foreground">Subject</span>
                                <Badge variant="outline">{tc.subject.name}</Badge>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Delete Confirmation Dialog */}
      {canEdit && (
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
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="flex-1"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
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
