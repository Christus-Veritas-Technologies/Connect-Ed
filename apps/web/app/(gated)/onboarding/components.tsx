"use client";

import { motion } from "framer-motion";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

interface FormSectionProps {
  title: string;
  children: React.ReactNode;
  error?: string;
  delay?: number;
}

export function FormSection({ title, children, error, delay = 0 }: FormSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="space-y-4"
    >
      <Label className="font-semibold">{title}</Label>
      {children}
      {error && typeof error === "string" && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-destructive"
        >
          {error}
        </motion.p>
      )}
    </motion.div>
  );
}

interface FormFieldProps {
  children: React.ReactNode;
  error?: string;
  delay?: number;
}

export function FormField({ children, error, delay = 0 }: FormFieldProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="space-y-2"
    >
      {children}
      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-destructive"
        >
          {error}
        </motion.p>
      )}
    </motion.div>
  );
}

interface FormActionsProps {
  onBack?: () => void;
  onSkip?: () => void;
  canContinue?: boolean;
  isLoading?: boolean;
  showBack?: boolean;
  showSkip?: boolean;
  continueLabel?: string;
  delay?: number;
}

export function FormActions({
  onBack,
  onSkip,
  canContinue = true,
  isLoading = false,
  showBack = true,
  showSkip = false,
  continueLabel,
  delay = 0,
}: FormActionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex gap-4 pt-4"
    >
      {showBack && (
        <Button
          type="button"
          variant="outline"
          className="w-1/4"
          onClick={onBack}
          disabled={isLoading}
        >
          Back
        </Button>
      )}
      {showSkip && (
        <Button
          type="button"
          variant="ghost"
          className="text-muted-foreground"
          onClick={onSkip}
          disabled={isLoading}
        >
          Skip
        </Button>
      )}
      <Button
        type="submit"
        className={showBack ? "flex-1" : "w-full"}
        disabled={!canContinue || isLoading}
      >
        {!isLoading && (
          <>
            {continueLabel || "Continue to Next Step"}
            <HugeiconsIcon icon={ArrowRight01Icon} size={20} />
          </>
        )}
      </Button>
    </motion.div>
  );
}

interface FormErrorProps {
  message?: string;
}

export function FormError({ message }: FormErrorProps) {
  if (!message) return null;
  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
