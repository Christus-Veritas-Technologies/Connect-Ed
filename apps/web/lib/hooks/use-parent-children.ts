"use client";

import { useAuth } from "../auth-context";

interface UseParentChildrenReturn {
  childrenCount: number;
  isLoading: boolean;
}

/**
 * Hook to get the current parent's children count
 * Returns loading state and child count
 * Used for dynamic sidebar labels and conditional rendering
 */
export function useParentChildren(): UseParentChildrenReturn {
  const { user, isLoading: authLoading } = useAuth();
  
  // Get children count from auth context
  const childrenCount = user?.children?.length || 0;
  
  return {
    childrenCount,
    isLoading: authLoading,
  };
}
