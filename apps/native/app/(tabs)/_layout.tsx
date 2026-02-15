import { Tabs, Redirect } from 'expo-router';
import { Platform } from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
    Home03Icon,
    Notification01Icon,
    SentIcon,
    UserGroupIcon,
    Money01Icon,
    School01Icon,
    BookOpen01Icon,
    Settings02Icon,
} from '@hugeicons/core-free-icons';
import { useAuth } from '@/lib/auth-context';
import type { Role } from '@/lib/types';

const BRAND_COLOR = '#3B82F6';
const MUTED_COLOR = '#94A3B8';

type TabConfig = {
    name: string;
    title: string;
    icon: typeof Home03Icon;
    roles: Role[];
};

// Tab configuration — order matters for tab bar display
const TAB_CONFIG: TabConfig[] = [
    { name: 'index', title: 'Dashboard', icon: Home03Icon, roles: ['ADMIN', 'RECEPTIONIST', 'TEACHER', 'PARENT', 'STUDENT'] },
    { name: 'students', title: 'Students', icon: UserGroupIcon, roles: ['ADMIN', 'RECEPTIONIST', 'TEACHER'] },
    { name: 'my-class', title: 'My Class', icon: School01Icon, roles: ['TEACHER', 'STUDENT'] },
    { name: 'my-child', title: 'My Child', icon: UserGroupIcon, roles: ['PARENT'] },
    { name: 'fees', title: 'Fees', icon: Money01Icon, roles: ['ADMIN', 'RECEPTIONIST'] },
    { name: 'fee-payments', title: 'Payments', icon: Money01Icon, roles: ['PARENT'] },
    { name: 'announcements', title: 'Notices', icon: Notification01Icon, roles: ['ADMIN', 'RECEPTIONIST', 'TEACHER', 'PARENT', 'STUDENT'] },
    { name: 'exams', title: 'Exams', icon: BookOpen01Icon, roles: ['ADMIN', 'TEACHER'] },
    { name: 'my-report', title: 'Report', icon: BookOpen01Icon, roles: ['STUDENT'] },
    { name: 'chat', title: 'Chat', icon: SentIcon, roles: ['ADMIN', 'TEACHER', 'PARENT', 'STUDENT'] },
    { name: 'settings', title: 'Settings', icon: Settings02Icon, roles: ['ADMIN', 'RECEPTIONIST', 'TEACHER', 'PARENT', 'STUDENT'] },
];

export default function TabsLayout() {
    const { user, isAuthenticated } = useAuth();

    if (!isAuthenticated || !user) {
        return <Redirect href="/login" />;
    }

    const userRole = user.role as Role;

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: BRAND_COLOR,
                tabBarInactiveTintColor: MUTED_COLOR,
                tabBarStyle: {
                    borderTopColor: '#E2E8F0',
                    backgroundColor: '#FFFFFF',
                    height: Platform.OS === 'ios' ? 88 : 64,
                    paddingTop: 8,
                    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                },
            }}
        >
            {TAB_CONFIG.map((tab) => {
                const hasAccess = tab.roles.includes(userRole);

                return (
                    <Tabs.Screen
                        key={tab.name}
                        name={tab.name}
                        options={{
                            title: tab.title,
                            href: hasAccess ? undefined : null,
                            tabBarIcon: ({ color, size }) => (
                                <HugeiconsIcon
                                    icon={tab.icon}
                                    size={size}
                                    color={color}
                                />
                            ),
                        }}
                    />
                );
            })}
        </Tabs>
    );
}
