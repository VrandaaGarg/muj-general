"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, AlertCircle, ArrowRight, MailCheck, Eye, EyeOff } from "lucide-react";

import { signUp } from "@/lib/auth-client";
import { signUpSchema, type SignUpInput } from "@/lib/validation/auth";
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

export default function SignUpPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(
    null
  );
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
  });

  async function onSubmit(values: SignUpInput) {
    setServerError(null);

    const { error } = await signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
      callbackURL: "/sign-in?verified=true",
    });

    if (error) {
      setServerError(error.message ?? "Something went wrong. Try again.");
      return;
    }

    setVerificationEmail(values.email);
  }

  return (
    <AuthShell>
      <AnimatePresence mode="wait">
        {verificationEmail ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
          >
            <Card>
              <CardHeader className="items-center text-center">
                <div className="mb-2 mx-auto flex size-12 items-center justify-center    bg-amber-600/10">
                  <MailCheck className="size-5 text-amber-600" />
                </div>
                <CardTitle className="font-sans text-xl tracking-tight">
                  Check your inbox
                </CardTitle>
                <CardDescription className="max-w-[280px] mx-auto">
                  We sent a verification link to{" "}
                  <span className="font-medium text-foreground">
                    {verificationEmail}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Click the link in the email to verify your account. If you
                  don&apos;t see it, check your spam folder.
                </p>
              </CardContent>
              <CardFooter className="justify-center">
                <Link
                  href="/sign-in"
                  className="text-xs font-medium text-foreground underline underline-offset-4 transition-colors hover:text-amber-600"
                >
                  Back to sign in
                </Link>
              </CardFooter>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="font-sans text-xl tracking-tight">
                  Create your account
                </CardTitle>
                <CardDescription>
                  Join MUJ General to publish and discover research.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form
                  id="sign-up-form"
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
                    <Label htmlFor="name">Full name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Dr. Jane Smith"
                      autoComplete="name"
                      autoFocus
                      aria-invalid={!!errors.name}
                      {...register("name")}
                    />
                    {errors.name && (
                      <p className="text-xs text-destructive">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@muj.manipal.edu"
                      autoComplete="email"
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
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        aria-invalid={!!errors.password}
                        className="pr-10"
                        {...register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-xs text-destructive">
                        {errors.password.message}
                      </p>
                    )}
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Min. 8 characters with uppercase, lowercase, and a number.
                    </p>
                  </div>
                </form>
              </CardContent>

              <CardFooter className="flex-col gap-3">
                <Button
                  type="submit"
                  form="sign-up-form"
                  disabled={isSubmitting}
                  className="w-full"
                  size="lg"
                >
                  {isSubmitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      Create account
                      <ArrowRight
                        data-icon="inline-end"
                        className="size-3.5"
                      />
                    </>
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Already have an account?{" "}
                  <Link
                    href="/sign-in"
                    className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-amber-600"
                  >
                    Sign in
                  </Link>
                </p>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
