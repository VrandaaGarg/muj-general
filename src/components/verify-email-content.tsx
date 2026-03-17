"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

import { AuthShell } from "@/components/auth-shell";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

type VerifyState = "loading" | "success" | "idle";

type VerifyEmailContentProps = {
  hasToken: boolean;
};

export function VerifyEmailContent({ hasToken }: VerifyEmailContentProps) {
  const [state, setState] = useState<VerifyState>(hasToken ? "loading" : "idle");

  useEffect(() => {
    if (!hasToken) {
      return;
    }

    const timer = setTimeout(() => setState("success"), 1500);
    return () => clearTimeout(timer);
  }, [hasToken]);

  return (
    <AuthShell>
      {state === "loading" && (
        <Card>
          <CardHeader className="items-center text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
            >
              <Loader2 className="size-8 text-amber-600" />
            </motion.div>
            <CardTitle className="font-serif text-xl tracking-tight">
              Verifying your email...
            </CardTitle>
            <CardDescription>
              Hang tight, this will only take a moment.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {state === "success" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
        >
          <Card>
            <CardHeader className="items-center text-center">
              <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-emerald-600/10">
                <CheckCircle2 className="size-5 text-emerald-600" />
              </div>
              <CardTitle className="font-serif text-xl tracking-tight">
                Email verified
              </CardTitle>
              <CardDescription>
                Your account is confirmed. You&apos;re all set.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm leading-relaxed text-muted-foreground">
                You can now sign in and start exploring the research repository.
              </p>
            </CardContent>
            <CardFooter className="justify-center">
              <Link href="/sign-in" className={buttonVariants({ size: "lg" })}>
                Continue to sign in
              </Link>
            </CardFooter>
          </Card>
        </motion.div>
      )}

      {state === "idle" && (
        <Card>
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
              <XCircle className="size-5 text-muted-foreground" />
            </div>
            <CardTitle className="font-serif text-xl tracking-tight">
              Verify your email
            </CardTitle>
            <CardDescription className="max-w-[280px]">
              We sent a verification link to your email address when you signed
              up.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Click the link in the email to verify your account and get
              started. If you can&apos;t find it, check your spam folder or try
              signing up again.
            </p>
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Link
              href="/sign-in"
              className={buttonVariants({
                variant: "outline",
                size: "lg",
                className: "w-full",
              })}
            >
              Back to sign in
            </Link>
            <Link
              href="/sign-up"
              className="text-xs font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
            >
              Sign up again
            </Link>
          </CardFooter>
        </Card>
      )}
    </AuthShell>
  );
}
