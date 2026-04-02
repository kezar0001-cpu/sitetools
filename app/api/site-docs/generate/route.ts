import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getSecret } from "@/lib/server/get-secret";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// ---------------------------------------------------------------------------
// System prompt — Document generation
// ---------------------------------------------------------------------------

const DOCUMENT_SYSTEM_PROMPT = `You are a professional document generator for construction and civil engineering. 
Convert informal meeting notes, incident summaries, or reports into structured professional documents.

Respond ONLY with valid JSON in this exact format:
{
  "metadata": {
    "document_title": "string",
    "project_name": "string or null",
    "location": "string or null", 
    "date": "YYYY-MM-DD or null",
    "reference": "string or null",
    "prepared_by": "string or null",
    "organization": "string or null"
  },
  "sections": [
    { "id": "1", "title": "Section Title", "content": "section content", "order": 1, "status": "open|closed|in-progress|pending or null" }
  ],
  "actionItems": [
    { "id": "1", "number": 1, "description": "action text", "responsible": "Name — Org or null", "due_date": "YYYY-MM-DD or null", "status": "open|in-progress|closed" }
  ],
  "attendees": [
    { "id": "1", "name": "Full Name", "organization": "Company or null", "role": "Role or null", "present": true }
  ],
  "signatories": [
    { "id": "1", "name": "Full Name", "organization": "Company or null", "signature_date": null }
  ]
}

Extract and organize all relevant information from the user's input. Use null for any fields not found in the input.`;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { document_type, summary, metadata_override } = body;

        if (!summary) {
            return NextResponse.json(
                { error: "Summary is required." },
                { status: 400 }
            );
        }

        // Verify user is authenticated
        const authHeader = request.headers.get("authorization");
        console.log("[site-docs/generate] Auth header:", authHeader ? "present" : "missing");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json(
                { error: "Not authenticated." },
                { status: 401 }
            );
        }
        const token = authHeader.slice(7);
        console.log("[site-docs/generate] Token length:", token?.length);
        const {
            data: { user },
            error: authError,
        } = await supabaseAdmin.auth.getUser(token);
        console.log("[site-docs/generate] Auth result:", user ? "user found" : "no user", authError ? `error: ${authError.message}` : "no error");

        if (authError || !user) {
            return NextResponse.json(
                { error: "Invalid session." },
                { status: 401 }
            );
        }

        // Get Anthropic API key from Supabase secrets
        console.log("[site-docs/generate] Fetching API key...");
        const apiKey = await getSecret("ANTHROPIC_API_KEY", supabaseAdmin);
        console.log("[site-docs/generate] API key:", apiKey ? "found" : "NOT FOUND");
        if (!apiKey) {
            return NextResponse.json(
                { error: "AI service not configured — API key not found." },
                { status: 500 }
            );
        }
        
        console.log("[site-docs/generate] Calling Claude...");
        const anthropic = new Anthropic({ apiKey });

        // Call Claude to generate structured content
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 55_000);

        const message = await anthropic.messages.create(
            {
                model: "claude-sonnet-4-6",
                max_tokens: 4096,
                system: DOCUMENT_SYSTEM_PROMPT,
                messages: [
                    {
                        role: "user",
                        content: `Document type: ${document_type || "professional document"}\n\n${summary}`,
                    },
                ],
            },
            { signal: controller.signal }
        );

        clearTimeout(timeoutId);

        console.log("[site-docs/generate] Claude response received, parsing...");
        const textBlock = message.content.find((b) => b.type === "text");
        const responseText = textBlock && "text" in textBlock ? textBlock.text.trim() : "";
        console.log("[site-docs/generate] Response length:", responseText.length);

        // Parse JSON response
        let generatedContent;
        try {
            generatedContent = JSON.parse(responseText);
            console.log("[site-docs/generate] JSON parsed successfully");
        } catch {
            console.log("[site-docs/generate] Initial JSON parse failed, trying fallback...");
            // Try to extract JSON from markdown code fences
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    generatedContent = JSON.parse(jsonMatch[0]);
                    console.log("[site-docs/generate] Fallback JSON parse succeeded");
                } catch {
                    console.log("[site-docs/generate] Fallback JSON parse failed");
                    return NextResponse.json(
                        { error: "Failed to parse AI response. Please try again." },
                        { status: 422 }
                    );
                }
            } else {
                console.log("[site-docs/generate] No JSON object found in response");
                return NextResponse.json(
                    { error: "Failed to parse AI response. Please try again." },
                    { status: 422 }
                );
            }
        }

        // Apply metadata overrides if provided
        if (metadata_override && generatedContent.metadata) {
            if (metadata_override.project_name) {
                generatedContent.metadata.project_name = metadata_override.project_name;
            }
            if (metadata_override.location) {
                generatedContent.metadata.location = metadata_override.location;
            }
            if (metadata_override.date) {
                generatedContent.metadata.date = metadata_override.date;
            }
            if (metadata_override.prepared_by) {
                generatedContent.metadata.prepared_by = metadata_override.prepared_by;
            }
            if (metadata_override.organization) {
                generatedContent.metadata.organization = metadata_override.organization;
            }
        }

        return NextResponse.json({
            generated_content: generatedContent,
        });
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            return NextResponse.json(
                { error: "Request timed out." },
                { status: 504 }
            );
        }
        console.error("Document generation error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "AI processing failed." },
            { status: 500 }
        );
    }
}
