/**
 * SiteDocs — Document Templates
 * Pre-defined templates with AI prompts for document generation
 */

import type { DocumentTemplate, DocumentType } from "./types";
import { buildTemplatePrompt } from "./standards";

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
    { "id": "1", "name": "Full Name", "organization": "Company", "role": "Role", "present": true }
  ],
  "sections": [
    { "id": "1", "title": "1. Matters from Previous Meeting", "content": "detailed content", "order": 1, "status": "open|closed|in-progress" }
  ],
  "actionItems": [
    { "id": "1", "number": 1, "description": "action description", "responsible": "Name — Org", "due_date": "YYYY-MM-DD or null", "status": "open|in-progress|closed" }
  ],
  "signatories": [
    { "id": "1", "name": "Name", "organization": "Org", "signature_date": null }
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
    { "id": "3", "title": "3. Immediate Actions Taken", "content": "response actions", "order": 3 },
    { "id": "4", "title": "4. Witnesses", "content": "witness information", "order": 4 },
    { "id": "5", "title": "5. Investigation Findings", "content": "root cause analysis", "order": 5 },
    { "id": "6", "title": "6. Corrective Actions", "content": "actions to prevent recurrence", "order": 6 }
  ],
  "actionItems": [
    { "id": "1", "number": 1, "description": "corrective action", "responsible": "Name — Org", "due_date": "YYYY-MM-DD", "status": "open" }
  ],
  "signatories": [
    { "id": "1", "name": "Reporter Name", "organization": "Organisation", "signature_date": null },
    { "id": "2", "name": "Supervisor Name", "organization": "Organisation", "signature_date": null }
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
- Names of reporter and supervisor/manager for sign-off

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
    { "id": "6", "title": "6. Preventive Actions", "content": "measures to prevent recurrence", "order": 6 },
    { "id": "7", "title": "7. Verification & Close-out", "content": "how effectiveness will be verified", "order": 7 }
  ],
  "actionItems": [
    { "id": "1", "number": 1, "description": "action", "responsible": "Name", "due_date": "YYYY-MM-DD", "status": "open" }
  ],
  "signatories": [
    { "id": "1", "name": "Raised By", "organization": "Organisation", "signature_date": null },
    { "id": "2", "name": "Verified By", "organization": "Organisation", "signature_date": null }
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
- Names of originator and verifier for sign-off

CAR Summary:
{{SUMMARY}}`,
    required_fields: [
        { name: "car_reference", label: "CAR Reference", type: "text", placeholder: "CAR-001" },
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
    "document_title": "Safety Report — [Period e.g. Week Ending DD MMM YYYY]",
    "project_name": "extracted or null",
    "location": "extracted site location or null",
    "date": "YYYY-MM-DD",
    "reference": "SAF-XXX or null",
    "prepared_by": "extracted name or null",
    "organization": "extracted company or null"
  },
  "sections": [
    { "id": "1", "title": "1. Safety Statistics", "content": "TRIFR, LTIFR, total hours worked, LTIs, MTIs, near misses, first aids — use null for any not provided", "order": 1 },
    { "id": "2", "title": "2. Hazards Identified", "content": "new hazards found this period with risk rating and control measures", "order": 2 },
    { "id": "3", "title": "3. Inspections Conducted", "content": "inspections carried out, by whom, outcomes and findings", "order": 3 },
    { "id": "4", "title": "4. Training Delivered", "content": "safety inductions, toolbox talks, competency assessments conducted", "order": 4 },
    { "id": "5", "title": "5. Incidents & Near Misses", "content": "summary of any incidents, near misses, or first aid treatments this period", "order": 5 },
    { "id": "6", "title": "6. Actions Taken", "content": "corrective actions completed and closed out this period", "order": 6 },
    { "id": "7", "title": "7. Outstanding Items", "content": "open actions carried forward, responsible party, and target close date", "order": 7 }
  ],
  "actionItems": [
    { "id": "1", "number": 1, "description": "outstanding safety action", "responsible": "Name — Org", "due_date": "YYYY-MM-DD or null", "status": "open|in-progress|closed" }
  ]
}

Extract and include:
- Report period (daily/weekly/monthly) and date
- All safety statistics mentioned (hours worked, incidents, near misses, LTIs, TRIFR, LTIFR)
- Hazards identified with risk ratings and controls
- Inspections and audits conducted with results
- Safety training and inductions delivered
- Incidents and near misses with brief descriptions
- Corrective actions completed and still outstanding
- Omit any section with no relevant information rather than leaving it empty

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
    { "id": "2", "title": "2. Description of Issue", "content": "conflict or missing info", "order": 2 },
    { "id": "3", "title": "3. Contractor's Interpretation", "content": "how we understand it", "order": 3 },
    { "id": "4", "title": "4. Proposed Solution", "content": "our suggested approach", "order": 4 },
    { "id": "5", "title": "5. Information Requested", "content": "specific questions", "order": 5 },
    { "id": "6", "title": "6. Impact Assessment", "content": "cost/time impacts if not resolved", "order": 6 }
  ],
  "actionItems": [
    { "id": "1", "number": 1, "description": "Response required from designer/consultant", "responsible": "Name — Org", "due_date": "YYYY-MM-DD or null", "status": "open" }
  ],
  "signatories": [
    { "id": "1", "name": "Submitted By", "organization": "Contractor", "signature_date": null },
    { "id": "2", "name": "Responded By", "organization": "Consultant/Designer", "signature_date": null }
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
    "document_title": "Inspection Checklist — [Type e.g. Pre-Pour Concrete Inspection]",
    "project_name": "extracted or null",
    "location": "extracted inspection area or null",
    "date": "YYYY-MM-DD",
    "reference": "INSP-XXX or null",
    "prepared_by": "extracted inspector name or null",
    "organization": "extracted company or null"
  },
  "sections": [
    { "id": "1", "title": "1. Pre-Inspection Setup", "content": "permits, drawings, method statements checked; weather/environmental conditions", "order": 1, "status": "open|closed" },
    { "id": "2", "title": "2. General Requirements", "content": "site safety, access, PPE, housekeeping — Pass/Fail/NA for each item", "order": 2, "status": "open|closed" },
    { "id": "3", "title": "3. Work-Specific Checks", "content": "detailed inspection points relevant to the work type with Pass/Fail/NA outcomes", "order": 3, "status": "open|closed" },
    { "id": "4", "title": "4. Quality & Compliance", "content": "materials, tolerances, specifications, standards checked", "order": 4, "status": "open|closed" },
    { "id": "5", "title": "5. Defects & Observations", "content": "items that failed or require attention, with location and description", "order": 5, "status": "open|closed" },
    { "id": "6", "title": "6. Overall Outcome", "content": "overall pass/conditional pass/fail, any hold points, re-inspection required yes/no", "order": 6, "status": "open|closed" }
  ],
  "actionItems": [
    { "id": "1", "number": 1, "description": "defect or finding requiring rectification", "responsible": "Name — Trade/Org", "due_date": "YYYY-MM-DD or null", "status": "open" }
  ],
  "signatories": [
    { "id": "1", "name": "Inspector", "organization": "Organisation", "signature_date": null },
    { "id": "2", "name": "Witness/Superintendent", "organization": "Organisation", "signature_date": null }
  ]
}

Extract and include:
- Inspection type, date, area/location, inspector and witness names
- Pre-inspection checks (drawings, permits, SWMS reviewed)
- General safety and housekeeping observations
- Work-specific checks with Pass/Fail/NA outcomes
- Any defects found with location and description
- Overall inspection outcome (pass, conditional pass, fail)
- All action items for defect rectification with responsible trades and due dates
- Hold points triggered or released

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
    { "id": "2", "title": "2. Key Points Discussed", "content": "main discussion points", "order": 2 },
    { "id": "3", "title": "3. Questions & Answers", "content": "worker questions", "order": 3 },
    { "id": "4", "title": "4. Actions Agreed", "content": "commitments made", "order": 4 }
  ],
  "attendees": [
    { "id": "1", "name": "Worker Name", "organization": "Company", "role": "Trade", "present": true }
  ],
  "signatories": [
    { "id": "1", "name": "Presenter Name", "organization": "Organisation", "signature_date": null }
  ]
}

Extract and include:
- Topic title, date, location, presenter name
- All key safety points covered
- Any questions raised and answers given
- Actions or commitments agreed by the team
- Names of all attendees with their trade/role
- Presenter name for sign-off

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

// ── Variation / Change Order Template ──
const variationTemplate: DocumentTemplate = {
    id: "variation",
    name: "Variation / Change Order",
    description: "Document scope changes, cost impacts, time impacts, and approval status",
    icon: "file-diff",
    color: "teal",
    prompt_template: `Convert the following variation summary into a professional variation/change order document.

Structure the output as JSON:
{
  "metadata": {
    "document_title": "Variation Order / Change Order",
    "project_name": "extracted",
    "location": "affected area",
    "date": "YYYY-MM-DD",
    "reference": "VO-XXX or CO-XXX",
    "prepared_by": "contractor",
    "organization": "company"
  },
  "sections": [
    { "id": "1", "title": "1. Description of Change", "content": "what is being changed", "order": 1 },
    { "id": "2", "title": "2. Reason for Variation", "content": "why the change is needed", "order": 2 },
    { "id": "3", "title": "3. Contract Reference", "content": "clause and drawing refs", "order": 3 },
    { "id": "4", "title": "4. Cost Impact", "content": "detailed cost breakdown", "order": 4 },
    { "id": "5", "title": "5. Time Impact", "content": "programme implications", "order": 5 },
    { "id": "6", "title": "6. Proposed Solution", "content": "how to implement", "order": 6 },
    { "id": "7", "title": "7. Approval Status", "content": "approvals obtained/pending", "order": 7 }
  ],
  "actionItems": [
    { "id": "1", "number": 1, "description": "follow-up action required to progress variation", "responsible": "Name — Org", "due_date": "YYYY-MM-DD or null", "status": "open" }
  ],
  "signatories": [
    { "id": "1", "name": "Submitted By (Contractor)", "organization": "Organisation", "signature_date": null },
    { "id": "2", "name": "Approved By (Principal/Superintendent)", "organization": "Organisation", "signature_date": null }
  ]
}

Extract and include:
- Variation/change order reference number and date
- Clear description of the scope change
- Reason the variation is required (design change, latent condition, client request, etc.)
- Relevant contract clauses and drawing references
- Cost impact with breakdown if provided
- Time (programme) impact in days
- Proposed implementation approach
- Current approval status
- Any follow-up actions needed to progress the variation

Variation Summary:
{{SUMMARY}}`,
    required_fields: [
        { name: "vo_reference", label: "VO/CO Reference", type: "text", placeholder: "VO-001" },
        { name: "date_raised", label: "Date Raised", type: "date" },
        { name: "contract_reference", label: "Contract Reference", type: "text" },
    ],
    optional_fields: [
        { name: "cost_impact", label: "Cost Impact ($)", type: "text" },
        { name: "time_impact", label: "Time Impact (days)", type: "text" },
        { name: "status", label: "Status", type: "select", options: ["Draft", "Submitted", "Approved", "Rejected"] },
    ],
    default_sections: ["Description", "Reason", "Cost Impact", "Time Impact", "Approval Status"],
};

// ── Non-Conformance Report (NCR) Template ──
const ncrTemplate: DocumentTemplate = {
    id: "ncr",
    name: "Non-Conformance Report",
    description: "Quality defects and non-conformances requiring corrective action",
    icon: "x-circle",
    color: "rose",
    prompt_template: `Convert the following NCR summary into a professional non-conformance report.

Structure the output as JSON:
{
  "metadata": {
    "document_title": "Non-Conformance Report",
    "project_name": "extracted",
    "location": "where found",
    "date": "YYYY-MM-DD",
    "reference": "NCR-XXX",
    "prepared_by": "quality officer",
    "organization": "company"
  },
  "sections": [
    { "id": "1", "title": "1. Description of Non-Conformance", "content": "what was found deficient", "order": 1 },
    { "id": "2", "title": "2. Reference Documents", "content": "specs, drawings, standards violated", "order": 2 },
    { "id": "3", "title": "3. Extent of Non-Conformance", "content": "how much work affected", "order": 3 },
    { "id": "4", "title": "4. Immediate Actions", "content": "what was done immediately", "order": 4 },
    { "id": "5", "title": "5. Proposed Rectification", "content": "how to fix it", "order": 5 },
    { "id": "6", "title": "6. Preventive Measures", "content": "how to stop recurrence", "order": 6 }
  ],
  "actionItems": [
    { "id": "1", "number": 1, "description": "action to close NCR", "responsible": "Name — Org", "due_date": "YYYY-MM-DD", "status": "open" }
  ],
  "signatories": [
    { "id": "1", "name": "Raised By", "organization": "Organisation", "signature_date": null },
    { "id": "2", "name": "Trade/Subcontractor", "organization": "Organisation", "signature_date": null },
    { "id": "3", "name": "Close-Out Verification", "organization": "Organisation", "signature_date": null }
  ]
}

NCR Summary:
{{SUMMARY}}`,
    required_fields: [
        { name: "ncr_reference", label: "NCR Reference", type: "text", placeholder: "NCR-001" },
        { name: "date_raised", label: "Date Raised", type: "date" },
        { name: "severity", label: "Severity", type: "select", options: ["Minor", "Major", "Critical"] },
    ],
    optional_fields: [
        { name: "specification", label: "Specification/Standard", type: "text" },
        { name: "drawing_ref", label: "Drawing Reference", type: "text" },
        { name: "trade_responsible", label: "Trade Responsible", type: "text" },
    ],
    default_sections: ["Description", "Reference", "Immediate Actions", "Rectification", "Preventive Measures"],
};

// ── Site Instruction Issue Template ──
const siteInstructionIssueTemplate: DocumentTemplate = {
    id: "site-instruction-issue",
    name: "Site Instruction — Issue",
    description: "Issue formal directions TO a contractor or subcontractor",
    icon: "clipboard",
    color: "yellow",
    prompt_template: `Convert the following instruction summary into a professional site instruction.

Structure the output as JSON:
{
  "metadata": {
    "document_title": "Site Instruction",
    "project_name": "extracted",
    "location": "affected area",
    "date": "YYYY-MM-DD",
    "reference": "SI-XXX",
    "prepared_by": "engineer/client",
    "organization": "consultant/client"
  },
  "sections": [
    { "id": "1", "title": "1. Instruction Details", "content": "what is required", "order": 1 },
    { "id": "2", "title": "2. Reason for Instruction", "content": "why it is being issued", "order": 2 },
    { "id": "3", "title": "3. Reference Documents", "content": "drawings, specs, previous correspondence", "order": 3 },
    { "id": "4", "title": "4. Contractor's Obligations", "content": "what contractor must do", "order": 4 },
    { "id": "5", "title": "5. Time for Compliance", "content": "when action must be taken", "order": 5 },
    { "id": "6", "title": "6. Cost & Time Implications", "content": "contractor to advise if claim arises within the specified notice period", "order": 6 }
  ],
  "actionItems": [
    { "id": "1", "number": 1, "description": "compliance action required by contractor", "responsible": "Name — Org", "due_date": "YYYY-MM-DD or null", "status": "open" }
  ],
  "signatories": [
    { "id": "1", "name": "Issued By (Engineer/Client)", "organization": "Organisation", "signature_date": null },
    { "id": "2", "name": "Acknowledged By (Contractor)", "organization": "Organisation", "signature_date": null }
  ]
}

Extract and include:
- SI reference number, date issued, and issuing party
- Clear and specific instruction details — what must be done
- Reason the instruction is being issued
- Relevant drawings, specifications, or prior correspondence
- Specific contractor obligations and deliverables
- Compliance timeframe or deadline
- Any cost or programme claim notice requirements
- All compliance actions with responsible parties and due dates

Instruction Summary:
{{SUMMARY}}`,
    required_fields: [
        { name: "si_reference", label: "SI Reference", type: "text", placeholder: "SI-001" },
        { name: "date_issued", label: "Date Issued", type: "date" },
        { name: "issued_by", label: "Issued By", type: "text" },
    ],
    optional_fields: [
        { name: "drawing_ref", label: "Drawing Reference", type: "text" },
        { name: "response_required", label: "Response Required By", type: "date" },
        { name: "priority", label: "Priority", type: "select", options: ["Routine", "Urgent", "Immediate"] },
    ],
    default_sections: ["Instruction Details", "Reason", "Contractor Obligations", "Time for Compliance"],
};

// ── Site Instruction Acknowledge Template ──
const siteInstructionAcknowledgeTemplate: DocumentTemplate = {
    id: "site-instruction-acknowledge",
    name: "Site Instruction — Acknowledge",
    description: "Acknowledge and document a site instruction received FROM client/engineer",
    icon: "clipboard-check",
    color: "amber",
    prompt_template: `Convert the following received instruction summary into a professional acknowledgement record.

Structure the output as JSON:
{
  "metadata": {
    "document_title": "Site Instruction Acknowledgement",
    "project_name": "extracted",
    "location": "affected area",
    "date": "YYYY-MM-DD",
    "reference": "SI-XXX (received reference)",
    "prepared_by": "contractor representative",
    "organization": "contractor company"
  },
  "sections": [
    { "id": "1", "title": "1. Received Instruction", "content": "what was instructed by the client/engineer", "order": 1 },
    { "id": "2", "title": "2. Instruction Details", "content": "specific requirements, drawings, specifications referenced", "order": 2 },
    { "id": "3", "title": "3. Acknowledgement", "content": "confirmation that the instruction has been received, understood, and accepted", "order": 3 },
    { "id": "4", "title": "4. Compliance Plan", "content": "how the contractor intends to comply, steps to be taken", "order": 4 },
    { "id": "5", "title": "5. Time & Cost Assessment", "content": "assessment of any time or cost implications, notice of claim if applicable", "order": 5 },
    { "id": "6", "title": "6. Evidence & Close-out", "content": "photos, records, or documentation of completed work", "order": 6 }
  ],
  "actionItems": [
    { "id": "1", "number": 1, "description": "compliance action required", "responsible": "Name — Org", "due_date": "YYYY-MM-DD or null", "status": "open" }
  ],
  "signatories": [
    { "id": "1", "name": "Received By (Contractor)", "organization": "Organisation", "signature_date": null },
    { "id": "2", "name": "Verified By (Supervisor)", "organization": "Organisation", "signature_date": null }
  ]
}

Extract and include:
- Original SI reference number from the received instruction
- Date the instruction was received
- Who issued the instruction (client, engineer, superintendent)
- Clear instruction details and requirements
- Relevant drawings, specifications, or correspondence referenced
- Contractor's understanding and acceptance of the instruction
- Compliance plan with specific steps and responsible parties
- Assessment of time/cost implications or notice of claim
- Compliance timeframe and any constraints
- Evidence of completed work for close-out

Received Instruction Summary:
{{SUMMARY}}`,
    required_fields: [
        { name: "original_si_reference", label: "Original SI Reference", type: "text", placeholder: "SI-001" },
        { name: "date_received", label: "Date Received", type: "date" },
        { name: "issued_by", label: "Issued By", type: "text" },
    ],
    optional_fields: [
        { name: "response_deadline", label: "Response/Compliance Deadline", type: "date" },
        { name: "claim_notice_required", label: "Cost/Time Claim Notice", type: "select", options: ["Not Required", "Pending Assessment", "Notice Submitted"] },
        { name: "compliance_status", label: "Compliance Status", type: "select", options: ["Pending", "In Progress", "Completed"] },
    ],
    default_sections: ["Received Instruction", "Acknowledgement", "Compliance Plan", "Time & Cost Assessment"],
};

// ── Template Registry ──
export const DOCUMENT_TEMPLATES: Record<DocumentType, DocumentTemplate> = {
    "meeting-minutes": meetingMinutesTemplate,
    "incident-report": incidentReportTemplate,
    "corrective-action": correctiveActionTemplate,
    "safety-report": safetyReportTemplate,
    rfi: rfiTemplate,
    "inspection-checklist": inspectionChecklistTemplate,
    "toolbox-talk": toolboxTalkTemplate,
    variation: variationTemplate,
    ncr: ncrTemplate,
    "site-instruction-issue": siteInstructionIssueTemplate,
    "site-instruction-acknowledge": siteInstructionAcknowledgeTemplate,
};

export function getTemplate(type: DocumentType): DocumentTemplate {
    return DOCUMENT_TEMPLATES[type];
}

export function getAllTemplates(): DocumentTemplate[] {
    return Object.values(DOCUMENT_TEMPLATES);
}

export function getTemplatePrompt(type: DocumentType, summary: string): string {
    const template = DOCUMENT_TEMPLATES[type];
    if (type === "meeting-minutes") {
        return template.prompt_template.replace("{{SUMMARY}}", summary);
    }
    return buildTemplatePrompt(template, summary);
}
