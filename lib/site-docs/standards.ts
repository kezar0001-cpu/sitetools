import type { DocumentTemplate, DocumentType } from '@/lib/site-docs/types'

export type StructuredFieldKind = 'text' | 'textarea' | 'list' | 'fields' | 'table'

export interface MetadataFieldConfig {
  key: string
  label: string
  type?: 'text' | 'date'
}

export interface SpecificFieldConfig {
  key: string
  label: string
  kind: StructuredFieldKind
  helpText?: string
  columns?: string[]
}

export interface DocumentStandardProfile {
  standardsBasis: string[]
  purpose: string
  metadataFields: MetadataFieldConfig[]
  specificFields: SpecificFieldConfig[]
}

export const DOCUMENT_STANDARD_PROFILES: Record<DocumentType, DocumentStandardProfile> = {
  'meeting-minutes': {
    standardsBasis: [],
    purpose: 'Record attendees, matters discussed, decisions, responsibilities, and follow-up actions in an auditable format.',
    metadataFields: [
      { key: 'time', label: 'Meeting Time' },
      { key: 'meeting_type', label: 'Meeting Type' },
      { key: 'next_meeting', label: 'Next Meeting Date', type: 'date' },
      { key: 'distribution', label: 'Distribution' },
    ],
    specificFields: [],
  },
  'incident-report': {
    standardsBasis: [
      'Safe Work Australia and WHS Act / Regulations concepts for incident and notifiable incident reporting',
      'Australian construction incident investigation practice requiring incident facts, immediate response, and corrective actions',
      'Client and council contractor reporting expectations for chronology, witnesses, evidence, and regulatory notification status',
    ],
    purpose: 'Capture the incident facts, people involved, immediate controls, investigation findings, evidence, and notification obligations.',
    metadataFields: [],
    specificFields: [
      { key: 'incident_snapshot', label: 'Incident Snapshot', kind: 'fields', helpText: 'Classification, severity, exact time, injury outcome, and notifiable status.' },
      { key: 'people_involved', label: 'People Involved', kind: 'table', columns: ['Name', 'Employer', 'Role', 'Involvement / Injury'] },
      { key: 'witness_register', label: 'Witness Register', kind: 'table', columns: ['Name', 'Organisation', 'Contact', 'Statement Summary'] },
      { key: 'evidence_register', label: 'Evidence Register', kind: 'list' },
      { key: 'regulatory_notification', label: 'Regulatory Notification', kind: 'fields', helpText: 'Who was notified, when, reference number, and whether scene preservation applies.' },
    ],
  },
  'corrective-action': {
    standardsBasis: [
      'Corrective action management commonly used under ISO 9001, ISO 45001, and contractor QA systems',
      'Australian construction close-out practice linking corrective actions to root cause and verification of effectiveness',
      'Council and principal contractor requirements for accountable ownership, due dates, and evidence of close-out',
    ],
    purpose: 'Track non-compliance or failures through root cause analysis, correction, corrective action, and verification.',
    metadataFields: [],
    specificFields: [
      { key: 'car_overview', label: 'CAR Overview', kind: 'fields', helpText: 'Raised date, linked NCR, category, priority, and target close date.' },
      { key: 'root_cause_summary', label: 'Root Cause Summary', kind: 'textarea' },
      { key: 'correction_vs_corrective', label: 'Correction vs Corrective Action', kind: 'table', columns: ['Type', 'Description', 'Owner', 'Due Date', 'Status'] },
      { key: 'verification_evidence', label: 'Verification Evidence', kind: 'list' },
    ],
  },
  'safety-report': {
    standardsBasis: [
      'WHS management system reporting practice aligned with ISO 45001-style monitoring and review',
      'Principal contractor and council reporting expectations for hazards, inspections, incidents, and outstanding actions',
      'Australian construction reporting norms for site safety performance and corrective action tracking',
    ],
    purpose: 'Summarise safety performance, hazards, inspections, training, incidents, and open actions over the reporting period.',
    metadataFields: [],
    specificFields: [
      { key: 'safety_statistics', label: 'Safety Statistics', kind: 'fields', helpText: 'Hours worked, headcount, incidents, near misses, LTIs, MTIs, and first aid events.' },
      { key: 'hazard_register', label: 'Hazard Register', kind: 'table', columns: ['Hazard', 'Risk Rating', 'Control Measures', 'Owner', 'Status'] },
      { key: 'inspection_summary', label: 'Inspection Summary', kind: 'table', columns: ['Inspection / Audit', 'By', 'Date', 'Outcome'] },
      { key: 'training_log', label: 'Training Log', kind: 'table', columns: ['Training / Briefing', 'Audience', 'Date', 'Outcome'] },
    ],
  },
  rfi: {
    standardsBasis: [
      'Construction contract administration practice for formal requests for clarification',
      'Australian project controls expectation that RFIs identify references, question, proposed interpretation, and required response date',
      'Council and superintendent workflows where unresolved RFIs may affect time, cost, and constructability',
    ],
    purpose: 'Formally request clarification on drawings, specifications, scope conflicts, or missing information and track the response.',
    metadataFields: [],
    specificFields: [
      { key: 'rfi_register', label: 'RFI Register Fields', kind: 'fields', helpText: 'Submitted to, response required by, discipline, and impact flags.' },
      { key: 'reference_register', label: 'Reference Register', kind: 'table', columns: ['Type', 'Reference', 'Revision / Date', 'Notes'] },
      { key: 'questions_asked', label: 'Questions Asked', kind: 'list' },
      { key: 'response_tracking', label: 'Response Tracking', kind: 'fields', helpText: 'Response status, responder, date responded, and response summary.' },
    ],
  },
  'inspection-checklist': {
    standardsBasis: [
      'Construction QA, WHS, and ITP-style inspection record practice',
      'Australian site inspection expectations for pass / fail / N/A recording, defects, and hold point status',
      'Council and superintendent expectations that inspections identify area, criteria, outcome, rectification, and sign-off',
    ],
    purpose: 'Capture structured inspection criteria, outcomes, defects, hold points, and reinspection actions in a checklist format.',
    metadataFields: [],
    specificFields: [
      { key: 'inspection_overview', label: 'Inspection Overview', kind: 'fields', helpText: 'Inspection type, lot / area, weather, witness, hold point, and overall outcome.' },
      { key: 'checklist_results', label: 'Checklist Results', kind: 'table', columns: ['Item', 'Criteria', 'Result', 'Comments', 'Photo Ref'] },
      { key: 'defects_register', label: 'Defects Register', kind: 'table', columns: ['Location', 'Defect / Finding', 'Responsible Trade', 'Due Date', 'Status'] },
    ],
  },
  'toolbox-talk': {
    standardsBasis: [
      'WHS consultation and communication duties under Australian safety practice',
      'Principal contractor toolbox talk recordkeeping expectations for topic, hazards, controls, and attendee acknowledgement',
      'Construction induction and pre-start briefing norms requiring clear attendance and understanding records',
    ],
    purpose: 'Document the safety topic, key hazards, required controls, presenter details, and attendee acknowledgement.',
    metadataFields: [],
    specificFields: [
      { key: 'toolbox_overview', label: 'Toolbox Overview', kind: 'fields', helpText: 'Presenter, duration, work group, and why the talk was delivered.' },
      { key: 'hazards_discussed', label: 'Hazards Discussed', kind: 'list' },
      { key: 'controls_confirmed', label: 'Controls Confirmed', kind: 'list' },
      { key: 'worker_feedback', label: 'Worker Feedback / Questions', kind: 'list' },
    ],
  },
  variation: {
    standardsBasis: [
      'Construction contract administration practice for variations and change orders',
      'Australian project controls expectation that scope, reason, cost, time, and approval pathway are clearly documented',
      'Council and superintendent workflows requiring traceability to instruction, latent condition, design change, or client request',
    ],
    purpose: 'Record a change in scope, why it is required, its contractual basis, and the associated cost and time impacts.',
    metadataFields: [],
    specificFields: [
      { key: 'variation_summary', label: 'Variation Summary', kind: 'fields', helpText: 'Instruction source, category, contract clause, and status.' },
      { key: 'cost_breakdown', label: 'Cost Breakdown', kind: 'table', columns: ['Cost Item', 'Description', 'Amount', 'Notes'] },
      { key: 'time_impact_details', label: 'Time Impact Details', kind: 'fields', helpText: 'Days claimed, critical path impact, EOT status, and mitigation.' },
      { key: 'approval_path', label: 'Approval Path', kind: 'table', columns: ['Role', 'Name / Organisation', 'Decision', 'Date'] },
    ],
  },
  ncr: {
    standardsBasis: [
      'Construction quality management and ISO 9001-aligned non-conformance control',
      'Australian QA practice requiring identification, segregation, rectification, and verification of non-conforming work',
      'Council and client expectations for references to drawings, specifications, extent, disposition, and close-out evidence',
    ],
    purpose: 'Record a non-conformance, affected work, required rectification, disposition, and evidence of close-out.',
    metadataFields: [],
    specificFields: [
      { key: 'ncr_snapshot', label: 'NCR Snapshot', kind: 'fields', helpText: 'Severity, lot / area, trade responsible, and affected work status.' },
      { key: 'reference_register', label: 'Reference Register', kind: 'table', columns: ['Document Type', 'Reference', 'Revision', 'Requirement Not Met'] },
      { key: 'disposition_options', label: 'Disposition / Rectification Options', kind: 'table', columns: ['Option', 'Description', 'Approved By', 'Status'] },
      { key: 'closeout_evidence', label: 'Close-out Evidence', kind: 'list' },
    ],
  },
  'site-instruction-issue': {
    standardsBasis: [
      'Construction superintendent / client instruction practice under common Australian contract administration workflows',
      'Project document control expectation that instructions are explicit, dated, referenced, and acknowledged',
      'Council and consultant practice requiring contractor compliance deadlines and notice of cost / time implications',
    ],
    purpose: 'Issue a formal direction to the contractor with references, compliance requirements, and notice of possible impacts.',
    metadataFields: [],
    specificFields: [
      { key: 'instruction_register', label: 'Instruction Register Fields', kind: 'fields', helpText: 'Issued by, priority, response required by, and acknowledgement status.' },
      { key: 'reference_register', label: 'Reference Register', kind: 'table', columns: ['Type', 'Reference', 'Revision / Date', 'Purpose'] },
      { key: 'contractor_actions', label: 'Contractor Actions', kind: 'table', columns: ['Required Action', 'Owner', 'Due Date', 'Status'] },
      { key: 'claim_notice', label: 'Claim / Notice Requirements', kind: 'textarea' },
    ],
  },
  'site-instruction-acknowledge': {
    standardsBasis: [
      'Contractor recordkeeping practice for site instructions received from client, engineer, or superintendent',
      'Australian construction compliance expectation that contractors formally acknowledge receipt and understanding',
      'Contract administration practice requiring contractors to assess time/cost implications and provide claim notice within specified periods',
    ],
    purpose: 'Acknowledge receipt of a site instruction, document understanding, outline compliance approach, and record any time/cost impact assessment.',
    metadataFields: [],
    specificFields: [
      { key: 'original_instruction', label: 'Original Instruction Details', kind: 'fields', helpText: 'Received from, original SI reference, date received, and priority.' },
      { key: 'compliance_plan', label: 'Compliance Plan', kind: 'table', columns: ['Step', 'Description', 'Owner', 'Due Date', 'Status'] },
      { key: 'claim_assessment', label: 'Time/Cost Claim Assessment', kind: 'fields', helpText: 'Impact assessment, notice required, notice date, and claim status.' },
      { key: 'compliance_evidence', label: 'Compliance Evidence', kind: 'list' },
    ],
  },
}

export function getDocumentStandardProfile(type: DocumentType): DocumentStandardProfile {
  return DOCUMENT_STANDARD_PROFILES[type]
}

function buildDocumentSpecificPromptSchema(type: DocumentType): string {
  const profile = getDocumentStandardProfile(type)

  const fields = profile.specificFields.map((field) => {
    if (field.kind === 'table') {
      return `    "${field.key}": { "columns": ${JSON.stringify(field.columns ?? [])}, "rows": [["cell 1", "cell 2"]] }`
    }
    if (field.kind === 'fields') {
      return `    "${field.key}": [{ "label": "Field label", "value": "Field value" }]`
    }
    if (field.kind === 'list') {
      return `    "${field.key}": ["item 1", "item 2"]`
    }
    return `    "${field.key}": "structured narrative text"`
  })

  return fields.join(',\n')
}

function buildDocumentSpecificInstructions(type: DocumentType): string {
  const profile = getDocumentStandardProfile(type)
  return profile.specificFields
    .map((field) => {
      const suffix = field.helpText ? ` — ${field.helpText}` : ''
      return `- ${field.label} (${field.key}, ${field.kind})${suffix}`
    })
    .join('\n')
}

export function buildTemplatePrompt(template: DocumentTemplate, summary: string): string {
  const profile = getDocumentStandardProfile(template.id)
  const metadataFieldLines = profile.metadataFields.length
    ? profile.metadataFields.map((field) => `- ${field.label} (${field.key})`).join('\n')
    : '- No additional metadata fields beyond the common document metadata.'

  return `You are preparing a ${template.name} for an Australian construction / council / contractor environment.

Purpose:
${profile.purpose}

Standards / requirements basis:
${profile.standardsBasis.map((item) => `- ${item}`).join('\n')}

Return ONLY valid JSON with this structure:
{
  "metadata": {
    "document_title": "specific professional title",
    "project_name": "project or subject or null",
    "client": "client / principal / council or null",
    "location": "site or affected location or null",
    "date": "YYYY-MM-DD or null",
    "reference": "document number or null",
    "prepared_by": "author / issuer / reporter or null",
    "organization": "company / contractor / consultant / council or null",
    "meeting_type": "string or null",
    "time": "string or null",
    "next_meeting": "YYYY-MM-DD or null",
    "distribution": "string or null"
  },
  "sections": [
    { "id": "1", "title": "Section title", "content": "Professional detailed content.", "order": 1, "status": "open|closed|in-progress" }
  ],
  "actionItems": [
    { "id": "1", "number": 1, "description": "Clear action", "responsible": "Name — Organisation", "due_date": "YYYY-MM-DD or null", "status": "open|in-progress|closed" }
  ],
  "attendees": [
    { "id": "1", "name": "Full Name", "organization": "Company", "role": "Role", "present": true }
  ],
  "signatories": [
    { "id": "1", "name": "Name", "organization": "Organisation", "signature_date": null }
  ],
  "standards_basis": ["standard or requirement source summary"],
  "document_specific": {
${buildDocumentSpecificPromptSchema(template.id)}
  }
}

Common rules:
- Keep the JSON valid.
- Use null, empty arrays, or empty rows only where information genuinely is not available.
- Use professional Australian English.
- Do not force meeting-minutes language into non-meeting documents.
- Include only attendees when the document type naturally has attendees or attendance acknowledgement.
- Include only signatories that make sense for the document type.
- Ensure sections reflect normal industry structure for ${template.name}.

Additional metadata to extract where available:
${metadataFieldLines}

Document-specific structured fields to populate:
${buildDocumentSpecificInstructions(template.id)}

Default section expectations:
${template.default_sections.map((item) => `- ${item}`).join('\n')}

Source summary:
${summary}`
}