import type { MSAItem, MSADocumentProps } from '@/lib/site-docs/pdf-types'
import type { ActionStatus, DocumentType, GeneratedContent, SiteActionUpdate, SiteDocument, StructuredFieldValue, StructuredTableValue } from '@/lib/site-docs/types'
import { buildSiteDocSignUrl } from '@/lib/site-docs/sign-links'
import { getDocumentStandardProfile } from '@/lib/site-docs/standards'

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
  'site-instruction-issue': 'Site Instruction — Issue',
  'site-instruction-acknowledge': 'Site Instruction — Acknowledge',
}

function formatDisplayDate(date: string | null | undefined): string {
  if (!date) return new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'long', year: 'numeric' })
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString('en-AU', { day: '2-digit', month: 'long', year: 'numeric' })
}

function toStatus(value: string | null | undefined): 'open' | 'closed' | 'critical' | 'in-progress' | 'council-response-provided' {
  if (!value) return 'open'
  const normalized = value.toLowerCase()
  if (normalized === 'closed') return 'closed'
  if (normalized === 'critical') return 'critical'
  if (normalized === 'in-progress' || normalized === 'in progress') return 'in-progress'
  if (normalized === 'council-response-provided' || normalized === 'council response provided') return 'council-response-provided'
  return 'open'
}

function formatActionStatus(value: ActionStatus | string): string {
  if (value === 'in-progress') return 'In Progress'
  if (value === 'council-response-provided') return 'Council Response Provided'
  if (value === 'closed') return 'Closed'
  return 'Open'
}

function formatLatestUpdate(item: { latest_update?: SiteActionUpdate | null }): string {
  const update = item.latest_update
  if (!update) return '—'
  const parsed = update.created_at ? new Date(update.created_at) : null
  const dateText = parsed && !Number.isNaN(parsed.getTime())
    ? parsed.toLocaleString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : update.created_at ?? ''
  const byline = [update.updated_by_name, update.updated_by_organisation].filter(Boolean).join(', ')
  return `${dateText}${byline ? `, ${byline}` : ''}: “${update.comment ?? ''}”`
}

function paragraphsFromContent(content: string): MSAItem[] {
  return content
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((text) => ({ type: 'paragraph', text }) as const)
}

function toDisplayValue(value: string | null | undefined, fallback = '—'): string {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : fallback
}

export function mapSiteDocToMSA(
  document: Pick<SiteDocument, 'id' | 'title' | 'document_type' | 'status' | 'reference_number' | 'revision'>,
  generatedContent: GeneratedContent,
  companyName: string | null,
  companyLogoUrl?: string | null,
  origin?: string
): MSADocumentProps {
  const metadata = generatedContent.metadata
  const standardProfile = getDocumentStandardProfile(document.document_type)

  const detailFields = [
    { label: 'Client', value: metadata.client },
    { label: 'Location', value: metadata.location },
    { label: 'Time', value: metadata.time },
    { label: 'Meeting Type', value: metadata.meeting_type },
    { label: 'Prepared By', value: metadata.prepared_by },
    { label: 'Organisation', value: metadata.organization },
    { label: 'Next Meeting', value: metadata.next_meeting ? formatDisplayDate(metadata.next_meeting) : null },
    { label: 'Distribution', value: metadata.distribution },
  ].filter((field) => field.value && field.value.trim().length > 0)

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

  if (detailFields.length > 0) {
    sections.unshift({
      title: document.document_type === 'meeting-minutes' ? 'Meeting Details' : 'Document Details',
      items: [
        {
          type: 'fields',
          data: detailFields.map((field) => ({
            label: field.label,
            value: toDisplayValue(field.value),
          })),
        },
      ],
    })
  }

  const attendeesSection = generatedContent.attendees?.length
    ? {
        title: 'Attendees',
        items: [
          {
            type: 'table' as const,
            columns: [
              { header: 'Name', weight: 2 },
              { header: 'Organisation', weight: 2 },
              { header: 'Role', weight: 2 },
              { header: 'Present', weight: 1 },
            ],
            rows: generatedContent.attendees.map((attendee) => [
              toDisplayValue(attendee.name),
              toDisplayValue(attendee.organization),
              toDisplayValue(attendee.role),
              attendee.present ? 'Yes' : 'No',
            ]),
          },
        ],
      }
    : null

  // Meeting minutes lead with attendees so they appear at the top of the document
  if (attendeesSection && document.document_type === 'meeting-minutes') {
    sections.unshift(attendeesSection)
  }

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
            { header: 'Latest Update', weight: 2 },
            { header: 'Status', weight: 1 },
          ],
          rows: generatedContent.actionItems.map((item) => ({
            cells: [
                String(item.number ?? ''),
                toDisplayValue(item.description, ''),
                toDisplayValue(item.responsible),
              formatDisplayDate(item.due_date),
              formatLatestUpdate(item),
              formatActionStatus(item.status),
            ],
            status: toStatus(item.status),
          })),
        },
      ],
    })
  }

  if (generatedContent.standards_basis?.length) {
    sections.push({
      title: 'Standards & Requirements Basis',
      items: generatedContent.standards_basis.map((item) => ({ type: 'paragraph' as const, text: `• ${item}` })),
    })
  }

  if (generatedContent.document_specific) {
    for (const field of standardProfile.specificFields) {
      const value = generatedContent.document_specific[field.key]
      if (!value) continue

      if (typeof value === 'string') {
        sections.push({
          title: field.label,
          items: paragraphsFromContent(value),
        })
        continue
      }

      if (Array.isArray(value)) {
        const isFields = value.every((item) => typeof item === 'object' && item !== null && 'label' in item && 'value' in item)
        if (isFields) {
          sections.push({
            title: field.label,
            items: [{ type: 'fields', data: (value as StructuredFieldValue[]).map((item) => ({ label: item.label, value: item.value })) }],
          })
        } else {
          sections.push({
            title: field.label,
            items: (value as string[]).map((item) => ({ type: 'paragraph' as const, text: `• ${item}` })),
          })
        }
        continue
      }

      const tableValue = value as StructuredTableValue
      sections.push({
        title: field.label,
        items: [{
          type: 'table',
          columns: (tableValue.columns || []).map((column) => ({ header: column, weight: 1 })),
          rows: tableValue.rows || [],
        }],
      })
    }
  }

  if (attendeesSection && document.document_type !== 'meeting-minutes') {
    sections.push(attendeesSection)
  }

  if (generatedContent.signatories?.length) {
    sections.push({
      title: 'Sign-Off',
      items: [
        {
          type: 'signoff_table',
          columns: [
            { header: 'Signatory', weight: 2 },
            { header: 'Organisation', weight: 2 },
            { header: 'Signature', weight: 1.6 },
            { header: 'Signature Date', weight: 1.4 },
            { header: 'Status', weight: 1 },
          ],
          rows: generatedContent.signatories.map((signatory) => ({
            name: toDisplayValue(signatory.name),
            organization: toDisplayValue(signatory.organization),
            signatureDate: formatDisplayDate(signatory.signature_date),
            signatureData: signatory.signature_data ?? null,
            signUrl: signatory.signature_date ? null : buildSiteDocSignUrl(document.id, signatory.id, origin),
            status: signatory.signature_date ? 'Signed' : 'Pending',
          })),
        },
        ...(document.document_type === 'meeting-minutes'
          ? [{
              type: 'warning' as const,
              text: 'If no objection or requested amendment is raised within 48 hours of issue, these minutes will be taken as accepted.',
            }]
          : []),
      ],
    })
  }

  const resolvedCompanyName = companyName ?? metadata.organization ?? 'Buildstate'

  return {
    documentType: DOC_TYPE_LABELS[document.document_type] ?? document.document_type,
    documentNo: metadata.reference ?? document.reference_number ?? `DOC-${document.id.slice(0, 8).toUpperCase()}`,
    date: formatDisplayDate(metadata.date),
    revision: document.revision || 'Rev A',
    title: metadata.document_title ?? document.title,
    subtitle: metadata.project_name ?? undefined,
    project: metadata.project_name ?? 'General Document',
    client: metadata.client ?? resolvedCompanyName,
    preparedBy: metadata.prepared_by ?? resolvedCompanyName,
    companyName: resolvedCompanyName,
    companyLogoUrl: companyLogoUrl ?? null,
    sections,
  }
}
