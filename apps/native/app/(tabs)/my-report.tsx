import React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { api } from '@/lib/api';
import { Text } from '@/components/ui/text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/loading';

export default function MyReportScreen() {
    const { data, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['dashboard', 'student'],
        queryFn: () => api.get<any>('/dashboard/student'),
    });

    if (isLoading) return <Loading fullScreen />;

    const snapshot = data?.reportSnapshot;
    const exams = data?.latestExams ?? [];

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <View className="px-4 pt-2 pb-3">
                <Text className="text-lg font-bold text-foreground">My Report</Text>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            >
                {/* Report snapshot */}
                {snapshot && (
                    <MotiView
                        from={{ opacity: 0, translateY: 10 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 300 }}
                    >
                        <Card className="mb-4">
                            <CardHeader>
                                <CardTitle>Report Summary</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <View className="flex-row justify-between mb-4">
                                    <View className="items-center flex-1">
                                        <Text className="text-3xl font-bold text-brand">{snapshot.overallAverage}%</Text>
                                        <Text className="text-xs text-muted-foreground">Overall Average</Text>
                                    </View>
                                    <View className="items-center flex-1">
                                        <Text className="text-3xl font-bold text-green-600">{snapshot.overallPassRate}%</Text>
                                        <Text className="text-xs text-muted-foreground">Pass Rate</Text>
                                    </View>
                                </View>

                                <View className="flex-row justify-between pt-3 border-t border-border">
                                    <View>
                                        <Text className="text-xs text-muted-foreground">Subjects</Text>
                                        <Text className="text-sm font-medium text-foreground">{snapshot.totalSubjects}</Text>
                                    </View>
                                    <View className="items-center">
                                        <Text className="text-xs text-muted-foreground">Passed</Text>
                                        <Text className="text-sm font-medium text-green-600">{snapshot.examsPassed}</Text>
                                    </View>
                                    <View className="items-end">
                                        <Text className="text-xs text-muted-foreground">Failed</Text>
                                        <Text className="text-sm font-medium text-red-500">
                                            {snapshot.totalSubjects - snapshot.examsPassed}
                                        </Text>
                                    </View>
                                </View>
                            </CardContent>
                        </Card>
                    </MotiView>
                )}

                {/* Strongest / Weakest */}
                {snapshot?.strongestSubject && snapshot?.weakestSubject && (
                    <MotiView
                        from={{ opacity: 0, translateY: 10 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 300, delay: 100 }}
                    >
                        <View className="flex-row gap-3 mb-4">
                            <Card className="flex-1">
                                <CardContent className="pt-4">
                                    <Text className="text-xs text-muted-foreground mb-1">Strongest</Text>
                                    <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                                        {snapshot.strongestSubject.subjectName}
                                    </Text>
                                    <Text className="text-lg font-bold text-green-600">{snapshot.strongestSubject.mark}%</Text>
                                </CardContent>
                            </Card>
                            <Card className="flex-1">
                                <CardContent className="pt-4">
                                    <Text className="text-xs text-muted-foreground mb-1">Weakest</Text>
                                    <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                                        {snapshot.weakestSubject.subjectName}
                                    </Text>
                                    <Text className="text-lg font-bold text-red-500">{snapshot.weakestSubject.mark}%</Text>
                                </CardContent>
                            </Card>
                        </View>
                    </MotiView>
                )}

                {/* All results */}
                {exams.length > 0 && (
                    <MotiView
                        from={{ opacity: 0, translateY: 10 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 300, delay: 200 }}
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle>Subject Results</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {exams.map((exam: any, idx: number) => (
                                    <View key={idx} className="flex-row items-center justify-between py-2.5 border-b border-border">
                                        <View className="flex-1 mr-2">
                                            <Text className="text-sm font-medium text-foreground">{exam.subjectName}</Text>
                                            <Text className="text-xs text-muted-foreground">{exam.examName}</Text>
                                        </View>
                                        <View className="flex-row items-center gap-2">
                                            <Text className="text-sm font-bold text-foreground">{exam.mark}%</Text>
                                            <Badge variant={exam.isPass ? 'success' : 'destructive'}>
                                                <Text className="text-xs">{exam.grade}</Text>
                                            </Badge>
                                        </View>
                                    </View>
                                ))}
                            </CardContent>
                        </Card>
                    </MotiView>
                )}

                {exams.length === 0 && (
                    <Card>
                        <CardContent className="py-8">
                            <Text className="text-sm text-muted-foreground text-center">
                                No exam results available yet
                            </Text>
                        </CardContent>
                    </Card>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
