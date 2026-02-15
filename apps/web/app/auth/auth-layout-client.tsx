"use client";

import { motion } from "framer-motion";
import { GuestGuard } from "@/components/auth-guard";

export default function AuthLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GuestGuard>
      <div className="min-h-screen flex">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-darkest via-dark to-mid relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: '40px 40px'
            }} />
          </div>

          {/* Floating shapes */}
          <motion.div
            className="absolute top-20 left-20 size-32 rounded-full bg-brand/20 blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-32 right-20 size-48 rounded-full bg-mid/30 blur-3xl"
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.4, 0.6, 0.4]
            }}
            transition={{ duration: 5, repeat: Infinity }}
          />

          <div className="relative z-10 flex flex-col justify-center p-12 text-white">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-5xl font-bold mb-6">Connect-Ed</h1>
              <p className="text-xl text-light/80 mb-8 max-w-md">
                The modern school management system that helps you focus on what matters most - education.
              </p>

              <div className="space-y-4">
                {[
                  "Student & fee management",
                  "Real-time reporting",
                  "Multi-channel communication",
                  "Secure & scalable"
                ].map((feature, i) => (
                  <motion.div
                    key={feature}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="size-2 rounded-full bg-brand" />
                    <span className="text-light/90">{feature}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right side - Form */}
        <div className="flex-1 flex items-center justify-center px-8 py-12 md:px-14 bg-muted/30">
          <div className="w-full">
            {children}
          </div>
        </div>
      </div>
    </GuestGuard>
  );
}
