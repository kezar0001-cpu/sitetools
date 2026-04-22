import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getSecret } from "@/lib/server/get-secret";
import { getTemplatePrompt, DOCUMENT_TEMPLATES } from "@/lib/site-docs/templates";
import type { DocumentType } from "@/lib/site-docs/types";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for long document generation

const MAX_SUMMARY_LENGTH = 10_000;

const DOCUMENT_SYSTEM_PROMPT =
    "You are a professional document generator for construction and civil engineering projects. " +
    "Respond ONLY with valid JSON — no markdown fences, no explanation, no text outside the JSON object.";

function sanitizeJsonLikeText(input: string): string {
    return input
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/,\s*([}\]])/g, "$1")
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ");
}

function tryParseGeneratedContent(responseText: string) {
    const candidates = [
        responseText,
        sanitizeJsonLikeText(responseText),
    ];

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        candidates.push(jsonMatch[0]);
        candidates.push(sanitizeJsonLikeText(jsonMatch[0]));
    }

    for (const candidate of candidates) {
        try {
            return JSON.parse(candidate);
        } catch {
            // Continue trying fallbacks
        }
    }

    return null;
}

async function repairJsonWithModel(anthropic: Anthropic, malformedText: string) {
    const repairMessage = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 6000,
        system: "You repair malformed JSON. Return ONLY valid JSON. Preserve the original content and structure as closely as possible. Do not add markdown fences or commentary.",
        messages: [{
            role: "user",
            content: `Repair this malformed JSON so it becomes valid JSON only:\n\n${malformedText}`,
        }],
    });

    const repairedTextBlock = repairMessage.content.find((b) => b.type === "text");
    const repairedText = repairedTextBlock && "text" in repairedTextBlock ? repairedTextBlock.text.trim() : "";
    return tryParseGeneratedContent(repairedText);
}

export async function POST(request: NextRequest) {
    try {
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        const body = await request.json();
        const { document_type, summary, metadata_override } = body;

        if (!summary) {
            return NextResponse.json(
                { error: "Summary is required." },
                { status: 400 }
            );
        }

        if (summary.length > MAX_SUMMARY_LENGTH) {
            return NextResponse.json(
                { error: `Summary is too long. Please keep input at or below ${MAX_SUMMARY_LENGTH.toLocaleString()} characters.` },
                { status: 400 }
            );
        }

        // Verify user is authenticated
        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json(
                { error: "Not authenticated." },
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
                { error: "Invalid session." },
                { status: 401 }
            );
        }

        const apiKey = await getSecret("ANTHROPIC_API_KEY", supabaseAdmin);
        if (!apiKey) {
            return NextResponse.json(
                { error: "AI service not configured — API key not found." },
                { status: 500 }
            );
        }

        const anthropic = new Anthropic({ apiKey });

        // Use the template-specific prompt when a known document type is provided;
        // this includes the detailed JSON schema, extraction instructions, and summary.
        const isKnownType = document_type && document_type in DOCUMENT_TEMPLATES;
        const userPrompt = isKnownType
            ? getTemplatePrompt(document_type as DocumentType, summary)
            : `Generate a professional construction document from the following summary:\n\n${summary}`;

        // Dynamic timeout based on input length: 1 min base + 30s per 1000 chars
        const inputLength = summary?.length || 0;
        const dynamicTimeoutMs = Math.min(
            270_000, // Cap at 4.5 minutes
            Math.max(60_000, 60_000 + (inputLength / 1000) * 30_000) // Base 1min + 30s per 1000 chars
        );

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), dynamicTimeoutMs);

        // Dynamic max_tokens based on input length for comprehensive outputs
        const dynamicMaxTokens = Math.min(
            10000,
            Math.max(5000, Math.ceil(inputLength * 0.9))
        );

        const message = await anthropic.messages.create(
            {
                model: "claude-sonnet-4-6",
                max_tokens: dynamicMaxTokens,
                system: DOCUMENT_SYSTEM_PROMPT,
                messages: [{ role: "user", content: userPrompt }],
            },
            { signal: controller.signal }
        );

        clearTimeout(timeoutId);

        const textBlock = message.content.find((b) => b.type === "text");
        const responseText = textBlock && "text" in textBlock ? textBlock.text.trim() : "";

        // Parse JSON response
        let generatedContent = tryParseGeneratedContent(responseText);

        if (!generatedContent && responseText) {
            generatedContent = await repairJsonWithModel(anthropic, responseText);
        }

        if (!generatedContent) {
            return NextResponse.json(
                { error: "The AI returned malformed structured output. Please retry — long inputs up to 10,000 characters are supported, and the system will attempt to recover automatically." },
                { status: 422 }
            );
        }

        // Apply metadata overrides if provided
        if (metadata_override && generatedContent.metadata) {
            const overridable = [
                "project_name",
                "client",
                "location",
                "date",
                "reference",
                "prepared_by",
                "organization",
                "meeting_type",
                "time",
                "next_meeting",
                "distribution",
            ] as const;
            for (const field of overridable) {
                if (metadata_override[field]) {
                    generatedContent.metadata[field] = metadata_override[field];
                }
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
