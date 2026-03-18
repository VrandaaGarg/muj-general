import "server-only";

import nodemailer from "nodemailer";

import { env, isSmtpConfigured } from "@/lib/env";

type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

let transporterPromise: Promise<nodemailer.Transporter> | null = null;

async function getTransporter() {
  if (!isSmtpConfigured) {
    return null;
  }

  if (!transporterPromise) {
    transporterPromise = Promise.resolve(
      nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE ?? false,
        auth:
          env.SMTP_USER && env.SMTP_PASS
            ? {
                user: env.SMTP_USER,
                pass: env.SMTP_PASS,
              }
            : undefined,
      }),
    );
  }

  return transporterPromise;
}

export async function sendEmail(payload: EmailPayload) {
  const transporter = await getTransporter();

  if (!transporter) {
    if (env.NODE_ENV === "production") {
      throw new Error(
        "SMTP is not configured. Verification email delivery is required in production.",
      );
    }

    console.info("[email:dev-fallback]", {
      from: env.SMTP_FROM ?? "dev@example.com",
      ...payload,
    });

    return;
  }

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });
}
