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
  step4?: {
    termlyFee: string;
  };
  step5?: {
    termNumber: number;
    termStartMonth: number;
    termStartDay: number;
    year: number;
  };
}

interface OnboardingContextType {
  data: OnboardingData;
  updateStep1: (data: OnboardingData["step1"]) => void;
  updateStep2: (data: OnboardingData["step2"]) => void;
  updateStep3: (data: OnboardingData["step3"]) => void;
  updateStep4: (data: OnboardingData["step4"]) => void;
  updateStep5: (data: OnboardingData["step5"]) => void;
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

  const updateStep4 = (step4Data: OnboardingData["step4"]) => {
    console.log("[Onboarding Context] Saving step4:", step4Data);
    setData((prev) => ({ ...prev, step4: step4Data }));
  };

  const updateStep5 = (step5Data: OnboardingData["step5"]) => {
    console.log("[Onboarding Context] Saving step5:", step5Data);
    setData((prev) => ({ ...prev, step5: step5Data }));
  };

  return (
    <OnboardingContext.Provider value={{ data, updateStep1, updateStep2, updateStep3, updateStep4, updateStep5 }}>
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
