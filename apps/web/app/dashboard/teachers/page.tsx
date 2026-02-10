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
  Users,
  UserCheck,
  BookOpen,
  AlertTriangle,
  Download,
  FileDown,
  X,
  Mail,
} from "lucide-react";
import {
  useMarkNotificationsByUrl,
  useTeachers,
  useCreateTeacher,
  useDeleteTeacher,
} from "@/lib/hooks";
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
  Pagination,
} from "@/components/dashboard";
import { exportToPDF, exportDataAsCSV } from "@/lib/export-utils";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ─── Compact Teacher Card ────────────────────────────────────
// Used in the "Recent Teachers" grid and the main grid view.
// Checkbox overlay, avatar, meta, hover actions.

function TeacherCard({
  teacher,
  isSelected,
  onSelect,
  onView,
  onDelete,
}: {
  teacher: Teacher;
  isSelected: boolean;
  onSelect: () => void;
  onView: () => void;
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
        className={`h-full cursor-pointer transition-all ${isSelected ? "ring-2 ring-brand shadow-lg" : ""
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

          {/* Avatar */}
          <div className="w-full aspect-square rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center mb-3">
            <span className="text-3xl font-bold text-white">
              {getInitials(teacher.name)}
            </span>
          </div>

          {/* Name */}
          <h3 className="font-medium text-sm truncate">{teacher.name}</h3>

          {/* Meta */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <span className="truncate">{teacher.email}</span>
          </div>

          {/* Classes + status */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge
              variant="outline"
              className={
                teacher.isActive
                  ? "bg-green-50 text-green-700 border-green-200 text-xs"
                  : "bg-orange-50 text-orange-700 border-orange-200 text-xs"
              }
            >
              {teacher.isActive ? "Active" : "On Leave"}
            </Badge>
            {teacher.classesTeaching?.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {teacher.classesTeaching.length} class
                {teacher.classesTeaching.length !== 1 ? "es" : ""}
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

export default function TeachersPage() {
  const { school } = useAuth();
  const router = useRouter();

  // ── State ──
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table" | "list">("grid");
  const [filterTab, setFilterTab] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    level: "" as string,
    classIds: [] as string[],
    subjectIds: [] as string[],
  });
  const [classSearch, setClassSearch] = useState("");

  // ── Data fetching ──
  const { data: teachersData, isLoading } = useTeachers();
  const { data: classesData } = useClasses();
  const { data: subjectsData } = useSubjects();
  const createMutation = useCreateTeacher();
  const deleteMutation = useDeleteTeacher();
  const markNotificationsByUrl = useMarkNotificationsByUrl();

  const teachers: Teacher[] = teachersData?.teachers || [];
  const classes = classesData?.classes || [];
  const allSubjects = subjectsData?.subjects || [];

  // Filter subjects by selected level
  const filteredSubjects = formData.level
    ? allSubjects.filter((s: any) => s.level === formData.level || !s.level)
    : [];

  // Mark notifications as read on mount
  useEffect(() => {
    markNotificationsByUrl.mutate("/dashboard/teachers");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 400);
  }, []);

  // ── Derived data — single query, client-side slicing ──
  const allTeachers = teachers;

  // Client-side filter by status tab
  const filteredTeachers =
    filterTab === "all"
      ? allTeachers.filter((t) =>
        debouncedSearch
          ? t.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          t.email.toLowerCase().includes(debouncedSearch.toLowerCase())
          : true
      )
      : filterTab === "active"
        ? allTeachers.filter(
          (t) =>
            t.isActive &&
            (debouncedSearch
              ? t.name
                .toLowerCase()
                .includes(debouncedSearch.toLowerCase()) ||
              t.email
                .toLowerCase()
                .includes(debouncedSearch.toLowerCase())
              : true)
        )
        : allTeachers.filter(
          (t) =>
            !t.isActive &&
            (debouncedSearch
              ? t.name
                .toLowerCase()
                .includes(debouncedSearch.toLowerCase()) ||
              t.email
                .toLowerCase()
                .includes(debouncedSearch.toLowerCase())
              : true)
        );

  // Recent 8 for top grid (only when not searching)
  const recentTeachers = !debouncedSearch ? filteredTeachers.slice(0, 8) : [];

  // Stats
  const activeTeachers = allTeachers.filter((t) => t.isActive).length;
  const onLeaveTeachers = allTeachers.filter((t) => !t.isActive).length;
  const teachersWithClasses = allTeachers.filter(
    (t) => t.classesTeaching && t.classesTeaching.length > 0
  ).length;
  const teachersWithoutClasses = allTeachers.filter(
    (t) => !t.classesTeaching || t.classesTeaching.length === 0
  ).length;

  // ── Selection helpers ──
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Actions ──
  const handleView = (teacher: Teacher) => {
    router.push(`/dashboard/teachers/${teacher.id}`);
  };

  const handleDeleteClick = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedTeacher) return;
    deleteMutation.mutate(selectedTeacher.id, {
      onSuccess: () => {
        toast.success("Teacher deleted", {
          description: `${selectedTeacher.name} has been removed.`,
        });
        setShowDeleteModal(false);
        setSelectedTeacher(null);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(selectedTeacher.id);
          return next;
        });
      },
      onError: (error) => {
        toast.error(
          error instanceof ApiError ? error.message : "Failed to delete teacher"
        );
      },
    });
  };

  const handleBulkDelete = () => {
    if (
      !confirm(
        `Delete ${selectedIds.size} teacher(s)? This cannot be undone.`
      )
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
    toast.success(`Deleting ${ids.length} teacher(s)...`);
  };

  const handleExportCSV = () => {
    const toExport =
      selectedIds.size > 0
        ? filteredTeachers.filter((t) => selectedIds.has(t.id))
        : filteredTeachers;
    if (toExport.length === 0) return;

    exportDataAsCSV(
      toExport.map((t) => ({
        Name: t.name,
        Email: t.email,
        Status: t.isActive ? "Active" : "On Leave",
        Classes:
          t.classesTeaching?.map((tc) => tc.class.name).join(", ") || "—",
        Subjects:
          t.teacherSubjects?.map((ts) => ts.subject.name).join(", ") || "—",
      })),
      ["Name", "Email", "Status", "Classes", "Subjects"],
      `teachers-${new Date().toISOString().split("T")[0]}`
    );
  };

  const handleExportPDF = () => {
    const toExport =
      selectedIds.size > 0
        ? filteredTeachers.filter((t) => selectedIds.has(t.id))
        : filteredTeachers;
    if (toExport.length === 0) return;

    exportToPDF(
      toExport.map((t) => ({
        name: t.name,
        email: t.email,
        status: t.isActive ? "Active" : "On Leave",
        classes:
          t.classesTeaching?.map((tc) => tc.class.name).join(", ") || "—",
      })),
      [
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "status", label: "Status" },
        { key: "classes", label: "Classes" },
      ],
      `teachers-${new Date().toISOString().split("T")[0]}`,
      "Teachers Report"
    );
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    createMutation.mutate(
      {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        level: formData.level || undefined,
        classIds:
          formData.classIds.length > 0 ? formData.classIds : undefined,
        subjectIds:
          formData.subjectIds.length > 0 ? formData.subjectIds : undefined,
      },
      {
        onSuccess: () => {
          setFormData({
            firstName: "",
            lastName: "",
            email: "",
            level: "",
            classIds: [],
            subjectIds: [],
          });
          setClassSearch("");
          setShowAddModal(false);
          toast.success("Teacher added successfully!", {
            description:
              "Welcome email with login credentials has been sent.",
          });
        },
        onError: (err) => {
          const error =
            err instanceof ApiError ? err.message : "Failed to add teacher";
          setFormError(error);
          toast.error(error);
        },
      }
    );
  };

  // ── Plan guard ──
  if (school?.plan === "LITE") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
          <Users className="size-12 text-muted-foreground" />
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
    <div className="space-y-6">
      {/* Breadcrumb */}
      <DashboardBreadcrumbs items={[{ label: "Teachers" }]} />

      {/* Header */}
      <PageHeader
        title="Teachers"
        subtitle="Manage teacher accounts and class assignments"
        search={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search by name or email..."
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
              Add Teacher
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Total Teachers"
          value={allTeachers.length}
          icon={<Users className="size-6" />}
          color="brand"
          delay={0.1}
        />
        <StatsCard
          label="Active"
          value={activeTeachers}
          icon={<UserCheck className="size-6" />}
          color="green"
          delay={0.2}
        />
        <StatsCard
          label="With Classes"
          value={teachersWithClasses}
          icon={<BookOpen className="size-6" />}
          color="blue"
          delay={0.3}
        />
        <StatsCard
          label="Without Classes"
          value={teachersWithoutClasses}
          icon={<AlertTriangle className="size-6" />}
          color="orange"
          delay={0.4}
        />
      </div>

      {/* Alert for unassigned teachers */}
      {teachersWithoutClasses > 0 && (
        <Alert>
          <AlertDescription>
            <strong>{teachersWithoutClasses}</strong> teacher
            {teachersWithoutClasses !== 1 ? "s are" : " is"} not assigned to
            any class yet. Consider assigning them to classes.
          </AlertDescription>
        </Alert>
      )}

      {/* Recent Teachers */}
      {!isLoading && recentTeachers.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Teachers</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recentTeachers.map((teacher) => (
              <TeacherCard
                key={teacher.id}
                teacher={teacher}
                isSelected={selectedIds.has(teacher.id)}
                onSelect={() => toggleSelection(teacher.id)}
                onView={() => handleView(teacher)}
                onDelete={() => handleDeleteClick(teacher)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Main Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">All Teachers</h2>

        {/* Filters + View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <FilterTabs
            tabs={[
              { key: "all", label: "All", count: allTeachers.length },
              { key: "active", label: "Active", count: activeTeachers },
              {
                key: "on-leave",
                label: "On Leave",
                count: onLeaveTeachers,
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
        {!isLoading && filteredTeachers.length === 0 && (
          <EmptyState
            icon={<Users className="size-12" />}
            title={
              debouncedSearch || filterTab !== "all"
                ? "No teachers match your filters"
                : "No teachers yet"
            }
            description="Add your first teacher to get started"
            action={
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="size-4" />
                Add Teacher
              </Button>
            }
          />
        )}

        {/* Grid View */}
        {!isLoading && filteredTeachers.length > 0 && viewMode === "grid" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredTeachers.map((teacher) => (
                <TeacherCard
                  key={teacher.id}
                  teacher={teacher}
                  isSelected={selectedIds.has(teacher.id)}
                  onSelect={() => toggleSelection(teacher.id)}
                  onView={() => handleView(teacher)}
                  onDelete={() => handleDeleteClick(teacher)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Table View */}
        {!isLoading &&
          filteredTeachers.length > 0 &&
          viewMode === "table" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Classes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeachers.map((teacher) => (
                  <TableRow
                    key={teacher.id}
                    className="group hover:bg-muted/50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
                          <span className="text-xs font-bold text-white">
                            {getInitials(teacher.name)}
                          </span>
                        </div>
                        <p className="font-medium">{teacher.name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {teacher.email}
                    </TableCell>
                    <TableCell className="text-sm">
                      {teacher.classesTeaching?.length > 0
                        ? teacher.classesTeaching
                          .map((tc) => tc.class.name)
                          .join(", ")
                        : "—"}
                    </TableCell>
                    <TableCell>
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
                            onClick={() => handleView(teacher)}
                          >
                            <Eye className="size-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(teacher)}
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
          filteredTeachers.length > 0 &&
          viewMode === "list" && (
            <div className="border rounded-xl divide-y">
              {filteredTeachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="size-10 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-white">
                      {getInitials(teacher.name)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{teacher.name}</p>
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
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                      <span className="truncate">{teacher.email}</span>
                      <span>·</span>
                      <span>
                        {teacher.classesTeaching?.length > 0
                          ? teacher.classesTeaching
                            .map((tc) => tc.class.name)
                            .join(", ")
                          : "No classes"}
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
                        onClick={() => handleView(teacher)}
                      >
                        <Eye className="size-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(teacher)}
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

      {/* Add Teacher Dialog */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl font-bold">
              Add New Teacher
            </DialogTitle>
          </DialogHeader>

          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleAddTeacher} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
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
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
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
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="john.smith@school.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                Login credentials will be sent via email
              </p>
            </div>

            {/* Level Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Teaching Level</Label>
              <Select
                value={formData.level}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    level: value,
                    subjectIds: [],
                  })
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

            {/* Subjects — only when level is selected */}
            {formData.level && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Subjects</Label>
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-1">
                  {filteredSubjects.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No subjects found for this level
                    </p>
                  ) : (
                    filteredSubjects.map((subject: any) => {
                      const isSelected = formData.subjectIds.includes(
                        subject.id
                      );
                      return (
                        <button
                          key={subject.id}
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              subjectIds: isSelected
                                ? formData.subjectIds.filter(
                                  (id) => id !== subject.id
                                )
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
                            <Badge variant="secondary" className="text-xs">
                              Selected
                            </Badge>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
                {formData.subjectIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {formData.subjectIds.length} subject
                    {formData.subjectIds.length !== 1 ? "s" : ""} selected
                  </p>
                )}
              </div>
            )}

            {/* Classes — multi-select */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Assign Classes</Label>
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
                      .filter((cls: any) =>
                        cls.name
                          .toLowerCase()
                          .includes(classSearch.toLowerCase())
                      )
                      .map((cls: any) => {
                        const isSelected = formData.classIds.includes(
                          cls.id
                        );
                        return (
                          <button
                            key={cls.id}
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                classIds: isSelected
                                  ? formData.classIds.filter(
                                    (id) => id !== cls.id
                                  )
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
                                <Badge
                                  variant="outline"
                                  className="ml-2 text-xs capitalize"
                                >
                                  {cls.level}
                                </Badge>
                              )}
                            </span>
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-brand" />
                            )}
                          </button>
                        );
                      })}
                    {classes.filter((cls: any) =>
                      cls.name
                        .toLowerCase()
                        .includes(classSearch.toLowerCase())
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
                    const cls = classes.find((c: any) => c.id === classId);
                    return cls ? (
                      <Badge
                        key={classId}
                        variant="secondary"
                        className="gap-1 cursor-pointer hover:bg-destructive/10"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            classIds: formData.classIds.filter(
                              (id) => id !== classId
                            ),
                          })
                        }
                      >
                        {cls.name}
                        <X className="size-3" />
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
              <Button
                type="submit"
                className="flex-1"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="size-4" />
                    Add Teacher
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
            <DialogTitle>Delete Teacher</DialogTitle>
          </DialogHeader>
          {selectedTeacher && (
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete{" "}
                  <strong>{selectedTeacher.name}</strong>?
                </p>
                <p className="text-xs text-destructive/80">
                  This action cannot be undone. All associated data will be
                  removed.
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
