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
  PAYMENT_SUCCESS: "PAYMENT_SUCCESS" as const,
  PAYMENT_FAILED: "PAYMENT_FAILED" as const,
  STUDENT_ADDED: "STUDENT_ADDED" as const,
  TEACHER_ADDED: "TEACHER_ADDED" as const,
  FEE_OVERDUE: "FEE_OVERDUE" as const,
  MESSAGE_SENT: "MESSAGE_SENT" as const,
  SYSTEM_ALERT: "SYSTEM_ALERT" as const,
  SHARED_FILE: "SHARED_FILE" as const,
} as const;

export const SharedFileRecipientType = {
  USER: "USER" as const,
  STUDENT: "STUDENT" as const,
  PARENT: "PARENT" as const,
  ROLE: "ROLE" as const,
} as const;

export const NotificationPriority = {
  LOW: "LOW" as const,
  MEDIUM: "MEDIUM" as const,
  HIGH: "HIGH" as const,
  URGENT: "URGENT" as const,
} as const;

export const SchoolPeriodType = {
  TERM: "TERM" as const,
  HOLIDAY: "HOLIDAY" as const,
} as const;

export const Currency = {
  USD: "USD" as const,
  ZAR: "ZAR" as const,
  ZIG: "ZIG" as const,
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
} as const;

export const PaymentMethod = {
  CASH: "CASH" as const,
  BANK_TRANSFER: "BANK_TRANSFER" as const,
  ONLINE: "ONLINE" as const,
} as const;

export const MessageType = {
  EMAIL: "EMAIL" as const,
  WHATSAPP: "WHATSAPP" as const,
  SMS: "SMS" as const,
} as const;

export const MessageStatus = {
  PENDING: "PENDING" as const,
  SENT: "SENT" as const,
  FAILED: "FAILED" as const,
} as const;

export const PaymentStatus = {
  PENDING: "PENDING" as const,
  COMPLETED: "COMPLETED" as const,
  FAILED: "FAILED" as const,
} as const;

export const PaymentType = {
  SIGNUP_FEE: "SIGNUP_FEE" as const,
  TERM_PAYMENT: "TERM_PAYMENT" as const,
} as const;
