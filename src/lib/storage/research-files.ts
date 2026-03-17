import "server-only";

import {
  DeleteObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

import { getR2BucketName, getR2Client } from "@/lib/storage/r2";

const MAX_RESEARCH_PDF_BYTES = 10 * 1024 * 1024;

export function validateResearchPdf(file: File | null) {
  if (!file || file.size === 0) {
    throw new Error("A PDF file is required for submission.");
  }

  if (file.type !== "application/pdf") {
    throw new Error("Only PDF uploads are supported right now.");
  }

  if (file.size > MAX_RESEARCH_PDF_BYTES) {
    throw new Error("PDF files must be 10 MB or smaller for this upload flow.");
  }
}

export async function uploadResearchPdf(params: {
  key: string;
  file: File;
}) {
  validateResearchPdf(params.file);

  const bucketName = getR2BucketName();
  const client = getR2Client();
  const body = Buffer.from(await params.file.arrayBuffer());

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: params.key,
      Body: body,
      ContentType: params.file.type,
      ContentLength: params.file.size,
    }),
  );

  return {
    bucketName,
    objectKey: params.key,
    mimeType: params.file.type,
    sizeBytes: params.file.size,
    originalName: params.file.name,
  };
}

export async function deleteResearchPdf(key: string) {
  const bucketName = getR2BucketName();
  const client = getR2Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
  );
}
