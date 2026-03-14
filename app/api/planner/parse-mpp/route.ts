import { NextRequest, NextResponse } from "next/server";
import CFB from "cfb";
import { parseMspXml, ImportResult } from "@/lib/planner/import-parser";

// Helpers for reading structured data from a Buffer (OLE Property Sets)
function readU16LE(buf: Buffer, offset: number): number {
  return buf.readUInt16LE(offset);
}

function readU32LE(buf: Buffer, offset: number): number {
  return buf.readUInt32LE(offset);
}

/**
 * Extract the project title from OLE SummaryInformation stream.
 * This stream stores properties in the MS Property Set format.
 * PIDSI_TITLE is property ID 2.
 */
function extractSummaryTitle(data: Buffer): string | null {
  try {
    // Property set header: 48 bytes, then section header
    if (data.length < 52) return null;

    // First section offset at byte 44
    const sectionOffset = readU32LE(data, 44);
    if (sectionOffset + 8 > data.length) return null;

    const propCount = readU32LE(data, sectionOffset + 4);

    // Property directory starts at sectionOffset + 8
    for (let i = 0; i < propCount; i++) {
      const dirOffset = sectionOffset + 8 + i * 8;
      if (dirOffset + 8 > data.length) break;

      const propId = readU32LE(data, dirOffset);
      const propOffset = readU32LE(data, dirOffset + 4);
      const absOffset = sectionOffset + propOffset;

      // PIDSI_TITLE = 2
      if (propId === 2) {
        if (absOffset + 8 > data.length) break;
        const type = readU16LE(data, absOffset);
        const len = readU32LE(data, absOffset + 4);

        // VT_LPSTR = 30 (ANSI string), VT_LPWSTR = 31 (Unicode)
        if (type === 30 && absOffset + 8 + len <= data.length) {
          return data
            .slice(absOffset + 8, absOffset + 8 + len - 1)
            .toString("ascii")
            .replace(/\x00/g, "");
        }
        if (type === 31 && absOffset + 8 + len * 2 <= data.length) {
          return data
            .slice(absOffset + 8, absOffset + 8 + len * 2 - 2)
            .toString("utf16le")
            .replace(/\x00/g, "");
        }
      }
    }
  } catch {
    // Ignore parse errors in property set
  }
  return null;
}

/**
 * Scan all streams in a CFB compound document for embedded XML content.
 * MS Project 2013+ can embed MSPDI XML in secondary streams.
 */
function findXmlInStreams(container: ReturnType<typeof CFB.parse>): string | null {
  const XML_SIG = Buffer.from("<?xml", "ascii");

  for (const entry of container.FileIndex) {
    if (!entry || entry.type !== 2) continue; // type 2 = file/stream

    const content = entry.content;
    if (!content || content.length < 6) continue;

    const buf = Buffer.isBuffer(content)
      ? content
      : Buffer.from(content as unknown as ArrayBuffer);

    // Check for XML signature at start
    if (buf.slice(0, 5).equals(XML_SIG)) {
      const xml = buf.toString("utf8");
      // Verify it looks like MSPDI (contains <Project or <Tasks)
      if (xml.includes("<Project") || xml.includes("<Tasks>")) {
        return xml;
      }
    }

    // Check for UTF-16 XML signature (BOM FF FE followed by < ? x m l)
    if (
      buf[0] === 0xff &&
      buf[1] === 0xfe &&
      buf[2] === 0x3c &&
      buf[3] === 0x00
    ) {
      const xml = buf.slice(2).toString("utf16le");
      if (xml.includes("<Project") || xml.includes("<Tasks>")) {
        return xml;
      }
    }

    // Also scan interior of stream for embedded XML blocks (some versions prepend binary header)
    if (buf.length > 512) {
      const xmlIdx = buf.indexOf(XML_SIG);
      if (xmlIdx > 0 && xmlIdx < buf.length - 100) {
        const xml = buf.slice(xmlIdx).toString("utf8");
        if (xml.includes("<Project") || xml.includes("<Tasks>")) {
          return xml;
        }
      }
    }
  }

  return null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const arrayBuffer = await (file as File).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Verify OLE signature: D0 CF 11 E0 A1 B1 1A E1
    if (
      buffer[0] !== 0xd0 ||
      buffer[1] !== 0xcf ||
      buffer[2] !== 0x11 ||
      buffer[3] !== 0xe0
    ) {
      return NextResponse.json(
        {
          error:
            "File does not appear to be a valid .mpp file. Please ensure it is saved from Microsoft Project.",
        },
        { status: 422 }
      );
    }

    // Parse the OLE compound document
    let container: ReturnType<typeof CFB.parse>;
    try {
      container = CFB.parse(buffer, { type: "buffer" });
    } catch {
      return NextResponse.json(
        { error: "Could not parse the .mpp file structure. The file may be corrupted." },
        { status: 422 }
      );
    }

    // Extract project name from SummaryInformation stream
    let projectName: string | null = null;
    const summaryEntry = container.FileIndex.find(
      (e) => e && e.name === "\u0005SummaryInformation"
    );
    if (summaryEntry?.content) {
      const buf = Buffer.isBuffer(summaryEntry.content)
        ? summaryEntry.content
        : Buffer.from(summaryEntry.content as unknown as ArrayBuffer);
      projectName = extractSummaryTitle(buf);
    }

    // Try to find embedded XML (works for some Project versions)
    const xml = findXmlInStreams(container);
    if (xml) {
      const result: ImportResult = parseMspXml(xml);
      if (result.tasks.length > 0) {
        // Override project name with what we extracted from OLE metadata if XML doesn't have it
        if (!result.projectName && projectName) {
          result.projectName = projectName;
        }
        return NextResponse.json(result);
      }
    }

    // No parseable XML found — return metadata-only result with helpful message
    const result: ImportResult = {
      tasks: [],
      projectName,
      projectStart: null,
      projectFinish: null,
      errors: [
        "This .mpp file's task data is stored in a proprietary binary format that cannot be read directly." +
          " To import all tasks, please open the file in Microsoft Project and export it as XML:" +
          " File → Save As → XML Format (*.xml), then upload the XML file here." +
          (projectName ? ` (Detected project: "${projectName}")` : ""),
      ],
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("[parse-mpp]", err);
    return NextResponse.json(
      { error: "Unexpected server error while parsing .mpp file." },
      { status: 500 }
    );
  }
}
