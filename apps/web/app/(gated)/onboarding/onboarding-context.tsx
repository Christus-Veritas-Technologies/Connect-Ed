"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

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
  step6?: Array<{
    subjectName: string;
    grades: Array<{ name: string; minMark: number; maxMark: number; isPass: boolean }>;
  }>;
}

interface OnboardingContextType {
  data: OnboardingData;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  updateStep1: (data: OnboardingData["step1"]) => void;
  updateStep2: (data: OnboardingData["step2"]) => void;
  updateStep3: (data: OnboardingData["step3"]) => void;
  updateStep4: (data: OnboardingData["step4"]) => void;
  updateStep5: (data: OnboardingData["step5"]) => void;
  updateStep6: (data: OnboardingData["step6"]) => void;
  clearProgress: () => void;
  isLoading: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { school } = useAuth();
  const [data, setData] = useState<OnboardingData>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Load progress from database on mount
  useEffect(() => {
    const loadProgress = async () => {
      if (!school) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.get("/onboarding-progress");
        const progress = response.data.progress;

        if (progress) {
          console.log("[Onboarding Context] Loaded progress from DB:", progress);

          // Reconstruct onboarding data from saved progress
          const loadedData: OnboardingData = {};

          if (progress.schoolName) {
            loadedData.step1 = {
              schoolName: progress.schoolName,
              address: progress.address || "",
              phoneNumber: progress.phone?.replace(/^(020|263)/, "") || "",
              email: progress.email || "",
              isLandline: progress.isLandline || false,
            };
          }

          if (progress.subjectsData) {
            loadedData.step2 = {
              curriculum: {
                cambridge: progress.cambridge || false,
                zimsec: progress.zimsec || false,
              },
              educationLevels: {
                primary: progress.hasPrimary || false,
                secondary: progress.hasSecondary || false,
              },
              subjects: progress.subjectsData,
            };
          }

          if (progress.classesData) {
            loadedData.step3 = {
              classes: progress.classesData,
            };
          }

          if (progress.termlyFee) {
            loadedData.step4 = {
              termlyFee: progress.termlyFee.toString(),
            };
          }

          if (progress.currentTermNumber) {
            loadedData.step5 = {
              termNumber: progress.currentTermNumber,
              termStartMonth: progress.termStartMonth || 1,
              termStartDay: progress.termStartDay || 1,
              year: progress.currentTermYear || new Date().getFullYear(),
            };
          }

          if (progress.gradesData) {
            loadedData.step6 = progress.gradesData;
          }

          setData(loadedData);
          setCurrentStep(progress.currentStep || 0);
        } else {
          // No progress saved, check if school name exists in DB
          if (school.name) {
            setData({
              step1: {
                schoolName: school.name,
                address: "",
                phoneNumber: "",
                email: "",
                isLandline: false,
              },
            });
          }
        }
      } catch (error) {
        console.error("[Onboarding Context] Failed to load progress:", error);
        // Pre-fill school name if available
        if (school?.name) {
          setData({
            step1: {
              schoolName: school.name,
              address: "",
              phoneNumber: "",
              email: "",
              isLandline: false,
            },
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadProgress();
  }, [school]);

  // Save progress to database
  const saveProgress = async (stepData: Partial<OnboardingData>, step: number) => {
    try {
      const payload: any = {
        currentStep: step,
        completedSteps: Array.from({ length: step }, (_, i) => i),
      };

      // Map step data to database fields
      if (stepData.step1) {
        payload.schoolName = stepData.step1.schoolName;
        payload.address = stepData.step1.address;
        payload.phone = stepData.step1.isLandline
          ? `020${stepData.step1.phoneNumber}`
          : `263${stepData.step1.phoneNumber}`;
        payload.email = stepData.step1.email;
        payload.isLandline = stepData.step1.isLandline;
      }

      if (stepData.step2) {
        payload.cambridge = stepData.step2.curriculum.cambridge;
        payload.zimsec = stepData.step2.curriculum.zimsec;
        payload.hasPrimary = stepData.step2.educationLevels.primary;
        payload.hasSecondary = stepData.step2.educationLevels.secondary;
        payload.subjectsData = stepData.step2.subjects;
      }

      if (stepData.step3) {
        payload.classesData = stepData.step3.classes;
      }

      if (stepData.step4) {
        payload.termlyFee = parseFloat(stepData.step4.termlyFee);
      }

      if (stepData.step5) {
        payload.currentTermNumber = stepData.step5.termNumber;
        payload.currentTermYear = stepData.step5.year;
        payload.termStartMonth = stepData.step5.termStartMonth;
        payload.termStartDay = stepData.step5.termStartDay;
      }

      if (stepData.step6) {
        payload.gradesData = stepData.step6;
      }

      await api.post("/onboarding-progress", payload);
      console.log("[Onboarding Context] ✓ Progress saved to DB");
    } catch (error) {
      console.error("[Onboarding Context] Failed to save progress:", error);
    }
  };

  const updateStep1 = (step1Data: OnboardingData["step1"]) => {
    console.log("[Onboarding Context] Saving step1:", step1Data);
    const newData = { ...data, step1: step1Data };
    setData(newData);
    saveProgress({ step1: step1Data }, 1);
  };

  const updateStep2 = (step2Data: OnboardingData["step2"]) => {
    console.log("[Onboarding Context] Saving step2:", step2Data);
    const newData = { ...data, step2: step2Data };
    setData(newData);
    saveProgress({ ...data, step2: step2Data }, 2);
  };

  const updateStep3 = (step3Data: OnboardingData["step3"]) => {
    console.log("[Onboarding Context] Saving step3:", step3Data);
    const newData = { ...data, step3: step3Data };
    setData(newData);
    saveProgress({ ...data, step3: step3Data }, 3);
  };

  const updateStep4 = (step4Data: OnboardingData["step4"]) => {
    console.log("[Onboarding Context] Saving step4:", step4Data);
    const newData = { ...data, step4: step4Data };
    setData(newData);
    saveProgress({ ...data, step4: step4Data }, 4);
  };

  const updateStep5 = (step5Data: OnboardingData["step5"]) => {
    console.log("[Onboarding Context] Saving step5:", step5Data);
    const newData = { ...data, step5: step5Data };
    setData(newData);
    saveProgress({ ...data, step5: step5Data }, 5);
  };

  const updateStep6 = (step6Data: OnboardingData["step6"]) => {
    console.log("[Onboarding Context] Saving step6 (grades):", step6Data);
    const newData = { ...data, step6: step6Data };
    setData(newData);
    saveProgress({ ...data, step6: step6Data }, 6);
  };

  const clearProgress = async () => {
    try {
      await api.delete("/onboarding-progress");
      setData({});
      setCurrentStep(0);
      console.log("[Onboarding Context] ✓ Progress cleared");
    } catch (error) {
      console.error("[Onboarding Context] Failed to clear progress:", error);
    }
  };

  return (
    <OnboardingContext.Provider
      value={{
        data,
        currentStep,
        setCurrentStep,
        updateStep1,
        updateStep2,
        updateStep3,
        updateStep4,
        updateStep5,
        updateStep6,
        clearProgress,
        isLoading,
      }}
    >
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
