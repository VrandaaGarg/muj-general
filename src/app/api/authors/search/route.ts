import { NextResponse } from "next/server";

import { getAppSession } from "@/lib/auth/session";
import { searchAuthorSuggestions } from "@/lib/db/queries";

export async function GET(request: Request) {
  const session = await getAppSession();

  if (!session || (session.appUser.role !== "editor" && session.appUser.role !== "admin")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") ?? "";
  const limitParam = Number(searchParams.get("limit") ?? "8");
  const limit = Number.isFinite(limitParam) ? limitParam : 8;

  const results = await searchAuthorSuggestions({ query, limit });
  return NextResponse.json({ results });
}
