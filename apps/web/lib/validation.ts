import { z } from "zod";

// Password validation schema
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

// Auth schemas
export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
  name: z.string().min(2, "Name must be at least 2 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: passwordSchema,
});

// Onboarding schema
export const onboardingSchema = z.object({
  schoolName: z.string().min(2, "School name must be at least 2 characters"),
  teacherCount: z.number().int().min(1, "Must have at least 1 teacher"),
  studentCount: z.number().int().min(1, "Must have at least 1 student"),
});

// Student schemas
export const createStudentSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  admissionNumber: z.string().min(1, "Admission number is required"),
  classId: z.string().optional(),
  parentId: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
});

export const updateStudentSchema = createStudentSchema.partial();

// Fee schemas
export const createFeeSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  amount: z.number().positive("Amount must be positive"),
  description: z.string().min(1, "Description is required"),
  dueDate: z.string().min(1, "Due date is required"),
});

export const recordPaymentSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "ONLINE"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

// Expense schemas
export const createExpenseSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  date: z.string().min(1, "Date is required"),
  receiptUrl: z.string().url().optional().or(z.literal("")),
});

// Class schemas
export const createClassSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  classTeacherId: z.string().optional(),
});

// User schemas (for creating teachers/receptionists)
export const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["RECEPTIONIST", "TEACHER"]),
});

// Payment schemas
export const createCheckoutSchema = z.object({
  planType: z.enum(["LITE", "GROWTH", "ENTERPRISE"]),
  paymentType: z.enum(["SIGNUP", "RECURRING"]),
});

// Type exports
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type CreateFeeInput = z.infer<typeof createFeeSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type CreateClassInput = z.infer<typeof createClassSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
