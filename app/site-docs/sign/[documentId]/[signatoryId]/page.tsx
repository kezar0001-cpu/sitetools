import SignSiteDocClient from './sign-client'

export default function SiteDocSignPage({
  params,
  searchParams,
}: {
  params: { documentId: string; signatoryId: string }
  searchParams: { token?: string }
}) {
  return (
    <SignSiteDocClient
      documentId={params.documentId}
      signatoryId={params.signatoryId}
      token={searchParams.token || ''}
    />
  )
}