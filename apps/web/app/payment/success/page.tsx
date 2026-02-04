"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle, AlertCircle, ArrowRight, Loader } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface PaymentResponse {
  payment: {
    id: string;
    userId: string;
    amount: number;
    paid: boolean;
    plan: string;
    createdAt: string;
  };
  isPaid: boolean;
}

  export type LoadingStep = {
    defaultTitle: string,
    successTitle: string,
    errorTitle: string,
    loadingTitle: string

    successSubtitle: string,
    errorSubtitle: string,
    loadingSubtitle: string,
    defaultSubtitle: string,

    success?: boolean,
    loading?: boolean,
    error?: boolean,
    started?: boolean
  }

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, checkAuth } = useAuth();
  const intermediatePaymentId = searchParams.get("intermediatePaymentId");

  const [status, setStatus] = useState<"loading" | "success" | "error" | "unauthorized">("loading");
  const [payment, setPayment] = useState<PaymentResponse["payment"] | null>(null);
  const [error, setError] = useState("");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [alreadyProcessed, setAlreadyProcessed] = useState(false);
  const [loadingSteps, setLoadingSteps] = useState<LoadingStep[]>([
    {
      defaultTitle: "Verify Payment",
      loadingTitle: "Verifying payment...",
      successTitle: "Payment Verified",
      errorTitle: "Payment Verification Failed",
      defaultSubtitle: "Checking payment status with our payment processor",
      loadingSubtitle: "This may take a few moments",
      successSubtitle: "Your payment has been successfully verified",
      errorSubtitle: "There was an issue verifying your payment",
      started: false,
      loading: false,
      success: false,
      error: false
    },
    {
      defaultTitle: "Update School Records",
      loadingTitle: "Updating your school records...",
      successTitle: "School Records Updated",
      errorTitle: "Failed to Update Records",
      defaultSubtitle: "Updating your school's plan and payment status",
      loadingSubtitle: "Applying your new plan benefits",
      successSubtitle: "Your school's plan has been successfully updated",
      errorSubtitle: "There was an issue updating your school records",
      started: false,
      loading: false,
      success: false,
      error: false
    },
    {
      defaultTitle: "Activate Services",
      loadingTitle: "Activating your services...",
      successTitle: "Services Activated",
      errorTitle: "Failed to Activate Services",
      defaultSubtitle: "Enabling your plan features and quotas",
      loadingSubtitle: "Setting up your messaging and communication tools",
      successSubtitle: "All services are now active and ready to use",
      errorSubtitle: "There was an issue activating your services",
      started: false,
      loading: false,
      success: false,
      error: false
    },
    {
      defaultTitle: "Send Confirmation",
      loadingTitle: "Sending confirmation email...",
      successTitle: "Confirmation Sent",
      errorTitle: "Failed to Send Confirmation",
      defaultSubtitle: "Preparing your payment confirmation and receipt",
      loadingSubtitle: "Sending confirmation to your email address",
      successSubtitle: "Confirmation email sent successfully",
      errorSubtitle: "Confirmation email could not be sent",
      started: false,
      loading: false,
      success: false,
      error: false
    }
  ]);

  // Helper function to update step state
  const updateStep = (stepIndex: number, updates: Partial<LoadingStep>) => {
    setLoadingSteps(prev => 
      prev.map((step, index) => 
        index === stepIndex ? { ...step, ...updates } : step
      )
    );
  };

  // Helper function to simulate API delay
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  useEffect(() => {
    const processPaymentSteps = async () => {
      // Check user authentication
      if (!user) {
        setStatus("unauthorized");
        setError("You must be logged in to access this page");
        return;
      }

      if (!intermediatePaymentId) {
        setStatus("error");
        setError("Payment ID not found");
        return;
      }

      try {
        // Step 1: Verify Payment and User Ownership
        setCurrentStepIndex(0);
        updateStep(0, { started: true, loading: true });
        
        const response = await api.get<PaymentResponse>(
          `/payments/verify/${intermediatePaymentId}`
        );
        setPayment(response.payment);
        
        // Verify the payment belongs to the current user
        if (response.payment.userId !== user.id) {
          throw new Error("This payment does not belong to your account");
        }
        
        // Check if payment was already processed
        if (response.isPaid) {
          setAlreadyProcessed(true);
          updateStep(0, { loading: false, success: true });
          await delay(800);
          
          // Refresh auth to get updated school data
          await checkAuth();
          
          // Skip steps 2-3, go straight to confirmation
          setCurrentStepIndex(3);
          updateStep(3, { started: true, loading: true });
          await delay(1000);
          updateStep(3, { loading: false, success: true });
          await delay(1000);
          
          setStatus("success");
          return;
        }
        
        // Poll for payment confirmation (wait for callback to process)
        if (!response.isPaid) {
          const maxAttempts = 30; // 30 seconds max
          let attempts = 0;
          let paymentConfirmed = false;
          
          while (attempts < maxAttempts && !paymentConfirmed) {
            await delay(1000); // Wait 1 second between polls
            
            const pollResponse = await api.get<PaymentResponse>(
              `/payments/verify/${intermediatePaymentId}`
            );
            
            if (pollResponse.isPaid) {
              paymentConfirmed = true;
              break;
            }
            
            attempts++;
          }
          
          if (!paymentConfirmed) {
            throw new Error("Payment confirmation timed out. Please check your payment status or contact support.");
          }
        }
        
        updateStep(0, { loading: false, success: true });
        await delay(800);

        // Step 2: Update School Records
        setCurrentStepIndex(1);
        updateStep(1, { started: true, loading: true });
        await delay(1500); // Simulate API call
        
        // Refresh auth to get updated school data
        await checkAuth();
        
        updateStep(1, { loading: false, success: true });
        await delay(800);

        // Step 3: Activate Services
        setCurrentStepIndex(2);
        updateStep(2, { started: true, loading: true });
        await delay(1800); // Simulate API call
        updateStep(2, { loading: false, success: true });
        await delay(800);

        // Step 4: Send Confirmation
        setCurrentStepIndex(3);
        updateStep(3, { started: true, loading: true });
        await delay(1200); // Simulate email sending
        updateStep(3, { loading: false, success: true });
        await delay(1000);

        // All steps completed successfully
        setStatus("success");
      } catch (err) {
        // Mark current step as failed
        updateStep(currentStepIndex, { loading: false, error: true });
        setStatus("error");
        setError(err instanceof Error ? err.message : "Payment processing failed");
      }
    };

    processPaymentSteps();
  }, [intermediatePaymentId, user, checkAuth]);

  // Get current step for display
  const currentStep = loadingSteps[currentStepIndex] ?? loadingSteps[0];
  
  if (!currentStep) {
    return null;
  }
  
  // Helper function to get step display state
  const getStepDisplayState = (step: LoadingStep) => {
    if (step.error) return 'error';
    if (step.success) return 'success';
    if (step.loading) return 'loading';
    if (step.started) return 'loading';
    return 'default';
  };
  
  // Helper function to get step title based on state
  const getStepTitle = (step: LoadingStep) => {
    const state = getStepDisplayState(step);
    switch (state) {
      case 'loading': return step.loadingTitle;
      case 'success': return step.successTitle;
      case 'error': return step.errorTitle;
      default: return step.defaultTitle;
    }
  };
  
  // Helper function to get step subtitle based on state
  const getStepSubtitle = (step: LoadingStep) => {
    const state = getStepDisplayState(step);
    switch (state) {
      case 'loading': return step.loadingSubtitle;
      case 'success': return step.successSubtitle;
      case 'error': return step.errorSubtitle;
      default: return step.defaultSubtitle;
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 max-w-md mx-auto">
        {/* Current Step Display */}
        <div className="flex flex-row gap-4 items-center">
          {/* Step Icon */}
          <div className="flex-shrink-0">
            {getStepDisplayState(currentStep) === 'loading' && (
              <Loader size={32} className="animate-spin text-blue-500" />
            )}
            {getStepDisplayState(currentStep) === 'success' && (
              <CheckCircle size={32} className="text-green-500" />
            )}
            {getStepDisplayState(currentStep) === 'error' && (
              <AlertCircle size={32} className="text-red-500" />
            )}
            {getStepDisplayState(currentStep) === 'default' && (
              <div className="w-8 h-8 border-2 border-gray-300 rounded-full" />
            )}
          </div>
          
          {/* Step Content */}
          <div className="flex flex-col gap-1 flex-1">
            <h2 className="text-slate-900 text-xl font-semibold">
              {getStepTitle(currentStep)}
            </h2>
            <p className="text-muted-foreground text-sm">
              {getStepSubtitle(currentStep)}
            </p>
          </div>
        </div>
        
        {/* Progress Indicator */}
        <div className="space-y-2 mt-6 w-full">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Step {currentStepIndex + 1} of {loadingSteps.length}</span>
            <span>{Math.round(((currentStepIndex + 1) / loadingSteps.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / loadingSteps.length) * 100}%` }}
            />
          </div>
        </div>
        
        {/* Development Helper Button */}
        {process.env.NODE_ENV === "development" && currentStepIndex === 0 && !alreadyProcessed && (
          <div className="mt-4 w-full">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={async () => {
                try {
                  await api.post(`/payments/test-complete/${intermediatePaymentId}`);
                  console.log("Payment marked as complete");
                } catch (err) {
                  console.error("Failed to mark payment complete:", err);
                }
              }}
            >
              [DEV] Mark Payment Complete
            </Button>
          </div>
        )}
        
        {/* All Steps Summary (small) */}
        <div className="space-y-1 mt-6 w-full">
          {loadingSteps.map((step, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div className="flex-shrink-0">
                {step.success && <CheckCircle size={12} className="text-green-500" />}
                {step.error && <AlertCircle size={12} className="text-red-500" />}
                {step.loading && <Loader size={12} className="animate-spin text-blue-500" />}
                {!step.started && <div className="w-3 h-3 border border-gray-300 rounded-full" />}
              </div>
              <span className={`${index === currentStepIndex ? 'font-medium' : 'text-muted-foreground'}`}>
                {step.defaultTitle}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (status === "unauthorized") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full"
        >
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Access Denied</h2>
              <p className="text-muted-foreground mt-2">{error}</p>
            </div>
          </div>

          <Alert variant="destructive" className="mt-6">
            <AlertTitle>Unauthorized Access</AlertTitle>
            <AlertDescription>
              You need to be logged in to access this payment verification page.
            </AlertDescription>
          </Alert>

          <div className="space-y-3 mt-6">
            <Button className="w-full" onClick={() => router.push("/auth/login")}>
              Log In
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push("/auth/signup")}
            >
              Create Account
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (status === "error") {
    const isUserMismatch = error.includes("does not belong to your account");
    return (
      <div className="min-h-screen flex items-center justify-center p-4 max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full"
        >
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Payment Not Found</h2>
              <p className="text-muted-foreground mt-2">{error}</p>
            </div>
          </div>

          <Alert variant="destructive" className="mt-6">
            <AlertTitle>Unable to Verify Payment</AlertTitle>
            <AlertDescription>
              {isUserMismatch 
                ? "This payment link belongs to a different account. Please use the payment link from your own account."
                : "We couldn't find your payment record. This could mean:"}
            </AlertDescription>
            {!isUserMismatch && (
              <ul className="mt-2 ml-4 space-y-1 text-sm list-disc">
                <li>The payment link is invalid or expired</li>
                <li>The payment hasn't been processed yet</li>
                <li>There was an issue with this transaction</li>
              </ul>
            )}
          </Alert>

          <div className="space-y-3 mt-6">
            <Button className="w-full" onClick={() => window.location.href = "/payment"}>
              Try Another Payment
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push("/")}
            >
              Contact Support
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full"
      >
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center"
          >
            <CheckCircle className="w-8 h-8 text-green-600" />
          </motion.div>
          <div>
            <h2 className="text-2xl font-bold">Payment Successful!</h2>
            <p className="text-muted-foreground mt-2">
              Thank you for choosing Connect-Ed
            </p>
          </div>
        </div>

        <Alert variant="success" className="mt-6">
          <AlertTitle>Payment Confirmed</AlertTitle>
          <AlertDescription>
            {payment && (
              <div className="space-y-1 text-sm mt-2">
                <p>
                  <strong>Amount:</strong> ${payment.amount}
                </p>
                <p>
                  <strong>Plan:</strong> {payment.plan}
                </p>
                <p>
                  <strong>Transaction ID:</strong> {payment.id.slice(0, 8)}...
                </p>
              </div>
            )}
          </AlertDescription>
        </Alert>

        <div className="space-y-3 mt-6">
          <Button
            className="w-full"
            size="lg"
            onClick={() => router.push("/onboarding")}
          >
            Continue to Onboarding
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push("/dashboard")}
          >
            Go to Dashboard
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-6">
          A confirmation email has been sent to your email address.
        </p>
      </motion.div>
    </div>
  );
}
