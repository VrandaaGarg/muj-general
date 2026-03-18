"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

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
      <div className="fixed top-0 right-0 left-0 z-50 h-[2px] bg-gradient-to-r from-primary/0 via-primary to-primary/0" />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 mb-8"
      >
        <Link href="/" className="transition-opacity hover:opacity-70">
          <Image
            src="/manipal-university-jaipur-logo-01.svg"
            alt="Manipal University Jaipur"
            width={200}
            height={40}
            className="h-10 w-auto"
            priority
          />
        </Link>
      </motion.div>

      {/* Card area */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05 }}
        className="relative z-10 w-full max-w-md [&_[data-slot=card]]:py-6 [&_[data-slot=card]]:has-data-[slot=card-footer]:pb-6 [&_[data-slot=card-header]]:px-6 [&_[data-slot=card-content]]:px-6 [&_[data-slot=card-footer]]:border-0 [&_[data-slot=card-footer]]:bg-transparent [&_[data-slot=card-footer]]:px-6 [&_[data-slot=card-footer]]:pt-2 [&_[data-slot=card-footer]]:pb-0"
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
