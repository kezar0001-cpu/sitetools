import { createHash } from 'crypto'

const DEFAULT_BASE_URL = 'http://localhost:3001'

function getSecret(): string {
  return process.env.SITE_DOCS_SIGN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'buildstate-site-docs-sign'
}

export function createSiteDocSignToken(documentId: string, signatoryId: string): string {
  return createHash('sha256')
    .update(`${documentId}:${signatoryId}:${getSecret()}`)
    .digest('hex')
}

export function isValidSiteDocSignToken(documentId: string, signatoryId: string, token: string | null | undefined): boolean {
  if (!token) return false
  return token === createSiteDocSignToken(documentId, signatoryId)
}

export function buildSiteDocSignUrl(documentId: string, signatoryId: string, origin?: string): string {
  const baseUrl = origin || process.env.NEXT_PUBLIC_APP_URL || DEFAULT_BASE_URL
  const token = createSiteDocSignToken(documentId, signatoryId)
  return `${baseUrl.replace(/\/$/, '')}/site-docs/sign/${documentId}/${signatoryId}?token=${token}`
}