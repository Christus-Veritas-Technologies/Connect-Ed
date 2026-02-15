import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  UserIcon,
  School01Icon,
  Logout01Icon,
  InformationCircleIcon,
} from '@hugeicons/core-free-icons';
import { useAuth } from '@/lib/auth-context';
import { Text } from '@/components/ui/text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function SettingsScreen() {
  const { user, school, userType, logout } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-4 pt-2 pb-3">
        <Text className="text-lg font-bold text-foreground">Settings</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        {/* Profile Card */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300 }}
        >
          <Card className="mb-4">
            <CardContent className="pt-4 items-center">
              <View className="h-20 w-20 rounded-full bg-brand items-center justify-center mb-3">
                <Text className="text-2xl font-bold text-white">
                  {user?.name?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
              <Text className="text-lg font-bold text-foreground">{user?.name}</Text>
              <Text className="text-sm text-muted-foreground">{user?.email}</Text>
              <View className="flex-row gap-2 mt-2">
                <Badge variant="brand">
                  <Text className="text-xs text-white">{user?.role}</Text>
                </Badge>
                {userType && (
                  <Badge variant="secondary">
                    <Text className="text-xs">{userType}</Text>
                  </Badge>
                )}
              </View>
            </CardContent>
          </Card>
        </MotiView>

        {/* School info */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300, delay: 100 }}
        >
          <Card className="mb-4">
            <CardHeader>
              <View className="flex-row items-center gap-2">
                <HugeiconsIcon icon={School01Icon} size={18} color="#3B82F6" />
                <CardTitle>School</CardTitle>
              </View>
            </CardHeader>
            <CardContent>
              <InfoRow label="Name" value={school?.name || 'N/A'} />
              <InfoRow label="Plan" value={school?.plan || 'N/A'} />
              <InfoRow label="Currency" value={school?.currency || 'USD'} />
              {school?.currentTermNumber && school?.currentTermYear && (
                <InfoRow
                  label="Current Term"
                  value={`Term ${school.currentTermNumber}, ${school.currentTermYear}`}
                />
              )}
              <InfoRow
                label="Period"
                value={school?.currentPeriodType === 'TERM' ? 'In Session' : 'Holiday'}
              />
            </CardContent>
          </Card>
        </MotiView>

        {/* Account info */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300, delay: 200 }}
        >
          <Card className="mb-4">
            <CardHeader>
              <View className="flex-row items-center gap-2">
                <HugeiconsIcon icon={UserIcon} size={18} color="#3B82F6" />
                <CardTitle>Account</CardTitle>
              </View>
            </CardHeader>
            <CardContent>
              <InfoRow label="User ID" value={user?.id?.slice(0, 8) + '...' || 'N/A'} />
              {user?.admissionNumber && (
                <InfoRow label="Admission No." value={user.admissionNumber} />
              )}
              {user?.class && (
                <InfoRow label="Class" value={user.class} />
              )}
            </CardContent>
          </Card>
        </MotiView>

        {/* App info */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300, delay: 300 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <View className="flex-row items-center gap-2">
                <HugeiconsIcon icon={InformationCircleIcon} size={18} color="#3B82F6" />
                <CardTitle>About</CardTitle>
              </View>
            </CardHeader>
            <CardContent>
              <InfoRow label="App" value="Connect-Ed" />
              <InfoRow label="Version" value="1.0.0" />
              <InfoRow label="Platform" value="Mobile" />
            </CardContent>
          </Card>
        </MotiView>

        {/* Logout */}
        <Button
          variant="destructive"
          label="Sign Out"
          onPress={logout}
          className="mt-2"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-2.5 border-b border-border">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text className="text-sm font-medium text-foreground">{value}</Text>
    </View>
  );
}
