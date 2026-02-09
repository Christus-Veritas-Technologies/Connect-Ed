// Re-export Prisma client and types
export { db, PrismaClient } from "./client.js";
export * from "@prisma/client";

// Re-export enums as constants for runtime use
export const Role = {
  ADMIN: "ADMIN" as const,
  RECEPTIONIST: "RECEPTIONIST" as const,
  TEACHER: "TEACHER" as const,
} as const;

export const Plan = {
  LITE: "LITE" as const,
  GROWTH: "GROWTH" as const,
  ENTERPRISE: "ENTERPRISE" as const,
} as const;

export const NotificationType = {
  CLASS_ANNOUNCEMENT: "CLASS_ANNOUNCEMENT" as const,
  PAYMENT_REMINDER: "PAYMENT_REMINDER" as const,
  EXAM_SCHEDULE: "EXAM_SCHEDULE" as const,
  GRADES_RELEASED: "GRADES_RELEASED" as const,
  SYSTEM: "SYSTEM" as const,
} as const;

export const NotificationPriority = {
  LOW: "LOW" as const,
  NORMAL: "NORMAL" as const,
  HIGH: "HIGH" as const,
  URGENT: "URGENT" as const,
} as const;

export const SchoolPeriodType = {
  TERM: "TERM" as const,
  HOLIDAY: "HOLIDAY" as const,
} as const;

export const ChatMessageType = {
  TEXT: "TEXT" as const,
  EXAM_RESULT: "EXAM_RESULT" as const,
  GRADE: "GRADE" as const,
  SUBJECT_INFO: "SUBJECT_INFO" as const,
} as const;

export const FeeStatus = {
  PENDING: "PENDING" as const,
  PARTIAL: "PARTIAL" as const,
  PAID: "PAID" as const,
  OVERDUE: "OVERDUE" as const,
  WAIVED: "WAIVED" as const,
} as const;

export const PaymentMethod = {
  PAYNOW: "PAYNOW" as const,
  BANK_TRANSFER: "BANK_TRANSFER" as const,
  CASH: "CASH" as const,
  CHEQUE: "CHEQUE" as const,
} as const;

export const MessageType = {
  TEXT: "TEXT" as const,
  EMAIL: "EMAIL" as const,
  WHATSAPP: "WHATSAPP" as const,
  SMS: "SMS" as const,
} as const;

export const MessageStatus = {
  QUEUED: "QUEUED" as const,
  SENT: "SENT" as const,
  DELIVERED: "DELIVERED" as const,
  FAILED: "FAILED" as const,
  SCHEDULED: "SCHEDULED" as const,
} as const;

export const PaymentStatus = {
  PENDING: "PENDING" as const,
  COMPLETED: "COMPLETED" as const,
  FAILED: "FAILED" as const,
} as const;

export const PaymentType = {
  INTERMEDIATE: "INTERMEDIATE" as const,
  INSTALLMENT: "INSTALLMENT" as const,
  FULL_PAYMENT: "FULL_PAYMENT" as const,
} as const;
