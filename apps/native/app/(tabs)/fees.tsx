import React, { useState } from 'react';
import { View, ScrollView, RefreshControl, Pressable, FlatList, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Search01Icon, Cancel01Icon, Money01Icon } from '@hugeicons/core-free-icons';
import { api } from '@/lib/api';
import { Text } from '@/components/ui/text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/loading';
import type { Fee } from '@/lib/types';

function statusBadge(status: string) {
  switch (status) {
    case 'PAID': return 'success' as const;
    case 'OVERDUE': return 'destructive' as const;
    case 'PARTIAL': return 'warning' as const;
    default: return 'secondary' as const;
  }
}

export default function FeesScreen() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['fees'],
    queryFn: () => api.get<any>('/fees'),
  });

  const statsQuery = useQuery({
    queryKey: ['fees', 'stats'],
    queryFn: () => api.get<any>('/fees/stats'),
  });

  const fees: Fee[] = data?.fees ?? [];

  const filtered = fees.filter((f) => {
    if (statusFilter && f.status !== statusFilter) return false;
    if (search) {
      const term = search.toLowerCase();
      const name = `${f.student?.firstName ?? ''} ${f.student?.lastName ?? ''}`.toLowerCase();
      return name.includes(term) || f.student?.admissionNumber?.toLowerCase().includes(term);
    }
    return true;
  });

  const stats = statsQuery.data;

  if (isLoading) return <Loading fullScreen />;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-4 pt-2 pb-3">
        <Text className="text-lg font-bold text-foreground mb-3">Fees</Text>

        {/* Summary cards */}
        {stats && (
          <View className="flex-row gap-2 mb-3">
            <View className="flex-1 bg-green-50 rounded-lg p-3">
              <Text className="text-xs text-green-700">Collected</Text>
              <Text className="text-base font-bold text-green-700">
                ${Number(stats.collected ?? 0).toLocaleString()}
              </Text>
            </View>
            <View className="flex-1 bg-red-50 rounded-lg p-3">
              <Text className="text-xs text-red-700">Pending</Text>
              <Text className="text-base font-bold text-red-700">
                ${Number(stats.pending ?? 0).toLocaleString()}
              </Text>
            </View>
          </View>
        )}

        {/* Search */}
        <View className="flex-row items-center bg-muted rounded-lg px-3 h-10 mb-2">
          <HugeiconsIcon icon={Search01Icon} size={18} color="#94A3B8" />
          <TextInput
            className="flex-1 ml-2 text-sm text-foreground"
            placeholder="Search by student name..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <HugeiconsIcon icon={Cancel01Icon} size={16} color="#94A3B8" />
            </Pressable>
          )}
        </View>

        {/* Status filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
          {['All', 'PAID', 'UNPAID', 'PARTIAL', 'OVERDUE'].map((s) => (
            <Pressable
              key={s}
              onPress={() => setStatusFilter(s === 'All' ? null : s)}
              className={`px-3 py-1.5 rounded-full mr-2 ${
                (s === 'All' && !statusFilter) || statusFilter === s
                  ? 'bg-brand'
                  : 'bg-muted'
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  (s === 'All' && !statusFilter) || statusFilter === s
                    ? 'text-white'
                    : 'text-foreground'
                }`}
              >
                {s}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={
          <View className="items-center py-20">
            <Text className="text-sm text-muted-foreground">No fees found</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 250, delay: Math.min(index * 30, 300) }}
          >
            <Card className="mb-2">
              <CardContent className="py-3">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-sm font-medium text-foreground">
                    {item.student?.firstName} {item.student?.lastName}
                  </Text>
                  <Badge variant={statusBadge(item.status)}>
                    <Text className="text-xs">{item.status}</Text>
                  </Badge>
                </View>
                <Text className="text-xs text-muted-foreground mb-2">
                  {item.student?.admissionNumber} · {item.type}
                </Text>
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-xs text-muted-foreground">Amount</Text>
                    <Text className="text-sm font-semibold text-foreground">
                      ${Number(item.amount).toLocaleString()}
                    </Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-xs text-muted-foreground">Paid</Text>
                    <Text className="text-sm font-semibold text-green-600">
                      ${Number(item.paidAmount).toLocaleString()}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-xs text-muted-foreground">Balance</Text>
                    <Text className="text-sm font-semibold text-red-500">
                      ${(Number(item.amount) - Number(item.paidAmount)).toLocaleString()}
                    </Text>
                  </View>
                </View>
                <Text className="text-xs text-muted-foreground mt-1.5">
                  Due: {new Date(item.dueDate).toLocaleDateString()}
                </Text>
              </CardContent>
            </Card>
          </MotiView>
        )}
      />
    </SafeAreaView>
  );
}
