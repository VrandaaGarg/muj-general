"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, MailCheck } from "lucide-react";

import { AuthShell } from "@/components/auth-shell";
import { authClient } from "@/lib/auth-client";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

type VerifyEmailContentProps = {
  token?: string;
  error?: string;
};

export function VerifyEmailContent({ token, error }: VerifyEmailContentProps) {
  const router = useRouter();
  const [isVerifying, setIsVerifying] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      return;
    }

    const verificationToken = token;
    let isMounted = true;

    async function verifyToken() {
      const { error: verificationError } = await authClient.verifyEmail({
        query: { token: verificationToken },
      });

      if (!isMounted) {
        return;
      }

      const destination = new URL("/sign-in", window.location.origin);

      if (verificationError) {
        destination.searchParams.set("error", verificationError.code ?? "invalid_token");
      } else {
        destination.searchParams.set("verified", "true");
      }

      router.replace(`${destination.pathname}${destination.search}`);
    }

    void verifyToken();

    return () => {
      isMounted = false;
      setIsVerifying(false);
    };
  }, [router, token]);

  return (
    <AuthShell>
      <Card>
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center    bg-amber-600/10">
            {isVerifying ? (
              <Loader2 className="size-5 animate-spin text-amber-600" />
            ) : (
              <MailCheck className="size-5 text-amber-600" />
            )}
          </div>
          <CardTitle className="font-sans text-xl tracking-tight">
            {isVerifying ? "Verifying your email" : "Check your email"}
          </CardTitle>
          <CardDescription className="max-w-[280px]">
            {isVerifying
              ? "Please wait while we confirm your verification link."
              : "We sent a verification link to your email address when you signed up."}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {error ? (
            <Alert variant="destructive" className="text-left">
              <AlertCircle className="size-4" />
              <AlertDescription>
                This verification link is no longer valid. Please sign in if your
                account is already verified, or sign up again to request a fresh
                verification email.
              </AlertDescription>
            </Alert>
          ) : null}
          <p className="text-sm leading-relaxed text-muted-foreground">
            {isVerifying
              ? "You will be redirected to sign in as soon as verification completes."
              : "Click the link in the email to verify your account and get started. If you can&apos;t find it, check your spam folder or try signing up again."}
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
    </AuthShell>
  );
}
