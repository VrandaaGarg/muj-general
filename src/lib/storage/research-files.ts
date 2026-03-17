import "server-only";

import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

import { getR2BucketName, getR2Client } from "@/lib/storage/r2";

const MAX_RESEARCH_PDF_BYTES = 10 * 1024 * 1024;
const PRESIGNED_UPLOAD_TTL_SECONDS = 60 * 5;

export function getMaxResearchPdfBytes() {
  return MAX_RESEARCH_PDF_BYTES;
}

export function validateResearchPdfMetadata(params: {
  contentType: string;
  sizeBytes: number;
}) {
  if (params.contentType !== "application/pdf") {
    throw new Error("Only PDF uploads are supported right now.");
  }

  if (params.sizeBytes <= 0) {
    throw new Error("A PDF file is required for submission.");
  }

  if (params.sizeBytes > MAX_RESEARCH_PDF_BYTES) {
    throw new Error("PDF files must be 10 MB or smaller for this upload flow.");
  }
}

export function validateResearchPdf(file: File | null) {
  if (!file || file.size === 0) {
    throw new Error("A PDF file is required for submission.");
  }

  validateResearchPdfMetadata({
    contentType: file.type,
    sizeBytes: file.size,
  });
}

export function createPresignedResearchUploadKey(userId: string) {
  return `research-items/uploads/${userId}/${Date.now()}-${randomUUID()}.pdf`;
}

export async function createPresignedResearchUpload(params: {
  key: string;
  contentType: string;
  sizeBytes: number;
}) {
  validateResearchPdfMetadata(params);

  const bucketName = getR2BucketName();
  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: params.key,
    ContentType: params.contentType,
    ContentLength: params.sizeBytes,
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: PRESIGNED_UPLOAD_TTL_SECONDS,
  });

  return {
    bucketName,
    uploadUrl,
    objectKey: params.key,
    expiresIn: PRESIGNED_UPLOAD_TTL_SECONDS,
  };
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

export async function getResearchObjectMetadata(key: string) {
  const bucketName = getR2BucketName();
  const client = getR2Client();

  const result = await client.send(
    new HeadObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
  );

  return {
    bucketName,
    objectKey: key,
    mimeType: result.ContentType ?? "application/octet-stream",
    sizeBytes: result.ContentLength ?? 0,
    checksum: result.ETag?.replaceAll('"', "") ?? null,
  };
}
