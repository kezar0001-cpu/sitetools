import type { MSAItem, MSADocumentProps } from '@/lib/site-docs/pdf-types'
import type { DocumentStatus, DocumentType, GeneratedContent, SiteDocument } from '@/lib/site-docs/types'

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  'meeting-minutes': 'Meeting Minutes',
  'incident-report': 'Incident Report',
  'corrective-action': 'Corrective Action Report',
  'safety-report': 'Safety Report',
  rfi: 'Request for Information',
  'inspection-checklist': 'Inspection Checklist',
  'toolbox-talk': 'Toolbox Talk Record',
  variation: 'Variation / Change Order',
  ncr: 'Non-Conformance Report',
  'site-instruction': 'Site Instruction',
}

function formatDisplayDate(date: string | null | undefined): string {
  if (!date) return new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'long', year: 'numeric' })
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString('en-AU', { day: '2-digit', month: 'long', year: 'numeric' })
}

function statusToRevision(status: DocumentStatus): string {
  if (status === 'finalised') return 'Rev C'
  if (status === 'shared') return 'Rev B'
  return 'Rev A'
}

function toStatus(value: string | null | undefined): 'open' | 'closed' | 'critical' {
  if (!value) return 'open'
  const normalized = value.toLowerCase()
  if (normalized === 'closed') return 'closed'
  if (normalized === 'critical') return 'critical'
  return 'open'
}

function paragraphsFromContent(content: string): MSAItem[] {
  return content
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((text) => ({ type: 'paragraph', text }) as const)
}

export function mapSiteDocToMSA(
  document: Pick<SiteDocument, 'id' | 'title' | 'document_type' | 'status' | 'reference_number'>,
  generatedContent: GeneratedContent,
  companyName: string | null
): MSADocumentProps {
  const metadata = generatedContent.metadata

  const sections = (generatedContent.sections ?? [])
    .sort((a, b) => a.order - b.order)
    .map((section) => {
      const items: MSAItem[] = [
        ...paragraphsFromContent(section.content ?? ''),
      ]

      if (section.status) {
        items.push({
          type: 'status_table',
          columns: [
            { header: 'Item', weight: 3 },
            { header: 'Status', weight: 1 },
          ],
          rows: [
            {
              cells: [section.title, section.status],
              status: toStatus(section.status),
            },
          ],
        })
      }

      return {
        title: section.title,
        items,
      }
    })

  if (generatedContent.actionItems?.length) {
    sections.push({
      title: 'Action Register',
      items: [
        {
          type: 'status_table',
          columns: [
            { header: '#', weight: 0.6 },
            { header: 'Action', weight: 3 },
            { header: 'Responsible', weight: 1.4 },
            { header: 'Due Date', weight: 1 },
            { header: 'Status', weight: 1 },
          ],
          rows: generatedContent.actionItems.map((item) => ({
            cells: [
              String(item.number ?? ''),
              item.description ?? '',
              item.responsible ?? '—',
              formatDisplayDate(item.due_date),
              item.status,
            ],
            status: toStatus(item.status),
          })),
        },
      ],
    })
  }

  if (generatedContent.attendees?.length) {
    sections.push({
      title: 'Attendees',
      items: [
        {
          type: 'table',
          columns: [
            { header: 'Name', weight: 2 },
            { header: 'Organisation', weight: 2 },
            { header: 'Role', weight: 2 },
            { header: 'Present', weight: 1 },
          ],
          rows: generatedContent.attendees.map((attendee) => [
            attendee.name,
            attendee.organization ?? '—',
            attendee.role ?? '—',
            attendee.present ? 'Yes' : 'No',
          ]),
        },
      ],
    })
  }

  if (generatedContent.signatories?.length) {
    sections.push({
      title: 'Sign-Off',
      items: [
        {
          type: 'fields',
          data: generatedContent.signatories.flatMap((signatory) => [
            { label: 'Signatory', value: signatory.name },
            { label: 'Organisation', value: signatory.organization ?? '—' },
            { label: 'Signature Date', value: formatDisplayDate(signatory.signature_date) },
            { label: 'Status', value: signatory.signature_date ? 'Signed' : 'Pending' },
          ]),
        },
      ],
    })
  }

  return {
    documentType: DOC_TYPE_LABELS[document.document_type] ?? document.document_type,
    documentNo: document.reference_number ?? metadata.reference ?? `DOC-${document.id.slice(0, 8).toUpperCase()}`,
    date: formatDisplayDate(metadata.date),
    revision: statusToRevision(document.status),
    title: document.title,
    subtitle: metadata.document_title,
    project: metadata.project_name ?? 'Unspecified Project',
    client: companyName ?? metadata.organization ?? 'MSA Civil & Communications Pty Ltd',
    preparedBy: metadata.prepared_by ?? 'SiteDocs',
    sections,
  }
}
