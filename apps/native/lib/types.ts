export type Role = 'ADMIN' | 'RECEPTIONIST' | 'TEACHER' | 'PARENT' | 'STUDENT';
export type UserType = 'STAFF' | 'PARENT' | 'STUDENT';
export type Plan = 'LITE' | 'GROWTH' | 'ENTERPRISE';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  onboardingComplete: boolean;
  emailVerified: boolean;
  children?: Array<{ id: string; name: string; class?: string }>;
  admissionNumber?: string;
  class?: string;
}

export interface School {
  id: string;
  name: string | null;
  plan: Plan;
  isActive: boolean;
  signupFeePaid: boolean;
  onboardingComplete: boolean;
  country?: string | null;
  currency: 'USD' | 'ZAR' | 'ZIG';
  termlyFee: number | null;
  currentTermNumber: number | null;
  currentTermYear: number | null;
  termStartDate: string | null;
  currentPeriodType: 'TERM' | 'HOLIDAY';
  holidayStartDate: string | null;
  nextPaymentDate: string | null;
}

export interface LoginResponse {
  user: User;
  school: School;
  userType: UserType;
  accessToken: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  author?: { name: string };
  targetRoles: string[];
  isRead?: boolean;
  _count?: { comments: number };
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  gender: string;
  dateOfBirth?: string;
  classId?: string;
  class?: { id: string; name: string };
  parent?: { id: string; name: string; email: string; phone?: string };
  feeBalance?: number;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  class?: { id: string; name: string } | null;
}

export interface ClassInfo {
  id: string;
  name: string;
  teacher?: { id: string; name: string } | null;
  _count?: { students: number };
}

export interface Fee {
  id: string;
  studentId: string;
  student?: { firstName: string; lastName: string; admissionNumber: string };
  amount: number;
  type: string;
  status: 'PAID' | 'UNPAID' | 'PARTIAL';
  paidAmount: number;
  dueDate: string;
  term: number;
  year: number;
}

export interface DashboardStats {
  totalStudents?: number;
  totalTeachers?: number;
  totalClasses?: number;
  totalRevenue?: number;
  totalExpenses?: number;
  outstandingFees?: number;
  recentAnnouncements?: Announcement[];
  attendanceRate?: number;
}

export interface ChatMessage {
  id: string;
  content: string;
  senderName: string;
  senderId: string;
  senderType: 'USER' | 'PARENT' | 'STUDENT';
  classId: string;
  createdAt: string;
  type?: 'text' | 'image' | 'file';
}

export interface ExamResult {
  id: string;
  subject: { name: string };
  mark: number;
  maxMark: number;
  grade?: string;
  comment?: string;
}

export interface ReportCard {
  id: string;
  student: { firstName: string; lastName: string };
  term: number;
  year: number;
  results: ExamResult[];
  averageMark?: number;
  rank?: number;
  teacherComment?: string;
}
