import { type ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { View } from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { Loading } from '@/components/ui/loading';

/**
 * Calculates how many days overdue the school's payment is.
 * Returns 0 if no payment date is set or the date is in the future.
 */
function getDaysOverdue(nextPaymentDate: string | null): number {
  if (!nextPaymentDate) return 0;
  const due = new Date(nextPaymentDate);
  const now = new Date();
  if (now <= due) return 0;
  return Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

interface PaymentGuardProps {
  children: ReactNode;
}

/**
 * Wraps protected pages. If the school's payment is >3 days overdue,
 * redirects to the payment screen.
 *
 * - During the 3-day grace period this guard does NOT block access
 * - Only blocks if user is not already on the payment screen
 */
export function PaymentGuard({ children }: PaymentGuardProps) {
  const { user, school, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading || !user || !school) return;

    // Don't redirect if already on payment screen or callback
    if (pathname?.includes('/payment')) return;

    const daysOverdue = getDaysOverdue(school.nextPaymentDate);
    const isLocked = daysOverdue > 3;

    // If locked and not an admin, don't redirect (they can't pay anyway)
    // Just let them see the tabs but payment screen will show them a message
    if (isLocked && user.role === 'ADMIN') {
      router.replace('/(tabs)/payment');
    }
  }, [user, school, isLoading, pathname, router]);

  if (isLoading) {
    return <Loading fullScreen />;
  }

  return <View style={{ flex: 1 }}>{children}</View>;
}
