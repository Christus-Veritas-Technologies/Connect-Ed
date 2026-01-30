// Re-export Prisma client and types
export { db } from "./client.js";
export * from "@prisma/client";

// Export utility types
export type {
  School,
  User,
  Student,
  Parent,
  Class,
  Subject,
  SubjectClass,
  Fee,
  FeePayment,
  Expense,
  SchoolPayment,
  MessageLog,
} from "@prisma/client";
