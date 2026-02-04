"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface OnboardingData {
  step1?: {
    schoolName: string;
    address: string;
    phoneNumber: string;
    email: string;
    isLandline: boolean;
  };
  step2?: {
    curriculum: {
      cambridge: boolean;
      zimsec: boolean;
    };
    educationLevels: {
      primary: boolean;
      secondary: boolean;
    };
    subjects: Array<{ name: string; level: string }>;
  };
  step3?: {
    classes: Array<{ name: string; capacity: string; level?: string }>;
  };
}

interface OnboardingContextType {
  data: OnboardingData;
  updateStep1: (data: OnboardingData["step1"]) => void;
  updateStep2: (data: OnboardingData["step2"]) => void;
  updateStep3: (data: OnboardingData["step3"]) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<OnboardingData>({});

  const updateStep1 = (step1Data: OnboardingData["step1"]) => {
    console.log("[Onboarding Context] Saving step1:", step1Data);
    setData((prev) => ({ ...prev, step1: step1Data }));
  };

  const updateStep2 = (step2Data: OnboardingData["step2"]) => {
    console.log("[Onboarding Context] Saving step2:", step2Data);
    setData((prev) => ({ ...prev, step2: step2Data }));
  };

  const updateStep3 = (step3Data: OnboardingData["step3"]) => {
    console.log("[Onboarding Context] Saving step3:", step3Data);
    setData((prev) => ({ ...prev, step3: step3Data }));
  };

  return (
    <OnboardingContext.Provider value={{ data, updateStep1, updateStep2, updateStep3 }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}
