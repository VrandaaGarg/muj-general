"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  FileText,
  LogOut,
  PenTool,
  Settings,
  Shield,
  User,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

import { useSession, signOut } from "@/lib/auth-client";
import type { AppRole } from "@/lib/auth/permissions";
import { buttonVariants } from "@/components/ui/button-variants";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SiteHeaderProps {
  role?: "reader" | "editor" | "admin";
}

export function SiteHeader({ role }: SiteHeaderProps) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [resolvedRole, setResolvedRole] = useState<AppRole | undefined>(role);
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

  useEffect(() => {
    setResolvedRole(role);
  }, [role]);

  useEffect(() => {
    let isCancelled = false;

    async function loadRole() {
      if (!session?.user) {
        if (!isCancelled) {
          setResolvedRole(undefined);
        }
        return;
      }

      if (role) {
        if (!isCancelled) {
          setResolvedRole(role);
        }
        return;
      }

      try {
        const response = await fetch("/api/auth/app-role", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { role: AppRole | null };

        if (!isCancelled) {
          setResolvedRole(data.role ?? undefined);
        }
      } catch {
        if (!isCancelled) {
          setResolvedRole(undefined);
        }
      }
    }

    void loadRole();

    return () => {
      isCancelled = true;
    };
  }, [session?.user, role]);

  async function handleSignOut() {
    setMenuOpen(false);
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="relative z-50 border-b border-border/60 bg-white backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3 md:px-12 lg:px-20">
        <Link
          href="/"
          className="flex items-center gap-3 transition-opacity hover:opacity-80"
        >
          <Image
            src="/manipal-university-jaipur-logo-01.svg"
            alt="Manipal University Jaipur"
            width={180}
            height={36}
            className="h-9 w-auto"
            priority
          />
        </Link>

        <nav className="flex items-center gap-2">
          {isPending ? (
            <div className="h-7 w-20 animate-pulse rounded-lg bg-muted" />
          ) : session?.user ? (
            <div className="relative" ref={menuRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="gap-2 px-2 py-2 cursor-pointer h-11 text-sm hover:bg-muted data-[state=open]:bg-muted"
              >
                <div className="flex size-6 items-center justify-center rounded-full bg-primary/10">
                  <User className="size-4 text-primary" />
                </div>
                <span className="max-w-[140px] truncate text-md font-medium text-foreground">
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
                      <p className="text-sm font-medium truncate">
                        {session.user.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {session.user.email}
                      </p>
                    </div>

                    {resolvedRole === "admin" && (
                      <Link
                        href="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
                      >
                        <Shield className="size-4 text-muted-foreground" />
                        Admin Panel
                      </Link>
                    )}
                    {(resolvedRole === "editor" || resolvedRole === "admin") && (
                      <Link
                        href="/editor"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
                      >
                        <PenTool className="size-4 text-muted-foreground" />
                        Editor Panel
                      </Link>
                    )}
                    <Link
                      href="/my-submissions"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
                    >
                      <FileText className="size-4 text-muted-foreground" />
                      My Submissions
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
                    >
                      <Settings className="size-4 text-muted-foreground" />
                      Settings
                    </Link>

                    <div className="my-1 border-t border-border/40" />

                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/5"
                    >
                      <LogOut className="size-4" />
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
      </div>
    </header>
  );
}
