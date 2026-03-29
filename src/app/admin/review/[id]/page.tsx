import { redirect } from "next/navigation";

export default async function LegacyAdminReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/submissions/${id}`);
}
