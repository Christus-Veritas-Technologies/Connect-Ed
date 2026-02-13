"use client";

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
    UserIcon,
    School01Icon,
    BookOpen01Icon,
    Mail01Icon,
    UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardBreadcrumbs } from "@/components/dashboard/breadcrumbs";

interface SubjectInfo {
    id: string;
    name: string;
    code: string;
    teacher: { id: string; name: string } | null;
}

interface ClassInfo {
    id: string;
    name: string;
    level: string | null;
    teacher: { id: string; name: string; email: string; phone: string | null } | null;
    subjects: SubjectInfo[];
    totalStudents: number;
}

interface ChildClassData {
    id: string;
    name: string;
    admissionNumber: string;
    class: ClassInfo | null;
}

interface MyChildClassResponse {
    children: ChildClassData[];
}

export default function MyChildClassPage() {
    const { data, isLoading, error } = useQuery({
        queryKey: ["dashboard", "my-child-class"],
        queryFn: () => api.get<MyChildClassResponse>("/dashboard/my-child-class"),
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-100">
                <div className="size-10 rounded-full border-4 border-brand border-t-transparent animate-spin" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-100 text-center">
                <p className="text-muted-foreground">Unable to load class information</p>
                <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                    Try Again
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <DashboardBreadcrumbs items={[{ label: "My Child's Class", href: "/dashboard/my-child-class" }]} />

            <div>
                <h1 className="text-2xl font-semibold">My Child's Class</h1>
                <p className="text-sm text-muted-foreground">Class details, subjects, and teachers</p>
            </div>

            {data.children.map((child, index) => (
                <motion.div
                    key={child.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                >
                    <div className="rounded-2xl border bg-card overflow-hidden">
                        {/* Child Header */}
                        <div className="flex items-center justify-between border-b bg-muted/30 px-5 py-4">
                            <div className="flex items-center gap-3">
                                <div className="size-9 rounded-lg bg-brand/15 text-brand flex items-center justify-center text-sm font-semibold">
                                    {child.name.split(" ").map((n) => n[0]).join("")}
                                </div>
                                <div>
                                    <h2 className="text-base font-semibold">{child.name}</h2>
                                    <p className="text-xs text-muted-foreground">{child.admissionNumber}</p>
                                </div>
                            </div>
                            {child.class && (
                                <Badge className="bg-brand text-white">{child.class.name}</Badge>
                            )}
                        </div>

                        {child.class ? (
                            <div className="p-5 space-y-6">
                                {/* Class Overview */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    <div className="rounded-xl border p-4">
                                        <div className="flex items-center gap-2 text-brand">
                                            <HugeiconsIcon icon={School01Icon} className="size-5" />
                                            <p className="text-sm font-semibold">Class</p>
                                        </div>
                                        <p className="mt-2 text-lg font-semibold">{child.class.name}</p>
                                        {child.class.level && (
                                            <Badge variant="outline" className="mt-1 capitalize">{child.class.level}</Badge>
                                        )}
                                    </div>
                                    <div className="rounded-xl border p-4">
                                        <div className="flex items-center gap-2 text-brand">
                                            <HugeiconsIcon icon={UserGroupIcon} className="size-5" />
                                            <p className="text-sm font-semibold">Class Size</p>
                                        </div>
                                        <p className="mt-2 text-lg font-semibold">{child.class.totalStudents}</p>
                                        <p className="text-xs text-muted-foreground">students</p>
                                    </div>
                                    <div className="rounded-xl border p-4">
                                        <div className="flex items-center gap-2 text-brand">
                                            <HugeiconsIcon icon={BookOpen01Icon} className="size-5" />
                                            <p className="text-sm font-semibold">Subjects</p>
                                        </div>
                                        <p className="mt-2 text-lg font-semibold">{child.class.subjects.length}</p>
                                        <p className="text-xs text-muted-foreground">subjects offered</p>
                                    </div>
                                </div>

                                {/* Class Teacher */}
                                {child.class.teacher && (
                                    <div className="rounded-xl border border-brand/15 bg-linear-to-r from-brand/5 to-transparent p-5">
                                        <div className="flex items-center gap-2 mb-3">
                                            <HugeiconsIcon icon={UserIcon} className="size-5 text-brand" />
                                            <h3 className="text-base font-semibold">Class Teacher</h3>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="size-12 rounded-xl bg-brand/15 text-brand flex items-center justify-center text-lg font-semibold">
                                                {child.class.teacher.name[0]}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-lg">{child.class.teacher.name}</p>
                                                <a
                                                    href={`mailto:${child.class.teacher.email}`}
                                                    className="flex items-center gap-1.5 text-sm text-brand hover:underline"
                                                >
                                                    <HugeiconsIcon icon={Mail01Icon} className="size-4" />
                                                    {child.class.teacher.email}
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Subjects Grid */}
                                <div>
                                    <h3 className="text-base font-semibold mb-3">Subjects</h3>
                                    {child.class.subjects.length === 0 ? (
                                        <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
                                            No subjects assigned yet
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                            {child.class.subjects.map((subject) => (
                                                <div key={subject.id} className="rounded-xl border p-4 hover:border-brand/30 transition-colors">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="font-medium">{subject.name}</p>
                                                            <p className="text-xs text-muted-foreground">{subject.code}</p>
                                                        </div>
                                                        <div className="size-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
                                                            <HugeiconsIcon icon={BookOpen01Icon} className="size-4" />
                                                        </div>
                                                    </div>
                                                    {subject.teacher && (
                                                        <div className="mt-3 pt-3 border-t">
                                                            <p className="text-xs text-muted-foreground">Teacher</p>
                                                            <p className="text-sm font-medium">{subject.teacher.name}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 text-center text-muted-foreground">
                                <HugeiconsIcon icon={School01Icon} className="size-10 mx-auto mb-3 opacity-50" />
                                <p className="font-medium">No class assigned</p>
                                <p className="text-sm mt-1">This child has not been assigned to a class yet.</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
