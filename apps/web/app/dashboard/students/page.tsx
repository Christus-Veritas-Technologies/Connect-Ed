"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserGroupIcon,
  Search01Icon,
  Add01Icon,
  ViewIcon,
  PencilEdit01Icon,
  UserCheck01Icon,
  UserRemove01Icon,
  FilterIcon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  FileDownloadIcon,
  FileExportIcon,
  PauseIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useStudents } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { exportToPDF, exportDataAsCSV } from "@/lib/export-utils";

export default function StudentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Query hooks
  const { data, isLoading } = useStudents({
    page,
    limit: 10,
    search: debouncedSearch || undefined,
  });

  const students = data?.students || [];
  const pagination = data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 };

  // Calculate stats - using isActive for now until backend is updated
  const activeStudents = students.filter((s) => s.isActive).length;
  const suspendedStudents = 0; // TODO: Update when backend supports status field
  const absentStudents = 0; // TODO: Update when backend supports status field

  // Filter students by status
  const filteredStudents = statusFilter === "all" 
    ? students 
    : statusFilter === "active"
    ? students.filter((s) => s.isActive)
    : statusFilter === "suspended"
    ? [] // TODO: Update when backend supports status field
    : statusFilter === "absent"
    ? [] // TODO: Update when backend supports status field
    : students.filter((s) => !s.isActive);

  // Export handlers
  const handleExportCSV = () => {
    if (filteredStudents.length === 0) return;

    const exportData = filteredStudents.map((student) => ({
      Name: `${student.firstName} ${student.lastName}`,
      "Student ID": student.admissionNumber,
      Class: student.class?.name || "—",
      Status: student.isActive ? "Active" : "Inactive",
      Gender: student.gender || "—",
      DOB: student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : "—",
    }));

    exportDataAsCSV(
      exportData,
      ["Name", "Student ID", "Class", "Status", "Gender", "DOB"],
      `students-${new Date().toISOString().split("T")[0]}`
    );
  };

  const handleExportPDF = () => {
    if (filteredStudents.length === 0) return;

    const exportData = filteredStudents.map((student) => ({
      name: `${student.firstName} ${student.lastName}`,
      studentId: student.admissionNumber,
      class: student.class?.name || "—",
      status: student.isActive ? "Active" : "Inactive",
      gender: student.gender || "—",
    }));

    exportToPDF(
      exportData,
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
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-brand to-purple-600">
              <HugeiconsIcon icon={UserGroupIcon} size={24} className="text-white" />
            </div>
            Students
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage student records and enrollments
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/dashboard/students/new">
            <HugeiconsIcon icon={Add01Icon} size={20} />
            Add Student
          </Link>
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
                  <p className="text-sm text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold mt-1">{pagination.total}</p>
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
                  <p className="text-2xl font-bold mt-1 text-green-600">{activeStudents}</p>
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
          <Card className="overflow-hidden border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Suspended</p>
                  <p className="text-2xl font-bold mt-1 text-red-600">{suspendedStudents}</p>
                </div>
                <div className="p-3 rounded-xl bg-red-100">
                  <HugeiconsIcon icon={UserRemove01Icon} size={24} className="text-red-600" />
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
                  <p className="text-sm text-muted-foreground">Absent</p>
                  <p className="text-2xl font-bold mt-1 text-orange-600">{absentStudents}</p>
                </div>
                <div className="p-3 rounded-xl bg-orange-100">
                  <HugeiconsIcon icon={PauseIcon} size={24} className="text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <HugeiconsIcon
            icon={Search01Icon}
            size={20}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search by name or student ID..."
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
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
            </SelectContent>
          </Select>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleExportCSV}
                    disabled={filteredStudents.length === 0}
                    className="gap-2"
                  >
                    <HugeiconsIcon icon={FileDownloadIcon} size={20} />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {filteredStudents.length === 0 ? "No students to export" : "Export as CSV"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleExportPDF}
                    disabled={filteredStudents.length === 0}
                    className="gap-2"
                  >
                    <HugeiconsIcon icon={FileExportIcon} size={20} />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {filteredStudents.length === 0 ? "No students to export" : "Export as PDF"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </motion.div>

      {/* Students Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-card rounded-xl border overflow-hidden"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="size-8 rounded-full border-4 border-brand border-t-transparent animate-spin" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
              <HugeiconsIcon icon={UserGroupIcon} size={48} className="text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">
              {search || statusFilter !== "all" ? "No students match your filters" : "No students found"}
            </p>
            <Button asChild className="gap-2">
              <Link href="/dashboard/students/new">
                <HugeiconsIcon icon={Add01Icon} size={20} />
                Add Your First Student
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Name</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredStudents.map((student, index) => (
                    <motion.tr
                      key={student.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className="group hover:bg-muted/50 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            className="size-10 rounded-full bg-gradient-to-br from-brand to-purple-600 flex items-center justify-center shadow-md"
                          >
                            <span className="text-sm font-bold text-white">
                              {student.firstName[0]}
                              {student.lastName[0]}
                            </span>
                          </motion.div>
                          <div>
                            <p className="font-semibold">
                              {student.firstName} {student.lastName}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {student.admissionNumber}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{student.class?.name || "—"}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={student.isActive ? "default" : "secondary"}
                          className={student.isActive ? "bg-green-500 hover:bg-green-600" : ""}
                        >
                          {student.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon-sm" className="hover:bg-brand/10 hover:text-brand">
                            <HugeiconsIcon icon={ViewIcon} size={18} />
                          </Button>
                          <Button variant="ghost" size="icon-sm" className="hover:bg-brand/10 hover:text-brand">
                            <HugeiconsIcon icon={PencilEdit01Icon} size={18} />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t bg-muted/30">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{filteredStudents.length}</span> of{" "}
                <span className="font-semibold text-foreground">{pagination.total}</span> students
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage(pagination.page - 1)}
                  className="gap-2"
                >
                  <HugeiconsIcon icon={ArrowDown01Icon} size={16} className="rotate-90" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage(pagination.page + 1)}
                  className="gap-2"
                >
                  Next
                  <HugeiconsIcon icon={ArrowUp01Icon} size={16} className="rotate-90" />
                </Button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
