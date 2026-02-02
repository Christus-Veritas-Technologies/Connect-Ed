"use client";

import { useEffect } from "react";
import { HugeiconsIcon } from "hugeicons/react";
import { AlertTriangleIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-destructive/5 to-brand/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="size-20 rounded-2xl bg-gradient-to-br from-brand to-mid flex items-center justify-center shadow-lg">
            <span className="text-3xl font-bold text-white">CE</span>
          </div>
        </div>

        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <HugeiconsIcon
              icon={AlertTriangleIcon}
              size={32}
              className="text-destructive"
            />
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-darkest">Something went wrong</h1>
          <p className="text-muted-foreground">
            We encountered an unexpected error. Please try again or contact support if the problem persists.
          </p>
        </div>

        {/* Error Details (Development Only) */}
        {process.env.NODE_ENV === "development" && error.message && (
          <div className="p-3 rounded-lg bg-muted text-left">
            <p className="text-xs font-mono text-muted-foreground break-words">
              {error.message}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 pt-4">
          <Button
            onClick={reset}
            className="w-full"
            size="lg"
          >
            Try again
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.location.href = "/"}
          >
            Go to Home
          </Button>
        </div>

        {/* Support Info */}
        <div className="text-sm text-muted-foreground space-y-1 pt-4 border-t">
          <p>Need help?</p>
          <p className="text-xs">
            Contact our support team at support@connect-ed.com
          </p>
        </div>
      </div>
    </div>
  );
}
