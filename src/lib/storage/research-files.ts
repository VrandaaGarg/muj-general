import "server-only";

import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";

import { getR2BucketName, getR2Client } from "@/lib/storage/r2";

export type ResearchUploadKind = "main_pdf" | "cover_image";

const MAX_RESEARCH_PDF_BYTES = 10 * 1024 * 1024;
const MAX_RESEARCH_IMAGE_BYTES = 5 * 1024 * 1024;
const PRESIGNED_UPLOAD_TTL_SECONDS = 60 * 5;
const COVER_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function getMaxResearchPdfBytes() {
  return MAX_RESEARCH_PDF_BYTES;
}

export function getMaxResearchImageBytes() {
  return MAX_RESEARCH_IMAGE_BYTES;
}

function getResearchUploadExtension(fileName: string, contentType: string) {
  const extension = extname(fileName).toLowerCase();

  if (contentType === "application/pdf") {
    return extension === ".pdf" ? extension : ".pdf";
  }

  if ([".jpg", ".jpeg", ".png", ".webp"].includes(extension)) {
    return extension;
  }

  if (contentType === "image/png") {
    return ".png";
  }

  if (contentType === "image/webp") {
    return ".webp";
  }

  return ".jpg";
}

export function validateResearchUploadMetadata(params: {
  kind: ResearchUploadKind;
  contentType: string;
  sizeBytes: number;
}) {
  if (params.sizeBytes <= 0) {
    throw new Error(
      params.kind === "main_pdf"
        ? "A PDF file is required for submission."
        : "Cover image uploads must contain a file.",
    );
  }

  if (params.kind === "main_pdf") {
    if (params.contentType !== "application/pdf") {
      throw new Error("Only PDF uploads are supported for the main file.");
    }

    if (params.sizeBytes > MAX_RESEARCH_PDF_BYTES) {
      throw new Error(
        "PDF files must be 10 MB or smaller for this upload flow.",
      );
    }

    return;
  }

  if (!COVER_IMAGE_MIME_TYPES.has(params.contentType)) {
    throw new Error("Cover images must be JPG, PNG, or WebP files.");
  }

  if (params.sizeBytes > MAX_RESEARCH_IMAGE_BYTES) {
    throw new Error("Cover images must be 5 MB or smaller.");
  }
}

export function validateResearchPdf(file: File | null) {
  if (!file || file.size === 0) {
    throw new Error("A PDF file is required for submission.");
  }

  validateResearchUploadMetadata({
    kind: "main_pdf",
    contentType: file.type,
    sizeBytes: file.size,
  });
}

export function createPresignedResearchUploadKey(
  userId: string,
  params: { fileName: string; contentType: string },
) {
  const extension = getResearchUploadExtension(
    params.fileName,
    params.contentType,
  );

  return `research-items/uploads/${userId}/${Date.now()}-${randomUUID()}${extension}`;
}

export function createPresignedJournalCoverUploadKey(
  userId: string,
  params: { fileName: string; contentType: string },
) {
  const extension = getResearchUploadExtension(
    params.fileName,
    params.contentType,
  );

  return `journal-covers/${userId}/${Date.now()}-${randomUUID()}${extension}`;
}

export async function createPresignedResearchUpload(params: {
  key: string;
  kind: ResearchUploadKind;
  contentType: string;
  sizeBytes: number;
}) {
  validateResearchUploadMetadata(params);

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

export async function uploadResearchFile(params: {
  key: string;
  file: File;
  kind: ResearchUploadKind;
}) {
  validateResearchUploadMetadata({
    kind: params.kind,
    contentType: params.file.type,
    sizeBytes: params.file.size,
  });

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
    checksum: null,
  };
}

export async function uploadResearchPdf(params: { key: string; file: File }) {
  return uploadResearchFile({ ...params, kind: "main_pdf" });
}

export async function deleteResearchObject(key: string) {
  const bucketName = getR2BucketName();
  const client = getR2Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
  );
}

export async function deleteResearchPdf(key: string) {
  return deleteResearchObject(key);
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
