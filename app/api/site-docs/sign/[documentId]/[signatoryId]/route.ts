import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import type { GeneratedContent, SiteDocument, Signatory } from '@/lib/site-docs/types'
import { isValidSiteDocSignToken } from '@/lib/site-docs/sign-links'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function getDocument(documentId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('site_documents')
    .select('id, title, generated_content')
    .eq('id', documentId)
    .single()

  if (error || !data) return null
  return data as Pick<SiteDocument, 'id' | 'title' | 'generated_content'>
}

export async function GET(
  req: NextRequest,
  { params }: { params: { documentId: string; signatoryId: string } }
) {
  const token = req.nextUrl.searchParams.get('token')
  if (!isValidSiteDocSignToken(params.documentId, params.signatoryId, token)) {
    return NextResponse.json({ error: 'Invalid signing link' }, { status: 403 })
  }

  const document = await getDocument(params.documentId)
  if (!document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  const signatory = (document.generated_content.signatories || []).find((item) => item.id === params.signatoryId)
  if (!signatory) {
    return NextResponse.json({ error: 'Signatory not found' }, { status: 404 })
  }

  return NextResponse.json({
    documentTitle: document.generated_content.metadata.document_title || document.title,
    signatory,
    acceptanceClause: 'If no objection or requested amendment is raised within 48 hours of issue, these minutes will be taken as accepted.',
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { documentId: string; signatoryId: string } }
) {
  const body = await req.json().catch(() => null) as { token?: string; signature?: string } | null
  if (!body?.signature || !isValidSiteDocSignToken(params.documentId, params.signatoryId, body.token)) {
    return NextResponse.json({ error: 'Invalid signing request' }, { status: 403 })
  }

  const document = await getDocument(params.documentId)
  if (!document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  const signatories = (document.generated_content.signatories || []) as Signatory[]
  const signatoryIndex = signatories.findIndex((item) => item.id === params.signatoryId)
  if (signatoryIndex === -1) {
    return NextResponse.json({ error: 'Signatory not found' }, { status: 404 })
  }

  const nextSignatories = [...signatories]
  nextSignatories[signatoryIndex] = {
    ...nextSignatories[signatoryIndex],
    signature_data: body.signature,
    signature_date: new Date().toISOString().slice(0, 10),
  }

  const generatedContent: GeneratedContent = {
    ...document.generated_content,
    signatories: nextSignatories,
  }

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('site_documents')
    .update({
      generated_content: generatedContent,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.documentId)

  if (error) {
    return NextResponse.json({ error: 'Failed to save signature' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}