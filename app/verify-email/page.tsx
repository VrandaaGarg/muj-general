import { VerifyEmailContent } from "@/components/verify-email-content";

type VerifyEmailPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const params = await searchParams;
  const token = params.token;
  const hasToken = Array.isArray(token) ? token.length > 0 : Boolean(token);

  return <VerifyEmailContent hasToken={hasToken} />;
}
