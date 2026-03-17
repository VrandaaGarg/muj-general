"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";

import { signIn } from "@/lib/auth-client";
import { signInSchema, type SignInInput } from "@/lib/validation/auth";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const VERIFICATION_ERRORS: Record<string, string> = {
  invalid_token: "That verification link is invalid. Please sign up again or request a new link.",
  token_expired: "That verification link has expired. Please sign up again or request a new link.",
};

function getSafeInternalRedirect(redirectTo: string | null) {
  if (!redirectTo || !redirectTo.startsWith("/")) {
    return "/dashboard";
  }

  if (redirectTo.startsWith("//") || redirectTo.includes("\\")) {
    return "/dashboard";
  }

  return redirectTo;
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified") === "true";
  const verifyError = searchParams.get("error");
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
  });

  const redirectTo = searchParams.get("redirectTo");

  async function onSubmit(values: SignInInput) {
    setServerError(null);

    const { error } = await signIn.email({
      email: values.email,
      password: values.password,
    });

    if (error) {
      if (error.status === 403) {
        setServerError(
          "Please verify your email before signing in. Check your inbox."
        );
        return;
      }
      setServerError(error.message ?? "Something went wrong. Try again.");
      return;
    }

    router.push(getSafeInternalRedirect(redirectTo));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-xl tracking-tight">
          Welcome back
        </CardTitle>
        <CardDescription>
          Sign in to your MUJ General account.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          id="sign-in-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          {verified && !verifyError && !serverError && (
            <Alert className="border-emerald-600/20 bg-emerald-600/5 text-emerald-600 [&>svg]:text-emerald-600">
              <CheckCircle2 className="size-4" />
              <AlertDescription className="text-emerald-600">
                Your email is verified. Please sign in.
              </AlertDescription>
            </Alert>
          )}

          {verifyError && !serverError && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>
                {VERIFICATION_ERRORS[verifyError] ??
                  "Email verification failed. Please try again or sign up with a new account."}
              </AlertDescription>
            </Alert>
          )}

          {serverError && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@muj.manipal.edu"
              autoComplete="email"
              autoFocus
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
        </form>
      </CardContent>

      <CardFooter className="flex-col gap-3">
        <Button
          type="submit"
          form="sign-in-form"
          disabled={isSubmitting}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              Sign in
              <ArrowRight data-icon="inline-end" className="size-3.5" />
            </>
          )}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/sign-up"
            className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-amber-600"
          >
            Create one
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export default function SignInPage() {
  return (
    <AuthShell>
      <Suspense>
        <SignInForm />
      </Suspense>
    </AuthShell>
  );
}
