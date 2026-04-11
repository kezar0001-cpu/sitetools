import { redirect } from "next/navigation";
import { CmsResetPasswordForm } from "./CmsResetPasswordForm";

type CmsResetPageProps = {
  searchParams: Promise<{ access_token?: string }>;
};

export default async function CmsResetPage({ searchParams }: CmsResetPageProps) {
  const params = await searchParams;
  const accessToken = params.access_token;

  if (!accessToken) {
    redirect("/cms");
  }

  return <CmsResetPasswordForm accessToken={accessToken} />;
}
