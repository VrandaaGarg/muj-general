/** Client-side presigned upload helper for R2 (browser-only, no "server-only"). */

export type ResearchUploadKind = "main_pdf" | "cover_image";

export interface PresignedUploadMeta {
  objectKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

interface PresignResponse {
  uploadUrl: string;
  objectKey: string;
  expiresIn: number;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  error?: string;
}

/**
 * 1. Request a presigned PUT URL from the backend.
 * 2. PUT the raw file bytes directly to R2.
 * 3. Return the metadata the server action needs.
 */
export async function presignedUpload(
  file: File,
  options?: { kind?: ResearchUploadKind },
): Promise<PresignedUploadMeta> {
  const kind = options?.kind ?? "main_pdf";

  // Step 1 – get a presigned URL
  const presignRes = await fetch("/api/uploads/research/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind,
      fileName: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    }),
  });

  if (!presignRes.ok) {
    const body = (await presignRes.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(
      body?.error ?? `Presign request failed (${presignRes.status})`,
    );
  }

  const presign = (await presignRes.json()) as PresignResponse;

  // Step 2 – PUT file bytes to R2
  const uploadRes = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
      "Content-Length": String(file.size),
    },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error(
      `File upload to storage failed (${uploadRes.status}). Please try again.`,
    );
  }

  // Step 3 – return metadata for the server action
  return {
    objectKey: presign.objectKey,
    originalName: presign.originalName,
    mimeType: presign.mimeType,
    sizeBytes: presign.sizeBytes,
  };
}

/** Append presigned upload metadata fields to a FormData instance. */
export function appendUploadMeta(
  formData: FormData,
  meta: PresignedUploadMeta,
  options?: { prefix?: "uploaded" | "coverUploaded" },
) {
  const prefix = options?.prefix ?? "uploaded";

  formData.set(`${prefix}ObjectKey`, meta.objectKey);
  formData.set(`${prefix}OriginalName`, meta.originalName);
  formData.set(`${prefix}MimeType`, meta.mimeType);
  formData.set(`${prefix}SizeBytes`, String(meta.sizeBytes));
}
