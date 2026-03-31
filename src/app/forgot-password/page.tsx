"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, AlertCircle, ArrowLeft, Mail } from "lucide-react";

import { requestPasswordReset } from "@/lib/auth-client";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validation/auth";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
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

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setServerError(null);

    const { error } = await requestPasswordReset({
      email: values.email,
      redirectTo: "/reset-password",
    });

    if (error) {
      setServerError(error.message ?? "Something went wrong. Try again.");
      return;
    }

    setSent(true);
  }

  return (
    <AuthShell>
      <Card>
        <CardHeader>
          <CardTitle className="font-sans text-xl tracking-tight">
            {sent ? "Check your email" : "Forgot password"}
          </CardTitle>
          <CardDescription>
            {sent
              ? "If an account exists with that email, we sent a reset link."
              : "Enter your email and we'll send you a link to reset your password."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {sent ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-emerald-600/10">
                <Mail className="size-5 text-emerald-600" />
              </div>
              <p className="text-sm text-muted-foreground">
                Check your inbox and spam folder. The link will expire shortly.
              </p>
            </div>
          ) : (
            <form
              id="forgot-password-form"
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col gap-4"
            >
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
            </form>
          )}
        </CardContent>

        <CardFooter className="flex-col gap-3">
          {sent ? (
            <Link
              href="/sign-in"
              className={buttonVariants({ variant: "outline", size: "lg", className: "w-full" })}
            >
              <ArrowLeft className="size-3.5" />
              Back to sign in
            </Link>
          ) : (
            <>
              <Button
                type="submit"
                form="forgot-password-form"
                disabled={isSubmitting}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Send reset link"
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Remember your password?{" "}
                <Link
                  href="/sign-in"
                  className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary"
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </CardFooter>
      </Card>
    </AuthShell>
  );
}
