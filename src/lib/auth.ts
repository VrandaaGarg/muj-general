import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.NEXT_PUBLIC_APP_URL],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignIn: false,
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your MUJ General account",
        text: `Verify your email by visiting: ${url}`,
        html: `<p>Verify your MUJ General account by clicking the link below:</p><p><a href="${url}">${url}</a></p>`,
      });
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          await db
            .insert(schema.appUsers)
            .values({ id: createdUser.id })
            .onConflictDoNothing();
        },
      },
    },
  },
  experimental: {
    joins: true,
  },
});

export type AuthSession = typeof auth.$Infer.Session;
