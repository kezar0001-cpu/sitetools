import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import type { DocumentType, DocumentStatus } from "@/lib/site-docs/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    request: NextRequest,
    { params }: { params: Promise<{ documentId: string }> }
) {
    try {
        const { documentId } = await params;

        if (!documentId) {
            return NextResponse.json(
                { error: "Document ID is required" },
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

        // Fetch document with company info
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

        // Verify user access
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

        // Generate PDF
        const content = document.generated_content;
        const docType = document.document_type as DocumentType;
        const company = document.company as { name?: string; abn?: string; address?: string } | null;

        const pdfBuffer = generatePDF(document.title, content, docType, document.status as DocumentStatus, company);

        const safeTitle = document.title.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "_").substring(0, 50);

        // Convert ArrayBuffer to Uint8Array for NextResponse
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generatePDF(title: string, content: any, docType: DocumentType, status: DocumentStatus, company: { name?: string; abn?: string; address?: string } | null): ArrayBuffer {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    let y = margin;
    
    // Primary color based on document type (RGB values for jspdf)
    const primaryColor: Record<DocumentType, [number, number, number]> = {
        "meeting-minutes": [30, 58, 95],
        "incident-report": [197, 48, 48],
        "corrective-action": [192, 86, 33],
        "safety-report": [39, 103, 73],
        rfi: [85, 60, 154],
        "inspection-checklist": [67, 65, 144],
        "toolbox-talk": [192, 86, 33],
        variation: [40, 94, 97],
        ncr: [184, 50, 128],
        "site-instruction": [214, 158, 46],
    };
    
    const [r, g, b] = primaryColor[docType] || [30, 58, 95];
    const metadata = content?.metadata || {};
    const companyName = company?.name || metadata?.organization || "";
    
    // Header background
    doc.setFillColor(r, g, b);
    doc.rect(0, 0, pageWidth, 50, "F");
    
    // Company name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(companyName, margin, y + 10);
    
    // Company details
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    let detailsY = y + 16;
    if (company?.abn) {
        doc.text(`ABN: ${company.abn}`, margin, detailsY);
        detailsY += 4;
    }
    if (company?.address) {
        const addressLines = doc.splitTextToSize(company.address, contentWidth * 0.5);
        doc.text(addressLines, margin, detailsY);
    }
    
    // Document type badge (right side)
    const typeLabel = DOC_TYPE_LABELS[docType];
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(255, 255, 255);
    doc.roundedRect(pageWidth - margin - 70, y + 5, 70, 20, 3, 3, "FD");
    doc.setTextColor(r, g, b);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("DOCUMENT TYPE", pageWidth - margin - 35, y + 12, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(typeLabel, pageWidth - margin - 35, y + 19, { align: "center" });
    
    // Document title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    const titleText = metadata?.document_title || title;
    const titleLines = doc.splitTextToSize(titleText, contentWidth - 80);
    doc.text(titleLines, margin, y + 38);
    
    // Status badge
    const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(pageWidth - margin - 40, y + 32, 40, 10, 2, 2, "F");
    doc.setTextColor(r, g, b);
    doc.setFontSize(9);
    doc.text(statusLabel, pageWidth - margin - 20, y + 38, { align: "center" });
    
    y = 60;
    
    // Metadata section
    const metaItems = [
        { label: "Project", value: metadata.project_name },
        { label: "Location", value: metadata.location },
        { label: "Date", value: metadata.date },
        { label: "Reference", value: metadata.reference },
        { label: "Prepared by", value: metadata.prepared_by },
    ].filter(item => item.value);
    
    if (metaItems.length > 0) {
        doc.setFillColor(247, 250, 252);
        doc.rect(margin, y, contentWidth, metaItems.length > 3 ? 25 : 15, "F");
        doc.setDrawColor(r, g, b);
        doc.setLineWidth(0.5);
        doc.line(margin, y, margin, y + (metaItems.length > 3 ? 25 : 15));
        
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(8);
        
        metaItems.forEach((item, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const x = margin + 5 + (col * contentWidth / 2);
            const itemY = y + 5 + (row * 10);
            doc.setFont("helvetica", "normal");
            doc.text(item.label.toUpperCase(), x, itemY);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(50, 50, 50);
            doc.text(String(item.value), x, itemY + 4);
            doc.setTextColor(100, 100, 100);
        });
        
        y += metaItems.length > 3 ? 30 : 20;
    }
    
    // Sections
    const sections = content?.sections || [];
    for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        
        // Check page break
        if (y > 250) {
            doc.addPage();
            y = margin;
        }
        
        // Section header
        doc.setFillColor(r, g, b);
        doc.rect(margin, y, contentWidth, 8, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(String(section.title).toUpperCase(), margin + 3, y + 5.5);
        
        y += 12;
        
        // Section content
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        const sectionContent = String(section.content || "").replace(/\n/g, " ");
        const splitText = doc.splitTextToSize(sectionContent, contentWidth - 6);
        
        // Check if content fits on current page
        if (y + splitText.length * 5 > 280) {
            doc.addPage();
            y = margin;
        }
        
        doc.text(splitText, margin + 3, y);
        y += splitText.length * 5 + 10;
    }
    
    // Attendees table
    const attendees = content?.attendees || [];
    if (attendees.length > 0) {
        if (y > 200) {
            doc.addPage();
            y = margin;
        }
        
        // Table header
        doc.setFillColor(r, g, b);
        doc.rect(margin, y, contentWidth, 8, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("ATTENDEES", margin + 3, y + 5.5);
        
        y += 10;
        
        // Table columns
        const colWidths = [contentWidth * 0.3, contentWidth * 0.3, contentWidth * 0.25, contentWidth * 0.15];
        const headers = ["Name", "Organization", "Role", "Present"];
        
        doc.setFillColor(230, 230, 230);
        doc.rect(margin, y, contentWidth, 7, "F");
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(8);
        let x = margin + 2;
        headers.forEach((header, i) => {
            doc.setFont("helvetica", "bold");
            doc.text(header, x, y + 5);
            x += colWidths[i];
        });
        
        y += 7;
        
        // Table rows
        attendees.forEach((attendee: { name: string; organization?: string; role?: string; present?: boolean }, i: number) => {
            if (y > 280) {
                doc.addPage();
                y = margin;
            }
            
            if (i % 2 === 0) {
                doc.setFillColor(247, 250, 252);
                doc.rect(margin, y, contentWidth, 7, "F");
            }
            
            doc.setTextColor(50, 50, 50);
            doc.setFont("helvetica", "normal");
            
            x = margin + 2;
            doc.text(attendee.name || "", x, y + 5);
            x += colWidths[0];
            doc.text(attendee.organization || "—", x, y + 5);
            x += colWidths[1];
            doc.text(attendee.role || "—", x, y + 5);
            x += colWidths[2];
            doc.text(attendee.present ? "Yes" : "No", x, y + 5);
            
            y += 7;
        });
        
        y += 5;
    }
    
    // Action items table
    const actionItems = content?.actionItems || [];
    if (actionItems.length > 0) {
        if (y > 180) {
            doc.addPage();
            y = margin;
        }
        
        // Table header
        doc.setFillColor(r, g, b);
        doc.rect(margin, y, contentWidth, 8, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("ACTION ITEMS", margin + 3, y + 5.5);
        
        y += 10;
        
        // Table columns
        const colWidths = [20, contentWidth * 0.45, contentWidth * 0.2, contentWidth * 0.2, contentWidth * 0.15 - 20];
        const headers = ["#", "Action", "Responsible", "Due", "Status"];
        
        doc.setFillColor(230, 230, 230);
        doc.rect(margin, y, contentWidth, 7, "F");
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(8);
        let x = margin + 2;
        headers.forEach((header, i) => {
            doc.setFont("helvetica", "bold");
            doc.text(header, x, y + 5);
            x += colWidths[i];
        });
        
        y += 7;
        
        // Table rows
        actionItems.forEach((item: { number: number; description: string; responsible?: string; due_date?: string; status: string }, i: number) => {
            const rowHeight = 7;
            
            if (y > 280) {
                doc.addPage();
                y = margin;
                // Redraw header
                doc.setFillColor(230, 230, 230);
                doc.rect(margin, y, contentWidth, 7, "F");
                let hx = margin + 2;
                headers.forEach((header, hi) => {
                    doc.setFont("helvetica", "bold");
                    doc.text(header, hx, y + 5);
                    hx += colWidths[hi];
                });
                y += 7;
            }
            
            if (i % 2 === 0) {
                doc.setFillColor(247, 250, 252);
                doc.rect(margin, y, contentWidth, rowHeight, "F");
            }
            
            doc.setTextColor(50, 50, 50);
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            
            x = margin + 2;
            doc.text(String(item.number), x, y + 5);
            x += colWidths[0];
            
            const desc = doc.splitTextToSize(item.description || "", colWidths[1] - 4);
            doc.text(desc, x, y + 5);
            x += colWidths[1];
            
            doc.text(item.responsible || "—", x, y + 5);
            x += colWidths[2];
            doc.text(item.due_date || "—", x, y + 5);
            x += colWidths[3];
            
            const statusText = item.status.charAt(0).toUpperCase() + item.status.slice(1);
            doc.text(statusText, x, y + 5);
            
            y += rowHeight;
        });
        
        y += 5;
    }
    
    // Signatories
    const signatories = content?.signatories || [];
    if (signatories.length > 0) {
        if (y > 220) {
            doc.addPage();
            y = margin;
        }
        
        doc.setFillColor(r, g, b);
        doc.rect(margin, y, contentWidth, 8, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("SIGN-OFF", margin + 3, y + 5.5);
        
        y += 12;
        
        signatories.forEach((sig: { name: string; organization?: string }) => {
            if (y > 260) {
                doc.addPage();
                y = margin;
            }
            
            doc.setTextColor(50, 50, 50);
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text(sig.name, margin, y);
            
            if (sig.organization) {
                doc.setFont("helvetica", "normal");
                doc.setFontSize(9);
                doc.setTextColor(100, 100, 100);
                doc.text(sig.organization, margin, y + 5);
            }
            
            // Signature line
            doc.setDrawColor(150, 150, 150);
            doc.line(margin + contentWidth * 0.5, y + 8, pageWidth - margin, y + 8);
            doc.setTextColor(150, 150, 150);
            doc.setFontSize(8);
            doc.text("Signature", margin + contentWidth * 0.5, y + 12);
            doc.text("Date", pageWidth - margin - 25, y + 12);
            
            y += 20;
        });
        
        // Disclaimer
        y += 5;
        if (y < 270) {
            doc.setFillColor(255, 250, 240);
            doc.setDrawColor(237, 137, 54);
            doc.rect(margin, y, contentWidth, 15, "FD");
            doc.setTextColor(116, 66, 16);
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            const disclaimer = "These minutes are a true record of the meeting held. Please review and advise of any corrections within 2 business days. If no response is received, the minutes will be taken as accepted.";
            const disclaimerLines = doc.splitTextToSize(disclaimer, contentWidth - 6);
            doc.text(disclaimerLines, margin + 3, y + 6);
        }
    }
    
    // Footer on each page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(247, 250, 252);
        doc.rect(0, 287, pageWidth, 10, "F");
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        
        const footerText = companyName + (metadata.reference ? ` | Ref: ${metadata.reference}` : "") + (metadata.date ? ` | ${metadata.date}` : "");
        if (footerText.trim()) {
            doc.text(footerText, pageWidth / 2, 293, { align: "center" });
        }
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, 293, { align: "right" });
    }
    
    return doc.output("arraybuffer");
}
