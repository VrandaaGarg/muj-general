import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { buildEmailHtml, buildEmailText } from "@/lib/email-template";
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
    autoSignInAfterVerification: false,
    sendVerificationEmail: async ({ user, url }) => {
      const template = {
        previewText: "Verify your MUJ General account",
        title: "Verify your MUJ General account",
        greeting: `Hi ${user.name},`,
        paragraphs: [
          "Welcome to MUJ General.",
          "Please verify your email address to activate your account and continue with submissions and reviews.",
          "For security, this verification link is unique to your account.",
        ],
        actionLabel: "Verify email address",
        actionUrl: url,
      };

      await sendEmail({
        to: user.email,
        subject: "Verify your MUJ General account",
        text: buildEmailText(template),
        html: buildEmailHtml(template),
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
