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

export default function MyChildScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard', 'parent'],
    queryFn: () => api.get<any>('/dashboard/parent'),
  });

  if (isLoading) return <Loading fullScreen />;

  const children = data?.children ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-4 pt-2 pb-3">
        <Text className="text-lg font-bold text-foreground">
          {children.length === 1 ? 'My Child' : 'My Children'}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {children.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <Text className="text-sm text-muted-foreground text-center">
                No children linked to your account yet.{'\n'}
                Contact your school administrator.
              </Text>
            </CardContent>
          </Card>
        ) : (
          children.map((child: any, idx: number) => (
            <MotiView
              key={child.id}
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 300, delay: idx * 100 }}
            >
              <Card className="mb-4">
                <CardHeader>
                  <View className="flex-row items-center justify-between">
                    <View>
                      <CardTitle>{child.name}</CardTitle>
                      <Text className="text-xs text-muted-foreground mt-0.5">
                        {child.admissionNumber}
                      </Text>
                    </View>
                    <View className="h-12 w-12 rounded-full bg-brand items-center justify-center">
                      <Text className="text-lg font-bold text-white">
                        {child.firstName?.[0]}{child.lastName?.[0]}
                      </Text>
                    </View>
                  </View>
                </CardHeader>
                <CardContent>
                  {/* Class info */}
                  {child.class && (
                    <View className="flex-row items-center justify-between py-2.5 border-b border-border">
                      <Text className="text-sm text-muted-foreground">Class</Text>
                      <View className="flex-row items-center gap-2">
                        <Badge variant="brand">
                          <Text className="text-xs text-white">{child.class.name}</Text>
                        </Badge>
                      </View>
                    </View>
                  )}

                  {child.class?.classTeacher && (
                    <View className="flex-row items-center justify-between py-2.5 border-b border-border">
                      <Text className="text-sm text-muted-foreground">Class Teacher</Text>
                      <Text className="text-sm font-medium text-foreground">
                        {child.class.classTeacher.name}
                      </Text>
                    </View>
                  )}

                  {/* Academic performance */}
                  {child.overallAverage > 0 && (
                    <View className="mt-3 mb-2">
                      <Text className="text-sm font-medium text-foreground mb-2">Academic Performance</Text>
                      <View className="flex-row items-center gap-4">
                        <View className="items-center">
                          <Text className="text-2xl font-bold text-brand">{child.overallAverage}%</Text>
                          <Text className="text-xs text-muted-foreground">Average</Text>
                        </View>
                        <View className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                          <View
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(child.overallAverage, 100)}%`,
                              backgroundColor: child.overallAverage >= 50 ? '#10B981' : '#EF4444',
                            }}
                          />
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Latest exam results */}
                  {child.latestExams?.length > 0 && (
                    <View className="mt-3">
                      <Text className="text-sm font-medium text-foreground mb-2">Latest Results</Text>
                      {child.latestExams.map((exam: any, i: number) => (
                        <View key={i} className="flex-row items-center justify-between py-2 border-b border-border">
                          <Text className="text-sm text-foreground">{exam.subjectName}</Text>
                          <View className="flex-row items-center gap-2">
                            <Text className="text-sm font-semibold text-foreground">{exam.mark}%</Text>
                            <Badge variant={exam.isPass ? 'success' : 'destructive'}>
                              <Text className="text-xs">{exam.grade}</Text>
                            </Badge>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Fee summary */}
                  <View className="mt-3 pt-3 border-t border-border">
                    <View className="flex-row justify-between">
                      <Text className="text-sm text-muted-foreground">Total Fees</Text>
                      <Text className="text-sm font-medium text-foreground">
                        ${Number(child.totalFees ?? 0).toLocaleString()}
                      </Text>
                    </View>
                    <View className="flex-row justify-between mt-1">
                      <Text className="text-sm text-muted-foreground">Paid</Text>
                      <Text className="text-sm font-medium text-green-600">
                        ${Number(child.totalPaid ?? 0).toLocaleString()}
                      </Text>
                    </View>
                    <View className="flex-row justify-between mt-1">
                      <Text className="text-sm font-medium text-foreground">Balance</Text>
                      <Text className={`text-sm font-bold ${(child.balance ?? 0) > 0 ? 'text-red-500' : 'text-green-600'}`}>
                        ${Number(child.balance ?? 0).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </CardContent>
              </Card>
            </MotiView>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
