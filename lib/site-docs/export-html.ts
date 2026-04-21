import type { GeneratedContent, SiteDocument } from '@/lib/site-docs/types'
import { buildSiteDocSignUrl } from '@/lib/site-docs/sign-links'
import { getDocumentStandardProfile } from '@/lib/site-docs/standards'

function escapeHtml(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatDisplayDate(date: string | null | undefined): string {
  if (!date) return '—'
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return escapeHtml(date)
  return parsed.toLocaleDateString('en-AU', { day: '2-digit', month: 'long', year: 'numeric' })
}

function nl2br(value: string | null | undefined): string {
  return escapeHtml(value).replace(/\n/g, '<br/>')
}

export function generateSiteDocHtml(params: {
  document: Pick<SiteDocument, 'id' | 'title' | 'document_type' | 'reference_number'>
  content: GeneratedContent
  companyName: string | null
  origin?: string
}): string {
  const { document, content, companyName, origin } = params
  const metadata = content.metadata
  const standardProfile = getDocumentStandardProfile(document.document_type)
  const displayTitle = metadata.document_title ?? document.title
  const resolvedCompany = companyName ?? metadata.organization ?? 'Buildstate'
  const acceptanceClause = document.document_type === 'meeting-minutes'
    ? 'If no objection or requested amendment is raised within 48 hours of issue, these minutes will be taken as accepted.'
    : ''

  const attendeesRows = (content.attendees ?? [])
    .map(
      (attendee) => `
        <tr>
          <td>${escapeHtml(attendee.name)}</td>
          <td>${escapeHtml(attendee.organization ?? '—')}</td>
          <td>${escapeHtml(attendee.role ?? '—')}</td>
          <td>${attendee.present ? 'Yes' : 'No'}</td>
        </tr>`
    )
    .join('')

  const actionRows = (content.actionItems ?? [])
    .map(
      (item) => `
        <tr>
          <td>${item.number ?? ''}</td>
          <td>${escapeHtml(item.description)}</td>
          <td>${escapeHtml(item.responsible ?? '—')}</td>
          <td>${formatDisplayDate(item.due_date)}</td>
          <td>${escapeHtml(item.status)}</td>
        </tr>`
    )
    .join('')

  const signatoryRows = (content.signatories ?? [])
    .map((sig) => {
      const signatureMarkup = sig.signature_data
        ? `<img src="${sig.signature_data}" alt="Signature" class="signature-image" />`
        : `<a href="${buildSiteDocSignUrl(document.id, sig.id, origin)}" class="sign-link">Click to sign</a>`

      return `
        <tr>
          <td>${escapeHtml(sig.name)}</td>
          <td>${escapeHtml(sig.organization ?? '—')}</td>
          <td>${signatureMarkup}</td>
          <td>${formatDisplayDate(sig.signature_date)}</td>
          <td>${sig.signature_date ? 'Signed' : 'Pending'}</td>
        </tr>`
    })
    .join('')

  const sectionBlocks = [...(content.sections ?? [])]
    .sort((a, b) => a.order - b.order)
    .map(
      (section) => `
        <section class="section">
          <div class="section-title">${escapeHtml(section.title)}</div>
          <div class="section-body">${nl2br(section.content)}</div>
          ${section.status ? `<div class="section-status">Status: ${escapeHtml(section.status)}</div>` : ''}
        </section>`
    )
    .join('')

  const standardsBlock = (content.standards_basis ?? []).length
    ? `<section class="section"><div class="section-title">Standards & Requirements Basis</div><div class="section-body"><ul>${(content.standards_basis ?? []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div></section>`
    : ''

  const documentSpecificBlocks = standardProfile.specificFields.map((field) => {
    const value = content.document_specific?.[field.key]
    if (!value) return ''

    if (typeof value === 'string') {
      return `<section class="section"><div class="section-title">${escapeHtml(field.label)}</div><div class="section-body">${nl2br(value)}</div></section>`
    }

    if (Array.isArray(value)) {
      const isFields = value.every((item) => typeof item === 'object' && item !== null && 'label' in item && 'value' in item)
      if (isFields) {
        return `<section class="section"><div class="section-title">${escapeHtml(field.label)}</div><div class="section-body"><div class="meta">${value.map((item) => `<div class="meta-card"><strong>${escapeHtml(String(item.label))}</strong>${escapeHtml(String(item.value))}</div>`).join('')}</div></div></section>`
      }
      return `<section class="section"><div class="section-title">${escapeHtml(field.label)}</div><div class="section-body"><ul>${value.map((item) => `<li>${escapeHtml(String(item))}</li>`).join('')}</ul></div></section>`
    }

    const columns = Array.isArray(value.columns) ? value.columns : []
    const rows = Array.isArray(value.rows) ? value.rows : []
    return `<section class="section"><div class="section-title">${escapeHtml(field.label)}</div><div class="section-body"><table><thead><tr>${columns.map((column) => `<th>${escapeHtml(String(column))}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${(Array.isArray(row) ? row : []).map((cell) => `<td>${escapeHtml(String(cell ?? ''))}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`
  }).join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(displayTitle)}</title>
  <style>
    @page { size: A4; margin: 18mm; }
    body { font-family: Arial, sans-serif; color: #1f2937; margin: 0; font-size: 12px; line-height: 1.5; }
    .page { max-width: 780px; margin: 0 auto; }
    .topbar { border-bottom: 2px solid #e87722; padding-bottom: 10px; margin-bottom: 16px; }
    .eyebrow { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
    h1 { font-size: 24px; margin: 6px 0 4px; color: #111827; }
    .subtle { color: #64748b; font-size: 12px; }
    .meta { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 8px; margin: 16px 0; }
    .meta-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; }
    .meta-card strong { display: block; font-size: 10px; color: #475569; text-transform: uppercase; margin-bottom: 4px; }
    .section { margin: 18px 0; }
    .section-title { background: #1a1a2e; color: #fff; padding: 8px 10px; border-left: 4px solid #e87722; font-weight: 700; text-transform: uppercase; }
    .section-body { border: 1px solid #cbd5e1; border-top: 0; padding: 12px; }
    .section-status { margin-top: 8px; color: #475569; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background: #1a1a2e; color: #fff; text-align: left; font-size: 11px; padding: 8px; }
    td { border: 1px solid #cbd5e1; padding: 8px; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fafc; }
    .signature-image { max-width: 140px; max-height: 48px; display: block; }
    .signature-line { display: inline-block; width: 140px; border-bottom: 1px solid #94a3b8; min-height: 20px; }
    .sign-link { color: #1d4ed8; text-decoration: underline; font-weight: 600; }
    .acceptance { margin-top: 12px; background: #f8fafc; border-left: 4px solid #e87722; padding: 10px 12px; color: #475569; font-size: 11px; }
    .footer-note { margin-top: 24px; color: #94a3b8; font-size: 10px; text-align: right; }
  </style>
</head>
<body>
  <div class="page">
    <div class="topbar">
      <div class="eyebrow">${escapeHtml(document.document_type.replace(/-/g, ' '))}</div>
      <h1>${escapeHtml(displayTitle)}</h1>
      <div class="subtle">${escapeHtml(resolvedCompany)} · Ref ${escapeHtml(document.reference_number ?? metadata.reference ?? `DOC-${document.id.slice(0, 8).toUpperCase()}`)}</div>
    </div>

    <div class="meta">
      <div class="meta-card"><strong>Project</strong>${escapeHtml(metadata.project_name ?? 'General Document')}</div>
      <div class="meta-card"><strong>Date</strong>${formatDisplayDate(metadata.date)}</div>
      <div class="meta-card"><strong>Client</strong>${escapeHtml(metadata.client ?? resolvedCompany)}</div>
      <div class="meta-card"><strong>Location</strong>${escapeHtml(metadata.location ?? '—')}</div>
      <div class="meta-card"><strong>Prepared By</strong>${escapeHtml(metadata.prepared_by ?? resolvedCompany)}</div>
    </div>

    ${attendeesRows ? `<section class="section"><div class="section-title">Attendees</div><div class="section-body"><table><thead><tr><th>Name</th><th>Organisation</th><th>Role</th><th>Present</th></tr></thead><tbody>${attendeesRows}</tbody></table></div></section>` : ''}

    ${sectionBlocks}

    ${standardsBlock}

    ${documentSpecificBlocks}

    ${actionRows ? `<section class="section"><div class="section-title">Action Register</div><div class="section-body"><table><thead><tr><th>#</th><th>Action</th><th>Responsible</th><th>Due Date</th><th>Status</th></tr></thead><tbody>${actionRows}</tbody></table></div></section>` : ''}

    ${signatoryRows ? `<section class="section"><div class="section-title">Confirmation & Sign-off</div><div class="section-body"><table><thead><tr><th>Signatory</th><th>Organisation</th><th>Signature</th><th>Date</th><th>Status</th></tr></thead><tbody>${signatoryRows}</tbody></table>${acceptanceClause ? `<div class="acceptance">${acceptanceClause}</div>` : ''}</div></section>` : ''}

    <div class="footer-note">Generated via Buildstate</div>
  </div>
</body>
</html>`
}