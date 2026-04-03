import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import type { DocumentType, DocumentStatus } from "@/lib/site-docs/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// Color themes for each document type
const DOCUMENT_THEMES: Record<DocumentType, { primary: string; secondary: string; accent: string; headerBg: string; headerText: string }> = {
    "meeting-minutes": { primary: "#1e3a5f", secondary: "#2c5282", accent: "#ed8936", headerBg: "#1e3a5f", headerText: "#ffffff" },
    "incident-report": { primary: "#c53030", secondary: "#9b2c2c", accent: "#feb2b2", headerBg: "#742a2a", headerText: "#ffffff" },
    "corrective-action": { primary: "#c05621", secondary: "#9c4221", accent: "#fbd38d", headerBg: "#7c341f", headerText: "#ffffff" },
    "safety-report": { primary: "#276749", secondary: "#22543d", accent: "#9ae6b4", headerBg: "#1c4532", headerText: "#ffffff" },
    rfi: { primary: "#553c9a", secondary: "#44337a", accent: "#d6bcfa", headerBg: "#3c2a6e", headerText: "#ffffff" },
    "inspection-checklist": { primary: "#434190", secondary: "#3730a3", accent: "#a3bffa", headerBg: "#312e81", headerText: "#ffffff" },
    "toolbox-talk": { primary: "#c05621", secondary: "#9c4221", accent: "#fbd38d", headerBg: "#7c341f", headerText: "#ffffff" },
    variation: { primary: "#285e61", secondary: "#234e52", accent: "#81e6d9", headerBg: "#1a3c3f", headerText: "#ffffff" },
    ncr: { primary: "#b83280", secondary: "#97266d", accent: "#fbb6ce", headerBg: "#702459", headerText: "#ffffff" },
    "site-instruction": { primary: "#d69e2e", secondary: "#b7791f", accent: "#fefcbf", headerBg: "#975a16", headerText: "#ffffff" },
};

// Status badge colors
const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    open: { bg: "#fffaf0", text: "#c05621", border: "#ed8936" },
    closed: { bg: "#f0fff4", text: "#276749", border: "#48bb78" },
    "in-progress": { bg: "#ebf8ff", text: "#2b6cb0", border: "#4299e1" },
    pending: { bg: "#faf5ff", text: "#6b46c1", border: "#9f7aea" },
    draft: { bg: "#fffaf0", text: "#c05621", border: "#ed8936" },
    final: { bg: "#f0fff4", text: "#276749", border: "#48bb78" },
};

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ documentId: string }> }
) {
    try {
        const { documentId } = await params;
        const { searchParams } = new URL(request.url);
        const format = searchParams.get("format") || "html";

        if (!documentId) {
            return NextResponse.json(
                { error: "Document ID is required" },
                { status: 400 }
            );
        }

        if (!["html", "pdf"].includes(format)) {
            return NextResponse.json(
                { error: "Invalid format. Use html or pdf" },
                { status: 400 }
            );
        }

        // Verify user is authenticated
        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json(
                { error: "Unauthorized - missing token" },
                { status: 401 }
            );
        }

        const token = authHeader.slice(7);
        const {
            data: { user },
            error: authError,
        } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json(
                { error: "Unauthorized - invalid token" },
                { status: 401 }
            );
        }

        // Fetch document with company info for branding
        const { data: document, error: docError } = await supabaseAdmin
            .from("site_documents")
            .select("*, company:companies(name, abn, address)")
            .eq("id", documentId)
            .single();

        if (docError || !document) {
            console.error("[site-docs/export] Document not found:", documentId, docError);
            return NextResponse.json(
                { error: "Document not found" },
                { status: 404 }
            );
        }

        // Verify user has access to this document
        const { data: membership, error: membershipError } = await supabaseAdmin
            .from("company_memberships")
            .select("id")
            .eq("company_id", document.company_id)
            .eq("user_id", user.id)
            .single();

        if (membershipError || !membership) {
            return NextResponse.json(
                { error: "Access denied" },
                { status: 403 }
            );
        }

        // Generate document content
        const content = document.generated_content;
        const docType = document.document_type as DocumentType;
        const docStatus = document.status as DocumentStatus;
        const company = document.company as { name?: string; abn?: string; address?: string };

        // Generate HTML content
        const html = generateThemedHTML(document.title, content, docType, docStatus, company);

        if (format === "html") {
            // Return as downloadable HTML file
            const safeTitle = document.title.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "_").substring(0, 50);
            const filename = `${safeTitle}.html`;
            
            return new NextResponse(html, {
                headers: {
                    "Content-Type": "text/html; charset=utf-8",
                    "Content-Disposition": `attachment; filename="${filename}"`,
                },
            });
        }

        // PDF format: return print-ready HTML that opens in new window
        // Client will trigger print dialog for "Save as PDF"
        const safeTitle = document.title.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "_").substring(0, 50);
        
        // Add print-trigger script for PDF mode
        const printReadyHtml = html.replace(
            "</body>",
            `
<script>
    // Auto-trigger print after a short delay to ensure styles load
    setTimeout(() => {
        window.print();
    }, 500);
</script>
</body>`
        );

        return new NextResponse(printReadyHtml, {
            headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Content-Disposition": `inline; filename="${safeTitle}.html"`,
            },
        });

    } catch (error) {
        console.error("[site-docs/export] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Export failed" },
            { status: 500 }
        );
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateThemedHTML(title: string, content: any, docType: DocumentType, status: DocumentStatus, company?: { name?: string; abn?: string; address?: string }): string {
    const theme = DOCUMENT_THEMES[docType] || DOCUMENT_THEMES["meeting-minutes"];
    const docTypeLabels: Record<DocumentType, string> = {
        "meeting-minutes": "MEETING MINUTES",
        "incident-report": "INCIDENT REPORT",
        "corrective-action": "CORRECTIVE ACTION REPORT",
        "safety-report": "SAFETY REPORT",
        rfi: "REQUEST FOR INFORMATION",
        "inspection-checklist": "INSPECTION CHECKLIST",
        "toolbox-talk": "TOOLBOX TALK RECORD",
        variation: "VARIATION / CHANGE ORDER",
        ncr: "NON-CONFORMANCE REPORT",
        "site-instruction": "SITE INSTRUCTION",
    };
    
    const { metadata, sections, actionItems, attendees, signatories } = content;

    // Generate sections with themed styling
    const sectionsHtml = sections?.map((section: { title: string; content?: string; status?: string }, index: number) => {
        const sectionNum = String(index + 1).padStart(2, '0');
        const sectionStatus = section.status;
        const statusBadge = sectionStatus ? createStatusBadge(sectionStatus) : '';
        
        return `
        <div class="section">
            <div class="section-header">
                <span class="section-number">${sectionNum}</span>
                <h2>${section.title}</h2>
                ${statusBadge}
            </div>
            <div class="section-content">
                ${section.content?.replace(/\n/g, "<br>") || ""}
            </div>
        </div>
    `}).join("") || "";

    const attendeesHtml = attendees?.length ? `
        <div class="section">
            <div class="section-header">
                <span class="section-number">AT</span>
                <h2>ATTENDEES</h2>
            </div>
            <table class="data-table">
                <thead>
                    <tr style="background: ${theme.headerBg}; color: ${theme.headerText};">
                        <th>Name</th>
                        <th>Organization</th>
                        <th>Role</th>
                        <th>Present</th>
                    </tr>
                </thead>
                <tbody>
                    ${attendees.map((a: { name: string; organization?: string; role?: string; present?: boolean }) => `
                        <tr>
                            <td><strong>${a.name}</strong></td>
                            <td>${a.organization || "—"}</td>
                            <td>${a.role || "—"}</td>
                            <td style="text-align: center;">${a.present ? '<span class="check">✓</span>' : '<span class="dash">—</span>'}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    ` : "";

    const actionItemsHtml = actionItems?.length ? `
        <div class="section">
            <div class="section-header">
                <span class="section-number">AI</span>
                <h2>ACTION ITEMS</h2>
            </div>
            <table class="data-table action-table">
                <thead>
                    <tr style="background: ${theme.headerBg}; color: ${theme.headerText};">
                        <th style="width: 40px;">#</th>
                        <th>Action</th>
                        <th>Responsible</th>
                        <th>Due Date</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${actionItems.map((item: { number: number; description: string; responsible?: string; due_date?: string; status: string }) => `
                        <tr>
                            <td style="text-align: center; font-weight: bold;">${item.number}</td>
                            <td>${item.description}</td>
                            <td>${item.responsible || "—"}</td>
                            <td>${item.due_date || "—"}</td>
                            <td>${createStatusBadge(item.status)}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    ` : "";

    const signatoriesHtml = signatories?.length ? `
        <div class="section">
            <div class="section-header">
                <span class="section-number">SO</span>
                <h2>SIGN-OFF</h2>
            </div>
            <table class="data-table sign-table">
                <thead>
                    <tr style="background: ${theme.headerBg}; color: ${theme.headerText};">
                        <th>Name</th>
                        <th>Organization</th>
                        <th style="width: 200px;">Signature</th>
                        <th style="width: 120px;">Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${signatories.map((s: { name: string; organization?: string }) => `
                        <tr style="height: 60px;">
                            <td><strong>${s.name}</strong></td>
                            <td>${s.organization || "—"}</td>
                            <td style="border-bottom: 1px solid #ccc;"></td>
                            <td style="border-bottom: 1px solid #ccc;"></td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
            <p class="sign-note">These minutes are a true record of the meeting held. Please review and advise of any corrections within <strong>2 business days</strong>. If no response is received, the minutes will be taken as accepted.</p>
        </div>
    ` : "";

    // Build metadata grid
    const metaItems = [
        { label: "Project", value: metadata?.project_name },
        { label: "Location", value: metadata?.location },
        { label: "Date", value: metadata?.date },
        { label: "Reference", value: metadata?.reference },
        { label: "Prepared by", value: metadata?.prepared_by },
        { label: "Organization", value: metadata?.organization || company?.name },
    ].filter(item => item.value);

    const metaGrid = metaItems.map(item => `
        <div class="meta-item">
            <span class="meta-label">${item.label}</span>
            <span class="meta-value">${item.value}</span>
        </div>
    `).join("");

    const statusBadge = createStatusBadge(status);

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        :root {
            --primary: ${theme.primary};
            --secondary: ${theme.secondary};
            --accent: ${theme.accent};
            --header-bg: ${theme.headerBg};
            --header-text: ${theme.headerText};
        }
        
        * { box-sizing: border-box; }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 900px;
            margin: 0 auto;
            padding: 0;
            background: #fff;
            color: #1a202c;
            line-height: 1.6;
        }
        
        /* Header Section */
        .doc-header {
            background: linear-gradient(135deg, var(--header-bg) 0%, var(--secondary) 100%);
            color: var(--header-text);
            padding: 30px 40px;
            position: relative;
        }
        
        .doc-header::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: var(--accent);
        }
        
        .header-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
        }
        
        .company-info h2 {
            margin: 0 0 8px 0;
            font-size: 22px;
            font-weight: 700;
            letter-spacing: -0.5px;
        }
        
        .company-details {
            font-size: 12px;
            opacity: 0.85;
            line-height: 1.5;
        }
        
        .doc-type-badge {
            background: rgba(255,255,255,0.15);
            padding: 12px 20px;
            border-radius: 6px;
            text-align: center;
            border: 2px solid var(--accent);
        }
        
        .doc-type-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            opacity: 0.9;
            margin-bottom: 4px;
        }
        
        .doc-type-title {
            font-size: 16px;
            font-weight: 700;
            letter-spacing: 0.5px;
        }
        
        .doc-title {
            font-size: 26px;
            font-weight: 700;
            margin: 0;
            line-height: 1.3;
        }
        
        .doc-meta-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid rgba(255,255,255,0.2);
            font-size: 13px;
        }
        
        .ref-number {
            font-weight: 600;
            color: var(--accent);
        }
        
        /* Content Area */
        .doc-content {
            padding: 30px 40px;
        }
        
        /* Metadata Grid */
        .meta-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 30px;
            padding: 20px;
            background: #f7fafc;
            border-radius: 8px;
            border-left: 4px solid var(--primary);
        }
        
        .meta-item {
            display: flex;
            flex-direction: column;
        }
        
        .meta-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #718096;
            margin-bottom: 4px;
            font-weight: 600;
        }
        
        .meta-value {
            font-size: 14px;
            color: #1a202c;
            font-weight: 500;
        }
        
        /* Sections */
        .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
        }
        
        .section-header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 15px;
            background: var(--header-bg);
            color: var(--header-text);
            border-radius: 6px 6px 0 0;
            margin-bottom: 0;
        }
        
        .section-number {
            background: var(--accent);
            color: var(--header-bg);
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 700;
        }
        
        .section-header h2 {
            margin: 0;
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            flex: 1;
        }
        
        .section-content {
            padding: 20px;
            background: #fff;
            border: 1px solid #e2e8f0;
            border-top: none;
            border-radius: 0 0 6px 6px;
        }
        
        .section-content p {
            margin: 0 0 12px 0;
        }
        
        .section-content p:last-child {
            margin-bottom: 0;
        }
        
        /* Tables */
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin: 0;
            font-size: 13px;
        }
        
        .data-table th {
            padding: 12px 15px;
            text-align: left;
            font-weight: 600;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .data-table td {
            padding: 12px 15px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
        }
        
        .data-table tbody tr:last-child td {
            border-bottom: none;
        }
        
        .data-table tbody tr:nth-child(even) {
            background: #f7fafc;
        }
        
        .action-table td:nth-child(2) {
            width: 40%;
        }
        
        .sign-table td {
            vertical-align: middle;
        }
        
        .check {
            color: #38a169;
            font-weight: bold;
            font-size: 16px;
        }
        
        .dash {
            color: #a0aec0;
        }
        
        .sign-note {
            margin-top: 15px;
            padding: 15px;
            background: #fffaf0;
            border-left: 4px solid #ed8936;
            font-size: 12px;
            color: #744210;
            border-radius: 0 4px 4px 0;
        }
        
        /* Footer */
        .doc-footer {
            margin-top: 40px;
            padding: 20px 40px;
            background: #f7fafc;
            border-top: 1px solid #e2e8f0;
            font-size: 11px;
            color: #718096;
            text-align: center;
        }
        
        .footer-brand {
            font-weight: 600;
            color: var(--primary);
        }
        
        /* Print Styles */
        @media print {
            body { max-width: none; margin: 0; }
            .doc-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .section-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .data-table thead tr { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .section { page-break-inside: avoid; }
            .doc-header { page-break-after: avoid; }
        }
    </style>
</head>
<body>
    <div class="doc-header">
        <div class="header-top">
            <div class="company-info">
                <h2>${company?.name || metadata?.organization || "Company Name"}</h2>
                <div class="company-details">
                    ${company?.abn ? `ABN: ${company.abn}<br>` : ""}
                    ${company?.address || ""}
                </div>
            </div>
            <div class="doc-type-badge">
                <div class="doc-type-label">Document Type</div>
                <div class="doc-type-title">${docTypeLabels[docType]}</div>
            </div>
        </div>
        <h1 class="doc-title">${metadata?.document_title || title}</h1>
        <div class="doc-meta-bar">
            <span>${metadata?.reference ? `Ref: <span class="ref-number">${metadata.reference}</span>` : "&nbsp;"}</span>
            <span>${statusBadge}</span>
        </div>
    </div>
    
    <div class="doc-content">
        ${metaGrid ? `<div class="meta-grid">${metaGrid}</div>` : ""}
        ${sectionsHtml}
        ${attendeesHtml}
        ${actionItemsHtml}
        ${signatoriesHtml}
    </div>
    
    <div class="doc-footer">
        <span class="footer-brand">${company?.name || metadata?.organization || ""}</span>
        ${metadata?.reference ? ` | Ref: ${metadata.reference}` : ""}
        ${metadata?.date ? ` | ${metadata.date}` : ""}
    </div>
</body>
</html>`;
}

function createStatusBadge(status: string): string {
    const colors = STATUS_COLORS[status.toLowerCase()] || STATUS_COLORS.pending;
    const label = status.charAt(0).toUpperCase() + status.slice(1).replace(/-/g, " ");
    
    return `<span style="
        display: inline-block;
        padding: 4px 12px;
        background: ${colors.bg};
        color: ${colors.text};
        border: 1px solid ${colors.border};
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    ">${label}</span>`;
}
