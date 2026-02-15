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

function statusBadge(status: string) {
  switch (status) {
    case 'PAID': return 'success' as const;
    case 'OVERDUE': return 'destructive' as const;
    case 'PARTIAL': return 'warning' as const;
    default: return 'secondary' as const;
  }
}

export default function FeePaymentsScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard', 'parent'],
    queryFn: () => api.get<any>('/dashboard/parent'),
  });

  if (isLoading) return <Loading fullScreen />;

  const children = data?.children ?? [];
  const summary = data?.summary;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-4 pt-2 pb-3">
        <Text className="text-lg font-bold text-foreground">Fee Payments</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {/* Summary */}
        {summary && (
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300 }}
          >
            <Card className="mb-4">
              <CardContent className="pt-4">
                <View className="flex-row justify-between mb-2">
                  <View className="items-center flex-1">
                    <Text className="text-xs text-muted-foreground">Total Fees</Text>
                    <Text className="text-base font-bold text-foreground">
                      ${Number(summary.totalFees).toLocaleString()}
                    </Text>
                  </View>
                  <View className="items-center flex-1">
                    <Text className="text-xs text-muted-foreground">Paid</Text>
                    <Text className="text-base font-bold text-green-600">
                      ${Number(summary.totalPaid).toLocaleString()}
                    </Text>
                  </View>
                  <View className="items-center flex-1">
                    <Text className="text-xs text-muted-foreground">Balance</Text>
                    <Text className="text-base font-bold text-red-500">
                      ${Number(summary.totalBalance).toLocaleString()}
                    </Text>
                  </View>
                </View>
              </CardContent>
            </Card>
          </MotiView>
        )}

        {/* Per-child fees */}
        {children.map((child: any, idx: number) => (
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
              </CardHeader>
              <CardContent>
                {child.fees?.length > 0 ? (
                  child.fees.map((fee: any) => (
                    <View key={fee.id} className="py-2.5 border-b border-border">
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-sm font-medium text-foreground">
                          {fee.description || fee.type || 'Fee'}
                        </Text>
                        <Badge variant={statusBadge(fee.status)}>
                          <Text className="text-xs">{fee.status}</Text>
                        </Badge>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-xs text-muted-foreground">
                          Amount: ${Number(fee.amount).toLocaleString()}
                        </Text>
                        <Text className="text-xs text-muted-foreground">
                          Balance: ${(Number(fee.amount) - Number(fee.paidAmount)).toLocaleString()}
                        </Text>
                      </View>
                      <Text className="text-xs text-muted-foreground mt-0.5">
                        Due: {new Date(fee.dueDate).toLocaleDateString()}
                      </Text>

                      {/* Payments */}
                      {fee.payments?.length > 0 && (
                        <View className="mt-2 pl-3 border-l-2 border-green-300">
                          {fee.payments.map((p: any) => (
                            <View key={p.id} className="flex-row justify-between py-1">
                              <Text className="text-xs text-green-700">
                                ${Number(p.amount).toLocaleString()} · {p.method}
                              </Text>
                              <Text className="text-xs text-muted-foreground">
                                {new Date(p.date || p.createdAt).toLocaleDateString()}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  ))
                ) : (
                  <Text className="text-sm text-muted-foreground text-center py-4">
                    No fees recorded
                  </Text>
                )}
              </CardContent>
            </Card>
          </MotiView>
        ))}

        {children.length === 0 && (
          <Card>
            <CardContent className="py-8">
              <Text className="text-sm text-muted-foreground text-center">
                No children linked to your account
              </Text>
            </CardContent>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
