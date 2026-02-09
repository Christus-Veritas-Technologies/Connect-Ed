"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserGroupIcon,
  Search01Icon,
  Add01Icon,
  ViewIcon,
  UserCheck01Icon,
  FilterIcon,
  Cancel01Icon,
  GridIcon,
  ListViewIcon,
  TableIcon,
  MoreVerticalIcon,
  Delete02Icon,
  TeacherIcon,
  BookmarkAdd01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMarkNotificationsByUrl, useTeachers, useCreateTeacher, useDeleteTeacher } from "@/lib/hooks";
import { useClasses } from "@/lib/hooks/use-classes";
import { useSubjects } from "@/lib/hooks/use-subjects";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface Teacher {
  id: string;
  name: string;
  email: string;
  level?: string | null;
  isActive: boolean;
  classesTeaching: Array<{
    id: string;
    class: { id: string; name: string; level?: string | null };
    subject: { id: string; name: string } | null;
  }>;
  teacherSubjects: Array<{
    id: string;
    subject: { id: string; name: string; level?: string | null };
  }>;
  createdAt: string;
}

export default function TeachersPage() {
  const { school } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"cards" | "table" | "list">("table");
  const [showAddModal, setShowAddModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    level: "" as string,
    classIds: [] as string[],
    subjectIds: [] as string[],
  });
  const [classSearch, setClassSearch] = useState("");

  const markNotificationsByUrl = useMarkNotificationsByUrl();

  // TanStack Query hooks
  const { data: teachersData, isLoading } = useTeachers();
  const { data: classesData } = useClasses();
  const { data: subjectsData } = useSubjects();
  const createMutation = useCreateTeacher();
  const deleteMutation = useDeleteTeacher();

  const teachers = teachersData?.teachers || [];
  const classes = classesData?.classes || [];
  const allSubjects = subjectsData?.subjects || [];

  // Filter subjects by selected level
  const filteredSubjects = formData.level
    ? allSubjects.filter((s) => s.level === formData.level || !s.level)
    : [];

  // Mark notifications as read when page loads
  useEffect(() => {
    markNotificationsByUrl.mutate("/dashboard/teachers");
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    createMutation.mutate(
      {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        level: formData.level || undefined,
        classIds: formData.classIds.length > 0 ? formData.classIds : undefined,
        subjectIds: formData.subjectIds.length > 0 ? formData.subjectIds : undefined,
      },
      {
        onSuccess: () => {
          setFormData({ firstName: "", lastName: "", email: "", level: "", classIds: [], subjectIds: [] });
          setClassSearch("");
          setShowAddModal(false);
          toast.success("Teacher added successfully!", {
            description: "Welcome email with login credentials has been sent.",
          });
        },
        onError: (err) => {
          const error = err instanceof ApiError ? err.message : "Failed to add teacher";
          setFormError(error);
          toast.error(error);
        },
      }
    );
  };

  // View Details and Delete Handlers
  const handleViewTeacherDetails = (teacher: Teacher, e?: React.MouseEvent) => {
    e?.stopPropagation();
    router.push(`/dashboard/teachers/${teacher.id}`);
  };

  const handleDeleteTeacher = (teacher: Teacher, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedTeacher(teacher);
    setShowDeleteModal(true);
  };

  const confirmDeleteTeacher = async () => {
    if (!selectedTeacher) return;

    deleteMutation.mutate(selectedTeacher.id, {
      onSuccess: () => {
        toast.success("Teacher deleted successfully", {
          description: `${selectedTeacher.name} has been removed.`,
        });
        setShowDeleteModal(false);
        setSelectedTeacher(null);
      },
      onError: (error) => {
        const err = error instanceof ApiError ? error.message : "Failed to delete teacher";
        toast.error(err);
      },
    });
  };

  // Filter teachers
  const filteredTeachers = teachers.filter((teacher) => {
    const matchesSearch = search
      ? teacher.name.toLowerCase().includes(search.toLowerCase()) ||
      teacher.email.toLowerCase().includes(search.toLowerCase())
      : true;

    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
          ? teacher.isActive
          : !teacher.isActive;

    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const activeTeachers = teachers.filter((t) => t.isActive).length;
  const onLeaveTeachers = teachers.filter((t) => !t.isActive).length;
  const teachersWithClasses = teachers.filter((t) => t.classesTeaching && t.classesTeaching.length > 0).length;
  const teachersWithoutClasses = teachers.filter((t) => !t.classesTeaching || t.classesTeaching.length === 0).length;

  // Check if plan supports teachers
  if (school?.plan === "LITE") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
          <HugeiconsIcon icon={TeacherIcon} size={48} className="text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-semibold mb-2">Teacher Management</h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          Teacher management is available in Growth and Enterprise plans.
        </p>
        <Button asChild>
          <a href="/dashboard/settings">Upgrade Plan</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Teachers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage teacher accounts and class assignments
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2 w-full sm:w-auto">
          <HugeiconsIcon icon={Add01Icon} size={20} />
          Add Teacher
        </Button>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="overflow-hidden border-l-4 border-l-brand">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Teachers</p>
                  <p className="text-2xl font-semibold mt-1">{teachers.length}</p>
                </div>
                <div className="p-3 rounded-xl bg-brand/10">
                  <HugeiconsIcon icon={UserGroupIcon} size={24} className="text-brand" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="overflow-hidden border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-semibold mt-1 text-green-600">{activeTeachers}</p>
                </div>
                <div className="p-3 rounded-xl bg-green-100">
                  <HugeiconsIcon icon={UserCheck01Icon} size={24} className="text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="overflow-hidden border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">With Classes</p>
                  <p className="text-2xl font-semibold mt-1 text-blue-600">{teachersWithClasses}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-100">
                  <HugeiconsIcon icon={BookmarkAdd01Icon} size={24} className="text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="overflow-hidden border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Without Classes</p>
                  <p className="text-2xl font-semibold mt-1 text-orange-600">{teachersWithoutClasses}</p>
                </div>
                <div className="p-3 rounded-xl bg-orange-100">
                  <HugeiconsIcon icon={Cancel01Icon} size={24} className="text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {teachersWithoutClasses > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Alert>
            <AlertDescription>
              <strong>{teachersWithoutClasses}</strong> teacher{teachersWithoutClasses !== 1 ? 's are' : ' is'} not assigned to any class yet.
              Consider assigning them to classes in the Classes section.
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <HugeiconsIcon
            icon={Search01Icon}
            size={20}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <HugeiconsIcon icon={FilterIcon} size={18} className="mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on-leave">On Leave</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* View Mode Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65 }}
        className="flex justify-start"
      >
        <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
          <TabsList>
            <TabsTrigger value="cards">
              Cards
            </TabsTrigger>
            <TabsTrigger value="table">
              Table
            </TabsTrigger>
            <TabsTrigger value="list">
              List
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Teachers Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-card rounded-xl border overflow-hidden"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="size-8 rounded-full border-4 border-brand border-t-transparent animate-spin" />
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
              <HugeiconsIcon icon={TeacherIcon} size={48} className="text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">
              {search || statusFilter !== "all" ? "No teachers match your filters" : "No teachers found"}
            </p>
            <Button onClick={() => setShowAddModal(true)} className="gap-2">
              <HugeiconsIcon icon={Add01Icon} size={20} />
              Add Your First Teacher
            </Button>
          </div>
        ) : (
          <>
            {/* Table View */}
            {viewMode === "table" && (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Classes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredTeachers.map((teacher, index) => (
                      <motion.tr
                        key={teacher.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                        className="group hover:bg-muted/50 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-full bg-gradient-to-br from-brand to-purple-600 flex items-center justify-center shadow-md">
                              <span className="text-sm font-bold text-white">
                                {teacher.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold">{teacher.name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {teacher.email}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {teacher.classesTeaching && teacher.classesTeaching.length > 0
                              ? teacher.classesTeaching.map(tc => tc.class.name).join(", ")
                              : "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              teacher.isActive
                                ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                : "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
                            }
                          >
                            {teacher.isActive ? "Active" : "On Leave"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon-sm" className="hover:bg-brand/10 hover:text-brand">
                                <HugeiconsIcon icon={MoreVerticalIcon} size={18} />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48" align="end">
                              <div className="flex flex-col gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="justify-start gap-2 hover:bg-brand/10 hover:text-brand"
                                  onClick={(e) => handleViewTeacherDetails(teacher, e)}
                                >
                                  <HugeiconsIcon icon={ViewIcon} size={16} />
                                  View details
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="justify-start gap-2 hover:bg-destructive/10 hover:text-destructive"
                                  onClick={(e) => handleDeleteTeacher(teacher, e)}
                                >
                                  <HugeiconsIcon icon={Delete02Icon} size={16} />
                                  Delete {teacher.name.split(" ")[0]}
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            )}

            {/* Cards View */}
            {viewMode === "cards" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                <AnimatePresence>
                  {filteredTeachers.map((teacher, index) => (
                    <motion.div
                      key={teacher.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-2 hover:border-brand/50 bg-gradient-to-br from-white to-brand/5">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="size-14 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg flex-shrink-0 ring-2 ring-white">
                              <span className="text-lg font-bold text-white">
                                {teacher.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                              </span>
                            </div>
                            <Badge
                              variant="outline"
                              className={
                                teacher.isActive
                                  ? "bg-green-50 text-green-700 border-green-300 shadow-sm"
                                  : "bg-orange-50 text-orange-700 border-orange-300 shadow-sm"
                              }
                            >
                              {teacher.isActive ? "Active" : "On Leave"}
                            </Badge>
                          </div>
                          <div className="space-y-2 mb-4">
                            <h4 className="font-bold text-lg truncate">
                              {teacher.name}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span className="truncate">{teacher.email}</span>
                            </div>
                            <div className="pt-2 border-t">
                              <div className="flex items-center gap-2 text-sm">
                                <HugeiconsIcon icon={BookmarkAdd01Icon} size={16} className="text-brand" />
                                <span className="text-muted-foreground">Classes:</span>
                                <span className="font-semibold text-brand">
                                  {teacher.classesTeaching && teacher.classesTeaching.length > 0
                                    ? teacher.classesTeaching.map(tc => tc.class.name).join(", ")
                                    : "None"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="outline" size="sm" className="flex-1 hover:bg-brand/10 hover:text-brand hover:border-brand" onClick={(e) => handleViewTeacherDetails(teacher, e)}>
                              <HugeiconsIcon icon={ViewIcon} size={16} className="mr-1" />
                              View details
                            </Button>
                            <Button variant="outline" size="sm" className="flex-1 hover:bg-destructive/10 hover:text-destructive hover:border-destructive" onClick={(e) => handleDeleteTeacher(teacher, e)}>
                              <HugeiconsIcon icon={Delete02Icon} size={16} className="mr-1" />
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* List View */}
            {viewMode === "list" && (
              <div className="divide-y">
                <AnimatePresence>
                  {filteredTeachers.map((teacher, index) => (
                    <motion.div
                      key={teacher.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className="group hover:bg-muted/50 transition-colors p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="size-10 rounded-full bg-gradient-to-br from-brand to-purple-600 flex items-center justify-center shadow-md flex-shrink-0">
                          <span className="text-sm font-bold text-white">
                            {teacher.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-semibold truncate">{teacher.name}</p>
                            <Badge
                              variant="outline"
                              className={
                                teacher.isActive
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-orange-50 text-orange-700 border-orange-200"
                              }
                            >
                              {teacher.isActive ? "Active" : "On Leave"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                            <span className="truncate">{teacher.email}</span>
                            <span>•</span>
                            <span>
                              {teacher.classesTeaching && teacher.classesTeaching.length > 0
                                ? teacher.classesTeaching.map(tc => tc.class.name).join(", ")
                                : "No classes"}
                            </span>
                          </div>
                        </div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon-sm" className="hover:bg-brand/10 hover:text-brand">
                              <HugeiconsIcon icon={MoreVerticalIcon} size={18} />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48" align="end">
                            <div className="flex flex-col gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="justify-start gap-2 hover:bg-brand/10 hover:text-brand"
                              >
                                <HugeiconsIcon icon={ViewIcon} size={16} />
                                View details
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="justify-start gap-2 hover:bg-destructive/10 hover:text-destructive"
                              >
                                <HugeiconsIcon icon={Delete02Icon} size={16} />
                                Delete {teacher.name.split(" ")[0]}
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Add Teacher Dialog */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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

          <form onSubmit={handleAddTeacher} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Smith"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Email Address <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john.smith@school.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                Login credentials will be sent via email
              </p>
            </div>

            {/* Level Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Teaching Level
              </Label>
              <Select
                value={formData.level}
                onValueChange={(value) => setFormData({ ...formData, level: value, subjectIds: [] })}
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

            {/* Subjects - only shown when level is selected */}
            {formData.level && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Subjects</Label>
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-1">
                  {filteredSubjects.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No subjects found for this level
                    </p>
                  ) : (
                    filteredSubjects.map((subject) => {
                      const isSelected = formData.subjectIds.includes(subject.id);
                      return (
                        <button
                          key={subject.id}
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              subjectIds: isSelected
                                ? formData.subjectIds.filter((id) => id !== subject.id)
                                : [...formData.subjectIds, subject.id],
                            });
                          }}
                          className={`w-full px-3 py-2 text-left text-sm rounded-md transition-colors flex items-center justify-between ${isSelected
                            ? "bg-brand/10 text-brand border border-brand/30"
                            : "hover:bg-muted"
                            }`}
                        >
                          <span>{subject.name}</span>
                          {isSelected && (
                            <Badge variant="secondary" className="text-xs">Selected</Badge>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
                {formData.subjectIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {formData.subjectIds.length} subject{formData.subjectIds.length !== 1 ? "s" : ""} selected
                  </p>
                )}
              </div>
            )}

            {/* Classes - multi-select */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Assign Classes
              </Label>
              <div className="relative">
                <Input
                  placeholder="Search classes..."
                  value={classSearch}
                  onChange={(e) => setClassSearch(e.target.value)}
                  className="rounded-lg"
                />
                {classSearch && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-border rounded-lg shadow-lg z-50 max-h-[200px] overflow-y-auto">
                    {classes
                      .filter((cls) =>
                        cls.name.toLowerCase().includes(classSearch.toLowerCase())
                      )
                      .map((cls) => {
                        const isSelected = formData.classIds.includes(cls.id);
                        return (
                          <button
                            key={cls.id}
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                classIds: isSelected
                                  ? formData.classIds.filter((id) => id !== cls.id)
                                  : [...formData.classIds, cls.id],
                              });
                              setClassSearch("");
                            }}
                            className={`w-full px-3 py-2 text-left transition-colors flex items-center justify-between ${isSelected
                              ? "bg-brand/10"
                              : "hover:bg-muted cursor-pointer"
                              }`}
                          >
                            <span className="text-sm">
                              {cls.name}
                              {cls.level && (
                                <Badge variant="outline" className="ml-2 text-xs capitalize">
                                  {cls.level}
                                </Badge>
                              )}
                            </span>
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-brand"></div>
                            )}
                          </button>
                        );
                      })}
                    {classes.filter((cls) =>
                      cls.name.toLowerCase().includes(classSearch.toLowerCase())
                    ).length === 0 && (
                        <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                          No classes match
                        </div>
                      )}
                  </div>
                )}
              </div>
              {formData.classIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.classIds.map((classId) => {
                    const cls = classes.find((c) => c.id === classId);
                    return cls ? (
                      <Badge
                        key={classId}
                        variant="secondary"
                        className="gap-1 cursor-pointer hover:bg-destructive/10"
                        onClick={() => setFormData({
                          ...formData,
                          classIds: formData.classIds.filter((id) => id !== classId),
                        })}
                      >
                        {cls.name}
                        <HugeiconsIcon icon={Cancel01Icon} size={14} />
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding..." : "Add Teacher"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Teacher Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Teacher</DialogTitle>
          </DialogHeader>
          {selectedTeacher && (
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete <strong>{selectedTeacher.name}</strong>?
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
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleteMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="flex-1"
                  onClick={confirmDeleteTeacher}
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
