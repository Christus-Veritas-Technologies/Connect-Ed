import React, { useState } from 'react';
import { View, ScrollView, RefreshControl, TextInput, Pressable, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Search01Icon, Cancel01Icon, UserIcon } from '@hugeicons/core-free-icons';
import { api } from '@/lib/api';
import { Text } from '@/components/ui/text';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/loading';
import type { Student } from '@/lib/types';

export default function StudentsScreen() {
    const [search, setSearch] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<any>(null);

    const { data, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['students'],
        queryFn: () => api.get<any>('/students'),
    });

    const students: Student[] = data?.students ?? [];

    const filtered = students.filter((s) => {
        const term = search.toLowerCase();
        return (
            s.firstName.toLowerCase().includes(term) ||
            s.lastName.toLowerCase().includes(term) ||
            s.admissionNumber.toLowerCase().includes(term)
        );
    });

    if (isLoading) return <Loading fullScreen />;

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            {/* Header */}
            <View className="px-4 pt-2 pb-3">
                <Text className="text-lg font-bold text-foreground mb-3">Students</Text>
                <View className="flex-row items-center bg-muted rounded-lg px-3 h-10">
                    <HugeiconsIcon icon={Search01Icon} size={18} color="#94A3B8" />
                    <TextInput
                        className="flex-1 ml-2 text-sm text-foreground"
                        placeholder="Search by name or admission no..."
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
            </View>

            <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
                ListEmptyComponent={
                    <View className="items-center py-20">
                        <Text className="text-sm text-muted-foreground">
                            {search ? 'No students match your search' : 'No students found'}
                        </Text>
                    </View>
                }
                renderItem={({ item, index }) => (
                    <MotiView
                        from={{ opacity: 0, translateY: 8 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 250, delay: Math.min(index * 30, 300) }}
                    >
                        <Pressable onPress={() => setSelectedStudent(item)}>
                            <Card className="mb-2">
                                <CardContent className="py-3 flex-row items-center gap-3">
                                    <View className="h-10 w-10 rounded-full bg-brand/10 items-center justify-center">
                                        <HugeiconsIcon icon={UserIcon} size={18} color="#3B82F6" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-sm font-medium text-foreground">
                                            {item.firstName} {item.lastName}
                                        </Text>
                                        <Text className="text-xs text-muted-foreground">{item.admissionNumber}</Text>
                                    </View>
                                    <View className="items-end">
                                        {item.class && (
                                            <Badge variant="secondary">
                                                <Text className="text-xs">{item.class.name}</Text>
                                            </Badge>
                                        )}
                                        {item.gender && (
                                            <Text className="text-xs text-muted-foreground mt-0.5">{item.gender}</Text>
                                        )}
                                    </View>
                                </CardContent>
                            </Card>
                        </Pressable>
                    </MotiView>
                )}
            />

            {/* Student detail modal */}
            <StudentDetailModal
                student={selectedStudent}
                onClose={() => setSelectedStudent(null)}
            />
        </SafeAreaView>
    );
}

function StudentDetailModal({ student, onClose }: { student: any; onClose: () => void }) {
    if (!student) return null;

    return (
        <Modal visible={!!student} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <SafeAreaView className="flex-1 bg-background">
                <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
                    <Text className="text-lg font-bold text-foreground">Student Details</Text>
                    <Pressable onPress={onClose}>
                        <HugeiconsIcon icon={Cancel01Icon} size={24} color="#64748B" />
                    </Pressable>
                </View>

                <ScrollView className="flex-1 px-4 pt-4">
                    {/* Avatar */}
                    <View className="items-center mb-6">
                        <View className="h-20 w-20 rounded-full bg-brand items-center justify-center mb-3">
                            <Text className="text-2xl font-bold text-white">
                                {student.firstName?.[0]}{student.lastName?.[0]}
                            </Text>
                        </View>
                        <Text className="text-xl font-bold text-foreground">
                            {student.firstName} {student.lastName}
                        </Text>
                        <Text className="text-sm text-muted-foreground">{student.admissionNumber}</Text>
                    </View>

                    {/* Info rows */}
                    <Card>
                        <CardContent className="pt-4">
                            <InfoRow label="Gender" value={student.gender || 'N/A'} />
                            <InfoRow label="Class" value={student.class?.name || 'Unassigned'} />
                            {student.dateOfBirth && (
                                <InfoRow label="Date of Birth" value={new Date(student.dateOfBirth).toLocaleDateString()} />
                            )}
                            {student.parent && (
                                <>
                                    <InfoRow label="Parent" value={student.parent.name} />
                                    <InfoRow label="Parent Email" value={student.parent.email} />
                                    {student.parent.phone && (
                                        <InfoRow label="Parent Phone" value={student.parent.phone} />
                                    )}
                                </>
                            )}
                            {student.feeBalance !== undefined && (
                                <InfoRow
                                    label="Fee Balance"
                                    value={`$${Number(student.feeBalance).toFixed(2)}`}
                                    valueColor={student.feeBalance > 0 ? 'text-red-500' : 'text-green-600'}
                                />
                            )}
                        </CardContent>
                    </Card>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
    return (
        <View className="flex-row items-center justify-between py-2.5 border-b border-border">
            <Text className="text-sm text-muted-foreground">{label}</Text>
            <Text className={`text-sm font-medium ${valueColor || 'text-foreground'}`}>{value}</Text>
        </View>
    );
}
