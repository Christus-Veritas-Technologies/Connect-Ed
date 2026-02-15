import React from 'react';
import { View, ScrollView, RefreshControl, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { api } from '@/lib/api';
import { Text } from '@/components/ui/text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/loading';

export default function ExamsScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['exams'],
    queryFn: () => api.get<any>('/exams'),
  });

  const exams = data?.exams ?? [];

  if (isLoading) return <Loading fullScreen />;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-4 pt-2 pb-3">
        <Text className="text-lg font-bold text-foreground">Exams</Text>
      </View>

      <FlatList
        data={exams}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={
          <View className="items-center py-20">
            <Text className="text-sm text-muted-foreground">No exams found</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 250, delay: Math.min(index * 30, 300) }}
          >
            <Card className="mb-3">
              <CardContent className="py-3">
                <View className="flex-row items-start justify-between mb-1">
                  <View className="flex-1 mr-2">
                    <Text className="text-sm font-semibold text-foreground">{item.name}</Text>
                    <Text className="text-xs text-muted-foreground">
                      {item.subject?.name || item.subjectName} · {item.class?.name || item.className}
                    </Text>
                  </View>
                  {item.paper && (
                    <Badge variant="secondary">
                      <Text className="text-xs">Paper {item.paper}</Text>
                    </Badge>
                  )}
                </View>

                {/* Stats */}
                {item.stats && (
                  <View className="flex-row gap-4 mt-2 pt-2 border-t border-border">
                    <View>
                      <Text className="text-xs text-muted-foreground">Students</Text>
                      <Text className="text-sm font-medium text-foreground">{item.stats.totalResults ?? 0}</Text>
                    </View>
                    <View>
                      <Text className="text-xs text-muted-foreground">Average</Text>
                      <Text className="text-sm font-medium text-foreground">{item.stats.averageMark ?? 0}%</Text>
                    </View>
                    <View>
                      <Text className="text-xs text-muted-foreground">Pass Rate</Text>
                      <Text className="text-sm font-medium text-foreground">{item.stats.passRate ?? 0}%</Text>
                    </View>
                  </View>
                )}

                <Text className="text-xs text-muted-foreground mt-2">
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </CardContent>
            </Card>
          </MotiView>
        )}
      />
    </SafeAreaView>
  );
}
