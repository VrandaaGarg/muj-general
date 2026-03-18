"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Search,
  Users,
} from "lucide-react";

import { useSession } from "@/lib/auth-client";
import { buttonVariants } from "@/components/ui/button-variants";
import { SiteHeader } from "@/components/site-header";

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
  const { data: session } = useSession();
  const isSignedIn = Boolean(session?.user);

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

      <SiteHeader />

      <main className="relative z-10 mx-auto max-w-5xl px-6 pt-20 pb-32 md:px-12 md:pt-32 lg:pt-40">
        <div className="flex flex-col items-start">
          <motion.div
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mb-6 flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1"
          >
            <GraduationCap className="size-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">
              Manipal University Jaipur
            </span>
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="max-w-3xl font-sans text-4xl leading-[1.1] tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl"
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
            className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground md:text-xl"
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
            <Link
              href="/research"
              className={buttonVariants({ size: "lg" })}
            >
              <Search className="size-4" />
              Browse research
              <ArrowRight data-icon="inline-end" className="size-4" />
            </Link>
            {isSignedIn ? (
              <Link
                href="/dashboard"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                <LayoutDashboard className="size-4" />
                Dashboard
              </Link>
            ) : (
              <Link
                href="/sign-up"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Create your account
              </Link>
            )}
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
               className="group rounded-xl border border-border/60 bg-card/50 p-6 transition-colors hover:border-primary/20 hover:bg-primary/[0.02]"
            >
              <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-primary/10">
                <pillar.icon className="size-4.5 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>
              <h3 className="text-base font-semibold tracking-tight">
                {pillar.title}
              </h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">
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
        <div className="flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
          <span>MUJ General — Manipal University Jaipur</span>
          <span className="font-mono text-xs tracking-wider uppercase opacity-60">
            Research Repository
          </span>
        </div>
      </motion.footer>
    </div>
  );
}
