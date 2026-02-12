"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
    UserGroupIcon,
    SentIcon,
    UserAdd01Icon,
    Search01Icon,
    Mail01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Users, Phone } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { StatsCard, ViewToggle, Pagination, EmptyState, FilterTabs } from "@/components/dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

interface ClassStudent {
    id: string;
    firstName: string;
    lastName: string;
    name: string;
    admissionNumber: string;
    gender: string | null;
    status: string;
    email: string | null;
    phone: string | null;
    dateOfBirth: string | null;
    createdAt: string;
    className: string;
    classId: string | null;
    parent: {
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
    } | null;
}

interface MyClassData {
    classes: Array<{
        id: string;
        name: string;
        level: string | null;
        capacity: number | null;
    }>;
    students: ClassStudent[];
    stats: {
        totalStudents: number;
        totalMessages: number;
        totalParents: number;
    };
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

const STATUS_COLORS: Record<string, string> = {
    ACTIVE: "success",
    SUSPENDED: "destructive",
    ABSENT: "warning",
};

export default function MyClassPage() {
    const { user } = useAuth();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [gender, setGender] = useState("");
    const [status, setStatus] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "table">("table");
    const limit = 12;

    // Debounce search
    const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);
    const handleSearch = (value: string) => {
        setSearch(value);
        if (searchTimer) clearTimeout(searchTimer);
        const timer = setTimeout(() => {
            setDebouncedSearch(value);
            setPage(1);
        }, 300);
        setSearchTimer(timer);
    };

    const { data, isLoading } = useQuery({
        queryKey: ["my-class", page, limit, debouncedSearch, gender, status],
        queryFn: () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
            });
            if (debouncedSearch) params.set("search", debouncedSearch);
            if (gender) params.set("gender", gender);
            if (status) params.set("status", status);
            return api.get<MyClassData>(`/dashboard/my-class?${params}`);
        },
    });

    const students = data?.students || [];
    const stats = data?.stats || { totalStudents: 0, totalMessages: 0, totalParents: 0 };
    const pagination = data?.pagination || { page: 1, limit, total: 0, totalPages: 0 };
    const classes = data?.classes || [];

    // No class assigned
    if (!isLoading && classes.length === 0) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">My Class</h1>
                    <p className="text-muted-foreground text-sm mt-1">Manage your class and students</p>
                </div>
                <EmptyState
                    icon={<HugeiconsIcon icon={UserGroupIcon} className="size-12" />}
                    title="No Class Assigned"
                    description="Contact your administrator to be assigned as a class teacher."
                />
            </div>
        );
    }

    const statusTabs = [
        { key: "", label: "All" },
        { key: "ACTIVE", label: "Active" },
        { key: "SUSPENDED", label: "Suspended" },
        { key: "ABSENT", label: "Absent" },
    ];

    return (
        <div className="space-y-6">
            {/* Header with quick actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">
                        My Class
                        {classes.length === 1 && (
                            <span className="text-muted-foreground font-normal text-xl ml-2">
                                — {classes[0]!.name}
                            </span>
                        )}
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Manage your students and class activities
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" asChild className="gap-2">
                        <Link href="/dashboard/class/chat">
                            <HugeiconsIcon icon={SentIcon} size={16} />
                            Class Chat
                        </Link>
                    </Button>
                    <Button asChild className="gap-2">
                        <Link href="/dashboard/students">
                            <HugeiconsIcon icon={UserAdd01Icon} size={16} />
                            Add Student
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatsCard
                    label="Students"
                    value={stats.totalStudents}
                    icon={<HugeiconsIcon icon={UserGroupIcon} className="size-5" />}
                    color="brand"
                />
                <StatsCard
                    label="Messages"
                    value={stats.totalMessages}
                    icon={<HugeiconsIcon icon={SentIcon} className="size-5" />}
                    color="blue"
                    delay={0.05}
                />
                <StatsCard
                    label="Parents"
                    value={stats.totalParents}
                    icon={<Users className="size-5" />}
                    color="purple"
                    delay={0.1}
                />
            </div>

            {/* Filters & View Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative w-72">
                        <HugeiconsIcon icon={Search01Icon} className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder="Search students..."
                            className="pl-9"
                        />
                    </div>
                    <Select
                        value={gender}
                        onValueChange={(v) => { setGender(v === "ALL" ? "" : v); setPage(1); }}
                    >
                        <SelectTrigger className="w-36">
                            <SelectValue placeholder="Gender" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Genders</SelectItem>
                            <SelectItem value="MALE">Male</SelectItem>
                            <SelectItem value="FEMALE">Female</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                    </Select>
                    <FilterTabs
                        tabs={statusTabs}
                        active={status}
                        onChange={(key) => { setStatus(key); setPage(1); }}
                    />
                </div>
                <ViewToggle mode={viewMode} onChange={(m) => setViewMode(m as "grid" | "table")} />
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="flex items-center justify-center py-12">
                    <div className="size-10 rounded-full border-4 border-brand border-t-transparent animate-spin" />
                </div>
            )}

            {/* No results */}
            {!isLoading && students.length === 0 && (
                <EmptyState
                    icon={<HugeiconsIcon icon={UserGroupIcon} className="size-12" />}
                    title="No Students Found"
                    description={debouncedSearch ? "Try adjusting your search or filters." : "No students in your class yet."}
                />
            )}

            {/* Table View */}
            {!isLoading && students.length > 0 && viewMode === "table" && (
                <Card>
                    <CardContent className="p-0">
                        <div className="rounded-md border-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Admission #</TableHead>
                                        <TableHead>Gender</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Parent</TableHead>
                                        <TableHead className="hidden lg:table-cell">Contact</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <AnimatePresence mode="popLayout">
                                        {students.map((student, index) => (
                                            <motion.tr
                                                key={student.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                transition={{ delay: index * 0.02 }}
                                                className="border-b transition-colors hover:bg-muted/50"
                                            >
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-9 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                                                            <span className="text-xs font-semibold text-brand">
                                                                {student.firstName[0]}{student.lastName[0]}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">{student.name}</p>
                                                            {student.email && (
                                                                <p className="text-xs text-muted-foreground">{student.email}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">{student.admissionNumber}</TableCell>
                                                <TableCell>
                                                    {student.gender ? (
                                                        <Badge variant="outline" className="capitalize text-xs">
                                                            {student.gender.toLowerCase()}
                                                        </Badge>
                                                    ) : "—"}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={(STATUS_COLORS[student.status] || "outline") as any} className="text-xs">
                                                        {student.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {student.parent ? (
                                                        <div>
                                                            <p className="text-sm">{student.parent.name}</p>
                                                            {student.parent.phone && (
                                                                <p className="text-xs text-muted-foreground">{student.parent.phone}</p>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="hidden lg:table-cell">
                                                    <div className="flex gap-2">
                                                        {student.phone && (
                                                            <a href={`tel:${student.phone}`} className="text-muted-foreground hover:text-foreground" title="Call">
                                                                <Phone size={16} />
                                                            </a>
                                                        )}
                                                        {student.email && (
                                                            <a href={`mailto:${student.email}`} className="text-muted-foreground hover:text-foreground">
                                                                <HugeiconsIcon icon={Mail01Icon} size={16} />
                                                            </a>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Grid (Card) View */}
            {!isLoading && students.length > 0 && viewMode === "grid" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <AnimatePresence mode="popLayout">
                        {students.map((student, index) => (
                            <motion.div
                                key={student.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: index * 0.02 }}
                            >
                                <Card className="overflow-hidden hover:shadow-md transition-shadow">
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="size-11 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                                                <span className="text-sm font-semibold text-brand">
                                                    {student.firstName[0]}{student.lastName[0]}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{student.name}</p>
                                                <p className="text-xs text-muted-foreground font-mono">{student.admissionNumber}</p>
                                            </div>
                                            <Badge variant={(STATUS_COLORS[student.status] || "outline") as any} className="text-xs shrink-0">
                                                {student.status}
                                            </Badge>
                                        </div>

                                        <div className="mt-4 space-y-2 text-sm">
                                            {student.gender && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">Gender</span>
                                                    <span className="capitalize">{student.gender.toLowerCase()}</span>
                                                </div>
                                            )}
                                            {student.className && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">Class</span>
                                                    <Badge variant="outline" className="text-xs">{student.className}</Badge>
                                                </div>
                                            )}
                                            {student.parent && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">Parent</span>
                                                    <span className="truncate max-w-30">{student.parent.name}</span>
                                                </div>
                                            )}
                                            {student.dateOfBirth && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">Born</span>
                                                    <span>{new Date(student.dateOfBirth).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                                                </div>
                                            )}
                                        </div>

                                        {(student.email || student.phone) && (
                                            <div className="mt-4 pt-3 border-t flex gap-2">
                                                {student.phone && (
                                                    <a
                                                        href={`tel:${student.phone}`}
                                                        className="flex-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-1.5 rounded-md hover:bg-muted transition-colors"
                                                    >
                                                        <Phone size={14} />
                                                        Call
                                                    </a>
                                                )}
                                                {student.email && (
                                                    <a
                                                        href={`mailto:${student.email}`}
                                                        className="flex-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-1.5 rounded-md hover:bg-muted transition-colors"
                                                    >
                                                        <HugeiconsIcon icon={Mail01Icon} size={14} />
                                                        Email
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Pagination */}
            {!isLoading && pagination.totalPages > 1 && (
                <Pagination
                    page={pagination.page}
                    totalPages={pagination.totalPages}
                    total={pagination.total}
                    limit={pagination.limit}
                    onPageChange={setPage}
                    noun="students"
                />
            )}
        </div>
    );
}
