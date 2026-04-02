import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { document_type, summary, metadata_override } = body;

        if (!summary) {
            return NextResponse.json(
                { message: "Summary is required" },
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

        // Get OpenAI API key from environment
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { message: "AI generation not configured" },
                { status: 503 }
            );
        }

        // Call OpenAI to generate structured content
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `You are a professional document generator for construction and civil engineering. 
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

Extract and organize all relevant information from the user's input. Use null for any fields not found in the input.`,
                    },
                    {
                        role: "user",
                        content: summary,
                    },
                ],
                response_format: { type: "json_object" },
                temperature: 0.3,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("OpenAI API error:", errorData);
            return NextResponse.json(
                { message: "Failed to generate document content" },
                { status: 502 }
            );
        }

        const aiResponse = await response.json();
        const generatedContent = JSON.parse(aiResponse.choices[0].message.content);

        // Apply metadata overrides if provided
        if (metadata_override) {
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
        console.error("Document generation error:", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
