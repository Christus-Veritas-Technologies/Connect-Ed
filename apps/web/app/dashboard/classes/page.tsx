"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Eye,
  Trash2,
  Check,
  MoreVertical,
  Loader2,
  BookOpen,
  CheckCircle,
  Users,
  AlertTriangle,
  Download,
  FileDown,
  Pencil,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  useClasses,
  useCreateClass,
  useDeleteClass,
} from "@/lib/hooks/use-classes";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DashboardBreadcrumbs,
  PageHeader,
  StatsCard,
  FilterTabs,
  ViewToggle,
  EmptyState,
  BulkActions,
} from "@/components/dashboard";
import { exportToPDF, exportDataAsCSV } from "@/lib/export-utils";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────

interface Class {
  id: string;
  name: string;
  level?: string | null;
  isActive: boolean;
  classTeacher?: { id: string; name: string } | null;
  _count?: { students: number };
  createdAt: string;
}

// ─── Compact Class Card ──────────────────────────────────────

function ClassCard({
  classItem,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
}: {
  classItem: Class;
  isSelected: boolean;
  onSelect: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      layout
      className="relative group"
    >
      <Card
        hover
        className={`h-full cursor-pointer transition-all ${
          isSelected ? "ring-2 ring-brand shadow-lg" : ""
        }`}
        onClick={onSelect}
      >
        <CardContent className="p-4">
          {/* Selection checkmark */}
          {isSelected && (
            <div className="absolute top-3 right-3 size-5 rounded-md bg-brand flex items-center justify-center z-10">
              <Check className="size-3.5 text-white" strokeWidth={3} />
            </div>
          )}

          {/* Class icon */}
          <div className="w-full aspect-square rounded-lg bg-gradient-to-br from-brand to-purple-600 flex items-center justify-center mb-3">
            <span className="text-3xl font-bold text-white">
              {classItem.name.substring(0, 2).toUpperCase()}
            </span>
          </div>

          {/* Name */}
          <h3 className="font-medium text-sm truncate">{classItem.name}</h3>

          {/* Meta */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <span>{classItem._count?.students || 0} students</span>
            <span>·</span>
            <span className="capitalize">{classItem.level || "—"}</span>
          </div>

          {/* Status + teacher */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge
              variant="outline"
              className={
                classItem.isActive
                  ? "bg-green-50 text-green-700 border-green-200 text-xs"
                  : "bg-gray-50 text-gray-700 border-gray-200 text-xs"
              }
            >
              {classItem.isActive ? "Active" : "Inactive"}
            </Badge>
            {classItem.classTeacher && (
              <Badge variant="outline" className="text-xs truncate max-w-[120px]">
                {classItem.classTeacher.name}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Hover action menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-3 right-3 size-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onView}>
            <Eye className="size-4" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="size-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}

// ─── Main Page ───────────────────────────────────────────────

export default function ClassesPage() {
  const { school, user } = useAuth();
  const router = useRouter();

  // ── State ──
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table" | "list">("grid");
  const [filterTab, setFilterTab] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const [formData, setFormData] = useState({
    name: "",
    level: "",
    classTeacherId: "",
  });

  // ── Data fetching ──
  const { data: classesData, isLoading } = useClasses();
  const { data: teachersData } = useTeachers();
  const createMutation = useCreateClass();
  const deleteMutation = useDeleteClass();

  const classes: Class[] = classesData?.classes || [];
  const teachers = teachersData?.teachers || [];

  // Loading guard
  if (!user || !school) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 animate-spin text-brand" />
      </div>
    );
  }

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 400);
  }, []);

  // ── Derived data — single query, client-side slicing ──
  const filteredClasses = classes.filter((cls) => {
    const matchesSearch = debouncedSearch
      ? cls.name.toLowerCase().includes(debouncedSearch.toLowerCase())
      : true;
    const matchesStatus =
      filterTab === "all"
        ? true
        : filterTab === "active"
          ? cls.isActive
          : !cls.isActive;
    return matchesSearch && matchesStatus;
  });

  // Recent 8 for top grid
  const recentClasses = !debouncedSearch ? filteredClasses.slice(0, 8) : [];

  // Stats
  const totalClasses = classes.length;
  const activeClasses = classes.filter((c) => c.isActive).length;
  const classesWithTeachers = classes.filter((c) => c.classTeacher).length;
  const classesWithoutTeachers = classes.filter((c) => !c.classTeacher).length;
  const totalStudents = classes.reduce(
    (sum, c) => sum + (c._count?.students || 0),
    0
  );

  // ── Selection helpers ──
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Actions ──
  const handleView = (classItem: Class) => {
    router.push(`/dashboard/classes/${classItem.id}`);
  };

  const handleEdit = (classItem: Class) => {
    router.push(`/dashboard/classes/${classItem.id}?edit=true`);
  };

  const handleDeleteClick = (classItem: Class) => {
    setSelectedClass(classItem);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedClass) return;
    deleteMutation.mutate(selectedClass.id, {
      onSuccess: () => {
        toast.success("Class deleted", {
          description: `${selectedClass.name} has been removed.`,
        });
        setShowDeleteModal(false);
        setSelectedClass(null);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(selectedClass.id);
          return next;
        });
      },
      onError: (error) => {
        toast.error(
          error instanceof ApiError ? error.message : "Failed to delete class"
        );
      },
    });
  };

  const handleBulkDelete = () => {
    if (
      !confirm(`Delete ${selectedIds.size} class(es)? This cannot be undone.`)
    )
      return;
    const ids = Array.from(selectedIds);
    ids.forEach((id) => {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        },
      });
    });
    toast.success(`Deleting ${ids.length} class(es)...`);
  };

  const handleExportCSV = () => {
    const toExport =
      selectedIds.size > 0
        ? filteredClasses.filter((c) => selectedIds.has(c.id))
        : filteredClasses;
    if (toExport.length === 0) return;

    exportDataAsCSV(
      toExport.map((c) => ({
        Name: c.name,
        Level: c.level || "—",
        Status: c.isActive ? "Active" : "Inactive",
        Teacher: c.classTeacher?.name || "—",
        Students: c._count?.students || 0,
      })),
      ["Name", "Level", "Status", "Teacher", "Students"],
      `classes-${new Date().toISOString().split("T")[0]}`
    );
  };

  const handleExportPDF = () => {
    const toExport =
      selectedIds.size > 0
        ? filteredClasses.filter((c) => selectedIds.has(c.id))
        : filteredClasses;
    if (toExport.length === 0) return;

    exportToPDF(
      toExport.map((c) => ({
        name: c.name,
        level: c.level || "—",
        status: c.isActive ? "Active" : "Inactive",
        teacher: c.classTeacher?.name || "—",
        students: String(c._count?.students || 0),
      })),
      [
        { key: "name", label: "Class" },
        { key: "level", label: "Level" },
        { key: "status", label: "Status" },
        { key: "teacher", label: "Teacher" },
        { key: "students", label: "Students" },
      ],
      `classes-${new Date().toISOString().split("T")[0]}`,
      "Classes Report"
    );
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!formData.name.trim()) {
      setFormError("Class name is required");
      return;
    }
    if (!formData.level) {
      setFormError("Level is required");
      return;
    }
    if (!formData.classTeacherId) {
      setFormError("Class teacher is required");
      return;
    }

    createMutation.mutate(formData, {
      onSuccess: () => {
        toast.success("Class created successfully!");
        setFormData({ name: "", level: "", classTeacherId: "" });
        setShowAddModal(false);
      },
      onError: (err) => {
        const error =
          err instanceof ApiError ? err.message : "Failed to create class";
        setFormError(error);
        toast.error(error);
      },
    });
  };

  // ── Plan guard ──
  if (school?.plan === "LITE") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
          <BookOpen className="size-12 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-semibold mb-2">Class Management</h1>
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
    <div className="space-y-6">
      {/* Breadcrumb */}
      <DashboardBreadcrumbs items={[{ label: "Classes" }]} />

      {/* Header */}
      <PageHeader
        title="Classes"
        subtitle="Manage school classes and assign teachers"
        search={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search classes..."
        showFilter
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleExportCSV}
              title="Export CSV"
            >
              <Download className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleExportPDF}
              title="Export PDF"
            >
              <FileDown className="size-4" />
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="size-4" />
              Add Class
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Total Classes"
          value={totalClasses}
          icon={<BookOpen className="size-6" />}
          color="brand"
          delay={0.1}
        />
        <StatsCard
          label="Active"
          value={activeClasses}
          icon={<CheckCircle className="size-6" />}
          color="green"
          delay={0.2}
        />
        <StatsCard
          label="With Teachers"
          value={classesWithTeachers}
          icon={<Users className="size-6" />}
          color="blue"
          delay={0.3}
        />
        <StatsCard
          label="Total Students"
          value={totalStudents}
          icon={<Users className="size-6" />}
          color="purple"
          delay={0.4}
        />
      </div>

      {/* Alert for unassigned classes */}
      {classesWithoutTeachers > 0 && (
        <Alert>
          <AlertDescription>
            <strong>{classesWithoutTeachers}</strong> class
            {classesWithoutTeachers !== 1 ? "es are" : " is"} without
            assigned teachers. Consider assigning teachers.
          </AlertDescription>
        </Alert>
      )}

      {/* Recent Classes */}
      {!isLoading && recentClasses.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Classes</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recentClasses.map((classItem) => (
              <ClassCard
                key={classItem.id}
                classItem={classItem}
                isSelected={selectedIds.has(classItem.id)}
                onSelect={() => toggleSelection(classItem.id)}
                onView={() => handleView(classItem)}
                onEdit={() => handleEdit(classItem)}
                onDelete={() => handleDeleteClick(classItem)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Main Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">All Classes</h2>

        {/* Filters + View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <FilterTabs
            tabs={[
              { key: "all", label: "All", count: classes.length },
              { key: "active", label: "Active", count: activeClasses },
              {
                key: "inactive",
                label: "Inactive",
                count: classes.length - activeClasses,
              },
            ]}
            active={filterTab}
            onChange={setFilterTab}
          />
          <ViewToggle mode={viewMode} onChange={setViewMode} showList />
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-8 animate-spin text-brand" />
          </div>
        )}

        {/* Empty */}
        {!isLoading && filteredClasses.length === 0 && (
          <EmptyState
            icon={<BookOpen className="size-12" />}
            title={
              debouncedSearch || filterTab !== "all"
                ? "No classes match your filters"
                : "No classes yet"
            }
            description="Create your first class to get started"
            action={
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="size-4" />
                Add Class
              </Button>
            }
          />
        )}

        {/* Grid View */}
        {!isLoading && filteredClasses.length > 0 && viewMode === "grid" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredClasses.map((classItem) => (
                <ClassCard
                  key={classItem.id}
                  classItem={classItem}
                  isSelected={selectedIds.has(classItem.id)}
                  onSelect={() => toggleSelection(classItem.id)}
                  onView={() => handleView(classItem)}
                  onEdit={() => handleEdit(classItem)}
                  onDelete={() => handleDeleteClick(classItem)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Table View */}
        {!isLoading &&
          filteredClasses.length > 0 &&
          viewMode === "table" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClasses.map((classItem) => (
                  <TableRow
                    key={classItem.id}
                    className="group hover:bg-muted/50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-lg bg-gradient-to-br from-brand to-purple-600 flex items-center justify-center">
                          <span className="text-xs font-bold text-white">
                            {classItem.name.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <p className="font-medium">{classItem.name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm capitalize text-muted-foreground">
                      {classItem.level || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {classItem.classTeacher?.name || (
                        <span className="text-orange-600">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {classItem._count?.students || 0}
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
                        {classItem.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-8 p-0"
                          >
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleView(classItem)}
                          >
                            <Eye className="size-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleEdit(classItem)}
                          >
                            <Pencil className="size-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(classItem)}
                            className="text-destructive"
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

        {/* List View */}
        {!isLoading &&
          filteredClasses.length > 0 &&
          viewMode === "list" && (
            <div className="border rounded-xl divide-y">
              {filteredClasses.map((classItem) => (
                <div
                  key={classItem.id}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="size-10 rounded-lg bg-gradient-to-br from-brand to-purple-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-white">
                      {classItem.name.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {classItem.name}
                      </p>
                      <Badge
                        variant="outline"
                        className={
                          classItem.isActive
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-gray-50 text-gray-700 border-gray-200"
                        }
                      >
                        {classItem.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                      <span className="capitalize">
                        {classItem.level || "—"}
                      </span>
                      <span>·</span>
                      <span>
                        {classItem._count?.students || 0} students
                      </span>
                      <span>·</span>
                      <span>
                        {classItem.classTeacher?.name || "No teacher"}
                      </span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-8 p-0"
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleView(classItem)}
                      >
                        <Eye className="size-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleEdit(classItem)}
                      >
                        <Pencil className="size-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(classItem)}
                        className="text-destructive"
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <BulkActions
          count={selectedIds.size}
          onDelete={handleBulkDelete}
          onExport={handleExportCSV}
          onClearSelection={() => setSelectedIds(new Set())}
        />
      )}

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
            <div className="space-y-2">
              <Label>
                Class Name <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g., Grade 5A, Math 101"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label>
                Level <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.level}
                onValueChange={(value) =>
                  setFormData({ ...formData, level: value })
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

            <div className="space-y-2">
              <Label>
                Class Teacher <span className="text-destructive">*</span>
              </Label>
              <div className="space-y-2">
                <Input
                  placeholder="Search teachers..."
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                />
                <Select
                  value={formData.classTeacherId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, classTeacherId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select teacher..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers
                      .filter((teacher: any) =>
                        teacherSearch
                          ? teacher.name
                              .toLowerCase()
                              .includes(teacherSearch.toLowerCase())
                          : true
                      )
                      .map((teacher: any) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowAddModal(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="size-4" />
                    Create Class
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Class</DialogTitle>
          </DialogHeader>
          {selectedClass && (
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete{" "}
                  <strong>{selectedClass.name}</strong>?
                </p>
                <p className="text-xs text-destructive/80">
                  This action cannot be undone. All students will be
                  unassigned from this class.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleteMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={confirmDelete}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="size-4" />
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
