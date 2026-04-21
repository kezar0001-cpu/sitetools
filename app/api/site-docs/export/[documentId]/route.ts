import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createElement } from 'react'
import { generateSiteDocHtml } from '@/lib/site-docs/export-html'
import { MSADocument } from '@/lib/site-docs/pdf-template'
import { mapSiteDocToMSA } from '@/lib/site-docs/pdf'
import type { GeneratedContent, SiteDocument } from '@/lib/site-docs/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type MSADocumentProps = Parameters<typeof MSADocument>[0]

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_').slice(0, 60)
}

async function renderPdfWithFallback(pdfData: MSADocumentProps) {
  try {
    return await renderToBuffer(createElement(MSADocument, pdfData))
  } catch (error) {
    const maybeProps = pdfData as MSADocumentProps & { companyLogoUrl?: string | null }
    if (maybeProps?.companyLogoUrl) {
      console.warn('[site-docs/export] PDF render failed with company logo, retrying without logo', error)
      return renderToBuffer(createElement(MSADocument, { ...maybeProps, companyLogoUrl: null }))
    }
    throw error
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const body = await req.json().catch(() => ({}))
    const format = req.nextUrl.searchParams.get('format') === 'docx' ? 'docx' : 'pdf'
    const providedContent = body.generated_content as GeneratedContent | undefined
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - missing token' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - invalid token' }, { status: 401 })
    }

    const { data: document, error: docError } = await supabaseAdmin
      .from('site_documents')
      .select('*, company:companies(name,logo_url)')
      .eq('id', params.documentId)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('company_memberships')
      .select('id')
      .eq('company_id', document.company_id)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const typedDocument = document as SiteDocument & {
      company?: { name?: string; logo_url?: string | null } | null
      generated_content: GeneratedContent
    }

    // Use provided content if available (avoids race condition with fresh saves)
    const contentToExport = providedContent ?? typedDocument.generated_content

    const pdfData = mapSiteDocToMSA(
      {
        id: typedDocument.id,
        title: typedDocument.title,
        document_type: typedDocument.document_type,
        status: typedDocument.status,
        reference_number: typedDocument.reference_number,
        revision: typedDocument.revision ?? 'Rev A',
      },
      contentToExport,
      typedDocument.company?.name ?? null,
      typedDocument.company?.logo_url ?? null,
      req.nextUrl.origin
    )

    const filename = sanitizeFilename(pdfData.documentNo || typedDocument.title || 'site-document')

    if (format === 'docx') {
      const html = generateSiteDocHtml({
        document: {
          id: typedDocument.id,
          title: typedDocument.title,
          document_type: typedDocument.document_type,
          reference_number: typedDocument.reference_number,
        },
        content: contentToExport,
        companyName: typedDocument.company?.name ?? null,
        origin: req.nextUrl.origin,
      })

      return new NextResponse(html, {
        headers: {
          'Content-Type': 'application/msword; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.doc"`,
        },
      })
    }

    const buffer = await renderPdfWithFallback(pdfData)
    const pdfBytes = new Uint8Array(buffer)

    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}.pdf"`,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    )
  }
}
