import React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { UserIcon } from '@hugeicons/core-free-icons';
import { api } from '@/lib/api';
import { Text } from '@/components/ui/text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/loading';

export default function MyClassScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard', 'my-class'],
    queryFn: () => api.get<any>('/dashboard/my-class'),
  });

  if (isLoading) return <Loading fullScreen />;

  const classData = data?.class || data;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-4 pt-2 pb-3">
        <Text className="text-lg font-bold text-foreground">
          {classData?.name || 'My Class'}
        </Text>
        {classData?.teacher && (
          <Text className="text-sm text-muted-foreground">
            Teacher: {classData.teacher.name}
          </Text>
        )}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {/* Class info */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300 }}
        >
          <Card className="mb-4">
            <CardContent className="pt-4">
              <View className="flex-row justify-between">
                <View>
                  <Text className="text-xs text-muted-foreground">Level</Text>
                  <Text className="text-sm font-medium text-foreground">{classData?.level || 'N/A'}</Text>
                </View>
                <View className="items-center">
                  <Text className="text-xs text-muted-foreground">Students</Text>
                  <Text className="text-sm font-medium text-foreground">
                    {classData?.students?.length ?? classData?._count?.students ?? 0}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-xs text-muted-foreground">Capacity</Text>
                  <Text className="text-sm font-medium text-foreground">{classData?.capacity || 'N/A'}</Text>
                </View>
              </View>
            </CardContent>
          </Card>
        </MotiView>

        {/* Subjects */}
        {classData?.subjects?.length > 0 && (
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300, delay: 100 }}
          >
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Subjects</CardTitle>
              </CardHeader>
              <CardContent>
                <View className="flex-row flex-wrap gap-2">
                  {classData.subjects.map((sub: any) => (
                    <Badge key={sub.id || sub.name} variant="secondary">
                      <Text className="text-xs">{sub.name} {sub.code ? `(${sub.code})` : ''}</Text>
                    </Badge>
                  ))}
                </View>
              </CardContent>
            </Card>
          </MotiView>
        )}

        {/* Students list */}
        {classData?.students?.length > 0 && (
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300, delay: 200 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Classmates</CardTitle>
              </CardHeader>
              <CardContent>
                {classData.students.map((student: any) => (
                  <View key={student.id} className="flex-row items-center gap-3 py-2.5 border-b border-border">
                    <View className="h-8 w-8 rounded-full bg-brand/10 items-center justify-center">
                      <HugeiconsIcon icon={UserIcon} size={14} color="#3B82F6" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-foreground">
                        {student.name || `${student.firstName} ${student.lastName}`}
                      </Text>
                      <Text className="text-xs text-muted-foreground">{student.admissionNumber}</Text>
                    </View>
                    {student.gender && (
                      <Text className="text-xs text-muted-foreground">{student.gender}</Text>
                    )}
                  </View>
                ))}
              </CardContent>
            </Card>
          </MotiView>
        )}

        {!classData?.students?.length && !classData?.subjects?.length && (
          <Card>
            <CardContent className="py-8">
              <Text className="text-sm text-muted-foreground text-center">
                No class information available
              </Text>
            </CardContent>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
