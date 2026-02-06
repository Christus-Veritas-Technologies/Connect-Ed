# Connect-Ed Roles & Permissions

This document defines the user roles in Connect-Ed and what each role can do within the system.

## Overview

Connect-Ed has 5 user roles, each with different access levels and permissions:

| Role | Description | User Type |
|------|-------------|-----------|
| **ADMIN** | School owner/administrator with full access | STAFF |
| **RECEPTIONIST** | Office staff who handles day-to-day operations | STAFF |
| **TEACHER** | Educators who teach classes and view students | STAFF |
| **PARENT** | Parents/guardians who monitor their children | PARENT |
| **STUDENT** | Students who view their own information | STUDENT |

---

## Role Permissions Matrix

### Teachers Management

| Action | ADMIN | RECEPTIONIST | TEACHER | PARENT | STUDENT |
|--------|:-----:|:------------:|:-------:|:------:|:-------:|
| View teacher list | ✅ | ❌ | ❌ | ❌ | ❌ |
| View teacher details | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create teacher | ✅ | ❌ | ❌ | ❌ | ❌ |
| Edit teacher | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete teacher | ✅ | ❌ | ❌ | ❌ | ❌ |

> **Note**: Parents and students can view teacher details to know who teaches their classes. This is read-only access.

### Students Management

| Action | ADMIN | RECEPTIONIST | TEACHER | PARENT | STUDENT |
|--------|:-----:|:------------:|:-------:|:------:|:-------:|
| View student list | ✅ | ✅ | ✅ | ❌ | ❌ |
| View student details | ✅ | ✅ | ✅ | ✅* | ✅* |
| Create student | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit student | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete student | ✅ | ✅ | ❌ | ❌ | ❌ |

> *Parents can only view their own children. Students can only view their own profile.

### Classes Management

| Action | ADMIN | RECEPTIONIST | TEACHER | PARENT | STUDENT |
|--------|:-----:|:------------:|:-------:|:------:|:-------:|
| View class list | ✅ | ✅ | ✅ | ❌ | ❌ |
| View class details | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create class | ✅ | ❌ | ❌ | ❌ | ❌ |
| Edit class | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete class | ✅ | ❌ | ❌ | ❌ | ❌ |

### Fees Management

| Action | ADMIN | RECEPTIONIST | TEACHER | PARENT | STUDENT |
|--------|:-----:|:------------:|:-------:|:------:|:-------:|
| View all fees | ✅ | ✅ | ❌ | ❌ | ❌ |
| View own fees | N/A | N/A | N/A | ✅ | ✅ |
| Create fee | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit fee | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete fee | ✅ | ✅ | ❌ | ❌ | ❌ |
| Record payment | ✅ | ✅ | ❌ | ❌ | ❌ |

### Expenses Management

| Action | ADMIN | RECEPTIONIST | TEACHER | PARENT | STUDENT |
|--------|:-----:|:------------:|:-------:|:------:|:-------:|
| View expenses | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create expense | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit expense | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete expense | ✅ | ✅ | ❌ | ❌ | ❌ |

### Reports

| Action | ADMIN | RECEPTIONIST | TEACHER | PARENT | STUDENT |
|--------|:-----:|:------------:|:-------:|:------:|:-------:|
| View financial reports | ✅ | ✅ | ❌ | ❌ | ❌ |
| Export reports | ✅ | ✅ | ❌ | ❌ | ❌ |

### Settings & Administration

| Action | ADMIN | RECEPTIONIST | TEACHER | PARENT | STUDENT |
|--------|:-----:|:------------:|:-------:|:------:|:-------:|
| View settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage school info | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage billing/plan | ✅ | ❌ | ❌ | ❌ | ❌ |
| View audit logs | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## Detailed Role Descriptions

### ADMIN (School Administrator)

The Admin role is typically assigned to the school owner or principal. They have **full access** to all features:

- ✅ Manage all teachers, students, parents, and classes
- ✅ Create, edit, and delete any entity
- ✅ Access all financial features (fees, expenses, payments)
- ✅ View and export reports
- ✅ Manage school settings and billing
- ✅ Upgrade/downgrade subscription plans
- ✅ Access audit logs

### RECEPTIONIST (Office Staff)

The Receptionist role is for front office staff who handle day-to-day administrative tasks:

- ✅ Manage students (enroll, update, remove)
- ✅ Manage fees and record payments
- ✅ Manage expenses
- ✅ View and export reports
- ❌ Cannot manage teachers (Admin-only)
- ❌ Cannot manage classes (Admin-only)
- ❌ Cannot access school settings

### TEACHER

Teachers have limited access focused on viewing information relevant to their work:

- ✅ View their assigned classes
- ✅ View students in their classes
- ✅ View other teacher profiles (read-only)
- ❌ Cannot modify any records
- ❌ Cannot access fees, expenses, or reports

### PARENT

Parents have view-only access to their children's information:

- ✅ View their children's profiles
- ✅ View their children's class and teacher info
- ✅ View fees and payment history for their children
- ✅ Make fee payments (online)
- ❌ Cannot modify any records
- ❌ Cannot view other students

### STUDENT

Students have the most restricted access:

- ✅ View their own profile
- ✅ View their class and teacher info
- ✅ View their fees and payment status
- ❌ Cannot modify any records
- ❌ Cannot view other students

---

## Implementation Notes

### Frontend Role Checks

Use the `canEditEntity` function from `@/lib/roles.ts`:

```typescript
import { canEditEntity } from "@/lib/roles";
import { useAuth } from "@/lib/auth-context";

function MyComponent() {
  const { user } = useAuth();
  const canEdit = canEditEntity(user?.role, "student");

  return (
    <div>
      {canEdit && <Button>Edit</Button>}
      {canEdit && <Button>Delete</Button>}
    </div>
  );
}
```

### Permission Types

The following permission types are defined in `@/lib/roles.ts`:

- `canManageTeachers` - Create, edit, delete teachers
- `canViewTeachers` - View teacher profiles
- `canManageStudents` - Create, edit, delete students
- `canViewStudents` - View student profiles
- `canManageClasses` - Create, edit, delete classes
- `canViewClasses` - View class details
- `canManageFees` - Create, edit, delete fees and payments
- `canViewFees` - View fee information
- `canManageExpenses` - Create, edit, delete expenses
- `canViewExpenses` - View expense information
- `canViewReports` - Access financial reports
- `canManageSettings` - Access school settings and billing

### Backend Authorization

The backend should also enforce these permissions. API routes should check the user's role before allowing mutations:

```typescript
// Example in Hono route
app.delete("/teachers/:id", authMiddleware, async (c) => {
  const user = c.get("user");
  
  // Only ADMIN can delete teachers
  if (user.role !== "ADMIN") {
    return c.json({ error: "Forbidden" }, 403);
  }
  
  // Proceed with deletion...
});
```

---

## Future Considerations

1. **Custom Roles**: Allow schools to create custom roles with specific permissions
2. **Department Heads**: Add a role between ADMIN and TEACHER for department management
3. **Read-only Admin**: Add an auditor role that can view everything but change nothing
4. **Parent Categories**: Distinguish between primary contact and secondary guardians
5. **Student Representatives**: Allow senior students limited administrative tasks
