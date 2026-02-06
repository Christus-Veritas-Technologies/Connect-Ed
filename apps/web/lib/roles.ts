"use client";

// Role types
export type UserRole = "ADMIN" | "RECEPTIONIST" | "TEACHER" | "PARENT" | "STUDENT";

// Define what each role can do
export const ROLE_PERMISSIONS = {
  // Teachers management
  canManageTeachers: ["ADMIN"] as UserRole[],
  canViewTeachers: ["ADMIN", "RECEPTIONIST", "TEACHER", "PARENT", "STUDENT"] as UserRole[],
  
  // Students management
  canManageStudents: ["ADMIN", "RECEPTIONIST"] as UserRole[],
  canViewStudents: ["ADMIN", "RECEPTIONIST", "TEACHER", "PARENT", "STUDENT"] as UserRole[],
  
  // Classes management
  canManageClasses: ["ADMIN"] as UserRole[],
  canViewClasses: ["ADMIN", "RECEPTIONIST", "TEACHER", "PARENT", "STUDENT"] as UserRole[],
  
  // Fees management
  canManageFees: ["ADMIN", "RECEPTIONIST"] as UserRole[],
  canViewFees: ["ADMIN", "RECEPTIONIST", "PARENT"] as UserRole[],
  
  // Expenses management
  canManageExpenses: ["ADMIN", "RECEPTIONIST"] as UserRole[],
  canViewExpenses: ["ADMIN", "RECEPTIONIST"] as UserRole[],
  
  // Reports
  canViewReports: ["ADMIN", "RECEPTIONIST"] as UserRole[],
  
  // Settings
  canManageSettings: ["ADMIN"] as UserRole[],
} as const;

export type Permission = keyof typeof ROLE_PERMISSIONS;

// Check if a role has a specific permission
export function hasPermission(role: UserRole | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[permission].includes(role);
}

// Check if a role can edit/delete an entity
export function canEditEntity(role: UserRole | undefined | null, entityType: "teacher" | "student" | "class"): boolean {
  if (!role) return false;
  
  switch (entityType) {
    case "teacher":
      return hasPermission(role, "canManageTeachers");
    case "student":
      return hasPermission(role, "canManageStudents");
    case "class":
      return hasPermission(role, "canManageClasses");
    default:
      return false;
  }
}

// Check if a role can view an entity detail page
export function canViewEntity(role: UserRole | undefined | null, entityType: "teacher" | "student" | "class"): boolean {
  if (!role) return false;
  
  switch (entityType) {
    case "teacher":
      return hasPermission(role, "canViewTeachers");
    case "student":
      return hasPermission(role, "canViewStudents");
    case "class":
      return hasPermission(role, "canViewClasses");
    default:
      return false;
  }
}

// Get a description of what a role can do
export function getRoleDescription(role: UserRole): string {
  switch (role) {
    case "ADMIN":
      return "Full access to all features including settings, billing, and user management.";
    case "RECEPTIONIST":
      return "Can manage students, fees, expenses, and view reports. Cannot manage teachers or classes.";
    case "TEACHER":
      return "Can view students, classes, and their own information. Read-only access to most features.";
    case "PARENT":
      return "Can view their children's information, fees, and teachers. Read-only access.";
    case "STUDENT":
      return "Can view their own information, class, and fees. Read-only access.";
    default:
      return "Unknown role";
  }
}
