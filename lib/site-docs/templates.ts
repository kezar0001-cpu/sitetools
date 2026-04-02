/**
 * SiteDocs — Document Templates
 * Pre-defined templates with AI prompts for document generation
 */

import type { DocumentTemplate, DocumentType } from "./types";

// ── Meeting Minutes Template ──
const meetingMinutesTemplate: DocumentTemplate = {
    id: "meeting-minutes",
    name: "Meeting Minutes",
    description: "Professional meeting minutes with attendees, agenda items, action items, and sign-off",
    icon: "users",
    color: "blue",
    prompt_template: `Convert the following meeting summary into professional meeting minutes.

Structure the output as JSON with this exact structure:
{
  "metadata": {
    "document_title": "Meeting Minutes — [Project/Meeting Name]",
    "project_name": "extracted or null",
    "location": "extracted meeting location or null",
    "date": "YYYY-MM-DD format",
    "reference": "generated reference like MTG-001 or null",
    "prepared_by": "extracted minute taker",
    "organization": "extracted organization"
  },
  "attendees": [
    { "name": "Full Name", "organization": "Company", "role": "Role", "present": true }
  ],
  "sections": [
    { "id": "1", "title": "1. Matters from Previous Meeting", "content": "detailed content", "order": 1, "status": "open|closed|in-progress" }
  ],
  "actionItems": [
    { "id": "1", "number": 1, "description": "action description", "responsible": "Name — Org", "due_date": "YYYY-MM-DD or null", "status": "open|in-progress|closed" }
  ],
  "signatories": [
    { "name": "Name", "organization": "Org", "signature_date": null }
  ]
}

Extract and organize:
- Meeting date, time, location
- All attendees with their organizations and roles
- Agenda items discussed (numbered sections)
- Action items with responsible parties and due dates
- Status indicators (Open/Closed/In Progress) for each item
- Decisions made and agreements reached

Meeting Summary:
{{SUMMARY}}`,
    required_fields: [
        { name: "project_name", label: "Project Name", type: "text", placeholder: "Depena Reserve Carpark Upgrade" },
        { name: "location", label: "Meeting Location", type: "text", placeholder: "MSA Civil Site Office" },
        { name: "date", label: "Meeting Date", type: "date" },
    ],
    optional_fields: [
        { name: "reference", label: "Reference Number", type: "text", placeholder: "MSA-MM-002" },
        { name: "next_meeting", label: "Next Meeting Date", type: "date" },
        { name: "prepared_by", label: "Minutes By", type: "text" },
    ],
    default_sections: ["Matters from Previous Meeting", "Agenda Items", "Action Items", "Next Meeting"],
};

// ── Incident Report Template ──
const incidentReportTemplate: DocumentTemplate = {
    id: "incident-report",
    name: "Incident Report",
    description: "Comprehensive incident documentation with timeline, witnesses, and corrective actions",
    icon: "alert-triangle",
    color: "red",
    prompt_template: `Convert the following incident summary into a professional incident report.

Structure the output as JSON with this exact structure:
{
  "metadata": {
    "document_title": "Incident Report — [Brief Description]",
    "project_name": "extracted or null",
    "location": "exact incident location",
    "date": "YYYY-MM-DD",
    "reference": "generated incident reference like INC-001",
    "prepared_by": "reporter name",
    "organization": "reporting organization"
  },
  "sections": [
    { "id": "1", "title": "1. Incident Overview", "content": "What happened, severity, classification", "order": 1 },
    { "id": "2", "title": "2. Timeline of Events", "content": "chronological sequence with times", "order": 2 },
    { "id": "3", "title": "3. Immediate Actions Taken", "content: "response actions", "order": 3 },
    { "id": "4", "title": "4. Witnesses", "content: "witness information", "order": 4 },
    { "id": "5", "title": "5. Investigation Findings", "content: "root cause analysis", "order": 5 },
    { "id": "6", "title": "6. Corrective Actions", "content: "actions to prevent recurrence", "order": 6 }
  ],
  "actionItems": [
    { "id": "1", "number": 1, "description": "corrective action", "responsible": "Name — Org", "due_date": "YYYY-MM-DD", "status": "open" }
  ]
}

Extract and include:
- Exact date, time, and location of incident
- Incident classification (Injury, Near Miss, Property Damage, Environmental)
- Severity level
- Persons involved and witnesses
- Equipment/Property involved
- Immediate cause and root cause
- Photos/evidence references
- Regulatory notification requirements
- Corrective actions with responsible parties

Incident Summary:
{{SUMMARY}}`,
    required_fields: [
        { name: "incident_date", label: "Date of Incident", type: "date" },
        { name: "incident_time", label: "Time of Incident", type: "text", placeholder: "10:20am" },
        { name: "location", label: "Incident Location", type: "text" },
        { name: "severity", label: "Severity", type: "select", options: ["Low", "Medium", "High", "Critical"] },
    ],
    optional_fields: [
        { name: "incident_type", label: "Incident Type", type: "select", options: ["Injury", "Near Miss", "Property Damage", "Environmental", "Security", "Other"] },
        { name: "persons_involved", label: "Persons Involved", type: "list" },
        { name: "witnesses", label: "Witnesses", type: "list" },
        { name: "equipment_involved", label: "Equipment Involved", type: "text" },
    ],
    default_sections: ["Incident Overview", "Timeline", "Immediate Actions", "Investigation", "Corrective Actions"],
};

// ── Corrective Action Report Template ──
const correctiveActionTemplate: DocumentTemplate = {
    id: "corrective-action",
    name: "Corrective Action Report",
    description: "CAR for non-conformances with root cause analysis and preventive actions",
    icon: "clipboard-check",
    color: "amber",
    prompt_template: `Convert the following corrective action summary into a professional CAR.

Structure the output as JSON with this exact structure:
{
  "metadata": {
    "document_title": "Corrective Action Report",
    "project_name": "extracted or null",
    "location": "location",
    "date": "YYYY-MM-DD",
    "reference": "CAR reference number",
    "prepared_by": "preparer name",
    "organization": "organization"
  },
  "sections": [
    { "id": "1", "title": "1. Non-Conformance Description", "content": "what was found", "order": 1 },
    { "id": "2", "title": "2. Reference Documents", "content": "related docs, standards, specs", "order": 2 },
    { "id": "3", "title": "3. Root Cause Analysis", "content": "5 whys or fishbone analysis", "order": 3 },
    { "id": "4", "title": "4. Immediate Correction", "content": "actions already taken", "order": 4 },
    { "id": "5", "title": "5. Corrective Actions", "content": "long-term fixes", "order": 5 },
    { "id": "6", "title": "6. Preventive Actions", "content: "measures to prevent recurrence", "order": 6 },
    { "id": "7", "title": "7. Verification & Close-out", "content: "how effectiveness will be verified", "order": 7 }
  ],
  "actionItems": [
    { "id": "1", "number": 1, "description": "action", "responsible": "Name", "due_date": "YYYY-MM-DD", "status": "open" }
  ]
}

Extract and structure:
- CAR reference number (link to NCR if applicable)
- Non-conformance details
- Standard/specification violated
- Root cause (systematic analysis)
- Immediate correction (short-term fix)
- Corrective actions (long-term solutions)
- Preventive actions (system-wide improvements)
- Responsible parties and due dates
- Verification method and evidence required

CAR Summary:
{{SUMMARY}}`,
    required_fields: [
        { name: "car_reference", label: "CAR Reference", type: "text", placeholder: "MSA-CAR-001" },
        { name: "ncr_reference", label: "NCR Reference (if applicable)", type: "text" },
        { name: "date_raised", label: "Date Raised", type: "date" },
        { name: "date_closed", label: "Target Close Date", type: "date" },
    ],
    optional_fields: [
        { name: "non_conformance", label: "Non-Conformance Type", type: "select", options: ["Quality", "Safety", "Environmental", "Program", "Other"] },
        { name: "standard_ref", label: "Standard/Spec Reference", type: "text" },
        { name: "originator", label: "Raised By", type: "text" },
    ],
    default_sections: ["Non-Conformance", "Root Cause Analysis", "Corrective Actions", "Preventive Actions", "Verification"],
};

// ── Safety Report Template ──
const safetyReportTemplate: DocumentTemplate = {
    id: "safety-report",
    name: "Safety Report",
    description: "Weekly or daily safety observations, hazards identified, and actions taken",
    icon: "shield-check",
    color: "emerald",
    prompt_template: `Convert the following safety summary into a professional safety report.

Structure the output as JSON:
{
  "metadata": {
    "document_title": "Safety Report — [Period]",
    "project_name": "extracted",
    "location": "site location",
    "date": "report date",
    "reference": "SAF-XXX",
    "prepared_by": "safety officer",
    "organization": "company"
  },
  "sections": [
    { "id": "1", "title": "1. Safety Statistics", "content": "TRIFR, LTIFR, incidents, near misses", "order": 1 },
    { "id": "2", "title": "2. Hazards Identified", "content": "new hazards found this period", "order": 2 },
    { "id": "3", "title": "3. Inspections Conducted", "content: "inspections and results", "order": 3 },
    { "id": "4", "title": "4. Training Delivered", "content: "safety training sessions", "order": 4 },
    { "id": "5", "title": "5. Incidents & Near Misses", "content: "summary of events", "order": 5 },
    { "id": "6", "title": "6. Actions Taken", "content: "corrective actions completed", "order": 6 },
    { "id": "7", "title": "7. Outstanding Items", "content: "pending actions", "order": 7 }
  ],
  "actionItems": []
}

Safety Summary:
{{SUMMARY}}`,
    required_fields: [
        { name: "report_period", label: "Report Period", type: "select", options: ["Daily", "Weekly", "Monthly"] },
        { name: "report_date", label: "Report Date", type: "date" },
    ],
    optional_fields: [
        { name: "workers_on_site", label: "Workers on Site", type: "text" },
        { name: "hours_worked", label: "Hours Worked", type: "text" },
    ],
    default_sections: ["Statistics", "Hazards", "Inspections", "Incidents", "Actions"],
};

// ── RFI Template ──
const rfiTemplate: DocumentTemplate = {
    id: "rfi",
    name: "Request for Information",
    description: "Formal RFI for design clarifications, conflicts, or missing information",
    icon: "help-circle",
    color: "violet",
    prompt_template: `Convert the following RFI summary into a professional Request for Information.

Structure the output as JSON:
{
  "metadata": {
    "document_title": "Request for Information",
    "project_name": "extracted",
    "location": "relevant location/drawing ref",
    "date": "YYYY-MM-DD",
    "reference": "RFI-XXX",
    "prepared_by": "requester",
    "organization": "contractor"
  },
  "sections": [
    { "id": "1", "title": "1. Drawing/Document Reference", "content": "specific references", "order": 1 },
    { "id": "2", "title": "2. Description of Issue", "content: "conflict or missing info", "order": 2 },
    { "id": "3", "title": "3. Contractor's Interpretation", "content: "how we understand it", "order": 3 },
    { "id": "4", "title": "4. Proposed Solution", "content: "our suggested approach", "order": 4 },
    { "id": "5", "title": "5. Information Requested", "content: "specific questions", "order": 5 },
    { "id": "6", "title": "6. Impact Assessment", "content: "cost/time impacts if not resolved", "order": 6 }
  ]
}

RFI Summary:
{{SUMMARY}}`,
    required_fields: [
        { name: "rfi_reference", label: "RFI Reference", type: "text", placeholder: "RFI-001" },
        { name: "to", label: "To (Consultant/Designer)", type: "text" },
        { name: "drawing_ref", label: "Drawing Reference", type: "text" },
        { name: "date_issued", label: "Date Issued", type: "date" },
    ],
    optional_fields: [
        { name: "required_by", label: "Response Required By", type: "date" },
        { name: "spec_ref", label: "Specification Reference", type: "text" },
        { name: "cost_impact", label: "Cost Impact", type: "select", options: ["Yes", "No", "Unknown"] },
        { name: "time_impact", label: "Time Impact", type: "select", options: ["Yes", "No", "Unknown"] },
    ],
    default_sections: ["Reference", "Issue Description", "Interpretation", "Proposed Solution", "Information Requested"],
};

// ── Daily Progress Report Template ──
const dailyProgressTemplate: DocumentTemplate = {
    id: "daily-progress",
    name: "Daily Progress Report",
    description: "Construction daily report with work completed, labour, equipment, and issues",
    icon: "file-text",
    color: "slate",
    prompt_template: `Convert the following daily summary into a professional daily progress report.

Structure the output as JSON:
{
  "metadata": {
    "document_title": "Daily Progress Report",
    "project_name": "extracted",
    "location": "site",
    "date": "YYYY-MM-DD",
    "reference": "DPR-XXX",
    "prepared_by": "supervisor",
    "organization": "contractor"
  },
  "sections": [
    { "id": "1", "title": "1. Weather Conditions", "content": "am/pm conditions", "order": 1 },
    { "id": "2", "title": "2. Work Completed Today", "content: "areas and quantities", "order": 2 },
    { "id": "3", "title": "3. Labour on Site", "content: "trade breakdown", "order": 3 },
    { "id": "4", "title": "4. Plant & Equipment", "content: "equipment used", "order": 4 },
    { "id": "5", "title": "5. Materials Delivered", "content: "deliveries today", "order": 5 },
    { "id": "6", "title": "6. Issues & Delays", "content: "problems encountered", "order": 6 },
    { "id": "7", "title": "7. Work Planned Tomorrow", "content: "next shift plan", "order": 7 },
    { "id": "8", "title": "8. Instructions Received", "content: "engineer/client instructions", "order": 8 }
  ]
}

Daily Summary:
{{SUMMARY}}`,
    required_fields: [
        { name: "report_date", label: "Report Date", type: "date" },
        { name: "weather", label: "Weather", type: "text" },
    ],
    optional_fields: [
        { name: "shift", label: "Shift", type: "select", options: ["Day", "Night", "Day & Night"] },
        { name: "total_workers", label: "Total Workers", type: "text" },
    ],
    default_sections: ["Weather", "Work Completed", "Labour", "Equipment", "Issues", "Plan for Tomorrow"],
};

// ── Inspection Checklist Template ──
const inspectionChecklistTemplate: DocumentTemplate = {
    id: "inspection-checklist",
    name: "Inspection Checklist",
    description: "Quality or safety inspection with pass/fail/NA items and photo references",
    icon: "list-checks",
    color: "indigo",
    prompt_template: `Convert the following inspection summary into a structured inspection checklist.

Structure the output as JSON:
{
  "metadata": {
    "document_title": "Inspection Checklist — [Type]",
    "project_name": "extracted",
    "location": "inspection area",
    "date": "YYYY-MM-DD",
    "reference": "INSP-XXX",
    "prepared_by": "inspector",
    "organization": "company"
  },
  "sections": [
    { "id": "1", "title": "1. General Requirements", "content: "inspection items with status", "order": 1 },
    { "id": "2", "title": "2. Specific Checks", "content: "detailed inspection points", "order": 2 }
  ],
  "actionItems": [
    { "id": "1", "number": 1, "description": "defect/finding", "responsible": "trade", "due_date": "date", "status": "open" }
  ]
}

Inspection Summary:
{{SUMMARY}}`,
    required_fields: [
        { name: "inspection_type", label: "Inspection Type", type: "select", options: ["Pre-Start", "Quality", "Safety", "Environmental", "Practical Completion", "Other"] },
        { name: "inspection_date", label: "Inspection Date", type: "date" },
        { name: "area_location", label: "Area/Location", type: "text" },
    ],
    optional_fields: [
        { name: "inspector", label: "Inspector", type: "text" },
        { name: "witness", label: "Witness", type: "text" },
    ],
    default_sections: ["General Requirements", "Specific Checks", "Defects Found"],
};

// ── Toolbox Talk Template ──
const toolboxTalkTemplate: DocumentTemplate = {
    id: "toolbox-talk",
    name: "Toolbox Talk Record",
    description: "Safety meeting record with topic, attendees, and acknowledgment signatures",
    icon: "message-square",
    color: "orange",
    prompt_template: `Convert the following toolbox talk summary into a professional record.

Structure the output as JSON:
{
  "metadata": {
    "document_title": "Toolbox Talk Record",
    "project_name": "extracted",
    "location": "site",
    "date": "YYYY-MM-DD",
    "reference": "TBT-XXX",
    "prepared_by": "presenter",
    "organization": "company"
  },
  "sections": [
    { "id": "1", "title": "1. Topic", "content": "talk subject", "order": 1 },
    { "id": "2", "title": "2. Key Points Discussed", "content: "main discussion points", "order": 2 },
    { "id": "3", "title": "3. Questions & Answers", "content: "worker questions", "order": 3 },
    { "id": "4", "title": "4. Actions Agreed", "content: "commitments made", "order": 4 }
  ],
  "attendees": [
    { "name": "Worker Name", "organization": "Company", "role": "Trade", "present": true }
  ]
}

Toolbox Talk Summary:
{{SUMMARY}}`,
    required_fields: [
        { name: "topic", label: "Topic", type: "text", placeholder: "Working Near Underground Services" },
        { name: "date", label: "Date", type: "date" },
        { name: "presenter", label: "Presenter", type: "text" },
    ],
    optional_fields: [
        { name: "duration", label: "Duration (minutes)", type: "text" },
        { name: "topic_ref", label: "Topic Reference", type: "text" },
    ],
    default_sections: ["Topic", "Key Points", "Questions", "Actions"],
};

// ── Template Registry ──
export const DOCUMENT_TEMPLATES: Record<DocumentType, DocumentTemplate> = {
    "meeting-minutes": meetingMinutesTemplate,
    "incident-report": incidentReportTemplate,
    "corrective-action": correctiveActionTemplate,
    "safety-report": safetyReportTemplate,
    rfi: rfiTemplate,
    "daily-progress": dailyProgressTemplate,
    "inspection-checklist": inspectionChecklistTemplate,
    "toolbox-talk": toolboxTalkTemplate,
};

export function getTemplate(type: DocumentType): DocumentTemplate {
    return DOCUMENT_TEMPLATES[type];
}

export function getAllTemplates(): DocumentTemplate[] {
    return Object.values(DOCUMENT_TEMPLATES);
}

export function getTemplatePrompt(type: DocumentType, summary: string): string {
    const template = DOCUMENT_TEMPLATES[type];
    return template.prompt_template.replace("{{SUMMARY}}", summary);
}
