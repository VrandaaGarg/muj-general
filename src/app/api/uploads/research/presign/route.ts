import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getAppUserById } from "@/lib/db/queries";
import {
  createPresignedResearchUpload,
  createPresignedResearchUploadKey,
} from "@/lib/storage/research-files";

type PresignBody = {
  kind?: "main_pdf" | "cover_image";
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
};

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUser = await getAppUserById(session.user.id);

  if (!appUser || (appUser.role !== "editor" && appUser.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as PresignBody;

  if (
    (body.kind !== "main_pdf" && body.kind !== "cover_image") ||
    !body.fileName ||
    !body.contentType ||
    typeof body.sizeBytes !== "number"
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const objectKey = createPresignedResearchUploadKey(session.user.id, {
      fileName: body.fileName,
      contentType: body.contentType,
    });
    const result = await createPresignedResearchUpload({
      key: objectKey,
      kind: body.kind,
      contentType: body.contentType,
      sizeBytes: body.sizeBytes,
    });

    return NextResponse.json({
      uploadUrl: result.uploadUrl,
      objectKey: result.objectKey,
      expiresIn: result.expiresIn,
      originalName: body.fileName,
      mimeType: body.contentType,
      sizeBytes: body.sizeBytes,
    });
  } catch (error) {
    console.error("Failed to create research upload URL", error);
    return NextResponse.json(
      { error: "Could not prepare upload URL" },
      { status: 400 },
    );
  }
}
