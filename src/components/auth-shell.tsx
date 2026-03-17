"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";

interface AuthShellProps {
  children: React.ReactNode;
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      {/* Subtle dot pattern */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 0.8px, transparent 0.8px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Top accent line */}
      <div className="fixed top-0 right-0 left-0 z-50 h-[2px] bg-gradient-to-r from-amber-600/0 via-amber-600 to-amber-600/0" />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 mb-8"
      >
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-70">
          <div className="flex size-8 items-center justify-center rounded-md bg-foreground">
            <BookOpen className="size-4 text-background" />
          </div>
          <span className="text-base font-semibold tracking-tight">
            MUJ General
          </span>
        </Link>
      </motion.div>

      {/* Card area */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05 }}
        className="relative z-10 w-full max-w-sm"
      >
        {children}
      </motion.div>

      {/* Footer hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="relative z-10 mt-8 text-center text-xs text-muted-foreground"
      >
        Manipal University Jaipur — Research Repository
      </motion.p>
    </div>
  );
}
