import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { ensureAppUser } from "@/lib/db/queries";
import type { AppRole } from "@/lib/auth/permissions";

export type AppSession = Awaited<ReturnType<typeof getAppSession>>;
export type AuthenticatedAppSession = NonNullable<AppSession>;

export async function getAuthSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function getAppSession() {
  const session = await getAuthSession();

  if (!session) {
    return null;
  }

  const appUser = await ensureAppUser(session.user.id);

  if (!appUser) {
    return null;
  }

  return {
    ...session,
    appUser,
  };
}

export async function requireAppSession(returnTo?: string) {
  const session = await getAppSession();

  if (!session) {
    const signInUrl = returnTo
      ? `/sign-in?redirectTo=${encodeURIComponent(returnTo)}`
      : "/sign-in";
    redirect(signInUrl);
  }

  return session;
}

export async function requireRole(
  allowedRoles: AppRole[],
  options?: {
    returnTo?: string;
    unauthorizedRedirectTo?: string;
  },
) {
  const session = await requireAppSession(options?.returnTo);

  if (!allowedRoles.includes(session.appUser.role)) {
    redirect(options?.unauthorizedRedirectTo ?? "/dashboard");
  }

  return session;
}
