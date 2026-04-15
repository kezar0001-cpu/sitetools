import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { jsPDF } from 'jspdf'
import { mapSiteDocToMSA } from '@/lib/site-docs/pdf'
import type { GeneratedContent, SiteDocument } from '@/lib/site-docs/types'

export const runtime = 'nodejs'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_').slice(0, 60)
}

function buildPdfBytes(data: ReturnType<typeof mapSiteDocToMSA>): Uint8Array {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 48
  const topStart = 52
  const lineHeight = 16
  const maxWidth = doc.internal.pageSize.getWidth() - marginX * 2

  let y = topStart

  const ensureSpace = (needed = lineHeight * 2) => {
    if (y + needed <= pageHeight - 48) return
    doc.addPage()
    y = topStart
  }

  const writeLine = (text: string, opts?: { size?: number; bold?: boolean; spacing?: number }) => {
    ensureSpace(opts?.spacing ?? lineHeight)
    doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal')
    doc.setFontSize(opts?.size ?? 10)
    const lines = doc.splitTextToSize(text || '—', maxWidth)
    doc.text(lines, marginX, y)
    y += (opts?.spacing ?? lineHeight) + (lines.length - 1) * (opts?.size ?? 10)
  }

  writeLine(data.title, { size: 18, bold: true, spacing: 22 })
  writeLine(data.subtitle || data.documentType, { size: 11, spacing: 18 })
  writeLine(`Document No: ${data.documentNo}`, { bold: true })
  writeLine(`Revision: ${data.revision}`)
  writeLine(`Date: ${data.date}`)
  writeLine(`Project: ${data.project}`)
  writeLine(`Client: ${data.client}`)
  writeLine(`Prepared By: ${data.preparedBy}`)
  y += 8

  for (const section of data.sections) {
    writeLine(section.title, { size: 12, bold: true, spacing: 18 })
    for (const item of section.items) {
      if (item.type === 'paragraph') {
        writeLine(item.text, { size: 10, spacing: 14 })
        continue
      }

      if (item.type === 'table') {
        for (const row of item.rows) {
          writeLine(`• ${row.join(' | ')}`, { size: 9, spacing: 13 })
        }
        continue
      }

      if (item.type === 'status_table') {
        for (const row of item.rows) {
          writeLine(`• ${row.cells.join(' | ')} [${row.status}]`, { size: 9, spacing: 13 })
        }
      }
    }
    y += 8
  }

  return new Uint8Array(doc.output('arraybuffer'))
}

export async function GET(
  req: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
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

    const pdfData = mapSiteDocToMSA(
      {
        id: typedDocument.id,
        title: typedDocument.title,
        document_type: typedDocument.document_type,
        status: typedDocument.status,
        reference_number: typedDocument.reference_number,
      },
      typedDocument.generated_content,
      typedDocument.company?.name ?? null,
      typedDocument.company?.logo_url ?? null
    )

    const pdfBytes = buildPdfBytes(pdfData)
    const filename = sanitizeFilename(pdfData.documentNo || typedDocument.title || 'site-document')

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
