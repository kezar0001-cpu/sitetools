import ClientActionRegisterPage from "./client-action-register";

export default function Page({
    params,
    searchParams,
}: {
    params: { linkId: string };
    searchParams: { token?: string };
}) {
    return <ClientActionRegisterPage linkId={params.linkId} token={searchParams.token || ""} />;
}