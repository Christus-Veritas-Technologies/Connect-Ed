/**
 * Determine redirect destination after login based on payment status, onboarding status, and role
 */

interface UserData {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "RECEPTIONIST" | "TEACHER";
}

interface SchoolData {
  id: string;
  name: string | null;
  plan: "LITE" | "GROWTH" | "ENTERPRISE";
  isActive: boolean;
  signupFeePaid: boolean;
  onboardingComplete: boolean;
}

/**
 * Get the redirect path based on user and school data
 * 
 * Priority:
 * 1. If payment not done -> /payment
 * 2. If onboarding not done -> /onboarding
 * 3. If all good -> role-specific dashboard
 */
export function getLoginRedirectPath(user: UserData, school: SchoolData): string {
  // Step 1: Check payment status
  if (!school.signupFeePaid) {
    return "/payment";
  }

  // Step 2: Check onboarding status
  if (!school.onboardingComplete) {
    return "/onboarding";
  }

  // Step 3: Role-based redirect
  // Currently all roles use /dashboard, but this can be customized
  const roleBasedPaths: Record<string, string> = {
    ADMIN: "/dashboard",
    RECEPTIONIST: "/dashboard",
    TEACHER: "/dashboard",
  };

  return roleBasedPaths[user.role] || "/dashboard";
}

/**
 * Get a user-friendly message about what the user needs to do
 */
export function getAuthMessage(user: UserData, school: SchoolData): string {
  if (!school.signupFeePaid) {
    return "Please complete payment to activate your account";
  }

  if (!school.onboardingComplete) {
    return "Let's set up your school profile";
  }

  switch (user.role) {
    case "ADMIN":
      return `Welcome back, ${user.name}! You're an admin.`;
    case "RECEPTIONIST":
      return `Welcome back, ${user.name}! You're a receptionist.`;
    case "TEACHER":
      return `Welcome back, ${user.name}! You're a teacher.`;
    default:
      return `Welcome back, ${user.name}!`;
  }
}

/**
 * Check if user can access a specific page based on their state
 */
export function canAccessPage(
  pageType: "payment" | "onboarding" | "dashboard",
  user: UserData,
  school: SchoolData
): boolean {
  switch (pageType) {
    case "payment":
      // Can access payment page if haven't paid
      return !school.signupFeePaid;

    case "onboarding":
      // Can access onboarding if paid but not onboarded
      return school.signupFeePaid && !school.onboardingComplete;

    case "dashboard":
      // Can access dashboard if paid and onboarded
      return school.signupFeePaid && school.onboardingComplete;

    default:
      return false;
  }
}
