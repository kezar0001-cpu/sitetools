import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ documentId: string }> }
) {
    try {
        const { documentId } = await params;
        const { searchParams } = new URL(request.url);
        const format = searchParams.get("format") || "pdf";

        if (!documentId) {
            return NextResponse.json(
                { message: "Document ID is required" },
                { status: 400 }
            );
        }

        if (!["pdf", "docx", "html"].includes(format)) {
            return NextResponse.json(
                { message: "Invalid format. Use pdf, docx, or html" },
                { status: 400 }
            );
        }

        // Verify user is authenticated
        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json(
                { message: "Unauthorized" },
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
                { message: "Unauthorized" },
                { status: 401 }
            );
        }

        // Fetch document
        const { data: document, error: docError } = await supabaseAdmin
            .from("site_documents")
            .select("*")
            .eq("id", documentId)
            .single();

        if (docError || !document) {
            return NextResponse.json(
                { message: "Document not found" },
                { status: 404 }
            );
        }

        // Verify user has access to this document
        const { data: membership } = await supabaseAdmin
            .from("company_memberships")
            .select("id")
            .eq("company_id", document.company_id)
            .eq("user_id", user.id)
            .single();

        if (!membership) {
            return NextResponse.json(
                { message: "Access denied" },
                { status: 403 }
            );
        }

        // Generate document content based on format
        const content = document.generated_content;
        const filename = `${document.title.replace(/[^a-zA-Z0-9]/g, "_")}.${format}`;

        if (format === "html") {
            const html = generateHTML(document.title, content);
            return new NextResponse(html, {
                headers: {
                    "Content-Type": "text/html",
                    "Content-Disposition": `attachment; filename="${filename}"`,
                },
            });
        }

        // For PDF and DOCX, return a simple HTML that can be printed/saved
        // In production, you'd use a library like Puppeteer or docx.js
        const html = generateHTML(document.title, content);

        if (format === "pdf") {
            return new NextResponse(html, {
                headers: {
                    "Content-Type": "text/html",
                    "Content-Disposition": `inline; filename="${filename}"`,
                },
            });
        }

        // For DOCX, return HTML with a note that it can be copied to Word
        return new NextResponse(html, {
            headers: {
                "Content-Type": "text/html",
                "Content-Disposition": `attachment; filename="${filename.replace(".docx", ".html")}"`,
            },
        });
    } catch (error) {
        console.error("Document export error:", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

function generateHTML(title: string, content: any): string {
    const { metadata, sections, actionItems, attendees, signatories } = content;

    const sectionsHtml = sections?.map((section: any) => `
        <div class="section">
            <h2>${section.title}</h2>
            <p>${section.content?.replace(/\n/g, "<br>") || ""}</p>
        </div>
    `).join("") || "";

    const attendeesHtml = attendees?.length ? `
        <div class="section">
            <h2>Attendees</h2>
            <table>
                <tr><th>Name</th><th>Organization</th><th>Role</th><th>Present</th></tr>
                ${attendees.map((a: any) => `
                    <tr>
                        <td>${a.name}</td>
                        <td>${a.organization || "—"}</td>
                        <td>${a.role || "—"}</td>
                        <td>${a.present ? "✓" : "—"}</td>
                    </tr>
                `).join("")}
            </table>
        </div>
    ` : "";

    const actionItemsHtml = actionItems?.length ? `
        <div class="section">
            <h2>Action Items</h2>
            <table>
                <tr><th>#</th><th>Action</th><th>Responsible</th><th>Due</th><th>Status</th></tr>
                ${actionItems.map((item: any) => `
                    <tr>
                        <td>${item.number}</td>
                        <td>${item.description}</td>
                        <td>${item.responsible || "—"}</td>
                        <td>${item.due_date || "—"}</td>
                        <td>${item.status}</td>
                    </tr>
                `).join("")}
            </table>
        </div>
    ` : "";

    const signatoriesHtml = signatories?.length ? `
        <div class="section">
            <h2>Sign-off</h2>
            <table>
                <tr><th>Name</th><th>Organization</th><th>Signature</th><th>Date</th></tr>
                ${signatories.map((s: any) => `
                    <tr>
                        <td>${s.name}</td>
                        <td>${s.organization || "—"}</td>
                        <td>_________________</td>
                        <td>____/____/______</td>
                    </tr>
                `).join("")}
            </table>
        </div>
    ` : "";

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
        h1 { border-bottom: 2px solid #333; padding-bottom: 10px; }
        h2 { color: #333; margin-top: 30px; }
        .meta { background: #f5f5f5; padding: 15px; margin: 20px 0; }
        .meta p { margin: 5px 0; }
        .section { margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f5f5f5; }
        @media print {
            body { max-width: none; margin: 0; }
        }
    </style>
</head>
<body>
    <h1>${metadata?.document_title || title}</h1>
    <div class="meta">
        ${metadata?.reference ? `<p><strong>Reference:</strong> ${metadata.reference}</p>` : ""}
        ${metadata?.date ? `<p><strong>Date:</strong> ${metadata.date}</p>` : ""}
        ${metadata?.project_name ? `<p><strong>Project:</strong> ${metadata.project_name}</p>` : ""}
        ${metadata?.location ? `<p><strong>Location:</strong> ${metadata.location}</p>` : ""}
        ${metadata?.prepared_by ? `<p><strong>Prepared by:</strong> ${metadata.prepared_by}</p>` : ""}
        ${metadata?.organization ? `<p><strong>Organization:</strong> ${metadata.organization}</p>` : ""}
    </div>
    ${sectionsHtml}
    ${attendeesHtml}
    ${actionItemsHtml}
    ${signatoriesHtml}
</body>
</html>`;
}
