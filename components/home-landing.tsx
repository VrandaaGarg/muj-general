"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  FileText,
  GraduationCap,
  Search,
  Users,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: index * 0.1,
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

const pillars = [
  {
    icon: FileText,
    title: "Publish",
    description:
      "Share research papers, theses, and academic work with your department and beyond.",
  },
  {
    icon: Search,
    title: "Discover",
    description:
      "Search across departments, filter by tags, and find the work that matters to you.",
  },
  {
    icon: Users,
    title: "Collaborate",
    description:
      "Connect with researchers, cite existing work, and build on collective knowledge.",
  },
] as const;

export function HomeLanding() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.4) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="fixed top-0 right-0 left-0 z-50 h-[2px] bg-gradient-to-r from-amber-600/0 via-amber-600 to-amber-600/0" />

      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12 lg:px-20"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-md bg-foreground">
            <BookOpen className="size-4 text-background" />
          </div>
          <span className="text-base font-semibold tracking-tight">
            MUJ General
          </span>
        </div>
        <nav className="flex items-center gap-2">
          <Link
            href="/sign-in"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Sign in
          </Link>
          <Link href="/sign-up" className={buttonVariants({ size: "sm" })}>
            Get started
            <ArrowRight data-icon="inline-end" className="size-3.5" />
          </Link>
        </nav>
      </motion.header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 pt-20 pb-32 md:px-12 md:pt-32 lg:pt-40">
        <div className="flex flex-col items-start">
          <motion.div
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mb-6 flex items-center gap-2 rounded-full border border-amber-600/20 bg-amber-600/5 px-3 py-1"
          >
            <GraduationCap className="size-3.5 text-amber-600" />
            <span className="text-xs font-medium text-amber-600">
              Manipal University Jaipur
            </span>
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="max-w-3xl font-serif text-4xl leading-[1.1] tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl"
          >
            The research repository
            <br />
            <span className="text-muted-foreground">
              your campus deserves.
            </span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg"
          >
            A unified platform for MUJ&apos;s academic community to publish,
            discover, and collaborate on research across every department.
          </motion.p>

          <motion.div
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mt-10 flex flex-wrap items-center gap-3"
          >
            <Link href="/sign-up" className={buttonVariants({ size: "lg" })}>
              Create your account
              <ArrowRight data-icon="inline-end" className="size-4" />
            </Link>
            <Link
              href="/sign-in"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Sign in to continue
            </Link>
          </motion.div>
        </div>

        <div className="mt-28 grid gap-6 sm:grid-cols-3 md:mt-36">
          {pillars.map((pillar, index) => (
            <motion.div
              key={pillar.title}
              custom={index + 4}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="group rounded-xl border border-border/60 bg-card/50 p-5 transition-colors hover:border-amber-600/20 hover:bg-amber-600/[0.02]"
            >
              <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-amber-600/10">
                <pillar.icon className="size-4 text-muted-foreground transition-colors group-hover:text-amber-600" />
              </div>
              <h3 className="text-sm font-semibold tracking-tight">
                {pillar.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {pillar.description}
              </p>
            </motion.div>
          ))}
        </div>
      </main>

      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="relative z-10 border-t px-6 py-6 md:px-12 lg:px-20"
      >
        <div className="flex flex-col items-center justify-between gap-3 text-xs text-muted-foreground sm:flex-row">
          <span>MUJ General — Manipal University Jaipur</span>
          <span className="font-mono text-[10px] tracking-wider uppercase opacity-60">
            Research Repository
          </span>
        </div>
      </motion.footer>
    </div>
  );
}
