/**
 * MPP / MS Project XML Import Parser
 *
 * Microsoft Project .mpp files can be exported as XML (.xml).
 * Many tools also export MSPDI (Microsoft Project Data Interchange) XML.
 * This parser handles MSPDI XML format which is the standard export from MS Project.
 *
 * For actual binary .mpp files, users should first export to XML from MS Project,
 * or use the converter flow that reads .mpp via a server-side library.
 */

export interface ImportedTask {
    uid: string;
    name: string;
    wbsCode: string | null;
    outlineLevel: number;
    start: string | null;
    finish: string | null;
    duration: string | null; // ISO duration e.g. "PT8H0M0S" or "5d"
    durationDays: number | null;
    percentComplete: number;
    milestone: boolean;
    summary: boolean;
    notes: string | null;
    predecessors: Array<{
        predecessorUid: string;
        type: "FS" | "FF" | "SS" | "SF";
        lag: number;
    }>;
}

export interface ImportResult {
    tasks: ImportedTask[];
    projectName: string | null;
    projectStart: string | null;
    projectFinish: string | null;
    errors: string[];
}

/** Parse ISO 8601 duration to approximate days. PT8H = 1 day, PT16H = 2 days, etc. */
function parseMspDuration(dur: string | null): number | null {
    if (!dur) return null;

    // Handle "Xd" shorthand
    const dayMatch = dur.match(/^(\d+)d$/i);
    if (dayMatch) return parseInt(dayMatch[1], 10);

    // Handle ISO duration: PT8H0M0S
    const isoMatch = dur.match(/PT(\d+)H/);
    if (isoMatch) {
        const hours = parseInt(isoMatch[1], 10);
        return Math.max(1, Math.ceil(hours / 8)); // 8-hour work day
    }

    // Handle P5D format
    const pDayMatch = dur.match(/P(\d+)D/);
    if (pDayMatch) return parseInt(pDayMatch[1], 10);

    return null;
}

/** Map MSPDI dependency type number to code. */
function mapDependencyType(typeNum: string): "FS" | "FF" | "SS" | "SF" {
    switch (typeNum) {
        case "0": return "FF";
        case "1": return "FS";
        case "2": return "SF";
        case "3": return "SS";
        default: return "FS";
    }
}

/** Parse MSPDI XML text content. */
function getTextContent(parent: Element, tag: string): string | null {
    const el = parent.getElementsByTagName(tag)[0];
    return el?.textContent?.trim() ?? null;
}

/** Parse date from MSPDI format (could be ISO or MSPDI datetime). */
function parseProjectDate(dateStr: string | null): string | null {
    if (!dateStr) return null;
    // MSPDI uses format like: 2026-03-15T08:00:00
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
}

/** Parse MSPDI / MS Project XML string into ImportResult. */
export function parseMspXml(xmlString: string): ImportResult {
    const errors: string[] = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, "text/xml");

    // Check for parse errors
    const parserError = doc.querySelector("parsererror");
    if (parserError) {
        return {
            tasks: [],
            projectName: null,
            projectStart: null,
            projectFinish: null,
            errors: ["Invalid XML format: " + (parserError.textContent ?? "parse error")],
        };
    }

    // Try finding project info
    const projectName =
        getTextContent(doc.documentElement, "Name") ||
        getTextContent(doc.documentElement, "Title") ||
        null;

    const projectStart = parseProjectDate(
        getTextContent(doc.documentElement, "StartDate") ||
        getTextContent(doc.documentElement, "Start")
    );

    const projectFinish = parseProjectDate(
        getTextContent(doc.documentElement, "FinishDate") ||
        getTextContent(doc.documentElement, "Finish")
    );

    // Parse tasks
    const taskElements = doc.getElementsByTagName("Task");
    const tasks: ImportedTask[] = [];

    for (let i = 0; i < taskElements.length; i++) {
        const el = taskElements[i];
        const uid = getTextContent(el, "UID");
        const name = getTextContent(el, "Name");

        // Skip project summary row (UID 0) and empty names
        if (!uid || uid === "0" || !name) continue;

        const outlineLevelStr = getTextContent(el, "OutlineLevel");
        const outlineLevel = outlineLevelStr ? parseInt(outlineLevelStr, 10) : 0;

        const milestoneStr = getTextContent(el, "Milestone");
        const summaryStr = getTextContent(el, "Summary");

        const durationStr = getTextContent(el, "Duration");
        const percentStr = getTextContent(el, "PercentComplete") || getTextContent(el, "PercentWorkComplete");

        // Parse predecessors
        const predElements = el.getElementsByTagName("PredecessorLink");
        const predecessors: ImportedTask["predecessors"] = [];

        for (let j = 0; j < predElements.length; j++) {
            const predEl = predElements[j];
            const predUid = getTextContent(predEl, "PredecessorUID");
            const typeStr = getTextContent(predEl, "Type") ?? "1";
            const lagStr = getTextContent(predEl, "LinkLag") ?? "0";

            if (predUid) {
                predecessors.push({
                    predecessorUid: predUid,
                    type: mapDependencyType(typeStr),
                    lag: Math.round(parseInt(lagStr, 10) / 4800), // MSPDI lag is in tenths of minutes
                });
            }
        }

        const notesEl = el.getElementsByTagName("Notes")[0];
        const notes = notesEl?.textContent?.trim() ?? null;

        tasks.push({
            uid,
            name,
            wbsCode: getTextContent(el, "WBS") || getTextContent(el, "OutlineNumber"),
            outlineLevel: Math.max(0, outlineLevel - 1), // Adjust: MSPDI outline starts at 1
            start: parseProjectDate(getTextContent(el, "Start")),
            finish: parseProjectDate(getTextContent(el, "Finish")),
            duration: durationStr,
            durationDays: parseMspDuration(durationStr),
            percentComplete: percentStr ? parseInt(percentStr, 10) : 0,
            milestone: milestoneStr === "1",
            summary: summaryStr === "1",
            notes,
            predecessors,
        });
    }

    if (tasks.length === 0) {
        errors.push("No tasks found in the XML. Ensure the file follows MSPDI format.");
    }

    return { tasks, projectName, projectStart, projectFinish, errors };
}

/**
 * Parse a generic CSV/text format (tab-delimited or comma-delimited) into ImportedTask[].
 * Expected headers: Task Name, Duration, Start, Finish, % Complete
 */
export function parseSimpleCsv(csvText: string): ImportResult {
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) {
        return { tasks: [], projectName: null, projectStart: null, projectFinish: null, errors: ["File is empty or has no data rows."] };
    }

    const delimiter = lines[0].includes("\t") ? "\t" : ",";
    const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ""));

    const nameIdx = headers.findIndex((h) => h.includes("task") || h.includes("name") || h.includes("activity"));
    const durationIdx = headers.findIndex((h) => h.includes("duration"));
    const startIdx = headers.findIndex((h) => h.includes("start"));
    const finishIdx = headers.findIndex((h) => h.includes("finish") || h.includes("end"));
    const percentIdx = headers.findIndex((h) => h.includes("percent") || h.includes("complete"));

    if (nameIdx < 0) {
        return { tasks: [], projectName: null, projectStart: null, projectFinish: null, errors: ["Could not find a 'Task Name' column."] };
    }

    const tasks: ImportedTask[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(delimiter).map((c) => c.trim());
        const name = cols[nameIdx];
        if (!name) continue;

        const durationStr = durationIdx >= 0 ? cols[durationIdx] : null;
        const durationDays = durationStr ? (parseMspDuration(durationStr) ?? (parseInt(durationStr, 10) || null)) : null;

        tasks.push({
            uid: String(i),
            name,
            wbsCode: null,
            outlineLevel: 0,
            start: startIdx >= 0 ? parseProjectDate(cols[startIdx]) : null,
            finish: finishIdx >= 0 ? parseProjectDate(cols[finishIdx]) : null,
            duration: durationStr,
            durationDays,
            percentComplete: percentIdx >= 0 ? parseInt(cols[percentIdx], 10) || 0 : 0,
            milestone: false,
            summary: false,
            notes: null,
            predecessors: [],
        });
    }

    return { tasks, projectName: null, projectStart: null, projectFinish: null, errors };
}
