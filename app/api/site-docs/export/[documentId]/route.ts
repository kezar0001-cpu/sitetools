import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { DocumentType, DocumentStatus } from "@/lib/site-docs/types";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
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

export async function GET(
    req: NextRequest,
    { params }: { params: { documentId: string } }
) {
    try {
        const { documentId } = params;

        const authHeader = req.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized - missing token" }, { status: 401 });
        }

        const token = authHeader.slice(7);
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized - invalid token" }, { status: 401 });
        }

        const { data: document, error: docError } = await supabaseAdmin
            .from("site_documents")
            .select("*, company:companies(name)")
            .eq("id", documentId)
            .single();

        if (docError || !document) {
            console.error("[site-docs/export] Document not found:", documentId, docError);
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        const { data: membership, error: membershipError } = await supabaseAdmin
            .from("company_memberships")
            .select("id")
            .eq("company_id", document.company_id)
            .eq("user_id", user.id)
            .single();

        if (membershipError || !membership) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const content = document.generated_content;
        const docType = document.document_type as DocumentType;
        const company = document.company as { name?: string } | null;

        const pdfBuffer = generatePDF(document.title, content, docType, document.status as DocumentStatus, company);
        const safeTitle = document.title.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "_").substring(0, 50);
        const pdfBytes = new Uint8Array(pdfBuffer);

        return new NextResponse(pdfBytes, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${safeTitle}.pdf"`,
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

// ─── Color palette ────────────────────────────────────────────────────────────

const PRIMARY_COLORS: Record<DocumentType, [number, number, number]> = {
    "meeting-minutes":    [30,  58,  95],
    "incident-report":    [197, 48,  48],
    "corrective-action":  [192, 86,  33],
    "safety-report":      [39,  103, 73],
    rfi:                  [85,  60,  154],
    "inspection-checklist": [67, 65, 144],
    "toolbox-talk":       [192, 86,  33],
    variation:            [40,  94,  97],
    ncr:                  [184, 50,  128],
    "site-instruction":   [214, 158, 46],
};

const ORANGE:      [number, number, number] = [214, 158, 46];
const DARK_TEXT:   [number, number, number] = [30,  30,  30];
const MID_TEXT:    [number, number, number] = [80,  80,  80];
const LIGHT_TEXT:  [number, number, number] = [130, 140, 155];
const BG_LIGHT:    [number, number, number] = [247, 250, 252];
const GREEN:       [number, number, number] = [22,  163, 74];
const BLUE_IP:     [number, number, number] = [37,  99,  235];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "";
    try {
        const d = new Date(dateStr + "T00:00:00");
        return d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
    } catch {
        return dateStr;
    }
}

function statusColor(status: string): [number, number, number] {
    switch (status.toLowerCase().replace(" ", "-")) {
        case "open":        return ORANGE;
        case "in-progress": return BLUE_IP;
        case "closed":      return GREEN;
        default:            return LIGHT_TEXT;
    }
}

function statusLabel(status: string): string {
    switch (status.toLowerCase()) {
        case "open":        return "Open";
        case "in-progress": return "In Progress";
        case "closed":      return "Closed";
        case "pending":     return "Pending";
        default:            return status.charAt(0).toUpperCase() + status.slice(1);
    }
}

// ─── PDF Generator ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generatePDF(title: string, content: any, docType: DocumentType, status: DocumentStatus, company: { name?: string } | null): ArrayBuffer {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const AT = doc as jsPDF & { lastAutoTable?: { finalY: number } };

    const PW   = doc.internal.pageSize.getWidth();  // 210
    const PH   = doc.internal.pageSize.getHeight(); // 297
    const M    = 15;   // margin
    const CW   = PW - M * 2; // content width = 180
    const SAFE = PH - 14;    // max Y before footer

    const [r, g, b]  = PRIMARY_COLORS[docType] || [30, 58, 95];
    const metadata   = content?.metadata || {};
    const companyName = company?.name || metadata?.organization || "";
    const isMM       = docType === "meeting-minutes";

    // ── helpers scoped to this doc ──
    const newPage = () => { doc.addPage(); return M; };

    const ensureSpace = (currentY: number, needed: number): number =>
        currentY + needed > SAFE ? newPage() : currentY;

    const sectionBar = (label: string, y: number): number => {
        doc.setFillColor(r, g, b);
        doc.rect(M, y, CW, 8.5, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(label.toUpperCase(), M + 3.5, y + 5.8);
        return y + 10.5;
    };

    // ── HEADER ────────────────────────────────────────────────────────────────
    const HDR_H = 50;

    // Main navy band
    doc.setFillColor(r, g, b);
    doc.rect(0, 0, PW, HDR_H, "F");

    // Company name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text(companyName, M, 15);

    // ABN + meeting type subheader
    const abn = metadata.abn || "";
    let sub = abn ? `ABN: ${abn}` : "";
    if (isMM && metadata.meeting_type) sub += (sub ? "  |  " : "") + metadata.meeting_type.toUpperCase();
    if (sub) {
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(190, 210, 230);
        doc.text(sub, M, 22);
    }

    // Right badge (slightly darker navy)
    const BX = PW - M - 62;
    const BW = 62;
    doc.setFillColor(Math.max(0, r - 14), Math.max(0, g - 24), Math.max(0, b - 38));
    doc.rect(BX, 0, BW, HDR_H, "F");

    // "DOCUMENT TYPE" small label
    doc.setTextColor(160, 185, 215);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.text("DOCUMENT TYPE", BX + BW / 2, 9, { align: "center" });

    // Type label (bold white, word-wrapped)
    const typeLabel = DOC_TYPE_LABELS[docType];
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    const typeLines = doc.splitTextToSize(typeLabel, BW - 8);
    let typeY = 16;
    typeLines.forEach((line: string) => {
        doc.text(line, BX + BW / 2, typeY, { align: "center" });
        typeY += 5.5;
    });

    // Ref + date in orange
    const refDateParts: string[] = [];
    if (metadata.reference) refDateParts.push(`Ref: ${metadata.reference}`);
    if (metadata.date)      refDateParts.push(formatDate(metadata.date));
    if (refDateParts.length) {
        doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2]);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        const refLines = doc.splitTextToSize(refDateParts.join("  |  "), BW - 8);
        let refY = typeY + 2;
        refLines.forEach((line: string) => {
            doc.text(line, BX + BW / 2, refY, { align: "center" });
            refY += 4.5;
        });
    }

    // Status label at bottom of badge
    const docStatusLabel = status === "finalised" ? "Finalised" : status === "shared" ? "Shared for Review" : "Draft";
    doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2]);
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.text(docStatusLabel, BX + BW / 2, HDR_H - 4, { align: "center" });

    // Orange accent bar below header
    doc.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2]);
    doc.rect(0, HDR_H, PW, 1.5, "F");

    let y = HDR_H + 6;

    // ── METADATA BLOCK ────────────────────────────────────────────────────────

    interface MetaEntry { label: string; value: string }
    const metaRows: MetaEntry[][] = [];

    if (metadata.project_name) metaRows.push([{ label: "PROJECT", value: String(metadata.project_name) }]);
    if (isMM && metadata.meeting_type) metaRows.push([{ label: "MEETING TYPE", value: String(metadata.meeting_type) }]);
    if (metadata.location)     metaRows.push([{ label: "LOCATION",     value: String(metadata.location) }]);

    {
        const dateVal = metadata.date ? formatDate(metadata.date) : null;
        const timeVal = isMM && metadata.time ? String(metadata.time) : null;
        if (dateVal && timeVal) {
            metaRows.push([{ label: "DATE", value: dateVal }, { label: "TIME", value: timeVal }]);
        } else if (dateVal) {
            metaRows.push([{ label: "DATE", value: dateVal }]);
        }
    }

    {
        const prepBy   = metadata.prepared_by ? String(metadata.prepared_by) : null;
        const nextMtg  = isMM && metadata.next_meeting ? formatDate(metadata.next_meeting) : null;
        if (prepBy && nextMtg) {
            metaRows.push([{ label: "MINUTES BY", value: prepBy }, { label: "NEXT MEETING", value: nextMtg }]);
        } else if (prepBy) {
            metaRows.push([{ label: "MINUTES BY", value: prepBy }]);
        } else if (nextMtg) {
            metaRows.push([{ label: "NEXT MEETING", value: nextMtg }]);
        }
    }

    if (isMM && metadata.distribution) {
        metaRows.push([{ label: "DISTRIBUTION", value: String(metadata.distribution) }]);
    }

    if (metaRows.length > 0) {
        const ROW_H    = 9.5;
        const PAD_V    = 4;
        const blockH   = metaRows.length * ROW_H + PAD_V * 2;

        doc.setFillColor(BG_LIGHT[0], BG_LIGHT[1], BG_LIGHT[2]);
        doc.rect(M, y, CW, blockH, "F");

        // Left colored border
        doc.setFillColor(r, g, b);
        doc.rect(M, y, 1.8, blockH, "F");

        metaRows.forEach((row, ri) => {
            const rowY    = y + PAD_V + ri * ROW_H;
            const colW    = CW / row.length;
            row.forEach((item, ci) => {
                const ix = M + 5 + ci * colW;
                doc.setTextColor(LIGHT_TEXT[0], LIGHT_TEXT[1], LIGHT_TEXT[2]);
                doc.setFontSize(7);
                doc.setFont("helvetica", "normal");
                doc.text(item.label, ix, rowY + 1);
                doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2]);
                doc.setFontSize(8.5);
                doc.setFont("helvetica", "bold");
                // Truncate to fit column
                const maxW   = colW - 10;
                const valStr = doc.splitTextToSize(item.value, maxW)[0] || item.value;
                doc.text(valStr, ix, rowY + 6);
            });
        });

        y += blockH + 7;
    }

    // ── ATTENDEES (top, section 1 for meeting minutes) ────────────────────────
    const attendees: Array<{ name: string; organization?: string; role?: string; present?: boolean }> =
        content?.attendees || [];

    if (attendees.length > 0) {
        y = ensureSpace(y, 30);
        y = sectionBar(isMM ? "1.  ATTENDEES" : "ATTENDEES", y);

        autoTable(doc, {
            startY: y,
            head: [["Name", "Organisation", "Role", "Present"]],
            body: attendees.map(a => [
                a.name || "",
                a.organization || "—",
                a.role || "—",
                a.present ? "Yes" : "No",
            ]),
            styles: {
                fontSize: 9,
                cellPadding: { top: 3.5, right: 4, bottom: 3.5, left: 4 },
                lineColor: [225, 230, 238],
                lineWidth: 0.15,
            },
            headStyles: {
                fillColor: [r, g, b],
                textColor: [255, 255, 255],
                fontStyle: "bold",
                fontSize: 8.5,
            },
            alternateRowStyles: { fillColor: BG_LIGHT },
            columnStyles: {
                0: { cellWidth: 48 },
                1: { cellWidth: 40 },
                2: { cellWidth: "auto" },
                3: { cellWidth: 18, halign: "center" },
            },
            margin: { left: M, right: M },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            didParseCell: (data: any) => {
                if (data.column.index === 3 && data.section === "body") {
                    const isPresent = String(data.cell.raw) === "Yes";
                    data.cell.styles.textColor = isPresent ? GREEN : [200, 60, 60];
                    data.cell.styles.fontStyle  = "bold";
                }
            },
        });
        y = (AT.lastAutoTable?.finalY ?? y) + 9;
    }

    // ── AGENDA SECTIONS ───────────────────────────────────────────────────────
    const sections: Array<{ id: string; title: string; content: string; order: number; status?: string }> =
        content?.sections || [];

    const sectionOffset = (attendees.length > 0 && isMM) ? 2 : 1;

    for (let i = 0; i < sections.length; i++) {
        const section     = sections[i];
        const sectionNum  = sectionOffset + i;
        const badgeNum    = String(sectionNum).padStart(2, "0");
        const contentText = String(section.content || "").trim();

        // Estimate height: badge row (10) + content lines + spacing (10)
        const tempLines   = doc.splitTextToSize(contentText, CW - 10);
        const estimated   = 12 + tempLines.length * 4.5 + 12;
        y = ensureSpace(y, Math.min(estimated, 40)); // ensure at least header + some lines

        // ── Section header row ──
        const BADGE_ROW_H = 9.5;
        doc.setFillColor(250, 247, 242);
        doc.rect(M, y, CW, BADGE_ROW_H, "F");

        // Left accent line on section row
        doc.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2]);
        doc.rect(M, y, 1.5, BADGE_ROW_H, "F");

        // Orange number badge
        doc.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2]);
        doc.roundedRect(M + 3.5, y + 1.8, 10, 6, 1.2, 1.2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text(badgeNum, M + 8.5, y + 6, { align: "center" });

        // Section title
        doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2]);
        doc.setFontSize(9.5);
        doc.setFont("helvetica", "bold");
        const titleMaxW = CW - 48; // leave room for status badge
        const titleStr  = doc.splitTextToSize(String(section.title || ""), titleMaxW)[0] || "";
        doc.text(titleStr, M + 17, y + 6.2);

        // Status badge (right-aligned)
        if (section.status) {
            const [sr, sg, sb] = statusColor(section.status);
            doc.setTextColor(sr, sg, sb);
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.text(statusLabel(section.status), PW - M - 2, y + 6.2, { align: "right" });
        }

        y += BADGE_ROW_H + 2;

        // ── Section content ──
        if (contentText) {
            doc.setTextColor(MID_TEXT[0], MID_TEXT[1], MID_TEXT[2]);
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            const lines = doc.splitTextToSize(contentText, CW - 8);

            for (const line of lines) {
                if (y > SAFE) { y = newPage(); }
                doc.text(line, M + 4, y);
                y += 4.6;
            }
        }

        y += 8; // inter-section gap
    }

    // ── ACTION ITEMS TABLE ────────────────────────────────────────────────────
    const actionItems: Array<{ number: number; description: string; responsible?: string; due_date?: string; status: string }> =
        content?.actionItems || [];

    if (actionItems.length > 0) {
        y = ensureSpace(y, 40);
        y = sectionBar("ACTION ITEMS", y);

        autoTable(doc, {
            startY: y,
            head: [["#", "Action", "Responsible", "Due", "Status"]],
            body: actionItems.map(item => [
                String(item.number || ""),
                item.description || "",
                item.responsible || "—",
                item.due_date ? formatDate(item.due_date) : "—",
                item.status || "open",
            ]),
            styles: {
                fontSize: 8.5,
                cellPadding: { top: 3.5, right: 4, bottom: 3.5, left: 4 },
                overflow: "linebreak",
                lineColor: [225, 230, 238],
                lineWidth: 0.15,
            },
            headStyles: {
                fillColor: [r, g, b],
                textColor: [255, 255, 255],
                fontStyle: "bold",
                fontSize: 8.5,
            },
            columnStyles: {
                0: { cellWidth: 10, halign: "center", fontStyle: "bold" },
                1: { cellWidth: "auto" },
                2: { cellWidth: 40 },
                3: { cellWidth: 30 },
                4: { cellWidth: 24, halign: "center" },
            },
            alternateRowStyles: { fillColor: BG_LIGHT },
            margin: { left: M, right: M },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            didParseCell: (data: any) => {
                if (data.column.index === 4 && data.section === "body") {
                    const raw = String(data.cell.raw || "").toLowerCase();
                    const [cr, cg, cb] = statusColor(raw);
                    data.cell.styles.textColor = [cr, cg, cb];
                    data.cell.styles.fontStyle  = "bold";
                    // Replace raw status with formatted label for display
                    data.cell.text = [statusLabel(raw)];
                }
            },
        });
        y = (AT.lastAutoTable?.finalY ?? y) + 9;
    }

    // ── SIGN-OFF ──────────────────────────────────────────────────────────────
    const signatories: Array<{ name: string; organization?: string }> =
        content?.signatories || [];

    if (signatories.length > 0) {
        y = ensureSpace(y, 40);
        y = sectionBar("SIGN-OFF", y);

        for (const sig of signatories) {
            y = ensureSpace(y, 26);

            doc.setTextColor(DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2]);
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text(sig.name || "", M, y);

            if (sig.organization) {
                doc.setFontSize(8.5);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(MID_TEXT[0], MID_TEXT[1], MID_TEXT[2]);
                doc.text(sig.organization, M, y + 5);
            }

            // Signature + date lines
            const lineStart = M + CW * 0.35;
            const dateSplit = PW - M - 38;

            doc.setDrawColor(185, 190, 200);
            doc.setLineWidth(0.35);
            doc.line(lineStart, y + 12, dateSplit - 4, y + 12); // signature line
            doc.line(dateSplit, y + 12, PW - M, y + 12);        // date line

            doc.setTextColor(LIGHT_TEXT[0], LIGHT_TEXT[1], LIGHT_TEXT[2]);
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "normal");
            doc.text("Signature", lineStart, y + 16.5);
            doc.text("Date", dateSplit, y + 16.5);

            y += 24;
        }

        // Disclaimer box
        y += 4;
        const disclaimerText = "These minutes are a true record of the meeting held. Please review and advise of any corrections within 2 business days. If no response is received, the minutes will be taken as accepted.";
        const disclaimerLines = doc.splitTextToSize(disclaimerText, CW - 8);
        const disclaimerH = disclaimerLines.length * 4.2 + 8;

        if (y + disclaimerH < SAFE) {
            doc.setFillColor(255, 251, 235);
            doc.setDrawColor(ORANGE[0], ORANGE[1], ORANGE[2]);
            doc.setLineWidth(0.4);
            doc.rect(M, y, CW, disclaimerH, "FD");
            doc.setTextColor(120, 80, 10);
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "normal");
            doc.text(disclaimerLines, M + 4, y + 5.5);
        }
    }

    // ── FOOTER — applied to every page ────────────────────────────────────────
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        const FY = PH - 10;

        // Footer background
        doc.setFillColor(BG_LIGHT[0], BG_LIGHT[1], BG_LIGHT[2]);
        doc.rect(0, FY, PW, 10, "F");

        // Orange top rule on footer
        doc.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2]);
        doc.rect(0, FY, PW, 0.6, "F");

        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(LIGHT_TEXT[0], LIGHT_TEXT[1], LIGHT_TEXT[2]);

        // Left: company | ABN
        const footerLeft = abn ? `${companyName}  |  ABN: ${abn}` : companyName;
        if (footerLeft.trim()) doc.text(footerLeft, M, FY + 6.5);

        // Right: ref | date | page
        const rightParts: string[] = [];
        if (metadata.reference) rightParts.push(`Ref: ${metadata.reference}`);
        if (metadata.date)      rightParts.push(metadata.date);
        rightParts.push(`Page ${i} of ${pageCount}`);
        doc.text(rightParts.join("  |  "), PW - M, FY + 6.5, { align: "right" });
    }

    return doc.output("arraybuffer");
}
