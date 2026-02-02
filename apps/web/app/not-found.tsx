import { HugeiconsIcon } from "hugeicons/react";
import { SearchNotFoundIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand/5 to-mid/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="size-20 rounded-2xl bg-gradient-to-br from-brand to-mid flex items-center justify-center shadow-lg">
            <span className="text-3xl font-bold text-white">CE</span>
          </div>
        </div>

        {/* 404 Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center">
            <HugeiconsIcon
              icon={SearchNotFoundIcon}
              size={32}
              className="text-brand"
            />
          </div>
        </div>

        {/* 404 Message */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-darkest">404</h1>
          <p className="text-2xl font-semibold text-dark">Page not found</p>
          <p className="text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Helpful Info */}
        <div className="p-4 rounded-xl bg-muted/50 border border-border">
          <p className="text-sm text-muted-foreground">
            Check the URL and try again, or explore our main features below.
          </p>
        </div>

        {/* Quick Links */}
        <div className="space-y-3 pt-4">
          <Button asChild className="w-full" size="lg">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
          <Button asChild variant="outline" className="w-full" size="lg">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>

        {/* Support Info */}
        <div className="text-sm text-muted-foreground space-y-1 pt-4 border-t">
          <p>Lost?</p>
          <p className="text-xs">
            Contact support: support@connect-ed.com
          </p>
        </div>
      </div>
    </div>
  );
}
