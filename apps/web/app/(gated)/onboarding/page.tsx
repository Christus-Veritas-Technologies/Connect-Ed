"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  School01Icon,
  TeacherIcon,
  UserGroupIcon,
  CheckmarkCircle02Icon,
  ArrowRight01Icon,
} from "@hugeicons/react";
import { useAuth, useAuthFetch } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const steps = [
  { icon: School01Icon, label: "School Name" },
  { icon: TeacherIcon, label: "Teachers" },
  { icon: UserGroupIcon, label: "Students" },
];

export default function OnboardingPage() {
  const { school, refreshToken } = useAuth();
  const authFetch = useAuthFetch();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(0);
  const [schoolName, setSchoolName] = useState("");
  const [teacherCount, setTeacherCount] = useState("");
  const [studentCount, setStudentCount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (school && !school.signupFeePaid) {
      router.push("/payment");
    }
  }, [school, router]);

  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return schoolName.length >= 2;
      case 1:
        return parseInt(teacherCount) >= 1;
      case 2:
        return parseInt(studentCount) >= 1;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setError("");
    setIsLoading(true);

    try {
      const response = await authFetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolName,
          teacherCount: parseInt(teacherCount),
          studentCount: parseInt(studentCount),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to complete onboarding");
      }

      await refreshToken();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete onboarding");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          className="text-6xl mb-4"
        >
          🎉
        </motion.div>
        <h1 className="text-3xl font-bold">Welcome to Connect-Ed!</h1>
        <p className="text-muted-foreground mt-2">
          Let&apos;s set up your school in just a few steps
        </p>
      </motion.div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center"
            >
              <div
                className={`
                  size-12 rounded-full flex items-center justify-center transition-all
                  ${isCompleted ? "bg-success text-white" : ""}
                  ${isActive ? "bg-brand text-white ring-4 ring-brand/20" : ""}
                  ${!isActive && !isCompleted ? "bg-muted text-muted-foreground" : ""}
                `}
              >
                {isCompleted ? (
                  <CheckmarkCircle02Icon size={24} />
                ) : (
                  <Icon size={24} />
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-16 h-1 mx-2 rounded-full transition-colors ${
                    isCompleted ? "bg-success" : "bg-muted"
                  }`}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Form Card */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">{steps[currentStep].label}</CardTitle>
            <CardDescription>
              {currentStep === 0 && "What's the name of your school?"}
              {currentStep === 1 && "How many teachers work at your school?"}
              {currentStep === 2 && "Approximately how many students are enrolled?"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {currentStep === 0 && (
              <div className="space-y-2">
                <Label htmlFor="schoolName">School Name</Label>
                <Input
                  id="schoolName"
                  type="text"
                  placeholder="e.g., Springfield Elementary School"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  icon={<School01Icon size={20} />}
                />
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-2">
                <Label htmlFor="teacherCount">Number of Teachers</Label>
                <Input
                  id="teacherCount"
                  type="number"
                  placeholder="e.g., 25"
                  min="1"
                  value={teacherCount}
                  onChange={(e) => setTeacherCount(e.target.value)}
                  icon={<TeacherIcon size={20} />}
                />
                <p className="text-xs text-muted-foreground">
                  This helps us understand your school size
                </p>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-2">
                <Label htmlFor="studentCount">Number of Students</Label>
                <Input
                  id="studentCount"
                  type="number"
                  placeholder="e.g., 500"
                  min="1"
                  value={studentCount}
                  onChange={(e) => setStudentCount(e.target.value)}
                  icon={<UserGroupIcon size={20} />}
                />
                <p className="text-xs text-muted-foreground">
                  Approximate number of enrolled students
                </p>
              </div>
            )}

            <div className="flex gap-4">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleBack}
                >
                  Back
                </Button>
              )}
              {currentStep < 2 ? (
                <Button
                  className="flex-1"
                  onClick={handleNext}
                  disabled={!canProceed()}
                >
                  Continue
                  <ArrowRight01Icon size={20} />
                </Button>
              ) : (
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={!canProceed()}
                  loading={isLoading}
                >
                  {!isLoading && (
                    <>
                      Complete Setup
                      <CheckmarkCircle02Icon size={20} />
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <p className="text-center text-sm text-muted-foreground mt-6">
        You can update these details later in your school settings
      </p>
    </div>
  );
}
