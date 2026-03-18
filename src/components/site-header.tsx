"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  LayoutDashboard,
  Library,
  LogOut,
  PenTool,
  ScrollText,
  Shield,
  User,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

import { useSession, signOut } from "@/lib/auth-client";
import { buttonVariants } from "@/components/ui/button-variants";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SiteHeaderProps {
  accentColor?: "primary" | "violet" | "rose";
  role?: "reader" | "editor" | "admin";
}

const accentLine: Record<string, string> = {
  primary:
    "bg-gradient-to-r from-primary/0 via-primary to-primary/0",
  violet:
    "bg-gradient-to-r from-violet-600/0 via-violet-600 to-violet-600/0",
  rose: "bg-gradient-to-r from-rose-600/0 via-rose-600 to-rose-600/0",
};

export function SiteHeader({
  accentColor = "primary",
  role,
}: SiteHeaderProps) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  async function handleSignOut() {
    setMenuOpen(false);
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <div
        className={cn(
          "fixed top-0 right-0 left-0 z-50 h-[2px]",
          accentLine[accentColor],
        )}
      />
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12 lg:px-20"
      >
        <Link
          href="/"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-70"
        >
          <div className="flex size-8 items-center justify-center rounded-md bg-foreground">
            <BookOpen className="size-4 text-background" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            MUJ General
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            href="/research"
            className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex"
          >
            <Library className="size-4" />
            Research
          </Link>
          <Link
            href="/journals"
            className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:flex"
          >
            <ScrollText className="size-4" />
            Journals
          </Link>
          {isPending ? (
            <div className="h-7 w-20 animate-pulse rounded-lg bg-muted" />
          ) : session?.user ? (
            <div className="relative" ref={menuRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="gap-1.5"
              >
                <div className="flex size-5 items-center justify-center rounded-full bg-primary/10">
                  <User className="size-3 text-primary" />
                </div>
                <span className="max-w-[120px] truncate text-xs">
                  {session.user.name}
                </span>
                <ChevronDown
                  className={cn(
                    "size-3 text-muted-foreground transition-transform",
                    menuOpen && "rotate-180",
                  )}
                />
              </Button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1.5 z-50 w-52 rounded-xl border border-border/60 bg-card/95 p-1 shadow-lg backdrop-blur-sm"
                  >
                    <div className="border-b border-border/40 px-3 py-2 mb-1">
                      <p className="text-xs font-medium truncate">
                        {session.user.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {session.user.email}
                      </p>
                    </div>

                    <Link
                      href="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs transition-colors hover:bg-muted"
                    >
                      <LayoutDashboard className="size-3.5 text-muted-foreground" />
                      Dashboard
                    </Link>
                    {(role === "editor" || role === "admin") && (
                      <Link
                        href="/editor"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs transition-colors hover:bg-muted"
                      >
                        <PenTool className="size-3.5 text-muted-foreground" />
                        Editor
                      </Link>
                    )}
                    {role === "admin" && (
                      <Link
                        href="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs transition-colors hover:bg-muted"
                      >
                        <Shield className="size-3.5 text-muted-foreground" />
                        Admin
                      </Link>
                    )}

                    <div className="my-1 border-t border-border/40" />

                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs text-destructive transition-colors hover:bg-destructive/5"
                    >
                      <LogOut className="size-3.5" />
                      Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <>
              <Link
                href="/sign-in"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className={buttonVariants({ size: "sm" })}
              >
                Get started
                <ArrowRight data-icon="inline-end" className="size-3.5" />
              </Link>
            </>
          )}
        </nav>
      </motion.header>
    </>
  );
}
