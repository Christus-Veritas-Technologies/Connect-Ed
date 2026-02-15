import React from 'react';
import { View, ScrollView, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
    UserGroupIcon,
    Money01Icon,
    School01Icon,
    TeacherIcon,
    BookOpen01Icon,
    ArrowUp01Icon,
    ArrowDown01Icon,
    Notification01Icon,
} from '@hugeicons/core-free-icons';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Text } from '@/components/ui/text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Loading } from '@/components/ui/loading';

// ========================================
// ADMIN/RECEPTIONIST DASHBOARD
// ========================================

function AdminDashboard() {
    const { data, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['dashboard', 'stats'],
        queryFn: () => api.get<any>('/dashboard/stats'),
    });

    if (isLoading) return <Loading fullScreen />;

    const stats = data;

    return (
        <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
            {/* Stats Grid */}
            <View className="flex-row flex-wrap gap-3 mb-6">
                <StatCard
                    title="Students"
                    value={stats?.totalStudents ?? 0}
                    icon={UserGroupIcon}
                    trend={stats?.studentsTrend}
                    color="#3B82F6"
                    delay={0}
                />
                <StatCard
                    title="Collected"
                    value={formatCurrency(stats?.collectedFees ?? 0)}
                    icon={Money01Icon}
                    trend={stats?.collectionsTrend}
                    color="#10B981"
                    delay={100}
                />
                <StatCard
                    title="Pending"
                    value={formatCurrency(stats?.pendingFees ?? 0)}
                    icon={Money01Icon}
                    color="#F59E0B"
                    delay={200}
                />
                <StatCard
                    title="Teachers"
                    value={stats?.teacherCount ?? 0}
                    icon={TeacherIcon}
                    color="#8B5CF6"
                    delay={300}
                />
            </View>

            {/* Collection Rate */}
            <MotiView
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 300, delay: 400 }}
            >
                <Card className="mb-4">
                    <CardContent className="pt-4">
                        <Text className="text-sm text-muted-foreground mb-2">Fee Collection Rate</Text>
                        <View className="flex-row items-center gap-3">
                            <View className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                                <View
                                    className="h-full bg-brand rounded-full"
                                    style={{ width: `${stats?.collectionRate ?? 0}%` }}
                                />
                            </View>
                            <Text className="text-sm font-semibold text-foreground">
                                {stats?.collectionRate ?? 0}%
                            </Text>
                        </View>
                    </CardContent>
                </Card>
            </MotiView>

            {/* Recent Activity */}
            <MotiView
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 300, delay: 500 }}
            >
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats?.recentActivity?.students?.slice(0, 3).map((item: any) => (
                            <View key={item.id} className="flex-row items-center justify-between py-2.5 border-b border-border">
                                <View className="flex-1">
                                    <Text className="text-sm font-medium text-foreground">{item.name}</Text>
                                    <Text className="text-xs text-muted-foreground">{item.class}</Text>
                                </View>
                                <Badge variant="secondary">
                                    <Text className="text-xs">New student</Text>
                                </Badge>
                            </View>
                        ))}
                        {stats?.recentActivity?.payments?.slice(0, 3).map((item: any) => (
                            <View key={item.id} className="flex-row items-center justify-between py-2.5 border-b border-border">
                                <View className="flex-1">
                                    <Text className="text-sm font-medium text-foreground">{item.student}</Text>
                                    <Text className="text-xs text-muted-foreground">{item.method}</Text>
                                </View>
                                <Text className="text-sm font-semibold text-green-600">
                                    +{formatCurrency(item.amount)}
                                </Text>
                            </View>
                        ))}
                        {(!stats?.recentActivity?.students?.length && !stats?.recentActivity?.payments?.length) && (
                            <Text className="text-sm text-muted-foreground text-center py-4">
                                No recent activity
                            </Text>
                        )}
                    </CardContent>
                </Card>
            </MotiView>
        </ScrollView>
    );
}

// ========================================
// TEACHER DASHBOARD
// ========================================

function TeacherDashboard() {
    const { data, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['dashboard', 'teacher'],
        queryFn: () => api.get<any>('/dashboard/teacher'),
    });

    if (isLoading) return <Loading fullScreen />;

    const stats = data?.stats;

    return (
        <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
            <View className="flex-row flex-wrap gap-3 mb-6">
                <StatCard title="Classes" value={stats?.totalClasses ?? 0} icon={School01Icon} color="#3B82F6" delay={0} />
                <StatCard title="Students" value={stats?.totalStudents ?? 0} icon={UserGroupIcon} color="#10B981" delay={100} />
                <StatCard title="Exams" value={stats?.totalExams ?? 0} icon={BookOpen01Icon} color="#8B5CF6" delay={200} />
                <StatCard title="Pass Rate" value={`${stats?.avgPassRate ?? 0}%`} icon={BookOpen01Icon} color="#F59E0B" delay={300} />
            </View>

            {/* Classes */}
            {data?.classes?.map((cls: any) => (
                <MotiView
                    key={cls.id}
                    from={{ opacity: 0, translateY: 10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 300 }}
                >
                    <Card className="mb-3">
                        <CardContent className="pt-4">
                            <View className="flex-row items-center justify-between mb-2">
                                <Text className="text-base font-semibold text-foreground">{cls.name}</Text>
                                <Badge variant="brand">
                                    <Text className="text-xs text-white">{cls.studentCount} students</Text>
                                </Badge>
                            </View>
                            {cls.subjects?.length > 0 && (
                                <View className="flex-row flex-wrap gap-1.5 mt-1">
                                    {cls.subjects.slice(0, 4).map((sub: any) => (
                                        <Badge key={sub.id} variant="secondary">
                                            <Text className="text-xs">{sub.name}</Text>
                                        </Badge>
                                    ))}
                                </View>
                            )}
                        </CardContent>
                    </Card>
                </MotiView>
            ))}

            {/* Recent Exams */}
            {data?.recentExams?.length > 0 && (
                <Card className="mt-2">
                    <CardHeader>
                        <CardTitle>Recent Exams</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.recentExams.map((exam: any) => (
                            <View key={exam.id} className="flex-row items-center justify-between py-2.5 border-b border-border">
                                <View className="flex-1">
                                    <Text className="text-sm font-medium text-foreground">{exam.name}</Text>
                                    <Text className="text-xs text-muted-foreground">
                                        {exam.subject} · {exam.className}
                                    </Text>
                                </View>
                                <View className="items-end">
                                    <Text className="text-sm font-semibold text-foreground">{exam.averageMark}%</Text>
                                    <Text className="text-xs text-muted-foreground">{exam.passRate}% pass</Text>
                                </View>
                            </View>
                        ))}
                    </CardContent>
                </Card>
            )}
        </ScrollView>
    );
}

// ========================================
// PARENT DASHBOARD
// ========================================

function ParentDashboard() {
    const { data, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['dashboard', 'parent'],
        queryFn: () => api.get<any>('/dashboard/parent'),
    });

    if (isLoading) return <Loading fullScreen />;

    const summary = data?.summary;

    return (
        <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
            {/* Summary Stats */}
            <View className="flex-row flex-wrap gap-3 mb-6">
                <StatCard title="Children" value={summary?.totalChildren ?? 0} icon={UserGroupIcon} color="#3B82F6" delay={0} />
                <StatCard title="Balance" value={formatCurrency(summary?.totalBalance ?? 0)} icon={Money01Icon} color={summary?.totalBalance > 0 ? '#EF4444' : '#10B981'} delay={100} />
            </View>

            {/* Children cards */}
            {data?.children?.map((child: any, idx: number) => (
                <MotiView
                    key={child.id}
                    from={{ opacity: 0, translateY: 10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 300, delay: idx * 100 }}
                >
                    <Card className="mb-4">
                        <CardHeader>
                            <View className="flex-row items-center justify-between">
                                <CardTitle>{child.name}</CardTitle>
                                {child.class && (
                                    <Badge variant="brand">
                                        <Text className="text-xs text-white">{child.class.name}</Text>
                                    </Badge>
                                )}
                            </View>
                            <Text className="text-xs text-muted-foreground">
                                {child.admissionNumber}
                            </Text>
                        </CardHeader>
                        <CardContent>
                            {/* Academic snapshot */}
                            {child.overallAverage > 0 && (
                                <View className="flex-row items-center gap-4 mb-3">
                                    <View className="items-center">
                                        <Text className="text-2xl font-bold text-brand">{child.overallAverage}%</Text>
                                        <Text className="text-xs text-muted-foreground">Average</Text>
                                    </View>
                                    <View className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                        <View
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${child.overallAverage}%`,
                                                backgroundColor: child.overallAverage >= 50 ? '#10B981' : '#EF4444',
                                            }}
                                        />
                                    </View>
                                </View>
                            )}

                            {/* Fee summary */}
                            <View className="flex-row items-center justify-between pt-2 border-t border-border">
                                <Text className="text-sm text-muted-foreground">Fee Balance</Text>
                                <Text
                                    className={`text-sm font-semibold ${child.balance > 0 ? 'text-red-500' : 'text-green-600'}`}
                                >
                                    {formatCurrency(child.balance ?? 0)}
                                </Text>
                            </View>
                        </CardContent>
                    </Card>
                </MotiView>
            ))}

            {(!data?.children?.length) && (
                <Card>
                    <CardContent className="py-8">
                        <Text className="text-sm text-muted-foreground text-center">
                            No children linked to your account yet.{'\n'}
                            Contact your school administrator.
                        </Text>
                    </CardContent>
                </Card>
            )}
        </ScrollView>
    );
}

// ========================================
// STUDENT DASHBOARD
// ========================================

function StudentDashboard() {
    const { data, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['dashboard', 'student'],
        queryFn: () => api.get<any>('/dashboard/student'),
    });

    if (isLoading) return <Loading fullScreen />;

    const snapshot = data?.reportSnapshot;
    const studentData = data?.student;

    return (
        <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
            {/* Class info */}
            {data?.class && (
                <MotiView
                    from={{ opacity: 0, translateY: 10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 300 }}
                >
                    <Card className="mb-4">
                        <CardContent className="pt-4">
                            <View className="flex-row items-center justify-between">
                                <View>
                                    <Text className="text-sm text-muted-foreground">Your Class</Text>
                                    <Text className="text-lg font-semibold text-foreground">{data.class.name}</Text>
                                </View>
                                {data.class.teacher && (
                                    <View className="items-end">
                                        <Text className="text-xs text-muted-foreground">Class Teacher</Text>
                                        <Text className="text-sm font-medium text-foreground">{data.class.teacher.name}</Text>
                                    </View>
                                )}
                            </View>
                        </CardContent>
                    </Card>
                </MotiView>
            )}

            {/* Academic Stats */}
            <View className="flex-row flex-wrap gap-3 mb-6">
                <StatCard title="Average" value={`${snapshot?.overallAverage ?? 0}%`} icon={BookOpen01Icon} color="#3B82F6" delay={100} />
                <StatCard title="Pass Rate" value={`${snapshot?.overallPassRate ?? 0}%`} icon={BookOpen01Icon} color="#10B981" delay={200} />
            </View>

            {/* Subjects */}
            {data?.latestExams?.length > 0 && (
                <Card className="mb-4">
                    <CardHeader>
                        <CardTitle>Latest Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.latestExams.map((exam: any, idx: number) => (
                            <View key={idx} className="flex-row items-center justify-between py-2.5 border-b border-border">
                                <View className="flex-1">
                                    <Text className="text-sm font-medium text-foreground">{exam.subjectName}</Text>
                                    <Text className="text-xs text-muted-foreground">{exam.examName}</Text>
                                </View>
                                <View className="flex-row items-center gap-2">
                                    <Text className="text-sm font-semibold text-foreground">{exam.mark}%</Text>
                                    <Badge variant={exam.isPass ? 'success' : 'destructive'}>
                                        <Text className="text-xs text-white">{exam.grade}</Text>
                                    </Badge>
                                </View>
                            </View>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Fee summary */}
            {data?.feeSummary && (
                <Card>
                    <CardHeader>
                        <CardTitle>Fee Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <View className="gap-2">
                            <View className="flex-row justify-between">
                                <Text className="text-sm text-muted-foreground">Total Fees</Text>
                                <Text className="text-sm font-medium text-foreground">{formatCurrency(data.feeSummary.totalFees)}</Text>
                            </View>
                            <View className="flex-row justify-between">
                                <Text className="text-sm text-muted-foreground">Paid</Text>
                                <Text className="text-sm font-medium text-green-600">{formatCurrency(data.feeSummary.totalPaid)}</Text>
                            </View>
                            <View className="flex-row justify-between pt-2 border-t border-border">
                                <Text className="text-sm font-medium text-foreground">Balance</Text>
                                <Text className={`text-sm font-bold ${data.feeSummary.balance > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                    {formatCurrency(data.feeSummary.balance)}
                                </Text>
                            </View>
                        </View>
                    </CardContent>
                </Card>
            )}
        </ScrollView>
    );
}

// ========================================
// SHARED COMPONENTS
// ========================================

function StatCard({
    title,
    value,
    icon,
    trend,
    color,
    delay = 0,
}: {
    title: string;
    value: string | number;
    icon: any;
    trend?: number;
    color: string;
    delay?: number;
}) {
    return (
        <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 300, delay }}
            className="flex-1 min-w-[45%]"
        >
            <Card>
                <CardContent className="pt-4">
                    <View className="flex-row items-center justify-between mb-2">
                        <View
                            className="h-9 w-9 rounded-lg items-center justify-center"
                            style={{ backgroundColor: `${color}18` }}
                        >
                            <HugeiconsIcon icon={icon} size={18} color={color} />
                        </View>
                        {trend !== undefined && trend !== 0 && (
                            <View className="flex-row items-center gap-0.5">
                                <HugeiconsIcon
                                    icon={trend > 0 ? ArrowUp01Icon : ArrowDown01Icon}
                                    size={12}
                                    color={trend > 0 ? '#10B981' : '#EF4444'}
                                />
                                <Text
                                    className={`text-xs font-medium ${trend > 0 ? 'text-green-600' : 'text-red-500'}`}
                                >
                                    {Math.abs(trend)}%
                                </Text>
                            </View>
                        )}
                    </View>
                    <Text className="text-xl font-bold text-foreground">{value}</Text>
                    <Text className="text-xs text-muted-foreground mt-0.5">{title}</Text>
                </CardContent>
            </Card>
        </MotiView>
    );
}

function formatCurrency(amount: number): string {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    return `$${amount.toFixed(0)}`;
}

// ========================================
// MAIN DASHBOARD SCREEN
// ========================================

export default function DashboardScreen() {
    const { user, school } = useAuth();

    const role = user?.role;

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            {/* Header */}
            <MotiView
                from={{ opacity: 0, translateY: -10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 300 }}
                className="px-4 pt-2 pb-3"
            >
                <View className="flex-row items-center justify-between">
                    <View>
                        <Text className="text-lg font-bold text-foreground">
                            {getGreeting()}, {user?.name?.split(' ')[0]}
                        </Text>
                        <Text className="text-sm text-muted-foreground">
                            {school?.name || 'Connect-Ed'}
                        </Text>
                    </View>
                    <View className="h-10 w-10 rounded-full bg-brand items-center justify-center">
                        <Text className="text-sm font-bold text-white">
                            {user?.name?.charAt(0)?.toUpperCase() || '?'}
                        </Text>
                    </View>
                </View>
            </MotiView>

            {/* Role-specific dashboard */}
            {(role === 'ADMIN' || role === 'RECEPTIONIST') && <AdminDashboard />}
            {role === 'TEACHER' && <TeacherDashboard />}
            {role === 'PARENT' && <ParentDashboard />}
            {role === 'STUDENT' && <StudentDashboard />}
        </SafeAreaView>
    );
}

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}
