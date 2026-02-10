"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  UserX,
  Clock,
  Download,
  FileDown,
} from "lucide-react";
import { useStudents, useDeleteStudent, useMarkNotificationsByUrl } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { AddParentDialog } from "@/components/dialogs/add-parent-dialog";
import { AddStudentDialog } from "@/components/dialogs/add-student-dialog";
import { toast } from "sonner";

// ─── Helpers ─────────────────────────────────────────────────

function getInitials(first: string, last: string) {
  return `${first[0]}${last[0]}`.toUpperCase();
}

// ─── Compact Student Card ────────────────────────────────────
// Used in the "Recent Students" grid and the main grid view.
// Mirrors the file card from shared-files: checkbox overlay,
// avatar, title, meta, hover actions.

function StudentCard({
  student,
  isSelected,
  onSelect,
  onView,
  onDelete,
}: {
  student: any;
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
        className={`h-full cursor-pointer transition-all ${
          isSelected ? "ring-2 ring-brand shadow-lg" : ""
        }`}
        onClick={onSelect}
      >
        <CardContent className="p-4">
          {/* Selection checkbox */}
          {isSelected && (
            <div className="absolute top-3 right-3 size-5 rounded-md bg-brand flex items-center justify-center z-10">
              <Check className="size-3.5 text-white" strokeWidth={3} />
            </div>
          )}

          {/* Avatar */}
          <div className="w-full aspect-square rounded-lg bg-gradient-to-br from-brand to-purple-600 flex items-center justify-center mb-3">
            <span className="text-3xl font-bold text-white">
              {getInitials(student.firstName, student.lastName)}
            </span>
          </div>

          {/* Name */}
          <h3 className="font-medium text-sm truncate">
            {student.firstName} {student.lastName}
          </h3>

          {/* Meta */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <span className="font-mono">{student.admissionNumber}</span>
            <span>·</span>
            <span>{student.class?.name || "No class"}</span>
          </div>

          {/* Status */}
          <div className="mt-2">
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
          </div>
        </CardContent>
      </Card>

      {/* Hover actions */}
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

export default function StudentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // ── State ──
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table" | "list">("grid");
  const [filterTab, setFilterTab] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(
    searchParams.get("action") === "add"
  );
  const [showParentModal, setShowParentModal] = useState(false);
  const [newlyCreatedStudentId, setNewlyCreatedStudentId] = useState<
    string | undefined
  >();
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  // ── Data fetching — single query, client‑side slicing ──
  // We fetch one page of 20, then slice the first 8 for "Recent".
  const { data, isLoading } = useStudents({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
  });
  const deleteMutation = useDeleteStudent();
  const markNotificationsByUrl = useMarkNotificationsByUrl();

  // Mark page notifications as read on mount
  useEffect(() => {
    markNotificationsByUrl.mutate("/dashboard/students");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search with cleanup
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 400);
  }, []);

  // ── Derived data ──
  const allStudents = data?.students || [];
  const pagination = data?.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  };

  // Client‑side filter by status tab
  const filteredStudents =
    filterTab === "all"
      ? allStudents
      : filterTab === "active"
        ? allStudents.filter((s) => s.isActive)
        : allStudents.filter((s) => !s.isActive);

  // Recent 8 students for the top grid (only when not searching)
  const recentStudents = !debouncedSearch ? filteredStudents.slice(0, 8) : [];

  // Stats — derived from the full dataset
  const totalStudents = pagination.total;
  const activeStudents = allStudents.filter((s) => s.isActive).length;
  const inactiveStudents = allStudents.filter((s) => !s.isActive).length;

  // ── Selection helpers ──
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Actions ──
  const handleView = (student: any) => {
    router.push(`/dashboard/students/${student.id}`);
  };

  const handleDeleteClick = (student: any) => {
    setSelectedStudent(student);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedStudent) return;
    deleteMutation.mutate(selectedStudent.id, {
      onSuccess: () => {
        toast.success("Student deleted", {
          description: `${selectedStudent.firstName} ${selectedStudent.lastName} has been removed.`,
        });
        setShowDeleteModal(false);
        setSelectedStudent(null);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(selectedStudent.id);
          return next;
        });
      },
      onError: (error) => {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete student"
        );
      },
    });
  };

  const handleBulkDelete = () => {
    if (
      !confirm(
        `Delete ${selectedIds.size} student(s)? This cannot be undone.`
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
    toast.success(`Deleting ${ids.length} student(s)...`);
  };

  // Export: uses selected items if any, otherwise all filtered
  const handleExportCSV = () => {
    const toExport =
      selectedIds.size > 0
        ? filteredStudents.filter((s) => selectedIds.has(s.id))
        : filteredStudents;
    if (toExport.length === 0) return;

    exportDataAsCSV(
      toExport.map((s) => ({
        Name: `${s.firstName} ${s.lastName}`,
        "Student ID": s.admissionNumber,
        Class: s.class?.name || "—",
        Status: s.isActive ? "Active" : "Inactive",
        Gender: s.gender || "—",
        DOB: s.dateOfBirth
          ? new Date(s.dateOfBirth).toLocaleDateString()
          : "—",
      })),
      ["Name", "Student ID", "Class", "Status", "Gender", "DOB"],
      `students-${new Date().toISOString().split("T")[0]}`
    );
  };

  const handleExportPDF = () => {
    const toExport =
      selectedIds.size > 0
        ? filteredStudents.filter((s) => selectedIds.has(s.id))
        : filteredStudents;
    if (toExport.length === 0) return;

    exportToPDF(
      toExport.map((s) => ({
        name: `${s.firstName} ${s.lastName}`,
        studentId: s.admissionNumber,
        class: s.class?.name || "—",
        status: s.isActive ? "Active" : "Inactive",
        gender: s.gender || "—",
      })),
      [
        { key: "name", label: "Name" },
        { key: "studentId", label: "Student ID" },
        { key: "class", label: "Class" },
        { key: "status", label: "Status" },
        { key: "gender", label: "Gender" },
      ],
      `students-${new Date().toISOString().split("T")[0]}`,
      "Students Report"
    );
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <DashboardBreadcrumbs items={[{ label: "Students" }]} />

      {/* Header */}
      <PageHeader
        title="Students"
        subtitle="Manage student records and enrollments"
        search={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search by name or ID..."
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
              Add Student
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Total Students"
          value={totalStudents}
          icon={<Users className="size-6" />}
          color="brand"
          delay={0.1}
        />
        <StatsCard
          label="Active"
          value={activeStudents}
          icon={<UserCheck className="size-6" />}
          color="green"
          delay={0.2}
        />
        <StatsCard
          label="Inactive"
          value={inactiveStudents}
          icon={<UserX className="size-6" />}
          color="red"
          delay={0.3}
        />
        <StatsCard
          label="This Page"
          value={filteredStudents.length}
          icon={<Clock className="size-6" />}
          color="blue"
          delay={0.4}
        />
      </div>

      {/* Recent Students */}
      {!isLoading && recentStudents.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Students</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recentStudents.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
                isSelected={selectedIds.has(student.id)}
                onSelect={() => toggleSelection(student.id)}
                onView={() => handleView(student)}
                onDelete={() => handleDeleteClick(student)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Main Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">All Students</h2>

        {/* Filters + View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <FilterTabs
            tabs={[
              { key: "all", label: "All", count: allStudents.length },
              { key: "active", label: "Active", count: activeStudents },
              {
                key: "inactive",
                label: "Inactive",
                count: inactiveStudents,
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
        {!isLoading && filteredStudents.length === 0 && (
          <EmptyState
            icon={<Users className="size-12" />}
            title={
              debouncedSearch || filterTab !== "all"
                ? "No students match your filters"
                : "No students yet"
            }
            description="Add your first student to get started"
            action={
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="size-4" />
                Add Student
              </Button>
            }
          />
        )}

        {/* Grid View */}
        {!isLoading && filteredStudents.length > 0 && viewMode === "grid" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredStudents.map((student) => (
                <StudentCard
                  key={student.id}
                  student={student}
                  isSelected={selectedIds.has(student.id)}
                  onSelect={() => toggleSelection(student.id)}
                  onView={() => handleView(student)}
                  onDelete={() => handleDeleteClick(student)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Table View */}
        {!isLoading &&
          filteredStudents.length > 0 &&
          viewMode === "table" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow
                    key={student.id}
                    className="group hover:bg-muted/50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-full bg-gradient-to-br from-brand to-purple-600 flex items-center justify-center">
                          <span className="text-xs font-bold text-white">
                            {getInitials(
                              student.firstName,
                              student.lastName
                            )}
                          </span>
                        </div>
                        <p className="font-medium">
                          {student.firstName} {student.lastName}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {student.admissionNumber}
                    </TableCell>
                    <TableCell className="text-sm">
                      {student.class?.name || "—"}
                    </TableCell>
                    <TableCell>
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
                            onClick={() => handleView(student)}
                          >
                            <Eye className="size-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(student)}
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
          filteredStudents.length > 0 &&
          viewMode === "list" && (
            <div className="border rounded-xl divide-y">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="size-10 rounded-full bg-gradient-to-br from-brand to-purple-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-white">
                      {getInitials(student.firstName, student.lastName)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {student.firstName} {student.lastName}
                      </p>
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
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                      <span className="font-mono">
                        {student.admissionNumber}
                      </span>
                      <span>·</span>
                      <span>{student.class?.name || "No class"}</span>
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
                        onClick={() => handleView(student)}
                      >
                        <Eye className="size-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(student)}
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

        {/* Pagination */}
        <Pagination
          page={page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={setPage}
          noun="students"
        />
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

      {/* Add Student Dialog */}
      <AddStudentDialog
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={(studentId) => {
          setNewlyCreatedStudentId(studentId);
          setShowParentModal(true);
        }}
      />

      {/* Add Parent Dialog */}
      <AddParentDialog
        open={showParentModal}
        onOpenChange={setShowParentModal}
        preselectedStudentId={newlyCreatedStudentId}
        onSuccess={(data) => {
          const linkedCount = data.linkedStudents?.length || 0;
          const requestedCount = data.requestedStudents?.length || 0;
          if (linkedCount > 0 && requestedCount === 0) {
            toast.success("Parent created!", {
              description: `Linked to ${linkedCount} student(s).`,
            });
          } else if (requestedCount > 0) {
            toast.success("Parent created — approval required", {
              description: `Request sent for ${requestedCount} student(s).`,
            });
          } else {
            toast.success("Parent created!");
          }
        }}
      />

      {/* Delete Confirmation */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Student</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete{" "}
                  <strong>
                    {selectedStudent.firstName} {selectedStudent.lastName}
                  </strong>
                  ?
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
