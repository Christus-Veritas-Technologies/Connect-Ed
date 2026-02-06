"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import {
  UserGroupIcon,
  Search01Icon,
  Add01Icon,
  ViewIcon,
  UserCheck01Icon,
  FilterIcon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  FileDownloadIcon,
  FileExportIcon,
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
import { useMarkNotificationsByUrl } from "@/lib/hooks";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  isActive: boolean;
  classes?: Array<{ id: string; name: string }>;
  createdAt: string;
}

export default function TeachersPage() {
  const { school } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"cards" | "table" | "list">("table");
  const [showAddModal, setShowAddModal] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [showViewDetailsModal, setShowViewDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    classId: "",
  });
  const [classSearch, setClassSearch] = useState("");
  const [classes, setClasses] = useState<Array<{ id: string; name: string; level?: string | null; teacherId?: string | null }>>([]);

  const markNotificationsByUrl = useMarkNotificationsByUrl();

  // Mark notifications as read when page loads
  useEffect(() => {
    markNotificationsByUrl.mutate("/dashboard/teachers");
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch teachers
  const fetchTeachers = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<{ teachers: Teacher[] }>("/teachers");
      setTeachers(data.teachers);
    } catch (error) {
      console.error("Failed to fetch teachers:", error);
      toast.error("Failed to load teachers");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch classes
  const fetchClasses = async () => {
    try {
      const data = await api.get<{ classes: Array<{ id: string; name: string; level?: string | null; teacherId?: string | null }> }>("/classes");
      setClasses(data.classes);
    } catch (error) {
      console.error("Failed to fetch classes:", error);
    }
  };

  useEffect(() => {
    fetchTeachers();
    fetchClasses();
  }, []);

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    try {
      // Generate a random password
      const generatedPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase() + "@1";
      
      await api.post("/teachers", {
        ...formData,
        password: generatedPassword,
        role: "TEACHER",
      });

      setFormData({ name: "", email: "", phone: "", classId: "" });
      setClassSearch("");
      setShowAddModal(false);
      fetchTeachers();
      toast.success("Teacher added successfully!", {
        description: "Welcome email with login credentials has been sent.",
      });
    } catch (err) {
      const error = err instanceof ApiError ? err.message : "Failed to add teacher";
      setFormError(error);
      toast.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // View Details and Delete Handlers
  const queryClient = useQueryClient();

  const handleViewTeacherDetails = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setShowViewDetailsModal(true);
  };

  const handleDeleteTeacher = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setShowDeleteModal(true);
  };

  const confirmDeleteTeacher = async () => {
    if (!selectedTeacher) return;

    setIsDeleting(true);
    try {
      await api.delete(`/teachers/${selectedTeacher.id}`);
      toast.success("Teacher deleted successfully", {
        description: `${selectedTeacher.name} has been removed.`,
      });
      setShowDeleteModal(false);
      setSelectedTeacher(null);
      // Refetch teachers
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      await fetchTeachers();
    } catch (error) {
      const err = error instanceof ApiError ? error.message : "Failed to delete teacher";
      toast.error(err);
    } finally {
      setIsDeleting(false);
    }
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
  const teachersWithClasses = teachers.filter((t) => t.classes && t.classes.length > 0).length;
  const teachersWithoutClasses = teachers.filter((t) => !t.classes || t.classes.length === 0).length;

  // Check if plan supports teachers
  if (school?.plan === "LITE") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
          <HugeiconsIcon icon={TeacherIcon} size={48} className="text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Teacher Management</h1>
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
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <HugeiconsIcon icon={TeacherIcon} size={28} className="text-brand" />
            Teachers
          </h1>
          <p className="text-muted-foreground mt-1">
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
                  <p className="text-2xl font-bold mt-1">{teachers.length}</p>
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
                  <p className="text-2xl font-bold mt-1 text-green-600">{activeTeachers}</p>
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
                  <p className="text-2xl font-bold mt-1 text-blue-600">{teachersWithClasses}</p>
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
                  <p className="text-2xl font-bold mt-1 text-orange-600">{teachersWithoutClasses}</p>
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
            <TabsTrigger value="cards" className="gap-2">
              <HugeiconsIcon icon={GridIcon} size={18} />
              Cards
            </TabsTrigger>
            <TabsTrigger value="table" className="gap-2">
              <HugeiconsIcon icon={TableIcon} size={18} />
              Table
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <HugeiconsIcon icon={ListViewIcon} size={18} />
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
                            {teacher.classes && teacher.classes.length > 0
                              ? teacher.classes.map(c => c.name).join(", ")
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
                                  onClick={() => handleViewTeacherDetails(teacher)}
                                >
                                  <HugeiconsIcon icon={ViewIcon} size={16} />
                                  View details
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="justify-start gap-2 hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => handleDeleteTeacher(teacher)}
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
                                  {teacher.classes && teacher.classes.length > 0
                                    ? teacher.classes.map(c => c.name).join(", ")
                                    : "None"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="outline" size="sm" className="flex-1 hover:bg-brand/10 hover:text-brand hover:border-brand" onClick={() => handleViewTeacherDetails(teacher)}>
                              <HugeiconsIcon icon={ViewIcon} size={16} className="mr-1" />
                              View details
                            </Button>
                            <Button variant="outline" size="sm" className="flex-1 hover:bg-destructive/10 hover:text-destructive hover:border-destructive" onClick={() => handleDeleteTeacher(teacher)}>
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
                              {teacher.classes && teacher.classes.length > 0
                                ? teacher.classes.map(c => c.name).join(", ")
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
        <DialogContent className="sm:max-w-md">
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
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Mr. John Smith"
                required
              />
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

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Phone Number <span className="text-destructive">*</span>
              </Label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+254 712 345 678"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Assign Class (Optional)
              </Label>
              <div className="relative">
                <Input
                  placeholder="Search and select class..."
                  value={classSearch}
                  onChange={(e) => setClassSearch(e.target.value)}
                  className="rounded-lg"
                />
                {classSearch && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-border rounded-lg shadow-lg z-50 max-h-[300px] overflow-y-auto">
                    {classes
                      .filter((cls) =>
                        cls.name.toLowerCase().includes(classSearch.toLowerCase())
                      )
                      .map((cls) => {
                        const isTaken = cls.teacherId && cls.teacherId !== "";
                        return (
                          <button
                            key={cls.id}
                            type="button"
                            onClick={() => {
                              if (!isTaken) {
                                setFormData({ ...formData, classId: cls.id });
                                setClassSearch("");
                              }
                            }}
                            disabled={isTaken}
                            className={`w-full px-3 py-2 text-left transition-colors flex items-center justify-between group ${
                              isTaken
                                ? "opacity-50 cursor-not-allowed"
                                : "hover:bg-muted cursor-pointer"
                            }`}
                          >
                            <span className="text-sm">
                              {cls.name}
                              {isTaken && (
                                <Badge className="ml-2 bg-yellow-100 text-yellow-800 border-yellow-300">
                                  TAKEN
                                </Badge>
                              )}
                            </span>
                            {formData.classId === cls.id && (
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
                {formData.classId && !classSearch && (
                  <div className="mt-2 p-2 bg-brand/10 border border-brand/30 rounded text-sm text-brand font-medium">
                    Selected: {classes.find(c => c.id === formData.classId)?.name}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Classes with existing class teachers are marked as TAKEN
              </p>
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
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Teacher"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Teacher Details Modal */}
      <Dialog open={showViewDetailsModal} onOpenChange={setShowViewDetailsModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Teacher Details</DialogTitle>
          </DialogHeader>
          {selectedTeacher && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="size-16 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                  <span className="text-2xl font-bold text-white">
                    {selectedTeacher.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">
                    {selectedTeacher.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedTeacher.email}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Status</p>
                  <Badge className={selectedTeacher.isActive ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}>
                    {selectedTeacher.isActive ? "Active" : "On Leave"}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Classes</p>
                  <p className="text-sm font-medium">
                    {selectedTeacher.classes && selectedTeacher.classes.length > 0
                      ? selectedTeacher.classes.length
                      : "0"}
                  </p>
                </div>
              </div>

              {selectedTeacher.classes && selectedTeacher.classes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Assigned Classes</p>
                  <div className="space-y-1">
                    {selectedTeacher.classes.map((cls) => (
                      <Badge key={cls.id} variant="outline" className="mr-2">
                        {cls.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={() => setShowViewDetailsModal(false)} className="w-full">
                Close
              </Button>
            </div>
          )}
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
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="flex-1"
                  onClick={confirmDeleteTeacher}
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
