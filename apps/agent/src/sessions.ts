// ============================================
// Session Manager — Tracks auth state per phone number
// In-memory sessions with timeout
// ============================================

export interface UserSession {
  phoneNumber: string;
  threadId: string;
  isVerified: boolean;
  authAttempts: number;
  authStage: "none" | "awaiting_email" | "awaiting_password" | "verified";
  email?: string;
  emailExtractionMode: "ai" | "regex"; // Track extraction mode
  aiEmailFailures: number; // Count AI extraction failures
  userData?: {
    userId: string;
    userType: string;
    name: string;
    schoolId: string;
    schoolName: string;
    role: string;
  };
  lastActivity: number;
}

const sessions = new Map<string, UserSession>();

// Session timeout: 24 hours
const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000;

// Cleanup stale sessions every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, session] of sessions) {
    if (now - session.lastActivity > SESSION_TIMEOUT_MS) {
      sessions.delete(key);
    }
  }
}, 60 * 60 * 1000);

export function getSession(phoneNumber: string): UserSession {
  let session = sessions.get(phoneNumber);
  if (!session) {
    session = {
      phoneNumber,
      threadId: `wa_${phoneNumber}_${Date.now()}`,
      isVerified: false,
      authAttempts: 0,
      authStage: "none",
      emailExtractionMode: "ai", // Start with AI mode
      aiEmailFailures: 0,
      lastActivity: Date.now(),
    };
    sessions.set(phoneNumber, session);
  }
  session.lastActivity = Date.now();
  return session;
}

export function updateSession(
  phoneNumber: string,
  updates: Partial<UserSession>
): UserSession {
  const session = getSession(phoneNumber);
  Object.assign(session, updates);
  sessions.set(phoneNumber, session);
  return session;
}

export function clearSession(phoneNumber: string): void {
  sessions.delete(phoneNumber);
}

export function getSessionCount(): number {
  return sessions.size;
}
