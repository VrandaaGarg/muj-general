import { VerifyEmailContent } from "@/components/verify-email-content";

type VerifyEmailPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const params = await searchParams;
  const token = getSearchParam(params.token);
  const error = getSearchParam(params.error);

  return <VerifyEmailContent token={token} error={error} />;
}
