import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

import { env, isR2Configured } from "@/lib/env";

let r2Client: S3Client | null = null;

export function getR2Client() {
  if (!isR2Configured) {
    throw new Error("Cloudflare R2 is not fully configured.");
  }

  if (!r2Client) {
    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID!,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }

  return r2Client;
}

export function getR2BucketName() {
  if (!env.R2_BUCKET_NAME) {
    throw new Error("R2_BUCKET_NAME is not configured.");
  }

  return env.R2_BUCKET_NAME;
}
