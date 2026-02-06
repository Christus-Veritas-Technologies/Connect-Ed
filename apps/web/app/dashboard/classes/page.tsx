"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  BookmarkAdd01Icon,
  Search01Icon,
  Add01Icon,
  ViewIcon,
  FilterIcon,
  GridIcon,
  TableIcon,
  MoreVerticalIcon,
  Delete02Icon,
  PencilEdit01Icon,
  UserGroupIcon,
  TeacherIcon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useAuth } from "@/lib/auth-context";
import { useClasses, useCreateClass, useDeleteClass } from "@/lib/hooks/use-classes";
import { useTeachers } from "@/lib/hooks/use-teachers";
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

interface Class {
  id: string;
  name: string;
  level?: string | null;
  isActive: boolean;
  classTeacher?: { id: string; name: string } | null;
  _count?: { students: number };
  createdAt: string;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
}

export default function ClassesPage() {
  const { school } = useAuth();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [showAddModal, setShowAddModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    level: "",
    classTeacherId: "",
  });
  
  // TanStack Query hooks
  const { data: classesData, isLoading } = useClasses();
  const { data: teachersData } = useTeachers();
  const createMutation = useCreateClass();
  const deleteMutation = useDeleteClass();
  
  const classes = classesData?.classes || [];
  const teachers = teachersData?.teachers || [];

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Handle add class
  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    createMutation.mutate(formData, {
      onSuccess: () => {
        toast.success("Class created successfully!");
        setFormData({ name: "", level: "", classTeacherId: "" });
        setShowAddModal(false);
      },
      onError: (err) => {
        const error = err instanceof ApiError ? err.message : "Failed to create class";
        setFormError(error);
        toast.error(error);
      },
    });
  };

  // Handle view details
  const handleViewDetails = (classItem: Class) => {
    router.push(`/dashboard/classes/${classItem.id}`);
  };

  // Handle edit
  const handleEdit = (classItem: Class) => {
    router.push(`/dashboard/classes/${classItem.id}?edit=true`);
  };

  // Handle delete
  const handleDelete = (classItem: Class) => {
    setSelectedClass(classItem);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedClass) return;

    deleteMutation.mutate(selectedClass.id, {
      onSuccess: () => {
        toast.success("Class deleted successfully", {
          description: `${selectedClass.name} has been removed.`,
        });
        setShowDeleteModal(false);
        setSelectedClass(null);
      },
      onError: (error) => {
        const err = error instanceof ApiError ? error.message : "Failed to delete class";
        toast.error(err);
      },
    });
  };

  // Filter classes
  const filteredClasses = classes.filter((cls) => {
    const matchesSearch = debouncedSearch
      ? cls.name.toLowerCase().includes(debouncedSearch.toLowerCase())
      : true;

    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
        ? cls.isActive
        : !cls.isActive;

    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const totalClasses = classes.length;
  const activeClasses = classes.filter((c) => c.isActive).length;
  const classesWithTeachers = classes.filter((c) => c.classTeacher).length;
  const classesWithoutTeachers = classes.filter((c) => !c.classTeacher).length;
  const totalStudents = classes.reduce((sum, c) => sum + (c._count?.students || 0), 0);

  // Check if plan supports classes
  if (school?.plan === "LITE") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
          <HugeiconsIcon icon={BookmarkAdd01Icon} size={48} className="text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Class Management</h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          Class management is available in Growth and Enterprise plans.
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
            <HugeiconsIcon icon={BookmarkAdd01Icon} size={28} className="text-brand" />
            Classes
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage school classes and assign teachers
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2 w-full sm:w-auto">
          <HugeiconsIcon icon={Add01Icon} size={20} />
          Add Class
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
                  <p className="text-sm text-muted-foreground">Total Classes</p>
                  <p className="text-2xl font-bold mt-1 text-brand">{totalClasses}</p>
                </div>
                <div className="p-3 rounded-xl bg-brand/10">
                  <HugeiconsIcon icon={BookmarkAdd01Icon} size={24} className="text-brand" />
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
                  <p className="text-2xl font-bold mt-1 text-green-600">{activeClasses}</p>
                </div>
                <div className="p-3 rounded-xl bg-green-100">
                  <HugeiconsIcon icon={BookmarkAdd01Icon} size={24} className="text-green-600" />
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
                  <p className="text-sm text-muted-foreground">With Teachers</p>
                  <p className="text-2xl font-bold mt-1 text-blue-600">{classesWithTeachers}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-100">
                  <HugeiconsIcon icon={TeacherIcon} size={24} className="text-blue-600" />
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
          <Card className="overflow-hidden border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold mt-1 text-purple-600">{totalStudents}</p>
                </div>
                <div className="p-3 rounded-xl bg-purple-100">
                  <HugeiconsIcon icon={UserGroupIcon} size={24} className="text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Alert for classes without teachers */}
      {classesWithoutTeachers > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Alert>
            <AlertDescription>
              <strong>{classesWithoutTeachers}</strong> class{classesWithoutTeachers !== 1 ? 'es are' : ' is'} without assigned teachers.
              Consider assigning teachers in the Teachers section.
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
            placeholder="Search classes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <HugeiconsIcon icon={FilterIcon} size={18} className="mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "table" | "cards")}>
          <TabsList>
            <TabsTrigger value="table" className="gap-2">
              <HugeiconsIcon icon={TableIcon} size={18} />
              Table
            </TabsTrigger>
            <TabsTrigger value="cards" className="gap-2">
              <HugeiconsIcon icon={GridIcon} size={18} />
              Cards
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Classes Content */}
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
        ) : filteredClasses.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
              <HugeiconsIcon icon={BookmarkAdd01Icon} size={48} className="text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">
              {search || statusFilter !== "all" ? "No classes match your filters" : "No classes found"}
            </p>
            <Button onClick={() => setShowAddModal(true)} className="gap-2">
              <HugeiconsIcon icon={Add01Icon} size={20} />
              Add Your First Class
            </Button>
          </div>
        ) : (
          <>
            {/* Table View */}
            {viewMode === "table" && (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Class</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredClasses.map((classItem, index) => (
                      <motion.tr
                        key={classItem.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                        className="group hover:bg-muted/30 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-lg bg-gradient-to-br from-brand to-purple-600 flex items-center justify-center shadow-sm">
                              <span className="text-sm font-bold text-white">
                                {classItem.name.substring(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold">{classItem.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {classItem.classTeacher?.name || "No teacher"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              classItem.isActive
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-gray-50 text-gray-700 border-gray-200"
                            }
                          >
                            {classItem.isActive ? "Live" : "Completed"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {classItem.level || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">—</TableCell>
                        <TableCell className="text-sm text-muted-foreground">Online</TableCell>
                        <TableCell className="text-sm font-medium">
                          {classItem._count?.students || 0}
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
                                  onClick={() => handleViewDetails(classItem)}
                                >
                                  <HugeiconsIcon icon={ViewIcon} size={16} />
                                  View details
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="justify-start gap-2 hover:bg-blue/10 hover:text-blue-600"
                                  onClick={() => handleEdit(classItem)}
                                >
                                  <HugeiconsIcon icon={PencilEdit01Icon} size={16} />
                                  Edit details
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="justify-start gap-2 hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => handleDelete(classItem)}
                                >
                                  <HugeiconsIcon icon={Delete02Icon} size={16} />
                                  Delete class
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
                  {filteredClasses.map((classItem, index) => (
                    <motion.div
                      key={classItem.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-2 hover:border-brand/50">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="size-12 rounded-lg bg-gradient-to-br from-brand to-purple-600 flex items-center justify-center shadow-md">
                              <span className="text-base font-bold text-white">
                                {classItem.name.substring(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <Badge
                              variant="outline"
                              className={
                                classItem.isActive
                                  ? "bg-green-50 text-green-700 border-green-300 shadow-sm"
                                  : "bg-gray-50 text-gray-700 border-gray-300 shadow-sm"
                              }
                            >
                              {classItem.isActive ? "Live" : "Completed"}
                            </Badge>
                          </div>

                          <div className="space-y-3 mb-4">
                            <h4 className="font-bold text-lg">{classItem.name}</h4>
                            
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Students:</span>
                                <span className="font-semibold text-brand">
                                  {classItem._count?.students || 0}
                                </span>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Teacher:</span>
                                <span className={`font-medium ${classItem.classTeacher ? 'text-green-600' : 'text-orange-600'}`}>
                                  {classItem.classTeacher ? (
                                    <div className="flex items-center gap-1">
                                      <HugeiconsIcon icon={TeacherIcon} size={14} />
                                      Assigned
                                    </div>
                                  ) : (
                                    "Not assigned"
                                  )}
                                </span>
                              </div>

                              {classItem.classTeacher && (
                                <div className="pt-2 border-t">
                                  <p className="text-xs text-muted-foreground">
                                    {classItem.classTeacher.name}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 hover:bg-brand/10 hover:text-brand hover:border-brand"
                              onClick={() => handleViewDetails(classItem)}
                            >
                              <HugeiconsIcon icon={ViewIcon} size={16} className="mr-1" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                              onClick={() => handleEdit(classItem)}
                            >
                              <HugeiconsIcon icon={PencilEdit01Icon} size={16} className="mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="icon-sm"
                              className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                              onClick={() => handleDelete(classItem)}
                            >
                              <HugeiconsIcon icon={Delete02Icon} size={16} />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Add Class Dialog */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Class</DialogTitle>
          </DialogHeader>

          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleAddClass} className="space-y-4">
            <div>
              <Label>Class Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g., Grade 5A, Math 101"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Level (optional)</Label>
              <Select
                value={formData.level}
                onValueChange={(value) => setFormData({ ...formData, level: value })}
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

            <div>
              <Label>Class Teacher (optional)</Label>
              <Select
                value={formData.classTeacherId}
                onValueChange={(value) => setFormData({ ...formData, classTeacherId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select teacher..." />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowAddModal(false)}
                disabled={createMutation.isPending}
              >
                <HugeiconsIcon icon={Cancel01Icon} size={18} className="mr-2" />
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <div className="size-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <HugeiconsIcon icon={Add01Icon} size={18} className="mr-2" />
                    Create Class
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Class</DialogTitle>
          </DialogHeader>
          {selectedClass && (
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete <strong>{selectedClass.name}</strong>?
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
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleteMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="flex-1"
                  onClick={confirmDelete}
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
