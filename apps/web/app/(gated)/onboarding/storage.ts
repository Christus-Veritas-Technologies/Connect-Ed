export interface OnboardingDraft {
  schoolName?: string;
  address?: string;
  phoneNumber?: string;
  email?: string;
  curriculum?: {
    cambridge: boolean;
    zimsec: boolean;
  };
  educationLevels?: {
    primary: boolean;
    secondary: boolean;
  };
  subjects?: { name: string; level: string }[];
  classes?: { name: string; capacity: string }[];
  teacherCount?: number;
  studentCount?: number;
}

const STORAGE_KEY = "connect-ed:onboarding";

export function loadOnboardingDraft(): OnboardingDraft {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as OnboardingDraft;
  } catch {
    return {};
  }
}

export function saveOnboardingDraft(partial: OnboardingDraft): void {
  if (typeof window === "undefined") return;
  const current = loadOnboardingDraft();
  const updated: OnboardingDraft = { ...current, ...partial };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function clearOnboardingDraft(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
