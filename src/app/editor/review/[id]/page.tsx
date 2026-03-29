import { redirect } from "next/navigation";

export default async function LegacyEditorReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/submissions/${id}`);
}
