import { CmsLoginClient } from "./CmsLoginClient";

type CmsLoginPageProps = {
  searchParams: {
    password?: string;
  };
};

export default function CmsLoginPage({ searchParams }: CmsLoginPageProps) {
  return <CmsLoginClient passwordUpdated={searchParams.password === "updated"} />;
}
