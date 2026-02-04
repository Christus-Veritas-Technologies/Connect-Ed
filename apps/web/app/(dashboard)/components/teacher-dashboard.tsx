"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  UserGroupIcon,
  School01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TeacherDashboardData {
  classes: Array<{
    id: string;
    name: string;
    level: string | null;
    capacity: number | null;
    studentCount: number;
    students: Array<{
      id: string;
      firstName: string;
      lastName: string;
      admissionNumber: string;
      email: string | null;
      phone: string | null;
    }>;
  }>;
}

export function TeacherDashboard() {
  const { user, school } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard", "teacher"],
    queryFn: () => api.get<TeacherDashboardData>("/dashboard/teacher"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="size-10 rounded-full border-4 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <p className="text-muted-foreground">Unable to load your dashboard</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  const totalStudents = data.classes.reduce((acc, c) => acc + c.studentCount, 0);
  const totalCapacity = data.classes.reduce((acc, c) => acc + (c.capacity || 0), 0);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold">
          Welcome, {user?.name?.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground">
          {school?.name} • Teacher Dashboard
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">My Classes</p>
                  <p className="text-3xl font-bold">{data.classes.length}</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-brand to-mid">
                  <HugeiconsIcon icon={School01Icon} className="size-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                  <p className="text-3xl font-bold">{totalStudents}</p>
                  {totalCapacity > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.round((totalStudents / totalCapacity) * 100)}% of capacity
                    </p>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-success to-emerald-600">
                  <HugeiconsIcon icon={UserGroupIcon} className="size-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Classes */}
      {data.classes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <HugeiconsIcon icon={School01Icon} className="size-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No Classes Assigned</p>
            <p className="text-muted-foreground">
              Contact your administrator to be assigned to a class
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {data.classes.map((cls, index) => (
            <motion.div
              key={cls.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {cls.name}
                      {cls.level && (
                        <Badge variant="outline" className="capitalize">
                          {cls.level}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {cls.studentCount} student{cls.studentCount !== 1 ? "s" : ""}
                      {cls.capacity && ` • Capacity: ${cls.capacity}`}
                    </CardDescription>
                  </div>
                  {cls.capacity && (
                    <div className="w-24">
                      <Progress 
                        value={(cls.studentCount / cls.capacity) * 100} 
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground text-center mt-1">
                        {Math.round((cls.studentCount / cls.capacity) * 100)}%
                      </p>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {cls.students.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No students in this class yet
                    </p>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Admission #</TableHead>
                            <TableHead className="hidden sm:table-cell">Contact</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cls.students.slice(0, 10).map((student) => (
                            <TableRow key={student.id}>
                              <TableCell className="font-medium">
                                {student.firstName} {student.lastName}
                              </TableCell>
                              <TableCell>{student.admissionNumber}</TableCell>
                              <TableCell className="hidden sm:table-cell text-muted-foreground">
                                {student.email || student.phone || "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {cls.students.length > 10 && (
                        <div className="p-3 border-t text-center">
                          <Link href={`/dashboard/classes/${cls.id}`}>
                            <Button variant="link" size="sm" className="gap-1">
                              View all {cls.students.length} students
                              <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
