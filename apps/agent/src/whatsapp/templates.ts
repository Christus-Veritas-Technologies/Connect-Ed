// ============================================
// WhatsApp Message Templates
// Pre-built formatted messages to avoid OpenAI costs
// ============================================

export interface ReportData {
  studentName: string;
  className: string;
  schoolName: string;
  parentName: string;
  averageMark: number;
  passRate: number;
  totalSubjects: number;
  totalExams: number;
  subjects: Array<{
    name: string;
    averageMark: number;
    grade: string;
    isPass: boolean;
  }>;
  strongestSubject?: { name: string; averageMark: number } | null;
  weakestSubject?: { name: string; averageMark: number } | null;
}

export interface FeeReminderData {
  parentName: string;
  studentName: string;
  schoolName: string;
  amount: string;
  dueDate: string;
  description: string;
}

export interface WelcomeData {
  name: string;
  schoolName: string;
  role: string;
}

// ============================================
// Template functions (WhatsApp-formatted)
// ============================================

export function academicReportTemplate(data: ReportData): string {
  let msg = `*Academic Report*\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `Hello ${data.parentName},\n\n`;
  msg += `Here is the latest academic report for *${data.studentName}* (${data.className}) at *${data.schoolName}*:\n\n`;

  // Overall stats
  msg += `*Overall Performance*\n`;
  msg += `• Average: *${data.averageMark}%*\n`;
  msg += `• Pass Rate: *${data.passRate}%*\n`;
  msg += `• Subjects: *${data.totalSubjects}* | Exams: *${data.totalExams}*\n\n`;

  // Subject breakdown
  msg += `*Subject Breakdown*\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n`;
  for (const subject of data.subjects) {
    const status = subject.isPass ? "PASS" : "FAIL";
    msg += `[${status}] ${subject.name}: *${subject.averageMark}%* (${subject.grade})\n`;
  }
  msg += `\n`;

  // Insights
  if (data.strongestSubject) {
    msg += `*Strongest:* ${data.strongestSubject.name} (${data.strongestSubject.averageMark}%)\n`;
  }
  if (data.weakestSubject) {
    msg += `*Needs attention:* ${data.weakestSubject.name} (${data.weakestSubject.averageMark}%)\n`;
  }

  msg += `\n_This is an automated report from ${data.schoolName}. Reply to chat with our AI assistant for more details._`;

  return msg;
}

export function feeReminderTemplate(data: FeeReminderData): string {
  let msg = `*Fee Reminder*\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `Hello ${data.parentName},\n\n`;
  msg += `This is a friendly reminder about an outstanding fee for *${data.studentName}* at *${data.schoolName}*:\n\n`;
  msg += `*${data.description}*\n`;
  msg += `Amount: *${data.amount}*\n`;
  msg += `Due: *${data.dueDate}*\n\n`;
  msg += `Please make payment at your earliest convenience.\n\n`;
  msg += `_Reply to this message if you have any questions._`;

  return msg;
}

export function welcomeTemplate(data: WelcomeData): string {
  let msg = `*Welcome to ${data.schoolName}!*\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `Hello ${data.name}!\n\n`;
  msg += `You've been registered as a *${data.role}* on our school management platform.\n\n`;
  msg += `You can chat with me here anytime to:\n`;
  msg += `• Check academic reports\n`;
  msg += `• View fee information\n`;
  msg += `• Get school announcements\n`;
  msg += `• Ask questions about the school\n\n`;
  msg += `To get started, please verify your identity by sharing your *email address* linked to your account.\n\n`;
  msg += `_I'm an AI assistant for ${data.schoolName}. I can help you with information but cannot make changes to your account._`;

  return msg;
}

export function termEndTemplate(schoolName: string): string {
  let msg = `*Term End Notice*\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `Hello!\n\n`;
  msg += `The current term at *${schoolName}* has ended.\n\n`;
  msg += `Academic reports for your child(ren) will be sent to you shortly.\n\n`;
  msg += `_Have a great holiday! — ${schoolName}_`;

  return msg;
}

export function authRequestTemplate(): string {
  return `To access your information, please share the *email address* associated with your account.`;
}

export function authPasswordTemplate(email: string): string {
  return `Found your account with *${email}*.\n\nNow please share your *password* to verify your identity.\n\n_Your password is encrypted and I cannot see it — I can only verify it matches our records._`;
}

export function authSuccessTemplate(name: string): string {
  return `*Welcome, ${name}!*\n\nYou're now verified. How can I help you today?\n\nYou can ask me about:\n• Academic reports & grades\n• Fees & payments\n• School announcements\n• School schedule\n• Any other questions`;
}

export function authFailedTemplate(): string {
  return `*Verification failed.* The password you provided doesn't match our records.\n\nPlease try again or contact the school office for help.`;
}

export function notVerifiedTemplate(): string {
  return `You need to verify your identity first.\n\nPlease share your *email address* to get started.`;
}

export function errorTemplate(): string {
  return `Sorry, something went wrong. Please try again in a moment.\n\n_If this persists, contact the school office._`;
}

export function quotaExceededTemplate(): string {
  return `The school's messaging quota for this period has been reached. Please contact the school office directly.\n\n_Quota resets at the start of each billing period._`;
}
